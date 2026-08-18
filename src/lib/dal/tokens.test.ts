// src/lib/dal/tokens.test.ts
//
// The database-free half. Everything that depends on a query — expiry, type
// isolation, single use — lives in tokens.integration.test.ts, which runs
// against a real mongod because those properties cannot be honestly asserted
// against a mock.
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({ connectDB: vi.fn() }))

import { generateToken, hashToken } from './tokens'
import { verifyTokenSchema } from '@/shared/schemas/auth'

describe('generateToken', () => {
  // 32 bytes as base64url is 43 characters with no padding, which is exactly
  // what the TOKEN_RE in schemas/auth.ts accepts. If this changes, links stop
  // validating before they ever reach a route.
  it('produces a 43-character base64url string', () => {
    expect(generateToken()).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })

  it('is URL-safe, so a token survives a query string unencoded', () => {
    const tokens = Array.from({ length: 50 }, generateToken)
    for (const token of tokens) {
      expect(encodeURIComponent(token)).toBe(token)
    }
  })

  it('does not repeat', () => {
    const tokens = new Set(Array.from({ length: 500 }, generateToken))
    expect(tokens.size).toBe(500)
  })

  // The drift check between the issuer and the validator, made here rather than
  // in schemas/auth.test.ts because the dependency may only run this way: the
  // schema layer is imported by 'use client' forms and cannot reach the DAL.
  // If either side changes the token format alone, this fails.
  it('produces tokens the route schema accepts', () => {
    for (let i = 0; i < 100; i++) {
      expect(verifyTokenSchema.safeParse({ token: generateToken() }).success).toBe(true)
    }
  })
})

describe('hashToken', () => {
  it('is deterministic', () => {
    const raw = generateToken()
    expect(hashToken(raw)).toBe(hashToken(raw))
  })

  // The regression this exists for: if hashToken ever became a pass-through,
  // the database would be storing live, click-to-use links in plain text and
  // every other test here would still pass.
  it('never returns its input', () => {
    const raw = generateToken()
    expect(hashToken(raw)).not.toBe(raw)
  })

  it('produces a 64-character hex digest', () => {
    expect(hashToken(generateToken())).toMatch(/^[a-f0-9]{64}$/)
  })

  it('maps different tokens to different hashes', () => {
    expect(hashToken(generateToken())).not.toBe(hashToken(generateToken()))
  })
})
