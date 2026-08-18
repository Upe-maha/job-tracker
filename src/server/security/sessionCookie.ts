// src/server/security/sessionCookie.ts
//
// Re-issues the caller's own session cookie with a fresh `signedInAt`.
//
// This exists for one flow: confirming a password change. Revocation compares
// `signedInAt` against `passwordChangedAt`, so without this the tab that just
// changed the password would revoke *itself* — the roadmap asks for "all other
// sessions logged out", and the word doing the work there is *other*.
//
// Server-only, like csrf.ts and rateLimiter.ts next door.
import { encode, getToken } from 'next-auth/jwt'
import type { NextResponse } from 'next/server'
import { REMEMBERED_IDLE_MS } from '@/shared/security/sessionPolicy'

// @auth/core derives the cookie name from whether secure cookies are in use,
// and — importantly — uses that same name as the encryption **salt**
// (jwt.js: `salt = cookieName`). Getting it wrong does not throw; it produces
// a token that silently fails to decode, i.e. signs the user out. One helper so
// the name and the salt can never disagree.
function sessionCookieName(): string {
  return process.env.NODE_ENV === 'production'
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token'
}

// Both variants, for the one caller that needs to clear rather than read:
// /api/auth/session-ended runs wherever it is deployed and a missed name means
// a cookie that survives, which is the redirect loop all over again.
export const SESSION_COOKIE_NAMES = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
] as const

const MAX_AGE_SECONDS = REMEMBERED_IDLE_MS / 1000

/**
 * Returns true when a cookie was re-issued. A `false` is the ordinary case,
 * not a failure: whoever clicked the emailed confirmation link may not have
 * been signed in at all, or may be signed in as somebody else — and in that
 * second case the session must be left to be revoked like any other.
 */
export async function restampSession(
  req: Request,
  res: NextResponse,
  userId: string,
): Promise<boolean> {
  const cookieName = sessionCookieName()
  const secret = process.env.AUTH_SECRET

  try {
    const token = await getToken({
      req: req as never,
      secret,
      secureCookie: process.env.NODE_ENV === 'production',
    })

    // Only the acting user's own session is spared. Re-stamping any other
    // token here would hand a bystander's session an exemption from the
    // revocation it is supposed to receive.
    if (!token || token.id !== userId) return false

    const next = {
      ...token,
      signedInAt: Date.now(),
      lastSeen: Date.now(),
      // Deliberately re-checked on the next request rather than trusted for a
      // further minute: the password state just changed underneath it.
      checkedAt: 0,
    }

    const value = await encode({
      token: next,
      secret: secret as string,
      salt: cookieName,
      maxAge: MAX_AGE_SECONDS,
    })

    res.cookies.set({
      name: cookieName,
      value,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: MAX_AGE_SECONDS,
    })

    return true
  } catch (error) {
    // A failure here means the user is signed out on their next request, which
    // is inconvenient but not unsafe — and far better than throwing after the
    // password has already been written.
    console.error('[sessionCookie.restamp]', error)
    return false
  }
}
