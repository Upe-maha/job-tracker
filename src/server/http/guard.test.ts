// src/server/http/guard.test.ts
//
// guard() is where the rate-limit tiers are actually enforced, so this file
// tests the branch rather than the configuration. The failure modes it covers
// are asymmetric and both bad: failing open on an auth or upload budget drops
// the protection at the one moment it's needed, and failing closed on a read
// budget takes the whole dashboard down with the database.
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

// The real rate limiter imports @/server/db, which throws at import time unless
// MONGODB_URI is set. Nothing here reaches Mongo — checkRateLimit is stubbed
// below — so a no-op stand-in is what keeps this loadable in the DB-free suite.
vi.mock('@/server/db', () => ({ connectDB: vi.fn() }))

// Mocking @/server/auth also keeps NextAuth and the Mongoose models out of the
// import graph entirely.
vi.mock('@/server/auth', () => ({ auth: vi.fn() }))

// Only checkRateLimit is replaced. RATE_LIMITS, rateLimitResponse and
// getClientIP stay real, so every assertion below runs against the same table
// production reads — a preset added later is covered the day it's added.
vi.mock('@/server/security/rateLimiter', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/server/security/rateLimiter')>()),
  checkRateLimit: vi.fn(),
  refundRateLimit: vi.fn(),
}))

import { auth } from '@/server/auth'
import {
  RATE_LIMITS,
  checkRateLimit,
  refundRateLimit,
  type RateLimitType,
} from '@/server/security/rateLimiter'
import { guard } from './guard'

const authMock = auth as unknown as Mock
const checkMock = checkRateLimit as unknown as Mock
const refundMock = refundRateLimit as unknown as Mock

const SESSION = { user: { id: 'user-1' } }
const TIERS = Object.keys(RATE_LIMITS) as RateLimitType[]

function req(
  init: { method?: string; headers?: Record<string, string>; path?: string } = {}
) {
  return new Request(`https://tracker.test${init.path ?? '/api/applications'}`, {
    method: init.method ?? 'GET',
    headers: init.headers,
  })
}

beforeEach(() => {
  authMock.mockResolvedValue(SESSION)
  checkMock.mockResolvedValue({ allowed: true, remaining: 10 })
  // guard() logs on every limiter failure; the fail-open cases below are
  // supposed to produce those lines, so silence them rather than read them.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('guard — limiter unavailable', () => {
  // The point of the table drive: if guard ignored failOpen and always failed
  // closed, 'read' breaks here; if it always failed open, 'login' and 'upload'
  // break. Only reading the flag passes both.
  it.each(TIERS)('%s honours its failOpen flag when the limiter throws', async (tier) => {
    checkMock.mockRejectedValue(new Error('mongo unreachable'))

    const g = await guard(req(), { rateLimit: tier })

    if (RATE_LIMITS[tier].failOpen) {
      expect(g.ok).toBe(true)
    } else {
      expect(g.ok).toBe(false)
      if (!g.ok) expect(g.response.status).toBe(503)
    }
  })

  // Guards the guard: if every preset ever landed on the same flag the test
  // above would still pass while asserting nothing about the branch.
  it('covers both flag values, so the table drive is a real partition', () => {
    const flags = TIERS.map((t) => RATE_LIMITS[t].failOpen)
    expect(flags).toContain(true)
    expect(flags).toContain(false)
  })

  // Called out separately from the loop because it is the one non-auth budget
  // that fails closed, and the reasoning is not obvious from the tier name:
  // /api/upload never touches Mongo, so with failOpen it would be the only
  // route still working during an outage — unmetered, still billing Cloudinary.
  it('refuses uploads rather than letting them through unmetered', async () => {
    checkMock.mockRejectedValue(new Error('mongo unreachable'))

    const g = await guard(req({ method: 'POST' }), { rateLimit: 'upload' })

    expect(g.ok).toBe(false)
    if (!g.ok) expect(g.response.status).toBe(503)
  })
})

describe('guard — limit exceeded', () => {
  it('answers 429 with Retry-After', async () => {
    checkMock.mockResolvedValue({
      allowed: false,
      message: 'Too many uploads. Please try again in a few minutes.',
      retryAfter: 420,
      remaining: 0,
    })

    const g = await guard(req(), { rateLimit: 'upload' })

    expect(g.ok).toBe(false)
    if (g.ok) return
    expect(g.response.status).toBe(429)
    expect(g.response.headers.get('Retry-After')).toBe('420')
    await expect(g.response.json()).resolves.toEqual({
      error: 'Too many uploads. Please try again in a few minutes.',
    })
  })
})

describe('guard — ordering', () => {
  // A rejection that still burned budget would let an unauthenticated caller
  // exhaust a logged-in user's bucket, so both short-circuits must land before
  // the limiter rather than merely before the handler.
  it('rejects cross-origin writes without spending budget', async () => {
    const g = await guard(
      req({ method: 'POST', headers: { 'sec-fetch-site': 'cross-site' } }),
      { rateLimit: 'write' }
    )

    expect(g.ok).toBe(false)
    if (!g.ok) expect(g.response.status).toBe(403)
    expect(checkMock).not.toHaveBeenCalled()
  })

  it('rejects unauthenticated requests without spending budget', async () => {
    authMock.mockResolvedValue(null)

    const g = await guard(req(), { rateLimit: 'read' })

    expect(g.ok).toBe(false)
    if (!g.ok) expect(g.response.status).toBe(401)
    expect(checkMock).not.toHaveBeenCalled()
  })
})

