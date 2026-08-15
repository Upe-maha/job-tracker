// src/lib/security/rateLimiter.ts
import net from 'node:net'
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import RateLimit from '@/models/RateLimit'

interface RateLimitConfig {
  maxAttempts: number
  windowMs: number // in milliseconds
  message: string
}

export const RATE_LIMITS = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many login attempts. Please try again in 15 minutes.',
  },
  register: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many registration attempts. Please try again in 1 hour.',
  },
  reset: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many reset attempts. Please try again in 1 hour.',
  },
  api: {
    maxAttempts: 100,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many requests. Please slow down.',
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

export async function checkRateLimit(
  identifier: string, // IP or user id + route key
  type: RateLimitType
): Promise<RateLimitResult> {
  const cfg = RATE_LIMITS[type]
  const key = `${type}:${identifier}`
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
  await RateLimit.deleteOne({ key: `${type}:${identifier}` })
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
