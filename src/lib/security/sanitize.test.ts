// src/lib/security/sanitize.test.ts
import { describe, expect, it } from 'vitest'
import {
  isAllowedImageUrl,
  isSafeUrl,
  isValidEmail,
  sanitizeInput,
  validatePassword,
} from './sanitize'

describe('sanitizeInput', () => {
  it('strips Mongo operator keys at any depth', () => {
    expect(sanitizeInput({ email: 'a@b.co', $gt: '' })).toEqual({ email: 'a@b.co' })
    expect(sanitizeInput({ filter: { $ne: null, ok: 1 } })).toEqual({ filter: { ok: 1 } })
  })

  it('strips dotted-path keys and prototype-pollution keys', () => {
    expect(sanitizeInput({ 'user.role': 'admin', name: 'x' })).toEqual({ name: 'x' })
    expect(sanitizeInput({ __proto__: { admin: true }, name: 'x' })).toEqual({ name: 'x' })
    expect(sanitizeInput({ constructor: 1, prototype: 2, name: 'x' })).toEqual({ name: 'x' })
  })

  // The threat model is keys, never string content — a job description
  // containing "$gte" is legitimate text.
  it('leaves string content untouched', () => {
    const text = 'salary $gte 100k, see foo.bar & <b>bold</b>'
    expect(sanitizeInput({ jobDescription: text })).toEqual({ jobDescription: text })
  })

  it('recurses through arrays', () => {
    expect(sanitizeInput({ tags: [{ $gt: 1, keep: 2 }] })).toEqual({ tags: [{ keep: 2 }] })
  })

  it('passes primitives, null and Date through unchanged', () => {
    const d = new Date('2020-01-01')
    expect(sanitizeInput('str')).toBe('str')
    expect(sanitizeInput(42)).toBe(42)
    expect(sanitizeInput(null)).toBeNull()
    expect(sanitizeInput(d)).toBe(d)
  })

  it('caps pathological nesting', () => {
    let deep: Record<string, unknown> = { end: true }
    for (let i = 0; i < 20; i++) deep = { nest: deep }
    expect(JSON.stringify(sanitizeInput(deep))).toContain('null')
  })
})

describe('isValidEmail', () => {
  it.each(['a@b.co', 'first.last@sub.domain.org'])('accepts %s', email => {
    expect(isValidEmail(email)).toBe(true)
  })

  it.each(['', 'no-at-sign', 'a@b', 'a b@c.co', 'a@ b.co'])('rejects %s', email => {
    expect(isValidEmail(email)).toBe(false)
  })

  it('rejects addresses over 254 characters', () => {
    expect(isValidEmail(`${'a'.repeat(250)}@b.co`)).toBe(false)
  })
})

describe('isSafeUrl', () => {
  it('accepts http and https absolute URLs', () => {
    expect(isSafeUrl('https://example.com/a')).toBe(true)
    expect(isSafeUrl('http://example.com')).toBe(true)
  })

  // The whole point of the helper: javascript: really does execute from an href.
  it.each(['javascript:alert(1)', 'data:text/html,<script>', 'file:///etc/passwd'])(
    'rejects %s',
    url => {
      expect(isSafeUrl(url)).toBe(false)
    },
  )

  it('rejects relative URLs and non-strings', () => {
    expect(isSafeUrl('/relative/path')).toBe(false)
    expect(isSafeUrl('example.com')).toBe(false)
    expect(isSafeUrl(null)).toBe(false)
    expect(isSafeUrl(42)).toBe(false)
  })

  it('accepts empty string so a field can be cleared', () => {
    expect(isSafeUrl('')).toBe(true)
  })

  it('enforces the 2048-character cap', () => {
    expect(isSafeUrl(`https://e.com/${'a'.repeat(2048)}`)).toBe(false)
  })

  it('rejects http when httpsOnly is set', () => {
    expect(isSafeUrl('http://example.com', { httpsOnly: true })).toBe(false)
    expect(isSafeUrl('https://example.com', { httpsOnly: true })).toBe(true)
  })
})

describe('isAllowedImageUrl', () => {
  it.each([
    'https://res.cloudinary.com/demo/image/upload/a.jpg',
    'https://lh3.googleusercontent.com/a/abc',
    'https://avatars.githubusercontent.com/u/1',
  ])('accepts the allowlisted host %s', url => {
    expect(isAllowedImageUrl(url)).toBe(true)
  })

  it('rejects an https URL on any other host', () => {
    expect(isAllowedImageUrl('https://evil.example.com/a.jpg')).toBe(false)
  })

  // Guards against a hostname-suffix match rather than an equality check.
  it('rejects a lookalike host', () => {
    expect(isAllowedImageUrl('https://res.cloudinary.com.evil.test/a.jpg')).toBe(false)
  })

  it('rejects http even on an allowlisted host', () => {
    expect(isAllowedImageUrl('http://res.cloudinary.com/a.jpg')).toBe(false)
  })

  it('accepts empty string so a photo can be cleared', () => {
    expect(isAllowedImageUrl('')).toBe(true)
  })
})

describe('validatePassword', () => {
  it('accepts a password within bounds, with no charset rules', () => {
    expect(validatePassword('abcdef')).toEqual({ valid: true })
    expect(validatePassword('a'.repeat(128))).toEqual({ valid: true })
  })

  it('rejects short, long and non-string values', () => {
    expect(validatePassword('abcde').valid).toBe(false)
    expect(validatePassword('a'.repeat(129)).valid).toBe(false)
    expect(validatePassword(undefined).valid).toBe(false)
    expect(validatePassword(123456).valid).toBe(false)
  })
})