describe('guard — bucket keys', () => {
  it('keys authenticated requests on the user id, per tier', async () => {
    await guard(req(), { rateLimit: 'read' })
    expect(checkMock).toHaveBeenCalledWith('user:user-1', 'read')
  })

  it('keys public routes on the client IP', async () => {
    authMock.mockResolvedValue(null)

    await guard(req({ headers: { 'x-forwarded-for': '203.0.113.7' } }), {
      auth: false,
      rateLimit: 'register',
    })

    expect(checkMock).toHaveBeenCalledWith('ip:203.0.113.7', 'register')
  })

  // Separate tiers mean separate counters for the same user, which is the
  // whole reason a Kanban drag's refetches no longer eat its write budget.
  it('sends reads and writes to different buckets', async () => {
    await guard(req(), { rateLimit: 'read' })
    await guard(req({ method: 'POST' }), { rateLimit: 'write' })

    expect(checkMock).toHaveBeenNthCalledWith(1, 'user:user-1', 'read')
    expect(checkMock).toHaveBeenNthCalledWith(2, 'user:user-1', 'write')
  })
})

describe('guard — bucket scope', () => {
  const routeScoped = TIERS.filter((t) => RATE_LIMITS[t].scope === 'route')
  const sharedScoped = TIERS.filter((t) => RATE_LIMITS[t].scope === 'shared')

  it('covers both scopes, so the cases below are a real partition', () => {
    expect(routeScoped.length).toBeGreaterThan(0)
    expect(sharedScoped.length).toBeGreaterThan(0)
  })

  it.each(routeScoped)('%s gives each route its own bucket', async (tier) => {
    await guard(req({ path: '/api/auth/forgot-password' }), { rateLimit: tier })
    await guard(req({ path: '/api/auth/resend-verification' }), { rateLimit: tier })

    const [first] = checkMock.mock.calls[0]
    const [second] = checkMock.mock.calls[1]
    expect(first).not.toBe(second)
    expect(first).toContain('/api/auth/forgot-password')
    expect(second).toContain('/api/auth/resend-verification')
  })

  it.each(sharedScoped)('%s pools every route into one bucket', async (tier) => {
    await guard(req({ path: '/api/applications' }), { rateLimit: tier })
    await guard(req({ path: '/api/dashboard' }), { rateLimit: tier })

    // The pool IS the budget here: splitting 'read' per route would silently
    // multiply 120/min by the number of read routes.
    expect(checkMock.mock.calls[0][0]).toBe(checkMock.mock.calls[1][0])
    expect(checkMock.mock.calls[0][0]).toBe('user:user-1')
  })

  // The exact regression. Both routes use 'reset'; guard() calls auth()
  // regardless of `auth: false`, so a signed-in user hitting the public
  // forgot-password route keys on their user id — which used to be the same
  // bucket resend-verification drew from, and their first "Resend email" click
  // answered 429.
  it('does not let forgot-password spend resend-verification’s budget', async () => {
    await guard(req({ method: 'POST', path: '/api/auth/forgot-password' }), {
      auth: false,
      rateLimit: 'reset',
    })
    await guard(req({ method: 'POST', path: '/api/auth/resend-verification' }), {
      rateLimit: 'reset',
    })

    expect(checkMock.mock.calls[0][0]).not.toBe(checkMock.mock.calls[1][0])
  })

  it('still separates two users on the same route', async () => {
    await guard(req({ path: '/api/auth/resend-verification' }), { rateLimit: 'reset' })
    authMock.mockResolvedValue({ user: { id: 'user-2' } })
    await guard(req({ path: '/api/auth/resend-verification' }), { rateLimit: 'reset' })

    expect(checkMock.mock.calls[0][0]).not.toBe(checkMock.mock.calls[1][0])
  })
})

describe('guard — refund', () => {
  it('hands back the attempt for the bucket it charged', async () => {
    const g = await guard(req({ path: '/api/auth/resend-verification' }), {
      rateLimit: 'reset',
    })

    expect(g.ok).toBe(true)
    if (!g.ok) return
    await g.refund()

    // Same bucket that was charged, prefixed by the preset name.
    const charged = checkMock.mock.calls[0][0]
    expect(refundMock).toHaveBeenCalledWith(`reset:${charged}`)
  })

  it('is a no-op when the route opted out of limiting', async () => {
    const g = await guard(req(), { rateLimit: false })

    expect(g.ok).toBe(true)
    if (!g.ok) return
    await g.refund()

    expect(refundMock).not.toHaveBeenCalled()
  })

  it('is not called unless the handler asks', async () => {
    await guard(req(), { rateLimit: 'reset' })
    expect(refundMock).not.toHaveBeenCalled()
  })
})

describe('guard — opting out', () => {
  it('skips the limiter entirely on rateLimit: false', async () => {
    const g = await guard(req(), { rateLimit: false })

    expect(g.ok).toBe(true)
    expect(checkMock).not.toHaveBeenCalled()
  })
})
