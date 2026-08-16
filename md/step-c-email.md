#Step C — Email System (nodemailer)

Status: planned → implemented in this step.

Three flows share one token mechanism: **email verification on register**, **forgot-password
reset**, and **password-change confirmation**.

## Context

Two things in the codebase were already waiting on this step:

- The `reset` rate-limit preset existed and was used by nothing — Step A left it "reserved for Step C".
- `auth/register` answered `409 "Account with this Email already in use"`, an enumeration oracle
  Step A knowingly kept: *"The 3/hour IP limit is what makes it non-scalable. Step C's email
  verification is the real fix"* (`md/step-a-security.md`, decision 3). This step is that fix.

`emailVerified: Date | null` already existed on `User` and is set on every OAuth path by
`resolveOAuthUser`, so Step B users arrive verified and never see a verification prompt.

## Decisions locked with the user

1. **nodemailer over SMTP**, not Resend. The roadmap named Resend; this step supersedes that. SMTP
   keeps the app provider-agnostic — Gmail, Mailgun, SES or a local Mailpit are all the same six
   env vars.
2. **All three flows in one step.** They share the token model, the mailer and the rate-limit
   presets, so the third flow costs almost nothing once the first two exist.
3. **An unverified user can still sign in**, and sees a banner with a resend button. `authorize()`
   is not touched, which keeps Step A's timing-equalization and lockout logic and Step B's
   `signIn`/`jwt` callbacks exactly as they are. Blocking login would also mean a lost verification
   email locks a real user out entirely.
4. **Password change is confirm-first.** `PUT /api/user/password` verifies the current password and
   stores the *new* hash on the token document; the password only changes when the emailed link is
   clicked. A stolen session cannot change a password without the inbox as well.
5. **Register is enumeration-safe.** New and existing emails get byte-identical responses; the
   difference is carried entirely in which email is sent.

## Approach

### Token storage (`src/models/Token.ts`, `src/lib/dal/tokens.ts`)

A separate collection rather than an embedded array — these expire, and a TTL index is the same
reason `RateLimit` has its own collection.

```
userId          ObjectId, required
type            'email_verify' | 'password_reset' | 'password_change'
tokenHash       String, required, unique     ← SHA-256 of the raw token
pendingPassword String, select: false        ← bcrypt hash, password_change only
expiresAt       Date, required, TTL index (expireAfterSeconds: 0)

unique index { userId, type }                ← at most one live token per user per type
```

**Store a hash, never the token.** A read-only database leak would otherwise hand over live,
click-to-use reset links for every pending request.

**SHA-256, not bcrypt.** Bcrypt's work factor exists to slow brute force against low-entropy human
passwords. A 256-bit CSPRNG token is not guessable, so bcrypt here would only add ~250 ms to every
link click and buy nothing.

**Issuance is one atomic upsert**, not delete-then-insert. Delete-then-insert has a window in which
two concurrent resends both insert and leave two live tokens; the upsert against the
`{ userId, type }` unique index means whichever write lands last owns the single surviving document.
Two concurrent upserts can still both attempt an insert and one gets a duplicate-key 11000 — retry
once, the same pattern already used in `rateLimiter.ts` and `dal/users.ts`. Semantics are **last
write wins**: simultaneous resends produce two emails of which only the later link works, while
sequential resends always invalidate the previous link.

**Consumption is `findOneAndDelete({ tokenHash, type, expiresAt: { $gt: now } })`** with
`.select('+pendingPassword')`. Three properties ride on that filter and each has a test:

- `expiresAt: { $gt: now }` — expiry is enforced by the **query**. Mongo's TTL monitor runs about
  once a minute, so an expired token is routinely still readable; the index is garbage collection
  only, exactly as noted on `RateLimit`.
- `type` — a security boundary, not a convenience. Without it a `password_reset` token would satisfy
  `verify-email` and be redeemable for a capability it was never issued for.
- `findOneAndDelete` is atomic, so single use is structural rather than checked.

`pendingPassword` is `select: false`, so it must be requested explicitly or
`confirm-password-change` would write `undefined` over the user's password and lock them out. It is
selected unconditionally rather than behind an `if (type === 'password_change')` — one code path,
nothing to get wrong later, and the field is null for the other two types anyway. The route treats a
missing hash as a server error, never as a write.

### Mailer (`src/lib/email/`)

