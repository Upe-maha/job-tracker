// src/server/security/linkIntent.ts
//
// Step E. The one cookie that carries an account_link token through an OAuth
// round trip, shared by the route that sets it and the signIn callback that
// reads it — so the name and the flags cannot drift between the two halves of
// one flow.
//
// Server-only, like csrf.ts and rateLimiter.ts next door.

export const ACCOUNT_LINK_COOKIE = 'account-link-intent'

// Ten minutes. Long enough for a provider consent screen, short enough that an
// abandoned attempt is not still sitting in the browser an hour later. The
// token carries the same TTL; this is only the cookie's half of it.
export const ACCOUNT_LINK_TTL_MS = 10 * 60 * 1000

export function accountLinkCookie(token: string) {
  return {
    name: ACCOUNT_LINK_COOKIE,
    value: token,
    httpOnly: true,
    // 'lax', not 'strict', and this is load-bearing: the cookie has to survive
    // the provider's top-level GET redirect back to /api/auth/callback/*, and
    // 'strict' drops it on exactly that navigation — the flow would then fail
    // every time with no cookie to explain why.
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ACCOUNT_LINK_TTL_MS / 1000,
  }
}
