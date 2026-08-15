#Step B — OAuth Login (Google + GitHub)

**Status: Planned.** Written before implementation, per the convention in `md/roadmap.md`.

## Context

Step A is complete: every custom route runs a uniform `guard()` preamble, credentials are protected by an
IP rate limit plus a per-account lockout, and no response reveals which handler failed or whether an
account exists. Step B adds Google and GitHub sign-in on top of that, including the case the roadmap
calls out explicitly — someone registers with email/password, then later signs in with an OAuth provider
using the same address.

Two facts shape the entire design:

1. **There is no NextAuth adapter.** `src/lib/auth.ts` is credentials-only with `strategy: 'jwt'`, and the
   user document is owned entirely by the Mongoose `User` model (profile fields, preferences, and the
   Step A lockout state). Sessions are JWTs, so no session collection is needed.
2. **`session.user.id` is load-bearing.** Every API route scopes queries by `user: g.session.user.id` —
   CLAUDE.md states this as the invariant. If an OAuth sign-in puts a *provider's* subject id there
   instead of the Mongo `_id`, every ownership-scoped query silently returns nothing or throws a
   CastError. This is the highest-risk failure mode in the step.

Outcome: a user can sign in with Google or GitHub; an existing email/password account is merged rather
than duplicated; and the merge cannot be used to take over someone else's account.

## Decisions locked with the user

1. **No adapter — do the account lookup/link/create by hand in the `signIn` callback.**
   `@auth/mongodb-adapter` drives the raw MongoClient and wants to own the shape of the `users`
   collection, which collides with the existing Mongoose model; with JWT sessions its `sessions` and
   `verification_tokens` collections are dead weight. Hand-rolling keeps one source of truth for a user
   document and matches how this codebase already works (per-route `guard()` over a HOF, hand-rolled
   rate limiter, hand-rolled theme context).
2. **Auto-link only on a provider-*verified* email.** This is the security control that replaces
   NextAuth's default `OAuthAccountNotLinked` block, which we are deliberately bypassing to satisfy
   "merge accounts gracefully". Google: trust `profile.email_verified === true`. GitHub: fetch
   `/user/emails` and require `primary && verified`. No verified email → refuse, do not create a second
   account.
3. **`User.password` becomes optional.** OAuth users have none.
4. **Widen the avatar host allowlist** rather than mirroring provider avatars into Cloudinary — mirroring
   means an upload per new OAuth user and feeds the orphaned-asset problem already logged as M2.

## Verified facts this plan relies on

Read out of `node_modules/@auth/core` at version 5.0.0-beta.32 / `@auth/core` as installed:

- `lib/actions/callback/index.js:66` passes `userByAccount ?? userFromProvider` to the `signIn` callback.
  With no adapter, `userByAccount` is `undefined`, so the callback receives `userFromProvider`.
- `lib/actions/callback/handle-login.js:24-27` — with no adapter, `handleLoginOrRegister` returns
  `{ user: _profile, account: _account }`, i.e. **the same object reference**. That object is then handed
  to `callbacks.jwt({ token, user, ... })` at `callback/index.js:78`.
  **Therefore mutating `user.id` inside the `signIn` callback does reach the `jwt` callback**, which is
  what lets us swap the provider subject id for the Mongo `_id`. No adapter needed to fix the invariant.
- `callback/index.js:74` builds `defaultToken.sub = user.id?.toString()`, so `sub` picks up the same
  corrected id.
- `handleAuthorized` (`src/lib/actions/callback/index.ts`): a **falsy** return from `signIn` throws
  `AccessDenied`; a **string** return is treated as a redirect URL and passed through the `redirect`
  callback. Returning `'/login?error=<code>'` is therefore the supported way to surface a custom OAuth
  failure, and the existing `loginErrorMessage()` on the login page can render it.
- `providers/github.js:88-99` — the built-in GitHub provider only calls `/user/emails` when
  `profile.email` is empty, and then picks `emails.find(e => e.primary) ?? emails[0]`
  **without checking `verified`**. Its default scope is `read:user user:email`, so the token can read
  that endpoint. This is exactly why decision 2 does the lookup itself rather than trusting
  `profile.email`.
