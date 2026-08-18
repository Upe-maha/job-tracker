# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # next dev
npm run build    # next build
npm run start    # production server
npm run lint     # eslint (flat config, eslint-config-next core-web-vitals + typescript)
npm test              # vitest run — both suites
npm run test:unit     # 13 in-process files, ~1s: the loop to run while working
npm run test:integration  # 7 files, each booting a real mongod
npm run test:watch    # watches tests/unit
npx tsc --noEmit      # typecheck without a full next build

# one file / one test
npx vitest run tests/integration/server/data/tokens.test.ts
npx vitest run -t 'expired token'
```

`scripts/responsive-check.mjs` is run by hand, not by `npm test`: `node scripts/responsive-check.mjs
[baseUrl]` (default `http://localhost:3000`). It needs a **server already running** (never `npm run
build` against the one you are checking — the rebuilt `.next` leaves the running dev server serving
unstyled pages and every control fails), a session cookie in `RESPONSIVE_CHECK_TOKEN`, and Playwright
resolved at runtime (`PLAYWRIGHT_PATH` for a global/npx copy, `CHROMIUM_PATH` for a system browser —
Playwright is deliberately not a dependency). See the note at the top of the script.
**It has not been run since Step H** — neither prerequisite is currently available, so any
layout change since then is unverified at the browser level. See `md/roadmap.md` follow-ups.

Tests live in `tests/`, not beside their subject, and the directory states how a file runs:
`tests/unit/` (13 files, in-process) and `tests/integration/` (7 files, each booting a real `mongod`).
Inside each, the tree mirrors `src/` — `tests/unit/server/http/guard.test.ts`,
`tests/integration/server/data/tokens.test.ts`. That is what makes `test:unit` a loop that cannot rot:
a mongod-booting file would have to be in the wrong directory to be collected. A test addresses its
subject through the `@/` alias, never a relative path; a helper sitting *beside* a test may stay relative.

The suite is Node-environment only — no jsdom, nothing renders. Server modules that import
`@/server/db` need `vi.mock('@/server/db', ...)`, since it throws at import time without `MONGODB_URI`.

**A few files spin up a real `mongod`** via `mongodb-memory-server`, each in its own
`beforeAll`/`afterAll`, rather than mocking the model:
- `tests/integration/server/data/tokens.test.ts` — token expiry, type isolation and single-use are properties
  of a *MongoDB query*, and a mocked model can only assert the shape of the filter object, which passes
  just as happily when the semantics are wrong.
- `tests/integration/server/data/users.test.ts` (Step E) — same reasoning for the account-linking helpers:
  `$elemMatch` matching one array element rather than two independently, the `$ne` guard that makes a
  concurrent link refuse instead of appending a duplicate, and `$pull` removing the right entry. It also
  pins `resolveOAuthUser`'s **unchanged** sign-in behaviour, since Step E adds a second writer to the
  same `accounts[]` array and the two deliberately answer different questions (see *Auth* below).
- `tests/integration/server/data/files.test.ts` — `resolveOwnedFile` is the whole of `/api/files`' access
  control, and "another user's file resolves to null" is a property of the `user:` filter, not of any
  predicate a mock could check.
- `tests/integration/server/data/notes.test.ts` — `fetchNotesFeed` is an aggregation with two known traps:
  `$match` does not cast a string to an `ObjectId` (an uncast user silently returns an empty feed),
  and a projected field that is absent rather than `null` reads differently at the call site, which
  is why `attachment` goes through `$ifNull`.
- `tests/integration/api/auth/register/route.test.ts` and
  `tests/integration/api/auth/resend-verification/route.test.ts` — the property under test (identical
  response whether or not the account exists; the `reset` budget only charged when mail actually sends)
  is a statement about the *whole route*, so `auth`/`db`/the rate limiter's collaborators are mocked but
  the Mongoose writes and the duplicate-key race are real. The **`resend` SDK** is stubbed at the module
  (`vi.mock('resend', ...)` returning a `Resend` class whose `emails.send` is the spy), not
  `@/server/email/mailer`, so the real `sendMailSafe` swallow-and-log path is what's actually exercised —
  including the resolved-`{ error }` refusal, which is the case a mailer-level mock would miss.

Note npm blocks `mongodb-memory-server`'s postinstall by default, so the mongod binary downloads on first
run instead (needs network once). `vitest.config.mts` uses Vite's native `resolve.tsconfigPaths` for the
`@/*` alias.

There is no Prettier config and ESLint enforces no formatting rules, so style is per-file: the
security/API layer (`src/server/http/*`, `src/server/security/*`, most `src/app/api/*` routes) uses single
quotes and no semicolons; a few older files (`src/server/db.ts`, `api/auth/register/route.ts`) use double
quotes and semicolons. Match the file you're editing and never let format-on-save rewrite a whole file —
a reformat-only diff buries the real change.

Required env vars in `.env.local`: `MONGODB_URI`, `NEXTAUTH_URL`, `AUTH_SECRET`,
`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
`AUTH_SECRET` is the single source of truth for signing/verifying tokens — both NextAuth (`src/server/auth.ts`)
and the middleware (`src/middleware.ts`) read it. `NEXTAUTH_SECRET` is no longer used.

Email (Step C): `RESEND_API_KEY` and `EMAIL_FROM` — the mailer is the **Resend SDK over HTTPS**.
Step C was built on nodemailer/SMTP and moved to Resend afterwards, so `nodemailer` is not a dependency
and any SMTP reference in an old commit predates the switch. Both vars are read lazily inside
`sendMail`, not at import, so a missing key fails the one request that sends rather than stopping the app
from booting. Link origins come from `NEXTAUTH_URL`, deliberately reusing the one `csrf.ts` already trusts.

OAuth (Step B): `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` — NextAuth v5
auto-discovers these names. Callback URLs are `<origin>/api/auth/callback/google` and `.../github`. Add
`trustHost: true` to the NextAuth config when deploying anywhere other than Vercel.

Optional: `TRUSTED_PROXY_HOPS` (default `1`) — how many reverse proxies sit in front of the app, which is what
makes `getClientIP` pick an `X-Forwarded-For` entry the client can't forge. `1` is correct on Vercel (it
overwrites XFF) and behind a single nginx/Caddy; `0` for direct exposure (no proxy header is trusted at all,
so everything shares one rate-limit bucket); `2` behind Cloudflare — though a Cloudflare deployment should
prefer `CF-Connecting-IP` instead, which is a follow-up if that host is ever chosen.

## Stack

Next.js 15 App Router · React 19 · TypeScript (strict) · Mongoose/MongoDB · NextAuth v5 (beta,
credentials + JWT sessions) · TanStack Query v5 · Zod v4 · react-hook-form (+ `@hookform/resolvers`) ·
Tailwind v4 · shadcn/ui (radix-nova style, `components.json`) · dnd-kit · Cloudinary · Recharts ·
sonner (toasts) · Vitest. Path alias `@/*` → `src/*`.

## Architecture

### Data model — one root document per application
`src/models/Application.ts` is the center of the app. Notes, prep files, and contacts are **embedded
subdocument arrays** on `Application`, not separate collections. `User` (`src/models/User.ts`) holds
auth + profile fields. Both models use the `mongoose.models.X || mongoose.model(...)` guard required
for Next.js hot reload. Indexes exist on `{user, createdAt}` and `{user, status}`.

A note additionally carries an optional `attachment: { url, name }` (Step F). **The URL is the file's
identity** — it is the key `resolveOwnedFile` checks ownership on and the key `/api/files` serves
from, which is what lets an attachment be authorised with no extra field and no new route. Nothing
else about the Cloudinary asset is stored, so Step F does no cleanup at all; R4 owns that, for
abandoned, replaced and removed files together. See `md/step-f-notes-pdf.md`.

Consequence: features like the notes feed or analytics are cross-application queries with no collection
of their own — "every note for a user" is an `$unwind` over `Application`, not a `find()` on notes.
`src/types/index.ts` holds the **wire** shapes (a serialized document: Dates as strings, plus
`_id`/`user`/timestamps) and re-exports the enum unions from `@/shared/schemas/enums`. Enum members are
declared exactly once, so a new status is a one-line change there — the models spread the same arrays
into their `enum:` options.

The read paths that need this live in `src/server/data/` (see *Data access layer* below), which replaced the
older approach of loading whole applications and flattening in JS. Two aggregation gotchas are already
paid for there and are easy to reintroduce: `aggregate()` does **not** cast strings to `ObjectId` the way
`find()` does (an uncast `$match: { user }` matches nothing and returns a silently empty result), and a
`$sort` on a timestamp alone can repeat or drop a row at a page boundary, so `notes._id` is a tiebreaker.

### Auth and route protection
- `src/server/auth.ts` exports `handlers`, `signIn`, `signOut`, `auth` from a single NextAuth v5 config.
  `authorize(credentials, request)` checks an IP rate limit before touching the DB, compares against a
  dummy bcrypt hash for unknown emails (timing equalization), and locks an account for 15 minutes after
  5 failed attempts — only the true owner (correct password) ever sees `account_locked`, a guesser always
  gets the generic `credentials` code. Three `CredentialsSignin` subclasses in `auth.ts` carry these codes
  (`src/shared/security/loginErrors.ts` defines them and is shared with the client login page, which reads
  `signIn()`'s `result.code` via `loginErrorMessage()`).
- **OAuth (Step B)**: Google + GitHub, with **no NextAuth adapter** — the `signIn` callback in `auth.ts`
  does the lookup/link/create against the Mongoose `User` itself, so the user document stays the single
  source of truth. Linked providers live in an embedded `accounts[]` array on `User`. Two things make this
  work and must not be broken: (1) the callback **overwrites `user.id` with the Mongo `_id`** — with no
  adapter `@auth/core` passes that same object into the `jwt` callback, and without the overwrite
  `session.user.id` would hold the *provider's* subject id and every ownership-scoped query would silently
  match nothing; (2) an account is only auto-linked when the provider **verifies** the email (Google's
  `email_verified`, GitHub's `/user/emails` `primary && verified` — the built-in GitHub provider does
  *not* check `verified`), which is the control replacing NextAuth's default `OAuthAccountNotLinked`
  block. Returning a string from `signIn` is treated as a redirect, which is how OAuth failures reach
  `/login?error=<code>`. See `md/step-b-oauth.md`.
- **Linking a provider from the profile page (Step E) is a separate branch of the same callback, and
  must stay separate.** `resolveOAuthUser` identifies a user *by provider-verified email*; pointing a
  Connect button at it means that when the provider's email differs from the account's — common, and
  exactly the case Connect serves — it resolves to or creates a **different** user, and the `user.id`
  overwrite above hands the session to them silently. So `POST /api/user/link-account` issues an
  `account_link` token into an httpOnly cookie first, and the callback takes the cookie's branch:
  `consumeToken` yields the userId the token was issued to, and `linkProviderToUser`
  (`src/server/data/users.ts`) attaches the provider to *that* user without consulting the email and
  without touching `emailVerified`. The branch also re-sets `name`/`email`/`photo` from the DB user,
  or @auth/core would rebuild the session from the linked provider's profile. Failures redirect to
  `/profile?error=<code>` (`LINK_ERROR` in `security/loginErrors.ts`), not `/login`.
- **`linkProviderToUser` refuses where `resolveOAuthUser` updates in place.** A provider already
  linked to a *different* account id returns `'provider_linked'` rather than rebinding: on the
  sign-in path an in-place update is correct, but on Connect it would silently swap which account is
  attached, based on nothing but which one happened to be signed into the browser. Disconnect, then
  Connect. The cookie is `sameSite: 'lax'` (`security/linkIntent.ts`) because `'strict'` is dropped on
  exactly the redirect that carries it back.
- `User.password` is **optional** — OAuth-only users have none. `authorize()` compares against
  `DUMMY_HASH` when it's absent, so a password login against such an account gets the generic
  `credentials` error rather than crashing.
- `src/types/next-auth.d.ts` augments `Session`, `JWT`, and `User` (`photo` field).
- `src/middleware.ts` does redirect-level routing only: `/` → `/dashboard` or `/login`, unauthenticated
  users off dashboard routes, authenticated users off auth pages. It **excludes `/api`** from its matcher.
  This is a UX layer only — `(dashboard)/layout.tsx`'s server-side `auth()` + `redirect` is the real
  enforcement for dashboard routes.
- Every API route calls `guard(req, opts)` (`src/server/http/guard.ts`) as its first line — composes the CSRF
  same-origin check, `auth()`, and rate limiting into one preamble: `const g = await guard(req, {
  rateLimit: 'read' }); if (!g.ok) return g.response`. `g.session.user.id` is guaranteed non-null from there (overloaded so
  `guard(req, {auth:false})`, used only by register, types `session` as nullable instead). This is a
  deliberate per-route call, not a `withAuth()` HOF — a HOF fights Next 15's generated route param types
  (`Promise<{id: string}>`) for no real benefit across three different handler shapes (no-arg, `(req,
  {params})`, formData). The invariant every route follows: scope **every** query by
  `user: g.session.user.id` — including `findOne`/`findOneAndUpdate`/`findOneAndDelete` by `_id`. Never
  look up an application by `_id` alone.
- `guard()` does **not** open the DB connection. Every handler that touches Mongoose must `await
  connectDB()` (`src/server/db.ts`) itself, inside the `try`, after the guard — including each branch of a
  multi-method file. `connectDB` caches the connection and the in-flight promise on `globalThis.mongoose`
  (resetting the promise on failure so the next request retries), which is what keeps serverless
  invocations from opening a new pool each time.
- Body-accepting routes call `parseBody(req, schema)` and query routes `parseQuery(searchParams, schema)`
  (`src/server/http/validate.ts`) — see *Validation* below. `runValidators: true` stays on every
  `findOneAndUpdate` as defense in depth (Mongoose skips validators on update by default). Route `[id]`
  params go through `toObjectId(id)` first — an invalid id returns the same 404 as a genuine not-found,
  never a Mongoose CastError 500.
- Every route returns errors through `src/server/http/respond.ts` — `fail(status, message)` for expected
  failures, and a `catch { return serverError('<scope>', err) }` at the bottom of each handler. The
  latter logs the real error server-side but always responds with a fixed `'Something went wrong'`, so
  no route-specific 500 text can fingerprint which handler failed. Don't hand-roll `NextResponse.json`
  error bodies.
- `src/server/security/rateLimiter.ts` is MongoDB-backed (`src/models/RateLimit.ts`, TTL index on
  `expiresAt`) rather than in-memory, so limits survive serverless cold starts. It is a **fixed-window
  counter** (per-key `count` + `expiresAt`, window anchored to the first request rather than to a
  wall-clock boundary) — not a token bucket or sliding window, so the usual ~2× burst across a window
  edge applies. Presets are sized per *thing being protected*, not one number for the whole API:
  `login` 5/15min (IP-keyed in `authorize()`, user-id-keyed on `user/password`), `register` 3/1h
  (IP-keyed — deliberately not email-keyed, or an attacker could exhaust a victim's own registration
  budget), `reset` 5/1h (Step C's *send* side: forgot-password, resend-verification — **route-scoped**, so
  that's five *per action*), `token` 10/15min (Step C's *consume* side, every link-click route, also
  route-scoped — split from `reset` so a user clicking a stale link doesn't burn their send budget),
  `read` 120/1min, `write` 30/1min, `upload` 15/10min, and
  `api` 100/1min — which is **no route's default** any more and survives only for the OAuth `signIn`
  callback in `auth.ts`, which has no request object to key on.
- **`guard()` is the single authority on request policy** — CSRF, auth, *and* the whole rate-limit
  decision including who is being limited and which bucket that lands in. It deliberately does not open
  the DB, parse the body, or wrap the handler (see the HOF note above). Policy centralizes; plumbing
  doesn't.
- **`rateLimit` is a required `guard()` option**, so a new route cannot compile without declaring what
  it costs. An implicit default is what let every route drift onto one budget regardless of expense;
  `rateLimit: false` opts out deliberately.
- **Each preset declares `scope: 'shared' | 'route'`**, and `guard()` folds the request pathname into the
  bucket key for `'route'` ones. Both directions are real defects: `'shared'` on `reset` let a signed-in
  user's forgot-password requests drain the budget for resend-verification (`guard()` calls `auth()` even
  on `auth: false` routes, so a public route still keys on the user id) and their first "Resend email"
  click answered 429; `'route'` on `read` would silently turn one 120/min pool into 120 *per route*. The
  scope lives in the preset table, never at a call site, and `guard.test.ts` pins both directions.
- **`g.refund()`** hands back the attempt a request was charged, for a handler that turns out to do
  nothing — `resend-verification` refunds when the address is already verified, since the `reset` budget
  bounds outbound mail and that branch sends none. It decrements rather than clearing, or a caller could
  reset their own window on demand via the no-op path.
- Each tier is a separate counter per user, so a Kanban drag spends 1 from `write` while its two
  invalidation refetches land on `read`.
- **The counter charges on request, not on success**, so a rejected request still increments. A count of
  6 against a limit of 3 means three attempts got through and three were refused — useful to know before
  reading a number off `ratelimits` and concluding the user did six things.
- Behaviour when Mongo is unreachable is a **`failOpen` field on each preset**, read by `guard()` — not
  inferred from the tier name, which is how a newly added tier used to inherit the wrong answer silently.
  `login`/`register`/`reset`/`token` fail **closed** (failing open hands a guesser unlimited attempts), and so
  does `upload`: bounding Cloudinary spend is the whole point of that tier, and `/api/upload` is the one
  route that never touches Mongo (it returns a URL a *separate* request persists), so failing open would
  leave it the only endpoint still working during an outage — unmetered. `read`/`write`/`api` fail open.
  `tests/unit/server/http/guard.test.ts` pins this per preset; don't change a `failOpen` without changing that test.
- `src/shared/security/sanitize.ts`'s `sanitizeInput` strips only object **keys** (`$`-prefixed, dotted,
  `__proto__`/`constructor`/`prototype`) — string content always passes through untouched, since the
  threat is NoSQL-operator/prototype-pollution keys, never string content. `validatePassword` (6–128
  chars, no charset rules) is the single source of truth shared by register, password change, and the
  future reset flow. `sanitizeString` is intentionally unused — React escapes on render.
- `resume` on `User` and any `type:'pdf'` `prepFiles.url` must be an `https://res.cloudinary.com` URL
  (enforced in `user/profile` and `prep-files` routes) since they're opened directly and only ever come
  from `/api/upload`. `photo` is looser: `isAllowedImageUrl` (`src/shared/security/sanitize.ts`) allows
  Cloudinary **plus** `lh3.googleusercontent.com` and `avatars.githubusercontent.com`, because a Step B
  OAuth sign-in supplies an avatar on the provider's own CDN and mirroring every new user's picture into
  Cloudinary would add uploads and orphaned assets for no security gain. `companyLogo`, `jobUrl` and the
  profile's three link fields (`linkedIn`, `portfolio`, and `github` — added in Step E, which also
  converted the first two from bounded `text` now that all three render as anchors) go
  through `isSafeUrl` — an absolute-URL + protocol check that rejects `javascript:`/`data:`/`file:`;
  `companyLogo` is https-only (mixed content), plain links accept `http:` too, since the client accepts a
  bare `http://` URL as-is. A profile storing a bare `linkedin.com/in/me` from before Step E fails
  validation on its next save until it is made absolute — accepted, not an oversight.

### Data access layer (`src/server/data/`)
Mongoose-touching read/write helpers that more than one caller needs, kept out of the route files.
`notes.ts` (`fetchNotesFeed`) backs both `/api/notes` and the dashboard's `notesFeed` widget; `users.ts`
(`verifiedProviderEmail`, `resolveOAuthUser`) is the security-critical half of Step B and is deliberately
free of `next-auth` imports so it stays callable without booting NextAuth. Project inside the pipeline
rather than returning whole documents — the point of `fetchNotesFeed` is to not drag every
`jobDescription`, `prepFile` and `contact` across the wire to render note previews.

`applications.ts` holds `findOwnedApplication` plus `pushSubdocument`/`updateSubdocument`/
`pullSubdocument` (Step D added the middle one — it is also what writes `notes.$.attachment` for
Step F), which the three subdocument routes share. **`userId` is the first, required argument of every helper** so an
ownership-scoped query cannot be written without one. `pushSubdocument` enforces its array cap inside
the filter (`[`${field}.${max-1}`]: { $exists: false }`) so the happy path is one round trip and two
concurrent writes can't both pass a check-then-write; a `null` result then costs one cheap `exists()`
to tell 404 from at-limit. The caps in `SUBDOCUMENT_LIMITS` exist because embedded arrays share the
parent's 16 MB ceiling — an uncapped `notes` array eventually fails every write to that application
*and* the user's whole dashboard, which aggregates over the same documents.

### Validation — Zod is the single source of truth
`src/shared/schemas/` owns every validation rule *and* every enum member. `enums.ts` holds the `as const`
arrays; `common.ts` holds field builders that wrap `@/shared/security/sanitize` (so the protocol allowlist,
the 2048-char URL cap, the upload size cap and the password bounds live in one place); each domain file
exports a **pair** — a wire schema and a `*FormSchema` the matching react-hook-form binds to.

Server side, every body-accepting route is `parseBody(req, schema)` and every query-string route is
`parseQuery(searchParams, schema)` (`src/server/http/validate.ts`). `parseBody` wraps the module-private
`readJsonBody` (415 on content type, 413 on size — enforced on **bytes read**, not the `content-length`
header — 400 on bad JSON, then `sanitizeInput`) and then `safeParse`. Zod's unknown-key stripping is what
makes `user`/`_id`/timestamps/subdocument arrays unwritable; there is no allowlist constant anymore.

Consequences worth knowing before changing a route:
- **A route file containing an enum array, a `MAX_*` constant or a regex is a layering violation.** Put
  it in the schema.
- **No handler catches `mongoose.Error.ValidationError`.** `runValidators: true` stays as defense in
  depth, but after Zod a Mongoose validation error means the Zod and Mongoose schemas have *drifted* —
  a server bug that belongs in the logs as a 500, not rendered to the caller as bad input.
- **`parseQuery` converts absent params to `undefined`.** `searchParams.get()` returns `null` and a Zod
  `.default()` only fires on `undefined`, so passing the raw null coerces a missing `limit` to `0`.
- **Failures answer `{ error: string }` with the first issue's message.** Per-field errors are the
  client's job, produced by RHF from the *same* schema. Don't invent a field-map response.
- **`z.input` vs `z.infer`.** A request body type is `z.input` (`ApplicationCreatePayload`,
  `NoteCreatePayload`, `ContactCreatePayload`) — fields with a `.default()` are optional, which is what
  lets a form post a subset. `z.infer` is the *parsed* result with every field present; using it for a
  payload over-demands. Forms whose controls produce strings that the schema coerces (dates, numbers)
  export both `*FormValues` (`z.input`) and `*FormOutput` (`z.output`) and use RHF's three generics.

### Presentation metadata — `src/shared/display/`
Labels, colors, icons and picker option lists, keyed off `schemas/enums`. Typed as
`Record<SomeEnum, Meta>`, so adding an enum member is a **compile error** until its display metadata
exists. Three label variants exist on purpose (`label`, `shortLabel`, `pluralLabel`) because a card, a
dense feed row and a filter pill genuinely differ — don't collapse them.

### Three tiers, enforced by lint
`src/` is split by **which way dependencies may point**, not by feature. A directory name cannot
promise what ends up in a browser bundle; it can promise what a module is allowed to import, and
`eslint.config.mjs` turns that promise into `no-restricted-imports` rules. Each tier also carries a
ten-line `README.md` stating the same contract.

| Tier | Holds | May import | Must not import |
|---|---|---|---|
| `src/shared/` | schemas, display maps, pure predicates, `files.ts`, `utils.ts` | third-party, `@/types` | `server`, `client`, `components`, `hooks` |
| `src/server/` | `data/`, `http/`, `security/`, `email/`, `auth.ts`, `db.ts` | `shared`, `models` | `client`, `components`, `hooks` |
| `src/client/` | `api-client.ts`, `query-keys.ts`, `navigation.ts`, `theme.tsx` | `shared` | `server`, `components`, `hooks` |
| `src/components/`, `src/hooks/` | UI | `client`, `shared` | `server`, `models`, `mongoose`, `resend` |

Three things here are easy to undo by accident:

- **`src/app/` is a composition layer and is deliberately not held to one rule.** `src/app/api/**`
  imports `server` freely — that is what a route handler is for. `page.tsx`/`layout.tsx`/`loading.tsx`
  get an **enumerated** ban rather than a blanket `@/server/**` one, because `(dashboard)/layout.tsx`
  legitimately calls `auth()`, and that server-side `auth()` + `redirect()` is the real enforcement
  for every dashboard route (`middleware.ts` only handles the redirect UX).
- **The bans name directories, never individual files.** The previous config listed `@/lib/dal/*`,
  `@/lib/db`, `@/lib/api/*` and `@/lib/email/*`, so `@/lib/auth`, `csrf.ts`, `rateLimiter.ts`,
  `sessionCookie.ts` and `linkIntent.ts` were importable from a `'use client'` file with nothing to
  stop them. A list goes stale as modules land beside the old ones; a directory does not.
- **Both `@/server/*` and `@/server/**` must appear in a group.** ESLint matches these
  gitignore-style, where a single `*` does not cross a `/`, so `@/server/*` alone misses
  `@/server/data/users`.

Within the tiers: models import only mongoose + enums; `server/data/` never builds a `Response`
(which is what keeps it callable from a test without booting NextAuth, and reusable from a Server
Action); `server/email/*` is grouped with `resend` so there is one answer to "may I import mail
here" rather than a per-file one. `src/client/` exists so that a route handler importing `apiGet()`
— the server fetching itself over HTTP — is a lint error rather than a legal import; `utils.ts`
stays in `shared/` for the mirror-image reason, since twelve of `cn`'s importers are server
components. Breaking any of these is a lint error, not a review comment.

### Email and account recovery (Step C) — `src/server/email/`, `src/models/Token.ts`, `src/server/data/tokens.ts`
Three flows over one token mechanism: verify-email, forgot-password, and a **confirm-first** password
change. (Step E adds a fourth token *type*, `account_link`, which is not an email flow at all — it
rides in a cookie through an OAuth redirect. It reuses `issueToken`/`consumeToken` unchanged.) See
`md/step-c-email.md`. What's easy to break:

- **The token collection stores a SHA-256 hash, never the token.** A read-only leak would otherwise be a
  pile of live, click-to-use reset links. SHA-256 rather than bcrypt on purpose — bcrypt's work factor
  defends low-entropy human passwords, and these are 256 bits of CSPRNG output.
- **`consumeToken`'s filter is the security boundary**, not the code around it. `type` is in the filter so
  a `password_reset` token can't be redeemed at `verify-email`; `expiresAt: { $gt: now }` is what enforces
  expiry, since the TTL index is garbage collection running on Mongo's own ~60s schedule and an expired
  token is routinely still readable; `findOneAndDelete` is what makes single use structural. It also
  `.select('+pendingPassword')` — that field is `select: false`, and without it the password-change
  confirmation writes `undefined` over the user's password. All five properties are pinned by
  `tests/integration/server/data/tokens.test.ts`.
- **`issueToken` is one upsert against a unique `{ userId, type }` index**, not delete-then-insert, which
  has a window where two concurrent resends both leave a live token. Semantics are last-write-wins.
- **Password change is confirm-first.** `PUT /api/user/password` checks the current password and parks the
  new hash on the token; the user document is untouched until `/api/auth/confirm-password-change` runs. A
  stolen session can't change a password without the inbox too. Don't "simplify" this back into a direct
  write.
- **`auth/register` and `auth/forgot-password` answer identically whether or not the account exists** —
  this is the fix Step A deferred (`md/step-a-security.md` decision 3). Both use `sendMailSafe`, which
  swallows and logs delivery failures, because a 500 on only the branch that sends mail reopens the
  oracle through the error path. Everywhere else `sendMail` throws into `serverError`. A new 4xx/5xx on
  one branch of either route is a regression, not a nicety.
- **Resend's `emails.send()` resolves with `{ data: null, error }` for anything the API refuses** — bad
  key, unverified sender, quota, suppressed recipient — it only rejects on a transport failure. `sendMail`
  therefore inspects `error` and throws itself; deleting that check silently breaks the whole
  `sendMail`/`sendMailSafe` split, since refused mail would then look like a success and
  `resend-verification` would charge the `reset` budget for a message that never left.
- Reset and confirm both clear `failedLoginAttempts`/`lockUntil`, on the same reasoning `auth.ts` gives
  for OAuth: inbox control beats a password as evidence of ownership, and leaving the lock lets an
  attacker's guessing deny the real owner their account.

### Route groups
- `src/app/page.tsx` — the public landing page (Step G). **`middleware.ts` redirects `/` only when
  signed in**; a signed-out visitor must reach it, which is what makes the page exist at all. `/`
  must stay out of both `isAuthPage` and `isDashboard` there, or the redirect returns by another
  branch. The page renders `LANDING_SECTIONS` from `components/landing/sections.ts` and nothing
  else: that array is the single place section order lives, and every section takes no props,
  imports its copy from `landing/content/copy.ts`, and renders inside the shared `Section`
  primitive — so a section never learns its own index. Header and footer sit outside the registry
  deliberately. Copy does **not** go in `shared/display/`, which is for `Record<Enum, Meta>` tables.
  Scroll reveal is `hooks/useReveal.ts` (a callback ref, not an effect) plus `.reveal` /
  `.reveal-visible` in `globals.css`, where `prefers-reduced-motion` **forces the revealed state** —
  a reveal waiting on a transition that never runs would hide the content permanently. The landing
  backdrop's intensity is a per-theme token (`--aurora-strength`), because one `color-mix`
  percentage reads completely differently against the light and dark grounds. **`Hero` deliberately
  has no `Reveal`**: it is above the fold and its `<h1>` is the LCP element, which an `opacity: 0`
  paint does not satisfy — reveals are for what the reader scrolls to.
- **Signing out goes to `/`**, from both call sites (`layout/Header.tsx` and the settings page), and
  every `(auth)` page carries a "Back to JobTracker" link from `(auth)/layout.tsx` — one copy, so
  the six pages cannot drift.
- **The section nav and the footer's Product column are both derived from `LANDING_NAV`** (the
  registry filtered to entries with a `navLabel`), and entries take `anchor: solution.id` rather
  than retyping the string — the registry key and the DOM id disagree in one case (`solution`
  renders `#features`). Never hand-write an in-page anchor list here: dropping a section from the
  registry has to take its links with it. Smooth scrolling is scoped to
  `html:has(.landing-root)` so the rest of the app is unaffected, and sections carry `scroll-mt-20`
  to clear the sticky header.
- `src/app/(auth)/` — login, register, forgot-password, reset-password, verify-email,
  confirm-password-change (own layout). The four Step C pages share `components/auth/AuthCard`; the two
  that redeem a link share `components/auth/TokenRedeemer`, whose `useRef` guard is load-bearing —
  without it StrictMode's double-invoked effect consumes the single-use token twice and shows "invalid or
  expired" for a verification that just succeeded.
- `src/app/(dashboard)/` — dashboard, applications, applications/[id], notes, analytics, profile,
  settings (shared sidebar/header layout).
- `src/app/api/` — `applications` (list/create), `applications/[id]` (get/update/delete) plus
  subdocument routes `[id]/notes`, `[id]/contacts`, `[id]/prep-files`, `[id]/status`;
  `notes` (cross-application paginated feed); `dashboard` (aggregated widget payload);
  `auth/register`, `auth/[...nextauth]`, `auth/verify-email`, `auth/resend-verification`,
  `auth/forgot-password`, `auth/reset-password`, `auth/confirm-password-change`,
  `auth/session-ended` (Step I — the only place that can clear a rejected session's cookie);
  `user/profile`, `user/password`, `user/link-account` (Step E — issues the `account_link` intent
  cookie), `user/accounts/[provider]` (DELETE, disconnect; refuses when it would remove the account's
  last sign-in method); `upload`; `files` (ownership-scoped PDF delivery — see *Uploads*).

**lucide has no brand icons** — `import { Github } from 'lucide-react'` is a compile error, not a
missing-icon fallback. GitHub, Google and LinkedIn marks live in `components/common/ProviderMarks.tsx`
and are shared by the login/register pages, the profile's Connected Accounts panel, and the landing
page's About section.

`middleware.ts`'s `isAuthPage` covers **only** `/login` and `/register`. The Step C token pages must stay
off that list: a signed-in user clicking a verify or confirm link has to reach the page, and adding them
would bounce to `/dashboard` and silently discard the token.

`/api/notes` and the dashboard's `notesFeed` are different things and both are wanted: the dashboard
returns a fixed 10-item widget preview, `/api/notes` returns the full filterable set that the `/notes`
page consumes via TanStack Query's `useInfiniteQuery` (`nextPage` cursor, `limit + 1` probe for
"is there more" instead of a second count query).

Dynamic route params are `Promise<{ id: string }>` and must be awaited (Next 15 convention).

### Client data flow
Dashboard pages are `'use client'` and fetch through TanStack Query against the API routes — no server
components hitting Mongoose directly. `src/components/providers.tsx` wraps the tree in
`SessionProvider` → `QueryClientProvider` (60s staleTime, retry 1) → `ThemeProvider` + sonner
`<Toaster/>`.

Nothing calls `fetch` directly. Reads are hooks in `src/hooks/useQueries.ts`, writes are `useMutation`
hooks in `src/hooks/useMutations.ts`, both over `src/client/api-client.ts` (`apiGet`/`apiSend`/`apiUpload`,
which throw a typed `ApiError` carrying the route's `{ error }` message). Keys come from
`src/client/query-keys.ts` — one definition each, so a key cannot be registered twice with different
options or left without an invalidator. `apiSend` sets the JSON content type (`readJsonBody` 415s
without it) and `apiUpload` sets `x-upload-request: '1'` (omitting it is a silent 403).

Each mutation states its own invalidation set: an application write also invalidates `['dashboard']`,
a note write also invalidates the `['notes']` prefix. `qk.applications.detail(id)` is
`['applications', id]` so invalidating `['applications']` covers the detail view by prefix.

Forms are react-hook-form + `standardSchemaResolver` bound to the `*FormSchema` variants, rendered
through the vendored shadcn `src/components/ui/form.tsx` (written against the unified `radix-ui`
package — the shadcn generator emits `@radix-ui/react-*`, which is not a dependency here). Field errors
render inline via `<FormMessage/>`; a server rejection that belongs to a field goes through
`form.setError(field, ...)`, and anything else surfaces as a toast from the mutation.

### Components
`src/components/ui/` is generated shadcn — treat as vendored. `applications/`, `applications/detail/`,
`dashboard/`, and `layout/` each re-export through an `index.ts` barrel — import from the barrel for
those. `notes/`, `profile/` and `common/` have no barrel; import their files directly. The Kanban board
(`applications/KanbanBoard.tsx` + `DraggableCard.tsx`) uses dnd-kit and persists moves via
`useUpdateApplicationStatus`. Its column state is derived from props via a content **signature**, not
the array reference — the parent rebuilds the array on every search keystroke, so resyncing on identity
would fight every optimistic drag. The three note tabs share `detail/NoteTabShell.tsx`; each supplies
only its own list, which is the one part that genuinely differs.

`src/components/common/PageShell.tsx` is the one content container every dashboard page mounts
(`CONTENT_WIDTH = 'max-w-[1200px]'`, plus `PageGrid` for the 12-col layouts). It renders immediately, before
any query resolves, so the frame stays put while the body swaps between skeleton/error/content — pages
used to pick their own max-width and return a centered "Loading…" for the whole page, which made
navigation feel like nothing had happened. `Panel.tsx` is the matching card shape (titled bar + rule +
body) that replaced hand-rolled `bg-card border rounded-xl p-6` blocks. `Skeletons.tsx` holds one skeleton
per page, each mirroring that page's real grid spans and card heights so data arriving doesn't reflow the
layout. Every `(dashboard)/*` route pairs its `page.tsx` with a `loading.tsx` (Next's route-level Suspense
boundary) that renders `PageShell` + the matching skeleton — this is what lets the router commit the
navigation immediately instead of holding the previous page on screen until the new segment's data lands.
`src/client/navigation.ts` is the single declaration of the six dashboard routes (href, label, sidebar icon,
breadcrumb description); the sidebar and the header breadcrumb both read `ROUTES`/`buildCrumbs` from it
instead of keeping their own lists, which used to drift.

### Sessions (Step I)
`src/shared/security/sessionPolicy.ts` holds every decision about whether a session is still alive, as
one pure function — which is what lets the Node-only suite test it. `auth.ts`'s `jwt` callback keeps
only the I/O. **Returning `null` from that callback is what ends a session** (`@auth/core` calls
`sessionStore.clean()` on a null token).

- **Rolling idle timeouts, carried in the token, not the cookie.** A JWT strategy has one cookie
  lifetime, so `session.maxAge` is the 7-day outer bound and the per-session window lives in an
  `idleMs` claim — 1 day by default, 7 with "Remember me". OAuth has no checkbox and takes the
  default.
- **Revocation is throttled to ~60s** via a `checkedAt` claim, because the `jwt` callback runs on
  *every* `auth()` call — every API route through `guard()` and every page load. The read
  (`fetchSessionUser`) is projected to one field and **fails open**, matching the `read` rate-limit
  tier. A missing user also ends the session.
- **`auth()` in a server component cannot write cookies**, so claims persist when the client
  `SessionProvider` hits `/api/auth/session`. Between those, `checkedAt` can be stale and a
  revalidation may repeat — the throttle is the typical case, not a guarantee.
- **The confirm-password-change route re-issues the acting session's cookie**
  (`security/sessionCookie.ts`) so the tab performing the change is not revoked by its own write —
  that is what makes it "all *other* sessions". The cookie name doubles as `@auth/core`'s encryption
  salt; getting it wrong does not throw, it silently signs the user out.
- **`(dashboard)/layout.tsx` redirects to `/api/auth/session-ended`, not `/login`.** A rejected
  session still has a decodable cookie, so middleware considers it signed in and bounces it back —
  `ERR_TOO_MANY_REDIRECTS`. Only a route handler can clear the cookie and break that loop.
- Legacy tokens (no claims, still valid because `AUTH_SECRET` is unchanged) are normalised inside
  `sessionPolicy` — `signedInAt` defaults to epoch so an unverifiable session cannot outlive a
  password change. One test per rule; see `md/step-i-sessions.md`.

### Responsive shell (Step H)
`lg` (1024px) is the app's one layout breakpoint: below it the sidebar is a **drawer**
(`layout/SidebarDrawer.tsx` over the vendored `ui/sheet.tsx`), the header's fixed `w-64` brand block
is `hidden lg:flex` in favour of a hamburger, and only the last breadcrumb shows. Things to know
before touching it:

- **`Sidebar` renders twice and only one may be *exposed*.** The permanent column is `hidden
  lg:flex` — `display: none` is what removes it from the accessibility tree *and* the tab order, so
  it must never be swapped for an opacity/visibility/transform trick, which would leave a second
  copy of every nav link focusable behind the open drawer. Radix mounts the drawer's copy only while
  open, so the two never coexist. The sidebar's nav is `aria-label="Main"` to distinguish it from
  the breadcrumb nav, which is also a landmark and legitimately so.
- **The drawer's open state is not persisted, and closes on `pathname` change** — derived from
  "which route was it opened on" rather than a boolean, so no effect has to synchronise it (a
  synchronous `setState` in an effect is what the react-hooks lint rule flags). `collapsed` keeps its
  `localStorage` entry and is desktop-only in meaning.
- **The shell is `h-dvh`, not `h-screen`.** `100vh` on mobile excludes the collapsible URL bar, so
  the shell ends up taller than the visible area and the bottom of `<main>` hides under browser
  chrome.
- **Control sizes are touch-first below `lg`**: `ui/button.tsx` and `ui/input.tsx` are `h-10 lg:h-8`
  (`size-11 lg:size-8` for icons). Deliberate edits to vendored files — the desktop density is
  unchanged, and `lg` rather than `sm` because a tablet is a touch device.
- **Modals must use `sm:max-w-*`.** The `DialogContent` base already carries
  `max-w-[calc(100%-2rem)]`; an unprefixed `max-w-lg` at a call site overrides it at every width and
  pushes the dialog past a phone's viewport.
- **The landing page has its own drawer** (`landing/LandingMobileNav.tsx`), a second caller of the
  same `ui/sheet.tsx`. It closes **on link click**, not on a pathname change like the dashboard's —
  its links are in-page anchors, so the pathname never changes and that rule would never fire. Its
  links come from `LANDING_NAV`, so they cannot drift from the desktop nav. The landing header's
  single CTA is **Sign in**; "Get started" belongs to the hero and the closing section.
- The dashboard header shows a compact **brand mark linking to `/`** below `lg` (the full `w-64`
  block is `hidden lg:flex`), with the wordmark itself dropping below `sm` — at 375px the row is
  hamburger + brand + page title + theme + avatar, and the title is what orients the reader.
- `scripts/responsive-check.mjs` is the regression guard: 6 routes × 6 viewports asserting no
  horizontal overflow, content width ≥85% of the viewport, at most one exposed primary nav and
  `aria-current`, and per-control hit areas. Run it after any layout change. Note the overflow
  assertion alone is **not** sufficient — a `shrink-0` sidebar beside a `min-w-0` main crushes the
  content to 119px without overflowing anything, which is why the content-width check exists.

### Theming
`src/client/theme.tsx` is a hand-rolled context (not next-themes): dark is the default, toggling adds or
removes `.dark` on `<html>` and writes `localStorage.theme`. `ThemeToggle`'s icon shows the theme you
are **in** (moon while dark, sun while light), not the one you would switch to; the `aria-label`
describes the action instead. localStorage is read through
`useSyncExternalStore` (with a `'dark'` server snapshot) rather than copied into state by an effect —
the effect only pushes the class onto `<html>`, which is the direction effects are for. Tailwind v4 tokens are defined in
`src/app/globals.css`; use semantic classes (`bg-background`, `text-muted-foreground`, `bg-brand`)
rather than raw colors.

### Uploads
`src/app/api/upload/route.ts` → Cloudinary. Requires a custom `x-upload-request: 1` header (forces a
CORS preflight this app never answers — belt-and-braces on top of `guard()`'s CSRF check, since this is
the one route reachable by a plain cross-site `<form enctype="multipart/form-data">` with no preflight)
sent by both callers (`AvatarUpload.tsx`, `PrepFilesTab.tsx`). `file.type` is client-supplied and never
trusted — uploads are sniffed by magic bytes and checked against a per-folder MIME allowlist (`avatars`:
images only; `prep-files`: images + PDF; `resumes` and `note-files`: PDF only). `MAX_UPLOAD_BYTES` (`@/shared/schemas/common`) is shared
with the client so an oversized file fails before the round trip; `folder=avatars` gets a 400×400 face
crop, PDFs upload as `resource_type: 'raw'`. `folder` is restricted to
`['avatars', 'prep-files', 'resumes', 'note-files']` and **fails closed** — an unrecognized value is a
400, not a fallback. Steps E and F each added their own folder rather than reusing `prep-files`, which
accepts images: the folder allowlist is the only thing keeping a caller out of a MIME allowlist it
never intended, and widening an existing bucket's meaning is how that erodes.

**PDFs are never linked at directly — they go through `GET /api/files`.** This is measured, not
defensive: a raw Cloudinary asset is delivered as `application/octet-stream` with
`Content-Disposition: attachment`, so every link to one downloads and nothing can preview it. Raw
delivery infers the content type from the extension on the public id, but a `.pdf` URL is refused
outright (**HTTP 401 plus a placeholder GIF**) unless the Cloudinary account enables *Allow delivery
of PDF and ZIP files*, which is off by default — so adding the extension makes it strictly worse.
Hence `pdfPublicId` in the upload route names the asset from the user's filename **without** an
extension, and `/api/files` re-labels it as `application/pdf` on the way through.

Three things about that route:
- **It is ownership-scoped, and that is the point of `resolveOwnedFile` (`src/server/data/files.ts`).**
  Every asset lives under one cloud name, so accepting any well-formed Cloudinary URL would let any
  signed-in user stream another user's CV — a route added to *narrow* access becoming the thing that
  widens it. It matches the URL against `user.resume`, a `prepFiles.url`, or (Step F) a
  `notes.attachment.url` on an application the user owns, and returns the filename for
  `Content-Disposition` (never one from the query string). **A new kind of stored file needs a branch
  here or it cannot be viewed at all** — that is the first thing to check when a preview 404s.
- **`next.config.ts` carries a `/api/files` exception** to the app-wide `X-Frame-Options: DENY` +
  `frame-ancestors 'none'` — `SAMEORIGIN` and `frame-ancestors 'self'; sandbox`. The preview dialog
  frames this response, and config headers win over route headers, so the exception cannot live in
  the route. `sandbox` keeps a PDF-with-JavaScript in an opaque origin now that it is same-origin.
- `src/shared/files.ts` holds the isomorphic URL derivations both sides need — `displayPdfName` (strips
  the upload route's 8-hex uniqueness suffix), `filePreviewUrl`, `fileDownloadUrl`. The **HTML
  `download` attribute is ignored cross-origin**, so downloads go through `&download=1` instead.

`common/PdfPreview.tsx` is the shared dialog (CV panel, profile identity card, prep-file rows, note
attachments), with Open and Download in the footer for the browsers that still refuse to render a PDF
inline. `notes/NoteAttachmentChip.tsx` wraps it for the three note surfaces — and note that the two
**feed rows put their `<Link>` behind the card as an `absolute inset-0` overlay** rather than wrapping
it, so the chip can be lifted above with `relative z-10`. A dialog trigger nested inside an anchor
navigates *and* opens: `stopPropagation` cannot cancel the anchor's default action, and
`preventDefault` would suppress the dialog too, since Radix's `DialogTrigger` skips its own handler on
a `defaultPrevented` event.

`User.password` is `select: false` — call sites needing the hash (`auth.ts`, `user/password`) must
`.select('+password')` explicitly. `User` also carries `failedLoginAttempts`/`lockUntil` (lockout state)
and `passwordChangedAt`. The last is written on every password change and, since Step I, read by the
`jwt` callback to revoke sessions older than it. Having been written since Step C is what made that
possible — a field introduced at Step I time would have had no baseline, leaving every pre-existing
session permanently un-invalidatable.

**It is compared against the token's own `signedInAt`, never against `iat`.** An earlier version of
this note said `iat`, and that would not have worked: `@auth/core` re-encodes the token on *every*
session read (`lib/actions/session.js`), so `iat` advances continuously and the session always looks
newer than the change. The check would have compiled, shipped, and silently never fired. `signedInAt`
is stamped once at sign-in and never refreshed. See `md/step-i-sessions.md`.

`accounts` carries a **unique partial index** on `(accounts.provider, accounts.providerAccountId)`.
`partialFilterExpression: { 'accounts.provider': { $exists: true } }` is mandatory, not an optimization:
it is a multikey index over two array paths, so every credentials-only user (`accounts: []`) keys as
`(null, null)` and a plain `unique: true` collides them and fails the build for the whole collection.
Mongoose *logs* an index-build failure rather than throwing, so verify with `listIndexes()` after any
change here. `resolveOAuthUser` looks accounts up with **`$elemMatch`** — two dot-notation conditions
are satisfied by different array elements, which would match a mismatched (provider, id) pair to the
wrong user.

## Docs
`md/roadmap.md` defines Steps A–I (security, OAuth, Resend email, application/note CRUD, profile
overhaul, PDF notes, landing page, mobile, session management) — all complete as of the `feat: steps
D–I` commit — implemented and committed one at a time. Its own heading still says "A through H";
Step I was appended later, and the Status section is the current list. Each step gets a
`md/step-<x>-*.md` written before implementation — and the doc is written *before* the code, so a plan
marked "Planned" may already be built. `md/step-a-security.md` (Step A, complete) records the
security-hardening decisions already locked with the user; read it before changing auth/route-guard code.
`md/step-b-oauth.md` does the same for OAuth, including the `@auth/core` source facts the no-adapter
design depends on — check them against the installed version before changing the `signIn`/`jwt` callbacks.

`md/roadmap.md`'s Status section also tracks a refactor track R1–R5 interleaved with the steps: R1
(trusted-proxy IP, security headers, external-URL validation) and R2 (paginated `/api/notes` + `server/data/`,
dashboard aggregation) are complete. R3 is complete for Zod-end-to-end and the extended `server/data/`;
its **Server Actions + RSC page loads with React `cache()` remain open** — the schemas and DAL are
deliberately shaped so a Server Action could consume the same `*FormSchema` and the same `server/data/`
functions unchanged. R4 (Cloudinary lifecycle) is **not started, and three shipped features are
waiting on it**: replacing a CV, and replacing/removing/abandoning a note attachment, all orphan the
old asset because no `publicId` is stored. R5 is partly done: Vitest and the security/schema/DAL
tests exist; GitHub Actions CI does not.

Response headers are set in `next.config.ts` for `/:path*` (`/api` included — `nosniff` matters on JSON
error bodies too): HSTS gated on production only, nosniff, `X-Frame-Options: DENY` + CSP
`frame-ancestors 'none'`, `Referrer-Policy`, `Permissions-Policy`. It is deliberately **not** a full CSP —
adding `script-src`/`style-src` pulls in the Tailwind v4 / Next inline-style nonce plumbing that
`md/step-a-security.md` deferred.

`md/phase1.md` … `md/phase6.md` are the author's earlier build notes (phase 6 covers the dnd-kit
Kanban). They describe how features were built, not current API contracts — prefer the source.
