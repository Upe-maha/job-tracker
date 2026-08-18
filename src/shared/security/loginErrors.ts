// src/shared/security/loginErrors.ts
//
// Shared between src/server/auth.ts (server, sets these as CredentialsSignin
// error codes) and the login page (client, reads them back via signIn()'s
// result.code). Must stay free of server-only imports (next-auth, @/server/auth)
// since the login page is 'use client'.

export const LOGIN_ERROR = {
  INVALID: 'credentials',
  RATE_LIMITED: 'too_many_attempts',
  LOCKED: 'account_locked',
  // OAuth (Step B). These arrive as a `?error=` query param rather than via
  // signIn()'s result.code: returning a string from the signIn callback is
  // treated by @auth/core as a redirect URL, which is how a provider sign-in
  // reports a failure of its own.
  OAUTH_UNVERIFIED_EMAIL: 'oauth_unverified_email',
  OAUTH_FAILED: 'oauth_failed',
} as const


// Step E. Connecting a provider from the profile page fails through the same
// mechanism — a string returned from the signIn callback is a redirect — but it
// lands back on /profile, not /login, so the codes and their copy are separate.
export const LINK_ERROR = {
  IN_USE: 'link_in_use',
  PROVIDER_LINKED: 'link_provider_linked',
  EXPIRED: 'link_expired',
  FAILED: 'link_failed',
} as const

export function linkErrorMessage(code?: string): string {
  switch (code) {
    case LINK_ERROR.IN_USE:
      return 'That account is already connected to a different user.'
    case LINK_ERROR.PROVIDER_LINKED:
      return 'A different account is already connected. Disconnect it first, then connect this one.'
    case LINK_ERROR.EXPIRED:
      return 'That connection request expired. Please try again.'
    case LINK_ERROR.FAILED:
    default:
      return 'Could not connect that account. Please try again.'
  }
}

export function loginErrorMessage(code?: string): string {
  switch (code) {
    case LOGIN_ERROR.RATE_LIMITED:
      return 'Too many login attempts. Please try again in 15 minutes.'
    case LOGIN_ERROR.LOCKED:
      return 'This account is temporarily locked after too many failed attempts. Try again in 15 minutes.'
    case LOGIN_ERROR.OAUTH_UNVERIFIED_EMAIL:
      return 'That provider did not give us a verified email address. Verify your email with the provider, or sign in with a password.'
    case LOGIN_ERROR.OAUTH_FAILED:
      return 'Could not complete sign-in with that provider. Please try again.'
    case LOGIN_ERROR.INVALID:
    default:
      return 'Invalid email or password'
  }
}
