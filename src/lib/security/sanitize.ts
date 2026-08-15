// src/lib/security/sanitize.ts

const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

// Strips MongoDB operator keys and dotted-path keys from objects.
// Prevents NoSQL injection attacks like { $gt: "" } and prototype pollution.
// Only object/array KEYS are touched — string content passes through untouched,
// since the threat model is keys, never string content (a job description
// containing "$gte" is legitimate text, not an operator).
export function sanitizeInput<T>(input: T, depth = 0): T {
  if (depth > 12) return null as T // cap pathological nesting

  if (input === null || typeof input !== 'object') return input
  if (input instanceof Date) return input

  if (Array.isArray(input)) {
    return input.map(v => sanitizeInput(v, depth + 1)) as T
  }

  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (key.startsWith('$')) continue // Mongo operators
    if (key.includes('.')) continue // dotted-path writes, e.g. "user.role"
    if (BLOCKED_KEYS.has(key)) continue // prototype pollution
    out[key] = sanitizeInput(value, depth + 1)
  }
  return out as T
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

const MAX_URL_LENGTH = 2048

// Absolute-URL check for any value that ends up in an `<a href>` or an
// `<img src>`. The point is the protocol allowlist: it rejects `javascript:`
// (which really does execute from an href), plus `data:`, `file:` and anything
// unparseable. Empty string passes so a field can be cleared.
//
// httpsOnly is for values rendered as images — a bare http: image on an https:
// page is blocked as mixed content anyway, so allowing it only yields a broken
// icon. Plain links keep http:, matching the prep-files rule, since the client
// accepts a bare http:// URL as typed.
export function isSafeUrl(value: unknown, { httpsOnly = false } = {}): boolean {
  if (typeof value !== 'string') return false
  if (value === '') return true
  if (value.length > MAX_URL_LENGTH) return false

  try {
    const { protocol } = new URL(value)
    return httpsOnly ? protocol === 'https:' : protocol === 'https:' || protocol === 'http:'
  } catch {
    return false
  }
}

// Hosts allowed to serve a user's avatar. Cloudinary is our own upload
// pipeline; the other two are the OAuth providers' avatar CDNs, which is the
// only reason they're here — a Google/GitHub sign-in hands back an avatar on
// its own domain, and Step B stores that URL as-is rather than mirroring every
// new user's picture into Cloudinary.
const ALLOWED_IMAGE_HOSTS = new Set([
  'res.cloudinary.com',
  'lh3.googleusercontent.com',
  'avatars.githubusercontent.com',
])

// For values rendered into an <img src> that must come from a host we trust,
// not merely from a safe protocol. Empty string passes so a photo can be
// cleared.
export function isAllowedImageUrl(value: unknown): boolean {
  if (!isSafeUrl(value, { httpsOnly: true })) return false
  if (value === '') return true

  try {
    return ALLOWED_IMAGE_HOSTS.has(new URL(value as string).hostname)
  } catch {
    return false
  }
}

// Exported so the Zod password field in @/lib/schemas/common builds the same
// bounds from one place instead of re-hardcoding 6 and 128.
export const PASSWORD_MIN_LENGTH = 6
export const PASSWORD_MAX_LENGTH = 128

export const PASSWORD_MESSAGES = {
  required: 'Password is required',
  tooShort: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
  tooLong: 'Password too long',
} as const

// Validate password strength
export function validatePassword(password: unknown): {
  valid: boolean
  message?: string
} {
  if (typeof password !== 'string') {
    return { valid: false, message: PASSWORD_MESSAGES.required }
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, message: PASSWORD_MESSAGES.tooShort }
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return { valid: false, message: PASSWORD_MESSAGES.tooLong }
  }
  return { valid: true }
}

