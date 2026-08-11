// src/lib/api/guard.ts
import { NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { auth } from '@/lib/auth'
import { isSameOriginRequest, csrfFailure } from '@/lib/security/csrf'
import { checkRateLimit, rateLimitResponse, getClientIP, type RateLimitType } from '@/lib/security/rateLimiter'
import { fail } from './respond'

interface GuardOptionsAuthed {
  auth?: true
  csrf?: boolean
  rateLimit?: RateLimitType | false
}
interface GuardOptionsPublic {
  auth: false
  csrf?: boolean
  rateLimit?: RateLimitType | false
}

type GuardResult<S> =
  | { ok: true; session: S; ip: string }
  | { ok: false; response: NextResponse }

// Shared route preamble: CSRF -> auth -> rate limit, in that order (CSRF is
// free and header-only; auth runs before rate limiting so the limiter key can
// be the user id on authenticated routes instead of shared IP buckets).
//
// Usage:
//   const g = await guard(req, { rateLimit: 'api' })
//   if (!g.ok) return g.response
//   // g.session is guaranteed non-null here
export async function guard(req: Request, opts?: GuardOptionsAuthed): Promise<GuardResult<Session>>
export async function guard(req: Request, opts: GuardOptionsPublic): Promise<GuardResult<Session | null>>
export async function guard(
  req: Request,
  opts: GuardOptionsAuthed | GuardOptionsPublic = {}
): Promise<GuardResult<Session | null>> {
  const requireAuth = opts.auth !== false
  const requireCsrf = opts.csrf !== false
  const rateLimitType = opts.rateLimit === undefined ? 'api' : opts.rateLimit

  if (requireCsrf && !isSameOriginRequest(req)) {
    return { ok: false, response: csrfFailure() }
  }

  const session = await auth()
  if (requireAuth && !session?.user?.id) {
    return { ok: false, response: fail(401, 'Unauthorized') }
  }

  const ip = getClientIP(req)

  if (rateLimitType) {
    const key = session?.user?.id ? `user:${session.user.id}` : `ip:${ip}`
    try {
      const result = await checkRateLimit(key, rateLimitType)
      if (!result.allowed) {
        return {
          ok: false,
          response: rateLimitResponse(result.message ?? 'Too many requests.', result.retryAfter ?? 60),
        }
      }
    } catch (err) {
      // Fail closed on auth-sensitive limits (login/register/reset), fail
      // open on the generic 'api' limit — a Mongo outage shouldn't 503 the
      // whole app, but it should still block credential-guessing.
      if (rateLimitType !== 'api') {
        console.error('[guard] rate limit check failed', err)
        return { ok: false, response: fail(503, 'Service temporarily unavailable') }
      }
      console.error('[guard] rate limit check failed, allowing request', err)
    }
  }

  return { ok: true, session: session ?? null, ip }
}
