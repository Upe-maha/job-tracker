// tests/unit/shared/schemas/common.test.ts
import { describe, expect, it } from 'vitest'
import {
  cloudinaryUrl,
  currency,
  email,
  httpsUrl,
  imageUrl,
  isCloudinaryUrl,
  nullableDate,
  nullableNumber,
  password,
  safeUrl,
  text,
} from '@/shared/schemas/common'

describe('text', () => {
  const name = text('Name', { min: 1, max: 5 })

  // The hand-rolled routes measured emptiness trimmed but the cap untrimmed,
  // which disagreed at both ends. Trim runs first here.
  it('trims before both the min and the max check', () => {
    expect(name.parse('  ab  ')).toBe('ab')
    expect(name.parse('abcde  ')).toBe('abcde')
    expect(name.safeParse('   ').success).toBe(false)
  })

  it('rejects over-length and non-string values', () => {
    expect(name.safeParse('abcdef').success).toBe(false)
    expect(name.safeParse(42).success).toBe(false)
  })

  it('allows empty when min is 0', () => {
    expect(text('Bio', { max: 10 }).parse('')).toBe('')
  })

  it('reports the field label in its message', () => {
    const result = name.safeParse('')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0].message).toBe('Name is required')
  })
})

describe('url fields', () => {
  it('safeUrl accepts http(s) and empty, rejects javascript:', () => {
    expect(safeUrl('Job URL').parse('http://a.com')).toBe('http://a.com')
    expect(safeUrl('Job URL').parse('')).toBe('')
    expect(safeUrl('Job URL').safeParse('javascript:alert(1)').success).toBe(false)
  })

  it('httpsUrl rejects http', () => {
    expect(httpsUrl('Logo').safeParse('http://a.com').success).toBe(false)
    expect(httpsUrl('Logo').parse('https://a.com')).toBe('https://a.com')
  })

  it('imageUrl enforces the host allowlist', () => {
    expect(imageUrl('Photo').parse('https://res.cloudinary.com/x.jpg')).toBeTruthy()
    expect(imageUrl('Photo').safeParse('https://evil.test/x.jpg').success).toBe(false)
  })
})

describe('isCloudinaryUrl', () => {
  it('accepts a Cloudinary https URL and empty string', () => {
    expect(isCloudinaryUrl('https://res.cloudinary.com/demo/a.pdf')).toBe(true)
    expect(isCloudinaryUrl('')).toBe(true)
  })

  it('rejects other hosts, http, and non-strings', () => {
    expect(isCloudinaryUrl('https://evil.test/a.pdf')).toBe(false)
    expect(isCloudinaryUrl('http://res.cloudinary.com/a.pdf')).toBe(false)
    expect(isCloudinaryUrl(null)).toBe(false)
  })

  // This is the cap the two hand-rolled route copies silently dropped.
  it('inherits the 2048-character cap', () => {
    expect(isCloudinaryUrl(`https://res.cloudinary.com/${'a'.repeat(2048)}`)).toBe(false)
  })

  it('powers cloudinaryUrl()', () => {
    expect(cloudinaryUrl('Resume').safeParse('https://other.test/a.pdf').success).toBe(false)
  })
})

describe('email', () => {
  it('trims and lowercases', () => {
    expect(email('bad').parse('  A@B.CO ')).toBe('a@b.co')
  })

  it('allows empty by default but not when allowEmpty is false', () => {
    expect(email('bad').parse('')).toBe('')
    expect(email('bad', { allowEmpty: false }).safeParse('').success).toBe(false)
  })

  it('rejects malformed addresses', () => {
    expect(email('bad').safeParse('not-an-email').success).toBe(false)
  })
})

describe('password', () => {
  it('shares its bounds with validatePassword', () => {
    expect(password.safeParse('abcde').success).toBe(false)
    expect(password.parse('abcdef')).toBe('abcdef')
    expect(password.safeParse('a'.repeat(129)).success).toBe(false)
  })

  // Deliberately no charset rules.
  it('accepts a long passphrase with no special characters', () => {
    expect(password.parse('correct horse battery staple')).toBeTruthy()
  })
})

describe('currency', () => {
  it('requires exactly three uppercase letters', () => {
    expect(currency('Currency').parse('USD')).toBe('USD')
    expect(currency('Currency').safeParse('usd').success).toBe(false)
    expect(currency('Currency').safeParse('US').success).toBe(false)
  })
})

describe('nullableNumber', () => {
  const n = nullableNumber('Salary')

  // One schema serves both layers: an HTML number input hands back '50000',
  // an API client hands back 50000.
  it('coerces a numeric string', () => {
    expect(n.parse('50000')).toBe(50000)
    expect(n.parse(50000)).toBe(50000)
  })

  it('treats empty string and null as cleared', () => {
    expect(n.parse('')).toBeNull()
    expect(n.parse(null)).toBeNull()
  })

  // The old routes turned this into a silent null; it must be a rejection.
  it('rejects a non-numeric string rather than nulling it', () => {
    expect(n.safeParse('abc').success).toBe(false)
  })
})

describe('nullableDate', () => {
  const d = nullableDate('Deadline')

  it('coerces an ISO string to a Date', () => {
    expect(d.parse('2026-01-01')).toBeInstanceOf(Date)
  })

  it('treats empty string and null as cleared', () => {
    expect(d.parse('')).toBeNull()
    expect(d.parse(null)).toBeNull()
  })

  // This is the 500-instead-of-400 bug: `new Date('nonsense')` produced an
  // Invalid Date that only failed later as a Mongoose CastError.
  it('rejects an unparseable date rather than producing Invalid Date', () => {
    expect(d.safeParse('nonsense').success).toBe(false)
  })
})
