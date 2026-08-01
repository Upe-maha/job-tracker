// src/lib/security/sanitize.ts

// Strips MongoDB operators from user input
// Prevents NoSQL injection attacks like { $gt: "" }
export function sanitizeInput(input: unknown): unknown {
  if (typeof input === 'string') {
    // Remove MongoDB operator patterns
    return input
      .replace(/\$where/gi, '')
      .replace(/\$gt/gi, '')
      .replace(/\$lt/gi, '')
      .replace(/\$gte/gi, '')
      .replace(/\$lte/gi, '')
      .replace(/\$ne/gi, '')
      .replace(/\$in/gi, '')
      .replace(/\$nin/gi, '')
      .replace(/\$or/gi, '')
      .replace(/\$and/gi, '')
      .replace(/\$not/gi, '')
      .replace(/\$nor/gi, '')
      .replace(/\$exists/gi, '')
      .replace(/\$regex/gi, '')
      .trim()
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeInput)
  }

  if (input !== null && typeof input === 'object') {
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      // Block keys that start with $ (MongoDB operators)
      if (!key.startsWith('$')) {
        sanitized[key] = sanitizeInput(value)
      }
    }
    return sanitized
  }

  return input
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

// Validate password strength
export function validatePassword(password: string): {
  valid: boolean
  message?: string
} {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' }
  }
  if (password.length > 128) {
    return { valid: false, message: 'Password too long' }
  }
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one uppercase letter',
    }
  }
  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one number',
    }
  }
  return { valid: true }
}

// Sanitize a string for safe display (prevent XSS)
export function sanitizeString(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim()
}