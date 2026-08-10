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

// Validate password strength
export function validatePassword(password: unknown): {
  valid: boolean
  message?: string
} {
  if (typeof password !== 'string') {
    return { valid: false, message: 'Password is required' }
  }
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' }
  }
  if (password.length > 128) {
    return { valid: false, message: 'Password too long' }
  }
  return { valid: true }
}

// Sanitize a string for safe display (prevent XSS)
// Unused by design — React already escapes on render; entity-encoding at the
// storage layer just puts "&amp;#x27;" in the database. Kept for callers that
// render into a non-React sink (e.g. an email template) in a later step.
export function sanitizeString(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim()
}
