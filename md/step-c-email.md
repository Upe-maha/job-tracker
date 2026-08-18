#Step C — Email System (Resend)

Status: planned → implemented in this step.

> **Transport note.** This step was built on nodemailer over SMTP and later moved to the Resend SDK;
> `nodemailer` is no longer a dependency. Decision 1 and the *Mailer* section below have been
> rewritten to describe what the code does now. Everything else — the token mechanism, the rate-limit
> presets, the routes, the enumeration-safety rules — was never transport-specific and is unchanged.

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

1. **Resend, over its HTTPS API** — `RESEND_API_KEY` and `EMAIL_FROM`, which is what the roadmap
   named in the first place. The step originally went the other way: nodemailer over SMTP, chosen to
   stay provider-agnostic (Gmail, Mailgun, SES or a local Mailpit are all the same six env vars).
   That reversed once the app needed a transport that actually worked from a deployed serverless
   function — an HTTPS API needs no outbound SMTP port, no connection pool to keep alive across
   invocations, and no app password. The cost is one vendor; the flows below don't care either way,
   which is why the switch touched `mailer.ts` and nothing else.
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

### Token storage (`src/models/Token.ts`, `src/server/data/tokens.ts`)

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

### Mailer (`src/server/email/`)

`mailer.ts` is server-only and holds the `Resend` client in a **module variable, not `globalThis`**.
The nodemailer transport it replaced was cached on the global for the same reason `connectDB` is — a
serverless invocation gets a fresh module registry but the same global, which is what stopped every
request opening its own SMTP connection pool. A Resend client holds no sockets (an API key and a
header object wrapped around `fetch`), so there is no pool to protect and nothing worth keeping
across invocations.

It is still built **lazily**, for the original reason: `db.ts` can throw at import on a missing env
var because nothing works without Mongo, but a missing `RESEND_API_KEY` should fail the one request
that tries to send rather than stop the app from booting.

**The one thing to know about this SDK: `emails.send()` resolves with `{ data: null, error }` for
anything the API refuses** — bad key, unverified sender, quota, suppressed recipient. It does not
throw; only a transport-level failure (DNS, socket) rejects. So `sendMail` inspects `error` and
throws itself, and that check is what keeps the `sendMail`/`sendMailSafe` split honest. Without it
every refused message would look like a success: `sendMail` would stop throwing,
`resend-verification` would answer 200 and charge the `reset` budget for mail that never left, and
`user/password` would tell the user to go read a confirmation link that was never delivered.

`templates.ts` is pure — four functions returning `{ subject, html, text }`, with links built from
`NEXTAUTH_URL`, reusing the origin `csrf.ts` already trusts rather than adding a second source of
truth.

**Register must swallow send failures.** Both branches — new account and existing account — send
*different* emails but must produce identical responses. A send failure surfacing as a 500 on one
branch only would reopen the enumeration oracle through the error path. That is what `sendMailSafe`
is for, and it is why the resolved-`{ error }` case above has to be turned into a throw first — a
refusal that never throws is a refusal `sendMailSafe` cannot log. Everywhere else `sendMail` throws
into the route's `catch { return serverError(...) }`.

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
- **Email change / re-verification on address change** → the profile overhaul, which is **Step E**.
  (This line said "Step D" when written; Step D is now Application & Note CRUD.)
