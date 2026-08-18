// tests/integration/server/data/tokens.test.ts
//
// The only DB-touching file in the suite, and it earns that on purpose:
// expiry, type isolation and single use are properties of a MongoDB *query*,
// not of any JS predicate. A mocked model could only assert the shape of the
// filter object, which passes just as happily when the semantics are wrong —
// so these run against an in-process mongod instead.
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import Token from '@/models/Token'
import { consumeToken, generateToken, hashToken, issueToken } from '@/server/data/tokens'

let mongod: MongoMemoryServer

const userId = new mongoose.Types.ObjectId()

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
  // Index builds are asynchronous; the unique { userId, type } index is what
  // makes issueToken's upsert atomic, so wait for it rather than racing it.
  await Token.init()
}, 60_000)

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

afterEach(async () => {
  await Token.deleteMany({})
})

const HOUR = 60 * 60 * 1000

describe('consumeToken — expiry', () => {
  it('rejects an expired token', async () => {
    // Written with a past expiresAt directly, so this asserts the query and
    // never waits on Mongo's TTL monitor (which runs about once a minute and
    // would leave the document readable well past its expiry anyway).
    const raw = generateToken()
    await Token.create({
      userId,
      type: 'email_verify',
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() - 1000),
    })

    await expect(consumeToken({ token: raw, type: 'email_verify' })).resolves.toBeNull()
  })

  it('accepts a token that has not expired', async () => {
    const raw = await issueToken({ userId, type: 'email_verify', ttlMs: HOUR })

    const consumed = await consumeToken({ token: raw, type: 'email_verify' })

    expect(consumed?.userId.toString()).toBe(userId.toString())
  })

  // An expired token must not be consumable, but it also must not be silently
  // treated as "already used" in a way that leaves it lying around forever.
  it('leaves an expired token in place rather than half-consuming it', async () => {
    const raw = generateToken()
    await Token.create({
      userId,
      type: 'email_verify',
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() - 1000),
    })

    await consumeToken({ token: raw, type: 'email_verify' })

    // Still there for the TTL reaper to collect — findOneAndDelete matched
    // nothing, so nothing was deleted.
    await expect(Token.countDocuments({ userId })).resolves.toBe(1)
  })
})

describe('consumeToken — type is a security boundary', () => {
  it('refuses a password_reset token at verify-email', async () => {
    const raw = await issueToken({ userId, type: 'password_reset', ttlMs: HOUR })

    await expect(consumeToken({ token: raw, type: 'email_verify' })).resolves.toBeNull()
  })

  it('refuses an email_verify token at reset-password', async () => {
    const raw = await issueToken({ userId, type: 'email_verify', ttlMs: HOUR })

    await expect(consumeToken({ token: raw, type: 'password_reset' })).resolves.toBeNull()
  })

  it('does not consume the token it refused', async () => {
    const raw = await issueToken({ userId, type: 'password_reset', ttlMs: HOUR })

    await consumeToken({ token: raw, type: 'email_verify' })

    // A mismatched type must not burn the token — the real link still works.
    await expect(consumeToken({ token: raw, type: 'password_reset' })).resolves.not.toBeNull()
  })
})

describe('consumeToken — single use', () => {
  it('succeeds once and then fails', async () => {
    const raw = await issueToken({ userId, type: 'email_verify', ttlMs: HOUR })

    await expect(consumeToken({ token: raw, type: 'email_verify' })).resolves.not.toBeNull()
    await expect(consumeToken({ token: raw, type: 'email_verify' })).resolves.toBeNull()
  })
})

describe('pendingPassword', () => {
  // select: false means this is absent unless asked for. If the .select() is
  // ever dropped, confirm-password-change would write undefined over the
  // user's password — so assert it round-trips.
  it('round-trips through issue and consume', async () => {
    const raw = await issueToken({
      userId,
      type: 'password_change',
      ttlMs: HOUR,
      pendingPassword: '$2b$12$fakehashfakehashfakehashfakehashfakehashfa',
    })

    const consumed = await consumeToken({ token: raw, type: 'password_change' })

    expect(consumed?.pendingPassword).toBe('$2b$12$fakehashfakehashfakehashfakehashfakehashfa')
  })

  it('is null for token types that do not carry one', async () => {
    const raw = await issueToken({ userId, type: 'email_verify', ttlMs: HOUR })

    const consumed = await consumeToken({ token: raw, type: 'email_verify' })

    expect(consumed?.pendingPassword).toBeNull()
  })
})

describe('issueToken — re-issue supersedes', () => {
  it('keeps exactly one token per user per type', async () => {
    await issueToken({ userId, type: 'email_verify', ttlMs: HOUR })
    await issueToken({ userId, type: 'email_verify', ttlMs: HOUR })

    await expect(Token.countDocuments({ userId, type: 'email_verify' })).resolves.toBe(1)
  })

  it('invalidates the previous link and honours the new one', async () => {
    const first = await issueToken({ userId, type: 'email_verify', ttlMs: HOUR })
    const second = await issueToken({ userId, type: 'email_verify', ttlMs: HOUR })

    await expect(consumeToken({ token: first, type: 'email_verify' })).resolves.toBeNull()
    await expect(consumeToken({ token: second, type: 'email_verify' })).resolves.not.toBeNull()
  })

  it('keeps different types independent', async () => {
    const verify = await issueToken({ userId, type: 'email_verify', ttlMs: HOUR })
    await issueToken({ userId, type: 'password_reset', ttlMs: HOUR })

    // Issuing a reset token must not clobber a pending verification.
    await expect(consumeToken({ token: verify, type: 'email_verify' })).resolves.not.toBeNull()
  })

  // Two resends racing must still leave one live token, not two.
  it('survives concurrent issuance', async () => {
    const [a, b] = await Promise.all([
      issueToken({ userId, type: 'email_verify', ttlMs: HOUR }),
      issueToken({ userId, type: 'email_verify', ttlMs: HOUR }),
    ])

    await expect(Token.countDocuments({ userId, type: 'email_verify' })).resolves.toBe(1)

    // Exactly one of the two raw tokens survives — whichever write landed last.
    const results = await Promise.all([
      consumeToken({ token: a, type: 'email_verify' }),
      consumeToken({ token: b, type: 'email_verify' }),
    ])
    expect(results.filter(Boolean)).toHaveLength(1)
  })
})
