// src/lib/api/guard.ts
import { NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { auth } from '@/lib/auth'
import { isSameOriginRequest, csrfFailure } from '@/lib/security/csrf'
import {
  RATE_LIMITS,
  checkRateLimit,
  rateLimitKey,
  rateLimitResponse,
  refundRateLimit,
  getClientIP,
  type RateLimitType,
} from '@/lib/security/rateLimiter'
import { fail } from './respond'

// `rateLimit` is required, not defaulted. An implicit default is what let every
// route drift onto one 100/min budget regardless of what it costs, so declaring
// the tier is now a compile-time obligation — `false` opts out deliberately.
interface GuardOptionsAuthed {
  auth?: true
  csrf?: boolean
  rateLimit: RateLimitType | false
}
interface GuardOptionsPublic {
  auth: false
  csrf?: boolean
  rateLimit: RateLimitType | false
}

// The route half of a 'route'-scoped bucket key. Taken from the URL rather than
// passed in by the caller, so it cannot drift from where the handler actually
// lives. Falls back to the raw url only if it somehow will not parse — a
// degenerate shared bucket is a far better failure than throwing inside the
// preamble every route depends on.
function routePath(req: Request): string {
  try {
    return new URL(req.url).pathname
  } catch {
    return req.url
  }
}

type GuardResult<S> =
  | {
      ok: true
      session: S
      // Hand back the attempt this request was charged, for a handler that
      // turns out to do nothing. See refundRateLimit — no-op when the route
      // opted out of rate limiting.
      refund: () => Promise<void>
    }
  | { ok: false; response: NextResponse }

// Every route's identity check and every rate-limit decision is made here and
// nowhere else. That is deliberate: the collision that let forgot-password
// spend resend-verification's budget existed because *bucket identity* was
// implicit, and the fix is for one function to own it rather than for each
// route to remember.
//
// What guard decides:
//   - CSRF, then auth, then rate limit, in that order (CSRF is free and
//     header-only; auth runs first so the limiter can key on the user id).
//   - Who the caller is for limiting purposes — session user id, else client IP.
//   - Which bucket that lands in, including whether the preset is shared across
//     routes or scoped to this one.
//   - Whether a limiter outage fails open or closed, read from the preset.
//
// What it deliberately does not do: open the database, parse the body, or wrap
// the handler. Next 15 generates route param types (`Promise<{id: string}>`)
// that an HOF has to fight across three different handler shapes, for no gain.
//
// Usage:
//   const g = await guard(req, { rateLimit: 'read' })
//   if (!g.ok) return g.response
//   // g.session is guaranteed non-null here
export async function guard(req: Request, opts: GuardOptionsAuthed): Promise<GuardResult<Session>>
export async function guard(req: Request, opts: GuardOptionsPublic): Promise<GuardResult<Session | null>>
export async function guard(
  req: Request,
  opts: GuardOptionsAuthed | GuardOptionsPublic
): Promise<GuardResult<Session | null>> {
  const requireAuth = opts.auth !== false
  const requireCsrf = opts.csrf !== false
  const rateLimitType = opts.rateLimit

  if (requireCsrf && !isSameOriginRequest(req)) {
    return { ok: false, response: csrfFailure() }
  }

  const session = await auth()
  if (requireAuth && !session?.user?.id) {
    return { ok: false, response: fail(401, 'Unauthorized') }
  }

  let refund = async () => {}

  if (rateLimitType) {
    // Who is being limited.
    const caller = session?.user?.id
      ? `user:${session.user.id}`
      : `ip:${getClientIP(req)}`

    // Which bucket that lands in. A 'route'-scoped preset gets the request path
    // folded into the identifier, so two routes sharing a preset can never
    // share a counter — the defect that made a logged-in user's first click of
    // "Resend email" answer 429 because the forgot-password form had already
    // spent the budget. Derived from the request rather than passed in, so a
    // call site cannot forget it or spell it differently.
    const identifier =
      RATE_LIMITS[rateLimitType].scope === 'route'
        ? `${routePath(req)}:${caller}`
        : caller

    try {
      const result = await checkRateLimit(identifier, rateLimitType)
      if (!result.allowed) {
        return {
          ok: false,
          response: rateLimitResponse(result.message ?? 'Too many requests.', result.retryAfter ?? 60),
        }
      }
      const key = rateLimitKey(identifier, rateLimitType)
      refund = () => refundRateLimit(key)
    } catch (err) {
      // Each preset states its own answer (see RATE_LIMITS). Read it rather
      // than inferring from the tier name: a Mongo outage shouldn't 503 the
      // whole app, but it must still block credential-guessing and uploads.
      if (!RATE_LIMITS[rateLimitType].failOpen) {
        console.error('[guard] rate limit check failed', err)
        return { ok: false, response: fail(503, 'Service temporarily unavailable') }
      }
      console.error('[guard] rate limit check failed, allowing request', err)
    }
  }

  return { ok: true, session: session ?? null, refund }
}
