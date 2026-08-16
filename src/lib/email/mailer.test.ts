// src/lib/email/mailer.test.ts
//
// The transport's contract, pinned directly rather than by implication.
//
// The Resend SDK *resolves* `{ data: null, error }` for anything the API
// refuses and only rejects on a transport-level failure. Every security
// property downstream — resend-verification refunding a budget that bounds
// outbound mail, register staying enumeration-safe when delivery breaks —
// assumes sendMail turns that resolved error back into a throw. The route
// integration tests exercise it, but through two handlers and a live mongod;
// this file states the rule in one place, and gives a future transport swap a
// spec to satisfy without booting a route.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const emailsSend = vi.hoisted(() => vi.fn())
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: emailsSend }
  },
}))

const MAIL = {
  to: 'ada@example.com',
  subject: 'Verify your email',
  html: '<p>hello</p>',
  text: 'hello',
}

const OK = { data: { id: 'test-email-id' }, error: null }

// The client is memoized in a module-level `let`, so every case re-imports the
// module. Without this a case that ran earlier would leave a client built from
// a key that a later case is trying to prove is missing.
async function loadMailer() {
  vi.resetModules()
  return import('./mailer')
}

beforeEach(() => {
  emailsSend.mockReset()
  emailsSend.mockResolvedValue(OK)
  process.env.RESEND_API_KEY = 're_test_key'
  process.env.EMAIL_FROM = 'jobs@tracker.test'
  // sendMailSafe logs what it swallows; that is the intended behaviour, so
  // silence it rather than read it.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('sendMail', () => {
  it('resolves when the API accepts the message', async () => {
    const { sendMail } = await loadMailer()

    await expect(sendMail(MAIL)).resolves.toBeUndefined()
    expect(emailsSend).toHaveBeenCalledOnce()
  })

  // The regression this whole file exists for. A rejected promise is the easy
  // case; `{ error }` on a *resolved* promise is what Resend actually returns,
  // and it is the one an implementation can silently ignore.
  it('throws when the API refuses the message without rejecting', async () => {
    emailsSend.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'Sender not verified' },
    })
    const { sendMail } = await loadMailer()

    // The message carries both halves so the server log says which of the many
    // ways Resend can refuse actually happened.
    await expect(sendMail(MAIL)).rejects.toThrow(/validation_error/)
    await expect(sendMail(MAIL)).rejects.toThrow(/Sender not verified/)
  })

  it('throws when the request never reaches the API', async () => {
    emailsSend.mockRejectedValue(new Error('fetch failed'))
    const { sendMail } = await loadMailer()

    await expect(sendMail(MAIL)).rejects.toThrow('fetch failed')
  })

  it('sends exactly the fields the templates produce, plus the configured sender', async () => {
    const { sendMail } = await loadMailer()
    await sendMail(MAIL)

    // Pinned because templates.ts returns { subject, html, text } and every
    // call site spreads it next to `to`. A payload that quietly grew or lost a
    // field would still typecheck against the SDK's RequireAtLeastOne options.
    expect(emailsSend.mock.calls[0][0]).toEqual({
      from: 'jobs@tracker.test',
      ...MAIL,
    })
  })

  describe('missing configuration', () => {
    it('throws for a missing RESEND_API_KEY, before attempting a send', async () => {
      delete process.env.RESEND_API_KEY
      const { sendMail } = await loadMailer()

      await expect(sendMail(MAIL)).rejects.toThrow('Missing RESEND_API_KEY. Email cannot be sent.')
      expect(emailsSend).not.toHaveBeenCalled()
    })

    it('throws for a missing EMAIL_FROM, before attempting a send', async () => {
      delete process.env.EMAIL_FROM
      const { sendMail } = await loadMailer()

      await expect(sendMail(MAIL)).rejects.toThrow('Missing EMAIL_FROM. Email cannot be sent.')
      expect(emailsSend).not.toHaveBeenCalled()
    })
  })
})

describe('sendMailSafe', () => {
  // Register and forgot-password answer identically whether or not the account
  // exists, and that holds only if sendMailSafe never throws — whatever the
  // cause. Each failure mode is asserted separately because they arrive by
  // genuinely different routes: a resolved error object, a rejected promise,
  // and a throw raised before the SDK is ever called.
  it('swallows an API refusal', async () => {
    emailsSend.mockResolvedValue({ data: null, error: { name: 'application_error', message: 'nope' } })
    const { sendMailSafe } = await loadMailer()

    await expect(sendMailSafe(MAIL)).resolves.toBeUndefined()
    expect(console.error).toHaveBeenCalled()
  })

  it('swallows a transport failure', async () => {
    emailsSend.mockRejectedValue(new Error('fetch failed'))
    const { sendMailSafe } = await loadMailer()

    await expect(sendMailSafe(MAIL)).resolves.toBeUndefined()
    expect(console.error).toHaveBeenCalled()
  })

  it('swallows a configuration failure', async () => {
    delete process.env.RESEND_API_KEY
    const { sendMailSafe } = await loadMailer()

    await expect(sendMailSafe(MAIL)).resolves.toBeUndefined()
    expect(console.error).toHaveBeenCalled()
  })
})
