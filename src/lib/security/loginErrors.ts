// src/lib/security/loginErrors.ts
//
// Shared between src/lib/auth.ts (server, sets these as CredentialsSignin
// error codes) and the login page (client, reads them back via signIn()'s
// result.code). Must stay free of server-only imports (next-auth, @/lib/auth)
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
