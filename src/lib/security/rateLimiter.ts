// src/lib/security/rateLimiter.ts
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import RateLimit from '@/models/RateLimit'

interface RateLimitConfig {
  maxAttempts: number
  windowMs: number // in milliseconds
  message: string
}

export const RATE_LIMITS = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many login attempts. Please try again in 15 minutes.',
  },
  register: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many registration attempts. Please try again in 1 hour.',
  },
  reset: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many reset attempts. Please try again in 1 hour.',
  },
  api: {
    maxAttempts: 100,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many requests. Please slow down.',
  },
} satisfies Record<string, RateLimitConfig>

export type RateLimitType = keyof typeof RATE_LIMITS

// `req` is the base Request (not NextRequest) because NextAuth's authorize()
// callback receives a plain Request, and this is called from there too.
export function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const real = req.headers.get('x-real-ip')

  if (forwarded) return forwarded.split(',')[0].trim()
  if (real) return real.trim()
  return '127.0.0.1'
}

interface RateLimitResult {
  allowed: boolean
  message?: string
  retryAfter?: number
  remaining: number
}

export async function checkRateLimit(
  identifier: string, // IP or user id + route key
  type: RateLimitType
): Promise<RateLimitResult> {
  const cfg = RATE_LIMITS[type]
  const key = `${type}:${identifier}`
  const now = new Date()
  const nextExpiry = new Date(now.getTime() + cfg.windowMs)

  await connectDB()

  // Roll an expired window forward, atomically. No-op if the window is still live.
  await RateLimit.updateOne(
    { key, expiresAt: { $lte: now } },
    { $set: { count: 0, expiresAt: nextExpiry } }
  )

  // Increment; create the doc if this is the first hit ever for this key.
  let doc
  try {
    doc = await RateLimit.findOneAndUpdate(
      { key },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: nextExpiry } },
      { upsert: true, new: true }
    )
  } catch (err: unknown) {
    // Two concurrent upserts on a unique index can both attempt an insert;
    // one gets a duplicate-key error. Retry once — the doc now exists.
    if ((err as { code?: number }).code === 11000) {
      doc = await RateLimit.findOneAndUpdate(
        { key },
        { $inc: { count: 1 }, $setOnInsert: { expiresAt: nextExpiry } },
        { upsert: true, new: true }
      )
    } else {
      throw err
    }
  }

  const remaining = Math.max(0, cfg.maxAttempts - doc.count)

  if (doc.count > cfg.maxAttempts) {
    return {
      allowed: false,
      message: cfg.message,
      retryAfter: Math.max(1, Math.ceil((doc.expiresAt.getTime() - now.getTime()) / 1000)),
      remaining: 0,
    }
  }

  return { allowed: true, remaining }
}

// Called on successful login so a legitimate user isn't penalised for earlier typos.
export async function clearRateLimit(identifier: string, type: RateLimitType): Promise<void> {
  await connectDB()
  await RateLimit.deleteOne({ key: `${type}:${identifier}` })
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
