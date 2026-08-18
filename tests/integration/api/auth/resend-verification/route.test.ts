// tests/integration/api/auth/resend-verification/route.test.ts
//
// The 'reset' budget bounds *outbound mail*, so the thing worth pinning is that
// it is only spent when mail actually leaves. Both branches that send nothing —
// an already-verified address, and a mail provider that refuses — have to hand
// the attempt back, or a misconfigured sender silently rate-limits a user out
// of the one feature that would fix their account.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

const SESSION_USER_ID = new mongoose.Types.ObjectId()

vi.mock('@/server/auth', () => ({
  auth: vi.fn(async () => ({ user: { id: SESSION_USER_ID.toString() } })),
}))
vi.mock('@/server/db', () => ({ connectDB: vi.fn() }))

// Failing the SDK rather than stubbing sendMail, so the route's real error path
// runs — that is the behaviour under test.
const emailsSend = vi.hoisted(() => vi.fn())
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: emailsSend }
  },
}))

import User from '@/models/User'
import Token from '@/models/Token'
import RateLimit from '@/models/RateLimit'
import { RATE_LIMITS } from '@/server/security/rateLimiter'
import { POST } from '@/app/api/auth/resend-verification/route'

let mongod: MongoMemoryServer

const BUCKET = `reset:/api/auth/resend-verification:user:${SESSION_USER_ID.toString()}`

// What the SDK returns when it accepts a message. Not `undefined` — sendMail
// destructures the result, so a bare undefined would crash the success path.
const SEND_OK = { data: { id: 'test-email-id' }, error: null }

beforeAll(async () => {
  // Set here rather than read from .env.local, which vitest does not load. The
  // key is fake on purpose: the SDK above is mocked, so it authenticates
  // nothing and only has to be non-empty to clear the mailer's requiredEnv.
  process.env.RESEND_API_KEY = 're_test_key'
  process.env.EMAIL_FROM = 'jobs@tracker.test'
  process.env.NEXTAUTH_URL = 'https://tracker.test'

  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
  await Promise.all([User.init(), Token.init(), RateLimit.init()])
}, 60_000)

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

beforeEach(async () => {
  emailsSend.mockReset()
  emailsSend.mockResolvedValue(SEND_OK)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  await User.create({
    _id: SESSION_USER_ID,
    name: 'Ada',
    email: 'ada@example.com',
    password: 'irrelevant',
  })
})

afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all([User.deleteMany({}), Token.deleteMany({}), RateLimit.deleteMany({})])
})

const resend = () =>
  POST(new Request('https://tracker.test/api/auth/resend-verification', { method: 'POST' }))

async function charged(): Promise<number> {
  const doc = await RateLimit.findOne({ key: BUCKET })
  return doc?.count ?? 0
}

describe('POST /api/auth/resend-verification — what the budget pays for', () => {
  it('charges one attempt when an email is actually sent', async () => {
    const res = await resend()

    expect(res.status).toBe(200)
    expect(emailsSend).toHaveBeenCalledOnce()
    await expect(charged()).resolves.toBe(1)
  })

  // The exact bug: mail unconfigured, every click 500s, and the hourly
  // allowance drains anyway. Eleven attempts were burned this way on nothing.
  it('refunds when the mail provider refuses, so a 500 costs nothing', async () => {
    emailsSend.mockRejectedValue(new Error('Missing RESEND_API_KEY. Email cannot be sent.'))

    const res = await resend()

    expect(res.status).toBe(500)
    await expect(charged()).resolves.toBe(0)
  })

  // The same refund, against the failure mode Resend actually uses. The case
  // above rejects; this one *resolves* with an error object, which is what a
  // refused message really looks like — an unverified sender is exactly how
  // this fails in development. If sendMail ever stopped converting that into a
  // throw, this route would answer 200 and charge the budget for mail that
  // never left, and the test above would not notice.
  it('refunds when Resend resolves an error instead of rejecting', async () => {
    emailsSend.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'Sender not verified' },
    })

    const res = await resend()

    expect(res.status).toBe(500)
    await expect(charged()).resolves.toBe(0)
  })

  it('stays at zero across repeated failures rather than creeping up', async () => {
    emailsSend.mockRejectedValue(new Error('resend unreachable'))

    for (let i = 0; i < RATE_LIMITS.reset.maxAttempts + 3; i++) await resend()

    // Every one of these 500s must be free, or the user is locked out of the
    // feature by the outage itself and cannot retry once it is fixed.
    await expect(charged()).resolves.toBe(0)
  })

  it('refunds for an already-verified address, which sends nothing', async () => {
    await User.updateOne({ _id: SESSION_USER_ID }, { $set: { emailVerified: new Date() } })

    const res = await resend()

    expect(res.status).toBe(200)
    expect(emailsSend).not.toHaveBeenCalled()
    await expect(charged()).resolves.toBe(0)
  })

  it('does not leave a token behind when it refunds a verified address', async () => {
    await User.updateOne({ _id: SESSION_USER_ID }, { $set: { emailVerified: new Date() } })

    await resend()

    await expect(Token.countDocuments({})).resolves.toBe(0)
  })

  // A refund must give back one attempt, never wipe the window — otherwise a
  // caller could clear their own rate limit on demand through the no-op path.
  it('never lets a refund drop the counter below zero', async () => {
    await resend() // charged: 1
    await User.updateOne({ _id: SESSION_USER_ID }, { $set: { emailVerified: new Date() } })
    await resend() // refunded: back to 1, not 0
    await resend()

    await expect(charged()).resolves.toBe(1)
  })
})
