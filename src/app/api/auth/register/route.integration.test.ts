// src/app/api/auth/register/route.integration.test.ts
//
// Register must answer identically whether or not the address already has an
// account. That is the enumeration fix Step A deferred to Step C
// (md/step-a-security.md, decision 3), and it is a property of the *whole*
// handler — the happy path, the existing-account path, the duplicate-key race
// and the mail-delivery failure all have to agree. Asserting it anywhere
// narrower than the route would miss the paths that actually leak.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

// The route's collaborators, stubbed at the edges: no session (register is
// public), no mail provider, and a connectDB that is a no-op because this file
// owns the mongoose connection itself.
vi.mock('@/server/auth', () => ({ auth: vi.fn().mockResolvedValue(null) }))
vi.mock('@/server/db', () => ({ connectDB: vi.fn() }))

// The Resend SDK is stubbed, not @/server/email/mailer at the module. The
// difference matters: the property under test is that *sendMailSafe* swallows a
// delivery failure, so mocking sendMailSafe itself would assert nothing — it
// would just be the mock's behaviour. Failing at the SDK is the real scenario,
// and the real mailer code then has to handle it.
const emailsSend = vi.hoisted(() => vi.fn())
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: emailsSend }
  },
}))
// guard() would otherwise spend the 3/hour register budget on the fourth test.
vi.mock('@/server/security/rateLimiter', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/server/security/rateLimiter')>()),
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 3 }),
}))

import User from '@/models/User'
import Token from '@/models/Token'
import { POST } from './route'

let mongod: MongoMemoryServer
const sendMock = emailsSend

// What the SDK returns when it accepts a message. Not `undefined` — sendMail
// destructures the result, so a bare undefined would crash the success path.
const SEND_OK = { data: { id: 'test-email-id' }, error: null }

beforeAll(async () => {
  // Set here rather than read from .env.local, which vitest does not load (only
  // next does). The real mailer calls requiredEnv on both before it will build
  // a client or send, so without these every send-path test throws. The key is
  // deliberately fake: the SDK above is mocked, so it authenticates nothing and
  // only has to be non-empty — and pointing the suite at a real secret would
  // break it anywhere .env.local does not exist, CI included.
  process.env.RESEND_API_KEY = 're_test_key'
  process.env.EMAIL_FROM = 'jobs@tracker.test'
  process.env.NEXTAUTH_URL = 'https://tracker.test'

  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
  await Promise.all([User.init(), Token.init()])
}, 60_000)

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

beforeEach(() => {
  sendMock.mockClear()
  sendMock.mockResolvedValue(SEND_OK)
  // sendMailSafe logs the swallowed failure; that is the intended behaviour,
  // so silence it rather than read it.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all([User.deleteMany({}), Token.deleteMany({})])
})

function register(body: Record<string, unknown>) {
  return POST(
    new Request('https://tracker.test/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  )
}

const ADA = { name: 'Ada', email: 'ada@example.com', password: 'hunter2' }

async function snapshot(res: Response) {
  return { status: res.status, body: await res.json() }
}

describe('POST /api/auth/register — enumeration safety', () => {
  it('answers the same for a free address and a taken one', async () => {
    const first = await snapshot(await register(ADA))
    const second = await snapshot(await register({ ...ADA, name: 'Someone Else' }))

    expect(first.status).toBe(201)
    // The whole point: byte-identical. Any divergence here — a 409, a different
    // message, a leaked name — is the oracle reopening.
    expect(second).toEqual(first)
  })

  it('creates exactly one account for a repeated address', async () => {
    await register(ADA)
    await register({ ...ADA, name: 'Someone Else' })

    await expect(User.countDocuments({ email: ADA.email })).resolves.toBe(1)
    // ...and does not overwrite the original owner's name with the impostor's.
    const user = await User.findOne({ email: ADA.email })
    expect(user?.name).toBe('Ada')
  })

  it('never returns the account holder name', async () => {
    await register(ADA)
    const { body } = await snapshot(await register({ ...ADA, name: 'Someone Else' }))

    expect(JSON.stringify(body)).not.toContain('Ada')
  })

  // The path most likely to regress: someone "improves" error handling by
  // letting a delivery failure surface, and the 500/201 split silently becomes
  // an account oracle again for anyone who can make delivery fail.
  it('stays identical when mail delivery fails', async () => {
    await register(ADA)
    sendMock.mockRejectedValue(new Error('resend unreachable'))

    const free = await snapshot(await register({ ...ADA, email: 'grace@example.com' }))
    const taken = await snapshot(await register(ADA))

    expect(taken).toEqual(free)
    expect(free.status).toBe(201)
  })

  // The same property against the failure mode Resend actually uses. The case
  // above rejects the promise; this one *resolves* with an error object, which
  // is what a refused message really looks like (unverified sender, quota,
  // suppressed recipient). If sendMail ever stopped converting that back into a
  // throw, the test above would still pass while every send silently no-oped.
  it('stays identical when Resend refuses the message', async () => {
    await register(ADA)
    sendMock.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'Sender not verified' },
    })

    const free = await snapshot(await register({ ...ADA, email: 'grace@example.com' }))
    const taken = await snapshot(await register(ADA))

    expect(taken).toEqual(free)
    expect(free.status).toBe(201)
  })
})

describe('POST /api/auth/register — behaviour behind the identical response', () => {
  it('issues a verification token for a new account only', async () => {
    await register(ADA)
    await expect(Token.countDocuments({ type: 'email_verify' })).resolves.toBe(1)

    await register({ ...ADA, name: 'Someone Else' })
    // The second attempt must not mint a token for an account it did not create.
    await expect(Token.countDocuments({ type: 'email_verify' })).resolves.toBe(1)
  })

  it('sends the verify email to a new address and the account-exists email to a taken one', async () => {
    await register(ADA)
    expect(sendMock.mock.calls[0][0].subject).toBe('Verify your email')

    sendMock.mockClear()
    await register({ ...ADA, name: 'Someone Else' })
    expect(sendMock.mock.calls[0][0].subject).toBe('You already have a Job Tracker account')
    // Addressed to the real owner, whatever name the second caller supplied.
    expect(sendMock.mock.calls[0][0].to).toBe(ADA.email)
  })

  it('stores a hash, never the submitted password', async () => {
    await register(ADA)
    const user = await User.findOne({ email: ADA.email }).select('+password')

    expect(user?.password).toBeDefined()
    expect(user?.password).not.toBe(ADA.password)
  })
})
