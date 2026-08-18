// src/shared/security/sessionPolicy.test.ts
//
// The security boundary for Step I, and the one part of it a Node-only suite
// can reach: every decision about whether a session is still alive lives in
// sessionVerdict, so it is tested here rather than through a browser.
import { describe, expect, it } from 'vitest'
import {
  DAY_MS,
  DEFAULT_IDLE_MS,
  REMEMBERED_IDLE_MS,
  REVALIDATE_EVERY_MS,
  normaliseClaims,
  sessionVerdict,
} from './sessionPolicy'

const NOW = Date.UTC(2026, 0, 15, 12, 0, 0)

// A session signed in an hour ago, seen a minute ago, checked just now.
function claims(overrides: Partial<Parameters<typeof sessionVerdict>[0]> = {}) {
  return {
    signedInAt: NOW - 60 * 60 * 1000,
    lastSeen: NOW - 60 * 1000,
    checkedAt: NOW,
    idleMs: DEFAULT_IDLE_MS,
    ...overrides,
  }
}

describe('sessionVerdict — idle expiry', () => {
  it('accepts a session used within its idle window', () => {
    expect(sessionVerdict(claims(), NOW, null)).toBe('ok')
  })

  it('expires a session idle past its window', () => {
    expect(sessionVerdict(claims({ lastSeen: NOW - DAY_MS - 1 }), NOW, null)).toBe('idle-expired')
  })

  it('does not expire exactly at the boundary', () => {
    // > rather than >=: a session used exactly one day ago is still inside a
    // one-day window, and an off-by-one here signs people out a request early.
    expect(sessionVerdict(claims({ lastSeen: NOW - DAY_MS }), NOW, null)).toBe('ok')
  })

  it('gives a remembered session the longer window', () => {
    const twoDaysIdle = { lastSeen: NOW - 2 * DAY_MS }
    expect(sessionVerdict(claims({ ...twoDaysIdle }), NOW, null)).toBe('idle-expired')
    expect(
      sessionVerdict(claims({ ...twoDaysIdle, idleMs: REMEMBERED_IDLE_MS }), NOW, null),
    ).toBe('ok')
  })

  it('checks idle before asking for a database read', () => {
    // An expired session must not cost a round trip to discover. Without a
    // passwordChangedAt argument this would otherwise answer 'needs-check'.
    expect(sessionVerdict(claims({ lastSeen: NOW - DAY_MS - 1, checkedAt: 0 }), NOW)).toBe(
      'idle-expired',
    )
  })

  it('survives a clock running backwards rather than expiring the session', () => {
    // lastSeen in the future (skew between machines) must not read as a
    // hugely stale session.
    expect(sessionVerdict(claims({ lastSeen: NOW + 60 * 60 * 1000 }), NOW, null)).toBe('ok')
  })
})

describe('sessionVerdict — revalidation throttle', () => {
  it('asks for a check once the window has elapsed', () => {
    expect(sessionVerdict(claims({ checkedAt: NOW - REVALIDATE_EVERY_MS }), NOW)).toBe(
      'needs-check',
    )
  })

  it('stays quiet inside the window', () => {
    expect(sessionVerdict(claims({ checkedAt: NOW - REVALIDATE_EVERY_MS + 1 }), NOW)).toBe('ok')
  })

  it('does not ask again once the caller has supplied the answer', () => {
    // passing passwordChangedAt means "I looked it up this cycle".
    expect(sessionVerdict(claims({ checkedAt: 0 }), NOW, null)).toBe('ok')
  })
})

describe('sessionVerdict — password-change revocation', () => {
  it('revokes a session older than the password change', () => {
    const changedAt = new Date(NOW - 30 * 60 * 1000) // half an hour ago
    expect(sessionVerdict(claims(), NOW, changedAt)).toBe('revoked')
  })

  it('does NOT revoke the session that performed the change', () => {
    // The tab doing the changing is re-stamped by the confirm route, so its
    // signedInAt lands at or after passwordChangedAt. Inverting the comparison
    // signs the user out of the window they are looking at — and leaves every
    // stolen session alive, which is the whole feature backwards.
    const changedAt = new Date(NOW - 1000)
    expect(sessionVerdict(claims({ signedInAt: NOW }), NOW, changedAt)).toBe('ok')
    expect(sessionVerdict(claims({ signedInAt: changedAt.getTime() }), NOW, changedAt)).toBe('ok')
  })

  it('never revokes when the account has no recorded password change', () => {
    // Every account created before Step C. A null here must not be coerced to
    // epoch, or the entire user base is signed out on deploy.
    expect(sessionVerdict(claims({ signedInAt: 0 }), NOW, null)).toBe('ok')
  })

  it('accepts a timestamp as well as a Date', () => {
    expect(sessionVerdict(claims(), NOW, NOW - 30 * 60 * 1000)).toBe('revoked')
  })

  it('ignores an unparseable password-change value rather than revoking', () => {
    // A corrupt field must not sign a user out; it is a data problem, not
    // evidence of compromise.
    expect(sessionVerdict(claims(), NOW, new Date('nonsense'))).toBe('ok')
  })
})

// One test per row of the migration table in md/step-i-sessions.md. These four
// are the difference between a migration and an outage: every token already in
// the wild carries { id, photo } and nothing else, and AUTH_SECRET does not
// change, so they all arrive here with every claim undefined.
describe('sessionVerdict — legacy tokens issued before this step', () => {
  const legacy = {}

  it('adopts a legacy session when the account has never changed its password', () => {
    expect(sessionVerdict(legacy, NOW, null)).toBe('ok')
  })

  it('revokes a legacy session for an account that HAS changed its password', () => {
    // signedInAt defaults to epoch because the token's real age is unknowable.
    // Defaulting it to `now` instead would let every pre-deploy token —
    // including a stolen one — outlive the change it should not survive.
    expect(sessionVerdict(legacy, NOW, new Date(NOW - DAY_MS))).toBe('revoked')
  })

  it('gives a legacy session the unremembered idle window, not the remembered one', () => {
    expect(sessionVerdict({ lastSeen: NOW - 2 * DAY_MS }, NOW, null)).toBe('idle-expired')
  })

  it('revalidates a legacy session immediately rather than granting a grace period', () => {
    expect(sessionVerdict(legacy, NOW)).toBe('needs-check')
  })
})

describe('normaliseClaims', () => {
  it('fills every gap conservatively', () => {
    expect(normaliseClaims({}, NOW)).toEqual({
      signedInAt: 0,
      lastSeen: NOW,
      checkedAt: 0,
      idleMs: DEFAULT_IDLE_MS,
    })
  })

  it('keeps a zero rather than treating it as absent', () => {
    // `claims.signedInAt || 0` would be indistinguishable from a missing
    // claim here; the typeof check is what keeps 0 meaningful.
    expect(normaliseClaims({ signedInAt: 0, lastSeen: 0, checkedAt: 0 }, NOW)).toMatchObject({
      signedInAt: 0,
      lastSeen: 0,
      checkedAt: 0,
    })
  })
})
