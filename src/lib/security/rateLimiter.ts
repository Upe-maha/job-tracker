// src/lib/security/rateLimiter.ts
import net from 'node:net'
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import RateLimit from '@/models/RateLimit'

interface RateLimitConfig {
  maxAttempts: number
  windowMs: number // in milliseconds
  message: string
  // Mongo unreachable: let the request through, or 503? Stated per preset
  // rather than inferred from the name, because guard() acts on it and a new
  // budget silently inheriting the wrong answer is a security bug either way —
  // fail open on an auth budget hands a guesser unlimited attempts, fail closed
  // on a read budget takes the whole dashboard down with the database.
  failOpen: boolean

  // Do all routes on this preset draw from one pool, or does each route get its
  // own? Both are wanted, and picking wrong is a real defect in either
  // direction:
  //
  //   'shared' — the pool IS the budget. 'read' at 120/min means 120 reads a
  //     minute in total; giving each of the six read routes its own 120 would
  //     quietly turn that into 720.
  //
  //   'route'  — the budget describes one action. 'reset' at 5/hour means five
  //     forgot-password requests AND five resend-verification requests, because
  //     they are different intentions that must not compete. Sharing them let a
  //     logged-in user spend their resend allowance on the forgot-password form
  //     and get a 429 on their first click of "Resend email".
  //
  // guard() derives the route part itself from the request path, so this is the
  // only place the decision is made and no call site can get it wrong.
  scope: 'shared' | 'route'
}

// One budget per thing being protected, not one number for the whole API. The
// spread matters more than the exact values: what bounds credential guessing
// has nothing in common with what bounds Cloudinary spend.
export const RATE_LIMITS = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many login attempts. Please try again in 15 minutes.',
    failOpen: false,
    scope: 'shared',
  },
  register: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many registration attempts. Please try again in 1 hour.',
    failOpen: false,
    scope: 'shared',
  },
  // Step C, the *send* side: forgot-password and resend-verification. Bounds
  // outbound mail cost and stops the app being used to spam someone's inbox.
  // 5, not 3: this is the budget a user spends when an email did not arrive, so
  // it has to survive a couple of honest retries. Three was tight enough that a
  // single unlucky session hit the wall, and because it is per-route now, five
  // here means five *per action* rather than five across all of them.
  reset: {
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many requests. Please try again in an hour.',
    failOpen: false,
    scope: 'route',
  },
  // Step C, the *consume* side: every route that redeems an emailed link.
  // Split from 'reset' because the two defend different things — sending costs
  // money and annoys a third party, redeeming costs a database round trip — and
  // a user who clicks a stale link a few times must not burn their send budget.
  // Fails closed with the rest of the auth-adjacent budgets.
  token: {
    maxAttempts: 10,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many attempts. Please try again in 15 minutes.',
    failOpen: false,
    scope: 'route',
  },
  // Generic moderate budget. No longer any route's default — it survives for
  // the OAuth signIn callback in @/lib/auth, which needs a budget that isn't
  // tied to a request object and isn't as tight as 'login'.
  api: {
    maxAttempts: 100,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many requests. Please slow down.',
    failOpen: true,
    scope: 'shared',
  },
  // Generous on purpose. A single mutation fans out to several invalidations
  // client-side, and invalidating ['notes'] refetches every loaded page of the
  // infinite feed at once — a deep-scrolled user creating a note can spend a
  // dozen of these in one burst, all of it legitimate.
  read: {
    maxAttempts: 120,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many requests. Please slow down.',
    failOpen: true,
    scope: 'shared',
  },
  // Bounds document growth: the embedded arrays have SUBDOCUMENT_LIMITS, but
  // the applications collection itself has no cap. A Kanban drag spends 1 here
  // and puts its two refetches on 'read', so 30 is well past human speed.
  write: {
    maxAttempts: 30,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many changes at once. Please slow down.',
    failOpen: true,
    scope: 'shared',
  },
  // Fails closed, unlike the other non-auth budgets. This tier exists to bound
  // billable Cloudinary uploads and permanently stored assets, and failing open
  // abandons exactly that at the moment it can't be enforced. /api/upload is
  // also the one route that never touches Mongo — it hands the buffer to
  // Cloudinary and returns the URL, which a *separate* request persists — so
  // during an outage it would otherwise be the only endpoint still working,
  // unmetered. The cost is that uploads 503 while Mongo is down, and the URL
  // could not have been saved anyway.
  upload: {
    maxAttempts: 15,
    windowMs: 10 * 60 * 1000, // 10 minutes
    message: 'Too many uploads. Please try again in a few minutes.',
    failOpen: false,
    scope: 'shared',
  },
} satisfies Record<string, RateLimitConfig>

export type RateLimitType = keyof typeof RATE_LIMITS

// Number of reverse proxies between the public internet and this app. Every
// proxy *appends* to X-Forwarded-For, so the left end of that header is
// whatever the client sent and the right end is what our own infrastructure
// wrote. With N trusted hops the real client is the Nth entry from the right,
// and nothing left of that cut can influence the bucket.
//
//   0 -> nothing in front of us, so no proxy header is trustworthy at all
//   1 -> Vercel (overwrites XFF with a single value) or one nginx/Caddy
//   2 -> Cloudflare in front of a host (prefer CF-Connecting-IP if adopted)
const TRUSTED_PROXY_HOPS = (() => {
  const raw = process.env.TRUSTED_PROXY_HOPS
  if (raw === undefined) return 1

  const parsed = Number.parseInt(raw, 10)
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 10) {
    // Never throw at import time — a typo in an env var must not take the app
    // down, and 1 is correct for the common single-proxy deployment.
    console.error(`[getClientIP] invalid TRUSTED_PROXY_HOPS=${raw}, falling back to 1`)
    return 1
  }
  return parsed
})()

