// src/lib/security/rateLimiter.ts
import { NextRequest, NextResponse } from 'next/server'

// In-memory store for rate limiting
// For production with multiple servers use Redis instead
const store = new Map<string, { count: number; resetAt: number }>()

interface RateLimitConfig {
  maxAttempts: number
  windowMs: number    // in milliseconds
  message: string
}

const configs: Record<string, RateLimitConfig> = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,  // 15 minutes
    message: 'Too many login attempts. Please try again in 15 minutes.',
  },
  register: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000,  // 1 hour
    message: 'Too many registration attempts. Please try again in 1 hour.',
  },
  reset: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000,  // 1 hour
    message: 'Too many reset attempts. Please try again in 1 hour.',
  },
  api: {
    maxAttempts: 100,
    windowMs: 60 * 1000,        // 1 minute
    message: 'Too many requests. Please slow down.',
  },
}

export function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const real = req.headers.get('x-real-ip')

  if (forwarded) return forwarded.split(',')[0].trim()
  if (real) return real.trim()
  return '127.0.0.1'
}

export function rateLimit(
  identifier: string,  // IP + route key
  type: keyof typeof configs
): { allowed: boolean; message?: string; retryAfter?: number } {
  const config = configs[type]
  const now = Date.now()
  const key = `${type}:${identifier}`

  const record = store.get(key)

  // No record yet or window expired — start fresh
  if (!record || now > record.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs })
    return { allowed: true }
  }

  // Increment count 
  record.count += 1
  store.set(key, record)

  if (record.count > config.maxAttempts) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000)
    return {
      allowed: false,
      message: config.message,
      retryAfter,
    }
  }

  return { allowed: true }
}

export function rateLimitResponse(message: string, retryAfter: number) {
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Reset': String(Date.now() + retryAfter * 1000),
      },
    }
  )
}

// Clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    store.forEach((value, key) => {
      if (now > value.resetAt) store.delete(key)
    })
  }, 5 * 60 * 1000)
}