`mailer.ts` is server-only and caches the nodemailer transport on `globalThis` for the same reason
`connectDB` does: a serverless invocation gets a fresh module registry but the same global, so this
is what stops every request opening a new SMTP connection pool. `templates.ts` is pure — four
functions returning `{ subject, html, text }`, with links built from `NEXTAUTH_URL`, reusing the
origin `csrf.ts` already trusts rather than adding a second source of truth.

**Register must swallow send failures.** Both branches — new account and existing account — send
*different* emails but must produce identical responses. A send failure surfacing as a 500 on one
branch only would reopen the enumeration oracle through the error path. Everywhere else `sendMail`
throws into the route's `catch { return serverError(...) }`.

### Rate limiting

The send side and the consume side defend different things, so they get different budgets:

| preset | budget | failOpen | scope | used by |
| --- | --- | --- | --- | --- |
| `reset` | 5 / 1h | `false` | route | forgot-password, resend-verification |
| `token` (new) | 10 / 15min | `false` | route | every link-click route |

Sending bounds outbound mail cost and inbox spamming; consuming bounds DB work on link clicks. Both
fail closed, consistent with every other auth-adjacent budget.

**Both are route-scoped, and that was a bug fix, not foresight.** Shipped first with the default shared
scope, which produced this: `guard()` calls `auth()` on every request including `auth: false` routes, so
a signed-in user submitting the public forgot-password form keys on their *user id* — the identical
bucket resend-verification draws from. Three forgot-password submissions and the first click of "Resend
email" answered 429. `guard()` now folds the request pathname into the key for `'route'` presets, so two
routes on one preset can never collide; `'shared'` stays the default for `read`/`write`/`api`, where the
pool *is* the budget and splitting it per route would multiply it by the route count.

Two smaller consequences of the same incident:

- `guard()` returns `refund()`, and `resend-verification` calls it when the address is already verified.
  The budget bounds outbound mail, so a branch that sends none should not cost an attempt.
- The counter charges on request, so rejected attempts increment too — a stored count of 6 against a
  limit of 3 means three got through, not six. Worth remembering before reading the collection and
  drawing a conclusion.

### Routes

| route | guard | behaviour |
| --- | --- | --- |
| `POST /api/auth/verify-email` | `auth:false`, `token` | consume → set `emailVerified` |
| `POST /api/auth/resend-verification` | session, `reset` | no-op success if already verified |
| `POST /api/auth/forgot-password` | `auth:false`, `reset` | always generic 200 |
| `POST /api/auth/reset-password` | `auth:false`, `token` | set password, `passwordChangedAt`, `emailVerified`, clear lockout |
| `POST /api/auth/confirm-password-change` | `auth:false`, `token` | apply `pendingPassword` |

Two rules carried over from earlier steps:

- Reset and confirm **clear `failedLoginAttempts`/`lockUntil`**, on the same reasoning `auth.ts`
  gives for OAuth: inbox control is stronger evidence of ownership than a password, and leaving the
  lock would let an attacker's failed guessing deny the owner their own account.
- `forgot-password` for an OAuth-only user (no password) is allowed and sets one. That is a feature
  — the address was provider-verified at link time.

### Client

The verification banner reads the existing `useProfile()` query, whose payload already carries
`emailVerified`. Deliberately **not** the JWT/session: that would mean touching Step B's callbacks
and handling a stale token after verification, whereas invalidating `qk.profile` is already the
app's normal pattern.

`middleware.ts`'s `isAuthPage` stays as it is — `/login` and `/register` only. The token pages must
**not** be added: a logged-in user clicking a verify or confirm link has to reach the page, and
listing them there would bounce them to `/dashboard` and silently discard the token.

## Verified facts this plan relies on

- `User.emailVerified` exists and is set by `resolveOAuthUser` at all three of its return paths.
- `middleware.ts` matches only `/login` and `/register` as auth pages, so the new token pages are
  reachable both signed in and signed out with no matcher change.
- `guard()` requires an explicit `rateLimit` tier since the tiering change, so every new route
  declares one or fails to compile.
- `GET /api/user/profile` already returns `emailVerified` to the client.

## Explicitly deferred

- **Session invalidation on password change** → Step H, which compares the JWT `iat` against
  `passwordChangedAt`. This step keeps writing that field so Step H has a baseline.
- **Lockout-notification emails** → a Step A follow-up; the mailer built here makes it a small
  addition.
- **Email change / re-verification on address change** → Step D's profile overhaul.