// Shared bucket for "we could not establish a trustworthy client IP". Brute
// force stays bounded, at the cost of one global budget — which is why the
// miss is logged loudly rather than swallowed.
const UNKNOWN_IP = 'unknown'
let warnedMissingIp = false

// Proxies emit `1.2.3.4:5678` and `[::1]:443` in the wild, both of which
// net.isIP rejects. Strip the port/brackets first, then validate — the return
// value becomes a unique-indexed Mongo key, so an arbitrary header string
// would blow past MongoDB's 1024-byte index key limit and 503 the request.
function normalizeIp(value: string): string | null {
  let ip = value.trim()

  const bracketed = ip.match(/^\[(.+)\](?::\d+)?$/)
  if (bracketed) {
    ip = bracketed[1]
  } else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) {
    ip = ip.slice(0, ip.lastIndexOf(':'))
  }

  return net.isIP(ip) ? ip : null
}

// `req` is the base Request (not NextRequest) because NextAuth's authorize()
// callback receives a plain Request, and this is called from there too.
export function getClientIP(req: Request): string {
  // No proxy in front of us means every forwarding header is client-supplied,
  // so there is nothing here worth trusting.
  if (TRUSTED_PROXY_HOPS === 0) return UNKNOWN_IP

  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const hops = forwarded.split(',')
    const ip = normalizeIp(hops[Math.max(0, hops.length - TRUSTED_PROXY_HOPS)])
    if (ip) return ip
  }

  // Single-valued and written by the last proxy (nginx's real_ip), so it rests
  // on the same trust assumption as the hop count above.
  const real = req.headers.get('x-real-ip')
  if (real) {
    const ip = normalizeIp(real)
    if (ip) return ip
  }

  // Once per process — in serverless that's one line per cold start, which is
  // loud enough to notice without flooding the log on every request.
  if (!warnedMissingIp) {
    warnedMissingIp = true
    console.error(
      `[getClientIP] no trusted client IP (TRUSTED_PROXY_HOPS=${TRUSTED_PROXY_HOPS}); ` +
        'all traffic will share one rate-limit bucket — check the proxy configuration'
    )
  }
  return UNKNOWN_IP
}

interface RateLimitResult {
  allowed: boolean
  message?: string
  retryAfter?: number
  remaining: number
}

// The one place the bucket key is spelled. guard() needs to name the same
// bucket later to refund it, and two independent format strings would drift.
export function rateLimitKey(identifier: string, type: RateLimitType): string {
  return `${type}:${identifier}`
}

export async function checkRateLimit(
  identifier: string, // IP or user id, already scoped by the caller
  type: RateLimitType
): Promise<RateLimitResult> {
  const cfg = RATE_LIMITS[type]
  const key = rateLimitKey(identifier, type)
  const now = new Date()
  const nextExpiry = new Date(now.getTime() + cfg.windowMs)

  await connectDB()

  // Roll an expired window forward, atomically. No-op if the window is still live.
  await RateLimit.updateOne(
    { key, expiresAt: { $lte: now } },
    { $set: { count: 0, expiresAt: nextExpiry } }
  )

  // Increment; create the doc if this is the first hit ever for this key.
  let doc
  try {
    doc = await RateLimit.findOneAndUpdate(
      { key },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: nextExpiry } },
      { upsert: true, new: true }
    )
  } catch (err: unknown) {
    // Two concurrent upserts on a unique index can both attempt an insert;
    // one gets a duplicate-key error. Retry once — the doc now exists.
    if ((err as { code?: number }).code === 11000) {
      doc = await RateLimit.findOneAndUpdate(
        { key },
        { $inc: { count: 1 }, $setOnInsert: { expiresAt: nextExpiry } },
        { upsert: true, new: true }
      )
    } else {
      throw err
    }
  }

  const remaining = Math.max(0, cfg.maxAttempts - doc.count)

  if (doc.count > cfg.maxAttempts) {
    return {
      allowed: false,
      message: cfg.message,
      retryAfter: Math.max(1, Math.ceil((doc.expiresAt.getTime() - now.getTime()) / 1000)),
      remaining: 0,
    }
  }

  return { allowed: true, remaining }
}

// Called on successful login so a legitimate user isn't penalised for earlier typos.
export async function clearRateLimit(identifier: string, type: RateLimitType): Promise<void> {
  await connectDB()
  await RateLimit.deleteOne({ key: rateLimitKey(identifier, type) })
}

// Give back a single attempt. checkRateLimit charges on *request*, but some
// budgets are really about an effect — 'reset' bounds outbound mail, so a
// request that turns out to send none should not have cost anything. The
// handler is the only thing that knows whether the effect happened, so it hands
// the charge back through guard()'s `refund`.
//
// Not clearRateLimit: that wipes the whole window, which would let a caller
// reset their own budget on demand by triggering the no-op path repeatedly.
// count stays floored at 0 so a double refund cannot mint attempts.
export async function refundRateLimit(key: string): Promise<void> {
  await connectDB()
  await RateLimit.updateOne({ key, count: { $gt: 0 } }, { $inc: { count: -1 } })
}

export function rateLimitResponse(message: string, retryAfter: number) {
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Reset': String(Date.now() + retryAfter * 1000),
      },
    }
  )
}
