// src/shared/schemas/auth.test.ts
import { describe, expect, it } from 'vitest'
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyTokenSchema,
} from './auth'

// A literal of the right shape — 43 base64url characters. Deliberately not
// generateToken(): the schema layer may not import the DAL (eslint enforces it,
// since these schemas are also imported by 'use client' forms). The check that
// the real issuer still produces something this schema accepts lives in
// src/lib/dal/tokens.test.ts, which is allowed to depend in that direction.
const VALID = 'abcdefghijklmnopqrstuvwxyz0123456789_-ABCDE'

describe('verifyTokenSchema', () => {
  it('accepts a freshly generated token', () => {
    expect(verifyTokenSchema.safeParse({ token: VALID }).success).toBe(true)
  })

  it.each([
    ['empty', ''],
    ['too short', VALID.slice(0, 42)],
    ['too long', VALID + 'a'],
    ['base64 padding', `${VALID.slice(0, 41)}==`],
    ['standard base64 characters', `${VALID.slice(0, 41)}+/`],
    ['a path traversal attempt', '../../etc/passwd'],
  ])('rejects %s', (_label, token) => {
    expect(verifyTokenSchema.safeParse({ token }).success).toBe(false)
  })

  // The message is shown to a user who clicked a link; it must not describe the
  // internals of the token format.
  it('reports a link-shaped error, not a validation one', () => {
    const result = verifyTokenSchema.safeParse({ token: 'nope' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('This link is invalid or has expired')
    }
  })
})

describe('forgotPasswordSchema', () => {
  it('normalizes the address the way the User model stores it', () => {
    const result = forgotPasswordSchema.safeParse({ email: '  Ada@Example.COM ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.email).toBe('ada@example.com')
  })

  it.each(['', 'not-an-email', 'ada@'])('rejects %j', (email) => {
    expect(forgotPasswordSchema.safeParse({ email }).success).toBe(false)
  })
})

describe('resetPasswordSchema', () => {
  it('accepts a valid token and password', () => {
    expect(
      resetPasswordSchema.safeParse({ token: VALID, password: 'hunter2' }).success
    ).toBe(true)
  })

  // The same 6-character floor as register and the change form — it comes from
  // the shared builder, so this is really asserting the reuse.
  it('applies the shared password policy', () => {
    expect(resetPasswordSchema.safeParse({ token: VALID, password: 'short' }).success).toBe(false)
  })

  it('rejects a valid password with a mangled token', () => {
    expect(
      resetPasswordSchema.safeParse({ token: 'mangled', password: 'hunter2' }).success
    ).toBe(false)
  })
})
