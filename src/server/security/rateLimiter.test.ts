// src/server/security/rateLimiter.test.ts
//
// checkRateLimit needs Mongo and this suite is DB-free, so the enforcement half
// is covered in src/server/http/guard.test.ts against a stubbed limiter. What's left
// here is the preset table itself: cheap invariants that catch a malformed entry
// the guard tests would happily pass over.
import { describe, expect, it, vi } from 'vitest'

// This module imports @/server/db, which throws at import time without
// MONGODB_URI. Nothing below calls a limiter function, so a stand-in is enough.
vi.mock('@/server/db', () => ({ connectDB: vi.fn() }))

import { RATE_LIMITS } from './rateLimiter'

const entries = Object.entries(RATE_LIMITS)

describe('RATE_LIMITS', () => {
  it.each(entries)('%s declares a usable budget', (_name, cfg) => {
    expect(cfg.maxAttempts).toBeGreaterThan(0)
    expect(cfg.windowMs).toBeGreaterThan(0)
    expect(cfg.message.length).toBeGreaterThan(0)
  })

  it.each(entries)('%s states failOpen explicitly', (_name, cfg) => {
    expect(typeof cfg.failOpen).toBe('boolean')
  })

  it.each(entries)('%s states its bucket scope explicitly', (_name, cfg) => {
    expect(['shared', 'route']).toContain(cfg.scope)
  })

  // The send-side budgets describe one action each, so they must not pool.
  // Sharing them is what let forgot-password drain resend-verification.
  it.each(['reset', 'token'] as const)('%s is scoped per route', (name) => {
    expect(RATE_LIMITS[name].scope).toBe('route')
  })

  // The inverse mistake, which is just as real: these budgets ARE the pool.
  // Scoping 'read' per route would multiply 120/min by the number of read
  // routes without anyone noticing.
  it.each(['read', 'write', 'api'] as const)('%s stays a shared pool', (name) => {
    expect(RATE_LIMITS[name].scope).toBe('shared')
  })

  // The budgets that must never be relaxed by a Mongo outage: the three auth
  // flows and Step C's 'token', plus 'upload' — the one route that would
  // otherwise keep working (and keep billing Cloudinary) while the database is
  // down.
  it.each(['login', 'register', 'reset', 'token', 'upload'] as const)('%s fails closed', (name) => {
    expect(RATE_LIMITS[name].failOpen).toBe(false)
  })
})
