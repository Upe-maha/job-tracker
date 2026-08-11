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
} as const

export type LoginErrorCode = (typeof LOGIN_ERROR)[keyof typeof LOGIN_ERROR]

export function loginErrorMessage(code?: string): string {
  switch (code) {
    case LOGIN_ERROR.RATE_LIMITED:
      return 'Too many login attempts. Please try again in 15 minutes.'
    case LOGIN_ERROR.LOCKED:
      return 'This account is temporarily locked after too many failed attempts. Try again in 15 minutes.'
    case LOGIN_ERROR.INVALID:
    default:
      return 'Invalid email or password'
  }
}