- `providers/google.d.ts:16` — the Google profile carries `email_verified: boolean`.
- `src/lib/auth.ts:56` already does `const hash = user?.password ?? DUMMY_HASH`, so an OAuth-only user
  attempting a password login compares against the dummy hash and receives the generic `credentials`
  error. Making `password` optional introduces no enumeration path and no crash.

## Approach

### Schema (`src/models/User.ts`, mirrored in `src/types/index.ts`)

- `password`: drop `required: true`, keep `select: false`.
- `accounts: [{ provider, providerAccountId, linkedAt }]` — an embedded array, consistent with how notes,
  contacts and prepFiles are modelled. Index `{ 'accounts.provider': 1, 'accounts.providerAccountId': 1 }`.
- `emailVerified: Date | null` — set on OAuth sign-in; also a direct Step C enabler.

CLAUDE.md's rule applies: schema changes land in both the model and `src/types/index.ts`.

### `signIn` callback (`src/lib/auth.ts`)

Short-circuit `account.provider === 'credentials'` — `authorize()` already did that work. Otherwise:

1. Resolve a verified email per decision 2. None → `return '/login?error=oauth_unverified_email'`.
2. `await connectDB()` — the callback owns its connection, same rule as every route handler.
3. Match on `{ 'accounts.provider', 'accounts.providerAccountId' }` → returning user.
4. Else match on `email` → existing account: `$push` the provider onto `accounts[]`. This is the merge.
5. Else create a user with no password, `emailVerified: new Date()`, account pre-attached. Handle the
   duplicate-key `11000` race the way `auth/register/route.ts:62` already does.
6. **Overwrite `user.id` with the Mongo `_id` string** — see the verified fact above.

`authorize()`, the lockout logic and the IP rate limit are untouched. OAuth sign-in legitimately bypasses
the credentials rate limit; the provider performs the authentication.

### Avatar hosts

`photo` is currently required to be `https://res.cloudinary.com` in `api/user/profile/route.ts`. Provider
avatars come from `lh3.googleusercontent.com` and `avatars.githubusercontent.com`. Add a host allowlist
next to `isSafeUrl` in `src/lib/security/sanitize.ts` (added in the Phase 1 URL-validation work) and use
it in both places. Document the allowlist in CLAUDE.md.

### Login page

Google and GitHub buttons above a divider and the existing credentials form. Surface the `?error=` query
param through the existing `loginErrorMessage()`. This page uses double quotes/semicolons and raw slate
classes rather than semantic tokens — match it, don't reformat it.

## Commit order

1. Step doc (this file) + `md/roadmap.md` status fix.
2. `User` model + types mirror.
3. Avatar host allowlist.
4. `loginErrors.ts` codes.
5. `auth.ts` providers + `signIn` callback.
6. Login page buttons.
7. CLAUDE.md env + policy documentation.

## Verification

Full OAuth needs real Google/GitHub apps, so this splits in two.

**Automated, no provider credentials required** — drive the `signIn` callback directly with synthetic
`account`/`profile` objects:

- new user → one document created, no `password`, `emailVerified` set, one entry in `accounts[]`
- link by verified email → seed a credentials user first, then assert exactly **one** document remains,
  with two entries in `accounts[]` and its original `password` hash intact
- returning user by `providerAccountId` → no new document
- unverified email → refused, no document created
- in every accepted path, the resulting `user.id` is a 24-character Mongo ObjectId, **not** a provider
  subject id

**Regressions:** the credentials e2e (register → sign in → `GET /api/applications`) must still pass with
`password` no longer `required`; an OAuth-only user attempting a password login must get the generic
`credentials` code, not a 500. `npx tsc --noEmit` and `npx eslint` clean on changed files apart from the
pre-existing `layout.tsx` error.

**Manual, needs your OAuth apps:** Google sign-in on a fresh email; GitHub sign-in on that same email,
confirming one account with two linked providers; avatar renders; `/api/dashboard` returns that user's
own data.

All probe users and applications removed afterwards, with DB row counts reported.

## Explicitly deferred

- **Unlinking a provider from the profile page** → Step D, which already owns the "GitHub connect button".
- **Session invalidation when a provider is linked** → Step H owns session lifecycle.
- **Email verification for credentials users** → Step C. Step A decision 3 stands: the register route
  keeps its clear `409`, and Step C's verification email is the real fix for enumeration.
- **Rate limiting the OAuth callback** — the provider authenticates the user, and the callback creates at
  most one document per real provider account. Revisit only if abuse appears.
