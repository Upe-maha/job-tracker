// src/shared/security/sessionPolicy.ts
//
// Every decision about whether a session is still alive, as one pure function.
//
// Pure on purpose: no imports beyond types, so it belongs to the isomorphic
// tier alongside sanitize.ts and loginErrors.ts, and — unlike most of what
// auth.ts does — it can be exercised directly by the Node-only Vitest suite.
// auth.ts keeps only the I/O around it: read the user when this asks, act on
// what it returns.

export const DAY_MS = 24 * 60 * 60 * 1000

/** Idle timeout when "Remember me" is left unchecked, and for OAuth sign-ins. */
export const DEFAULT_IDLE_MS = DAY_MS
/** Idle timeout when it is ticked. Also the session cookie's own lifetime. */
export const REMEMBERED_IDLE_MS = 7 * DAY_MS

// How stale a revocation check may be. Every `auth()` call runs the jwt
// callback — that is every API route through guard() and every dashboard page
// load — so checking the database each time would put a query on the critical
// path of every request. One minute bounds the cost to a single read per
// session per minute; the cost of that choice is that a session can outlive a
// password change by up to this long.
export const REVALIDATE_EVERY_MS = 60 * 1000

// Optional throughout, because a token issued before this step has none of
// them. The normalisation below is the migration rule, and it lives here
// rather than in auth.ts precisely so it is covered by tests.
export interface SessionClaims {
  signedInAt?: number
  lastSeen?: number
  checkedAt?: number
  idleMs?: number
}

export type SessionVerdict = 'ok' | 'idle-expired' | 'revoked' | 'needs-check'

export interface NormalisedClaims {
  signedInAt: number
  lastSeen: number
  checkedAt: number
  idleMs: number
}

// The defaults are conservative in every direction, because a legacy token
// tells us nothing about itself:
//
//   signedInAt → 0. Its real age is unknowable, and assuming it is *new* would
//     let a token issued before this deployed — including a stolen one —
//     outlive a password change. Epoch means any recorded password change
//     revokes it, which is the safe way to be wrong.
//   idleMs → the unremembered default. Nobody ticked a box that did not exist.
//   lastSeen → now. A session cannot be punished for a timestamp that was
//     never recorded; adopting it starts the idle clock from first sight
//     instead of signing everyone out on deploy.
//   checkedAt → 0, so the very next use revalidates rather than being handed a
//     fresh grace period.
export function normaliseClaims(claims: SessionClaims, now: number): NormalisedClaims {
  return {
    signedInAt: typeof claims.signedInAt === 'number' ? claims.signedInAt : 0,
    lastSeen: typeof claims.lastSeen === 'number' ? claims.lastSeen : now,
    checkedAt: typeof claims.checkedAt === 'number' ? claims.checkedAt : 0,
    idleMs: typeof claims.idleMs === 'number' ? claims.idleMs : DEFAULT_IDLE_MS,
  }
}

/**
 * `passwordChangedAt` is only consulted when the caller has actually read the
 * user this cycle; pass `undefined` to mean "not looked up", which is why the
 * 'needs-check' verdict exists as a separate answer rather than a boolean.
 */
export function sessionVerdict(
  claims: SessionClaims,
  now: number,
  passwordChangedAt?: Date | number | null,
): SessionVerdict {
  const { lastSeen, checkedAt, idleMs, signedInAt } = normaliseClaims(claims, now)

  // Idle first: an expired session should not cost a database read to discover.
  // A negative elapsed time (clock skew, a token stamped by a machine running
  // ahead) is treated as "just seen" rather than as a wildly stale session —
  // Math.max keeps a skewed clock from signing someone out.
  const idleFor = Math.max(0, now - lastSeen)
  if (idleFor > idleMs) return 'idle-expired'

  if (passwordChangedAt === undefined) {
    const sinceCheck = Math.max(0, now - checkedAt)
    return sinceCheck >= REVALIDATE_EVERY_MS ? 'needs-check' : 'ok'
  }

  // null means the account has never had a password change recorded — every
  // account predating Step C — and must never revoke.
  if (passwordChangedAt === null) return 'ok'

  const changedAt =
    passwordChangedAt instanceof Date ? passwordChangedAt.getTime() : passwordChangedAt
  if (!Number.isFinite(changedAt)) return 'ok'

  // Strictly older, so a session stamped at or after the change survives.
  //
  // That is not automatic: a session's signedInAt is fixed at sign-in, so the
  // very tab that changes the password would otherwise revoke itself. The
  // confirm-password-change route re-issues that one session's cookie with a
  // fresh signedInAt (see security/sessionCookie.ts) — which is what makes
  // "every *other* session" true rather than "every session".
  //
  // Inverting this comparison signs the user out of the tab they are looking
  // at and leaves every stolen session alive, so it is pinned by tests in both
  // directions.
  return signedInAt < changedAt ? 'revoked' : 'ok'
}
