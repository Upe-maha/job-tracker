// tests/unit/server/email/templates.test.ts
//
// Pure functions, so no transport is involved. What matters here is that the
// link points at this app and carries the token intact — a template that drops
// or mangles the token produces an email that cannot possibly work, and nothing
// upstream would notice.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  accountExists,
  passwordChangeConfirm,
  passwordReset,
  verifyEmail,
} from '@/server/email/templates'

const ORIGINAL = process.env.NEXTAUTH_URL
const TOKEN = 'abcdefghijklmnopqrstuvwxyz0123456789_-ABCDE'

beforeEach(() => {
  process.env.NEXTAUTH_URL = 'https://tracker.example.com'
})

afterEach(() => {
  process.env.NEXTAUTH_URL = ORIGINAL
})

const withToken = [
  ['verifyEmail', verifyEmail, '/verify-email'],
  ['passwordReset', passwordReset, '/reset-password'],
  ['passwordChangeConfirm', passwordChangeConfirm, '/confirm-password-change'],
] as const

describe.each(withToken)('%s', (_name, template, path) => {
  it('links to its page on NEXTAUTH_URL, carrying the token', () => {
    const mail = template('Ada', TOKEN)
    const expected = `https://tracker.example.com${path}?token=${TOKEN}`

    expect(mail.html).toContain(expected)
    expect(mail.text).toContain(expected)
  })

  it('never points at another flow', () => {
    const mail = template('Ada', TOKEN)
    for (const other of withToken.map(([, , p]) => p).filter((p) => p !== path)) {
      expect(mail.html).not.toContain(other)
    }
  })

  it('has a subject and both bodies', () => {
    const mail = template('Ada', TOKEN)
    expect(mail.subject.length).toBeGreaterThan(0)
    expect(mail.html.length).toBeGreaterThan(0)
    expect(mail.text.length).toBeGreaterThan(0)
  })

  it('addresses the recipient by name', () => {
    expect(template('Ada', TOKEN).text).toContain('Ada')
  })

  // A trailing slash on the env var must not produce a double slash, which
  // some mail clients silently refuse to linkify.
  it('tolerates a trailing slash on NEXTAUTH_URL', () => {
    process.env.NEXTAUTH_URL = 'https://tracker.example.com/'
    expect(template('Ada', TOKEN).html).toContain(`https://tracker.example.com${path}?token=`)
  })
})

describe('accountExists', () => {
  // Sent to an address that already has an account, triggered by *anyone* who
  // types it into the register form. The recipient may not be the person who
  // triggered it, so it must not carry anything that acts on the account.
  it('carries no token', () => {
    const mail = accountExists('Ada')
    expect(mail.html).not.toContain('token=')
    expect(mail.text).not.toContain('token=')
  })

  it('points only at the sign-in page', () => {
    const mail = accountExists('Ada')
    expect(mail.text).toContain('https://tracker.example.com/login')
    expect(mail.html).not.toContain('/reset-password')
    expect(mail.html).not.toContain('/verify-email')
  })
})
