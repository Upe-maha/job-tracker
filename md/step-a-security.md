#Step A — Security Layer

## Context

This is the first of eight planned steps (A–H) hardening and finishing the job-tracker app. Steps B–H
add OAuth, Resend email flows, a profile overhaul, PDF-in-notes, a landing page, mobile responsiveness,
and session management. Step A lays the security foundation the rest build on.

The app currently has a security layer that exists on disk but is **entirely dead code**:
`src/lib/security/rateLimiter.ts` and `src/lib/security/sanitize.ts` are imported by nothing, and
`rate-limiter-flexible` sits in `package.json` unused. Concretely, today:

- **No endpoint is rate limited** — including `POST /api/auth/callback/credentials` and `/api/auth/register`.
- **No account lockout**, and `authorize()` returns early for unknown users without running bcrypt, which
  is a timing oracle for user enumeration.
- **Two mass-assignment holes**: `PUT /api/applications/[id]` does `$set: body` unfiltered (a client can
  overwrite `user`, `notes`, `createdAt`), and `PUT /api/user/profile` writes every field unvalidated —
  including `photo`, which is rendered into an `<img src>` and copied into the JWT.
- **No CSRF defence** on the 11 non-NextAuth routes. `POST /api/upload` uses `formData()`, so it takes no
  CORS preflight and is genuinely forgeable from an attacker page by an authenticated victim.
- **Info leakage**: `applications/[id]/status/route.ts` `console.log`s user and application ids; per-route
  500 strings fingerprint which handler failed; malformed ObjectIds produce CastError 500s.
- `src/proxy.ts` never runs — verified via `.next/server/middleware-manifest.json` showing
  `"middleware": {}`. `proxy.ts` is the Next **16** filename; this app is on Next 15.5.22, which needs
  `src/middleware.ts` exporting `middleware`. (Dashboard pages are still protected — `(dashboard)/layout.tsx`
  does a server-side `auth()` + `redirect('/login')`. The live impact is that `/` doesn't redirect and
  signed-in users can still open `/login`.)

Outcome: every custom API route runs a uniform auth → CSRF → rate-limit → sanitize → allowlist preamble,
credentials are protected by both an IP rate limit and a per-account lockout, and no response reveals
which handler failed or whether an account exists.

## Decisions locked with the user

1. **MongoDB-backed** rate limiting and lockout — deploying to serverless, so per-process Maps are
   unreliable. Hand-roll a small Mongoose model; **remove** `rate-limiter-flexible`.
2. **Password minimum stays 6 characters.** Relax `validatePassword()` down to 6 and drop its uppercase/digit
   rules, so it becomes the single source of truth reused by `user/password` and Step C's reset flow.
3. **Keep** the clear `409 "Account with this Email already in use"` on register. The 3/hour IP limit is what
   makes the enumeration oracle non-scalable. Step C's email verification is the real fix.
4. **Fix the dead middleware** in this step: rename to `src/middleware.ts`, unify on `AUTH_SECRET`.

## Verified facts this plan relies on

- `@auth/core/lib/actions/callback/index.js:231` calls `provider.authorize(credentials, new Request(url, { headers, ... }))`
  — the second arg is a real `Request` carrying the **original inbound headers**, so `x-forwarded-for` is
  available inside `authorize()`. `getClientIP` must be retyped `NextRequest` → `Request` (body unchanged).
- `@auth/core/index.js:133` sets `params.set("code", error.code)` for `CredentialsSignin` subclasses, and
  `next-auth/react.js:175` reads it back — so custom codes reach `signIn(..., {redirect:false})` as `result.code`.
- `PUT /api/applications/[id]` has **zero client callers** (only `profile/page.tsx` and `settings/page.tsx`
  issue PUTs). A strict allowlist there cannot break the UI.
- `/api/upload` has exactly two callers: `AvatarUpload.tsx:47`, `PrepFilesTab.tsx:63`.

## Approach

### Boilerplate: explicit preamble, not a route wrapper

Use a 2-line `guard()` call per route, **not** a `withAuth(handler)` HOF. Next 15 generates
`.next/types/app/api/**/route.ts` that structurally checks each exported method against
`{ params: Promise<{ id: string }> }`; threading that through a HOF's generics produces build errors that
point at generated files. There are also three handler shapes here (no-arg, `(req, { params })`, formData)
and per-route guard configs, so a HOF saves one line and costs debuggability. With no test suite, build-time
clarity is worth more.

```ts
const g = await guard(req, { rateLimit: 'api' })
if (!g.ok) return g.response
// g.session.user.id is narrowed non-null from here
```

### New files

**`src/models/RateLimit.ts`** — `{ key: String unique, count: Number, expiresAt: Date }` with
`index({ expiresAt: 1 }, { expireAfterSeconds: 0 })`. TTL is pure GC; correctness never depends on the
reaper because every read compares `expiresAt` to `now`. Use the same `mongoose.models.X || model(...)`
hot-reload guard as the other models.

**`src/lib/security/rateLimiter.ts`** — rewrite **in place** (the in-memory `Map` and `setInterval` must not
survive). Keep `RATE_LIMITS` configs unchanged (login 5/15min, register 3/1h, reset 3/1h, api 100/1min).
Exports: `getClientIP(req: Request)`, `checkRateLimit(id, type): Promise<{allowed, message?, retryAfter?, remaining}>`,
`clearRateLimit(id, type)`, `rateLimitResponse(msg, retryAfter)`.

```ts
// roll an expired window forward atomically (no-op if window is live)
await RateLimit.updateOne({ key, expiresAt: { $lte: now } },
                          { $set: { count: 0, expiresAt: nextExpiry } })
// then increment, creating on first-ever hit
const doc = await RateLimit.findOneAndUpdate({ key },
  { $inc: { count: 1 }, $setOnInsert: { expiresAt: nextExpiry } },
  { upsert: true, new: true })
```
Wrap the second call in a `try/catch` for `err.code === 11000` and retry once — concurrent upserts on a
unique index can both attempt an insert. `clearRateLimit` is called on successful login so a legitimate
user isn't penalised for earlier typos.

**`src/lib/security/csrf.ts`** — `isSameOriginRequest(req)`, `csrfFailure()`. Order: GET/HEAD/OPTIONS → allow;
`Sec-Fetch-Site` present → require `same-origin`; else `Origin` present → compare against allowed set
(`new URL(process.env.NEXTAUTH_URL).origin` plus host-derived); **neither header → allow** (standard OWASP
fallback — a real browser always sends `Origin` cross-origin, and this keeps curl/non-browser clients working).

Lives in a **helper called per route, not middleware**. The matcher excludes `/api`; adding it back means
running the edge runtime on every API call and immediately carving `/api/auth` out again, because NextAuth
already does its own double-submit CSRF and a naive Origin check would break sign-in.

**`src/lib/api/validate.ts`**
- `readJsonBody(req)` — the **single choke point for sanitization**. Requires `application/json` → else 415
  (this alone kills the simple-request CSRF class on all 10 JSON routes); caps `content-length` ~100 KB → 413;
  catches parse errors → 400 (today they 500); rejects non-object roots; runs `sanitizeInput` before returning.
- `pickAllowed(src, keys)` — copies only present keys via `in`, so explicit `null` survives but absent keys
  don't clobber.
- `toObjectId(id)` — `mongoose.isValidObjectId` guard.

**`src/lib/api/respond.ts`** — `fail(status, error)` and `serverError(scope, err)`, the latter logging once
server-side and returning a **fixed** `500 {error:'Something went wrong'}`. No route hand-writes a 500 again,
so no per-handler 500 string remains to fingerprint.

**`src/lib/api/guard.ts`** — `guard(req, { auth=true, csrf=true, rateLimit='api'|false })` returning
`{ok:true, session, ip} | {ok:false, response}`. Order **CSRF → auth → rate limit**: CSRF first because it's
header-only and free; auth before rate limit so the key can be the **user id** on authenticated routes and
the **IP** on public ones (otherwise a whole NAT shares one 100/min bucket). Fail **closed** on
login/register/reset if Mongo is down; fail **open** on `'api'`.

**`src/lib/security/loginErrors.ts`** — `LOGIN_ERROR` codes (`credentials`, `too_many_attempts`,
`account_locked`) and `loginErrorMessage(code?)`. Must import nothing from `next-auth` or `@/lib/auth` — the
login page is `'use client'`.

**`src/middleware.ts`** (rename of `src/proxy.ts`, delete the original) — `export async function middleware`,
`getToken({ req, secret: process.env.AUTH_SECRET })`, add `/notes` `/analytics` `/settings` to `isDashboard`.
Pass `secureCookie: process.env.NODE_ENV === 'production'`; `getToken`'s cookie-name inference differs
(`__Secure-authjs.session-token` vs `authjs.session-token`) and getting it wrong is the classic "middleware
thinks everyone is logged out in production" bug — verify on a preview deploy. This is a redirect-UX layer
only; **keep** the `auth()` + `redirect` in `(dashboard)/layout.tsx` as the real enforcement.

### Edits to existing files

**`src/lib/security/sanitize.ts`** — delete every `.replace(/\$gt/gi,'')`-style line. The threat model is
object *keys*, never string content; today the regex corrupts a job description containing `$gte` or a
company named `$and`.

```ts
export function sanitizeInput<T>(input: T, depth = 0): T {
  if (depth > 12) return null as T
  if (input === null || typeof input !== 'object') return input   // strings pass through untouched
  if (input instanceof Date) return input
  if (Array.isArray(input)) return input.map(v => sanitizeInput(v, depth + 1)) as T
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (k.startsWith('$')) continue                              // Mongo operators
    if (k.includes('.')) continue                                // dotted-path writes
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue
    out[k] = sanitizeInput(v, depth + 1)
  }
  return out as T
}
```
`validatePassword`: floor 6, drop uppercase/digit rules (per decision 2 — keeping them would break existing
users changing passwords and still leave register inconsistent), keep the 128 ceiling as a bcrypt-DoS guard,
add a `typeof !== 'string'` guard. Leave `sanitizeString` **unused** — React escapes on render, and
entity-encoding at the storage layer puts `&amp;#x27;` in the database.

**`src/models/User.ts`** — `password` gains `select: false`; add `failedLoginAttempts` (default 0),
`lockUntil` (default null), `passwordChangedAt` (default null). Exactly two call sites need `.select('+password')`:
`src/lib/auth.ts` and `src/app/api/user/password/route.ts`. Mirror all four fields in `src/types/index.ts`.
`passwordChangedAt` is a **Step H enabler** — populate it now on every password change so Step H's
invalidation check is a clean `token.iat < user.passwordChangedAt` instead of a column of nulls.

**`src/lib/auth.ts`** — three `CredentialsSignin` subclasses carrying the `LOGIN_ERROR` codes, plus a
module-scope `DUMMY_HASH` (a pasted bcrypt cost-12 literal — do **not** compute at module load, that's
~250 ms on every cold start). `authorize(credentials, request)` in this exact order:

1. `typeof` guards on email/password → `InvalidCredentials`.
2. `checkRateLimit(\`ip:${getClientIP(request)}\`, 'login')` → `RateLimited`. This is the only signal
   available before touching the DB.
3. `User.findOne({email}).select('+password')`.
4. `bcrypt.compare(password, user?.password ?? DUMMY_HASH)` — **before** the `!user` check, so an unknown
   user pays the same cost.
5. Lockout check **after** the compare, so both branches cost the same. If locked: throw `AccountLocked`
   only when the password was correct, else `InvalidCredentials` — only the true owner learns the account
   is locked; a guesser gets the generic message.
6. On wrong password: `$inc` attempts, set `lockUntil = now + 15min` at 5.
7. On success: zero the counters and `clearRateLimit` the IP.

Auto-unlock is implicit — a past `lockUntil` reads as unlocked. The counter is deliberately **not** reset by
mere expiry, so the 6th wrong password after a lock re-locks immediately.

The IP limit and the account lockout are independent and both needed: the IP limit stops one attacker
spraying many accounts; the lockout stops a rotating-IP botnet hammering one account.

Also type the `jwt`/`session` callbacks properly against `src/types/next-auth.d.ts` (removes both `any`s).
**Do not touch `session.maxAge`** — that is Step H.

**`src/app/(auth)/login/page.tsx`** — read `result.code` and pass it through `loginErrorMessage()` instead of
the hardcoded string. Fix `React.SubmitEvent` → `React.FormEvent` in both auth pages (`SubmitEvent` is not a
real React type).

**Route edits** — every route gets `guard` → `toObjectId` → `readJsonBody` → validate → `runValidators: true`.
That last flag matters: Mongoose skips validators on update by default, so today a PUT can write
`status: "pwned"`. Add it to every `findOneAndUpdate`, including the `$push` ones.

- `applications/[id]/route.ts` — allowlist `[company, role, companyLogo, status, jobUrl, jobDescription,
  location, workMode, jobType, salaryMin, salaryMax, salaryCurrency, appliedDate, deadline, followUpDate, tags]`.
  Excluded deliberately: `user`, `_id`, `createdAt`, and the subdocument arrays (they have dedicated routes;
  letting PUT replace `notes` wholesale is data loss *and* a schema bypass). Coerce dates/numbers. Invalid
  ObjectId → **404 identical to real not-found**, so malformed and someone-else's are indistinguishable.
  Drop the invalid `statusText` on the 200.
- `user/profile/route.ts` — allowlist `[name, bio, location, phone, linkedIn, portfolio, currency,
  jobSearchStatus, photo, resume]`. `photo`/`resume` must parse as `https:` URLs on `res.cloudinary.com`
  (they only ever come from our own upload route) — this closes a stored-XSS vector, since `photo:
  "javascript:alert(1)"` is accepted today and round-trips into the JWT. Length-cap free text; add the
  missing null check (it currently 200s a `null` body if the user is gone).
- `upload/route.ts` — the real CSRF exposure. `guard(req, {csrf:true})`; plus a required `x-upload-request: 1`
  header added to both callers (forces a preflight we never answer — belt-and-braces, independent of header
  trust; do **not** set `Content-Type` manually on those fetches, `FormData` needs the browser boundary).
  MIME allowlist keyed off folder, **verified by sniffing magic bytes** (`%PDF-`, `\xFF\xD8\xFF`, `\x89PNG`)
  — `file.type` is client-supplied, so without sniffing "allowlist" means asking the attacker nicely.
  Allowlist `folder` to `['avatars','prep-files']` (currently client-controlled and interpolated into the
  Cloudinary path). Replace the blind `as File` cast with `instanceof File`.
- `auth/register/route.ts` — `guard(req, {auth:false, rateLimit:'register'})`, `typeof` guards (fixes the
  non-string-email → 500), `isValidEmail`, `validatePassword`, name length 1–100. Keep the 409. Also catch
  Mongo `11000` on create and return the same 409, closing the check-then-create race. Do not return `userId`.
  Note: keep the register limit **IP-keyed** — keying it on email would let an attacker exhaust a victim's
  registration budget.
- `user/password/route.ts` — `.select('+password')`, use `validatePassword`, reject new === current, set
  `passwordChangedAt`, and rate-limit with the `'login'` config keyed on user id (it's an authenticated
  password oracle).
- `applications/[id]/status/route.ts` — **delete all four `console.log` calls** (they write user and
  application ids to the log sink). Keep the existing enum check, add a `typeof` guard.
- `notes` / `contacts` / `prep-files` — body-supplied ids through `toObjectId` → 400 (not 404; a body id has
  no enumeration surface). `prep-files` DELETE currently ignores its update result and always reports success —
  404 on null. Two live data-loss bugs to fix while in these files: `contacts` reads `linkedin` but the schema
  field is `linkedIn`, and `notes` destructures `WhatToImprove` (capital W) against a `whatToImprove` field —
  both silently drop on write.
- `applications/route.ts` — validate the `status` query param against the enum (today garbage silently returns
  `[]`, which looks like data loss); validate `tags` is an array **of strings** with a cap.
- `dashboard/route.ts` — change `GET()` to `GET(req: Request)` for preamble uniformity; type the `(note: any)`.
- `package.json` — drop `rate-limiter-flexible`.
- `CLAUDE.md` — update the env note (only `AUTH_SECRET` is read now) and the "Security helpers" section that
  documents these as unused.

## Commit order

Separate commits so a bisect is meaningful. **No `Co-Authored-By` trailer.**

1. Middleware rename — independent, and breakage is instantly visible in the manifest.
2. Primitives, no callers yet: `sanitize.ts` fix, `respond.ts`, `validate.ts`, `csrf.ts`, `RateLimit.ts`,
   `rateLimiter.ts` rewrite. (Batchable with 3.)
3. `guard.ts`, composing them. Still no callers.
4. `User.ts` fields + `select: false` + the two `.select('+password')` fixes — **alone**, since missing a call
   site breaks login. Log in immediately after.
5. `auth.ts` lockout/timing/typing + `loginErrors.ts` + login page `result.code`. Verify all three login
   outcomes before touching routes.
6. Routes in risk order: `applications/[id]` PUT → `user/profile` PUT → `upload` → `register` →
   `user/password` → the four subdocument routes → `applications` list → `dashboard`.
7. `package.json` + `CLAUDE.md` cleanup.

## Verification

No test framework, so this is the acceptance suite. `npm run dev`, with a Mongo shell on `ratelimits` and
`users`. Get a cookie: log in, copy `authjs.session-token` from DevTools, `export C='authjs.session-token=<v>'`.

**Rate limiting** — 7 wrong logins via `POST /api/auth/callback/credentials` (form-encoded): first 5 behave
alike, 6–7 redirect with `code=too_many_attempts`. Confirm `db.ratelimits` shows `count: 7`. **Then restart
`next dev` and retry — the block must persist.** That restart is the entire point of the Mongo constraint; an
in-memory Map passes every other check here. Register: 201/201/201 then 429 with `Retry-After`. API: 100×200
then 429. Roll `expiresAt` into the past manually → allowed again with `count: 1`. Stop Mongo → login fails
cleanly (closed), `GET /api/applications` still reaches its own 500 (open).

**Sanitization** — PUT `{"company":"Salary $gte 100k & $and Co", "$set":{...}, "notes":[]}` → 200, and re-GET
must show `company` **byte-identical including `$gte` and `$and`** (this is the regression the old
`sanitizeInput` caused), with `user`/`notes` untouched. Mass assignment: PUT another user's id + `createdAt` +
`_id` alongside a real `status` change → status updates, the rest untouched; log in as a second user and
confirm the application is still invisible to them. `{"user.name":"x"}` dropped. `{"__proto__":{"admin":true}}`
→ `({}).admin` still undefined. `{"status":"pwned"}` → 400 (only works with `runValidators`). `/api/applications/not-an-id`
→ 404 with a body identical to real not-found and **no CastError in the terminal**. `Content-Type: text/plain`
→ 415; malformed JSON → 400 not 500. `{"photo":"javascript:alert(1)"}` → 400.

**Lockout** — register `lock@example.com`, fail 5× **from the browser form**. ⚠️ Clear the `login:ip:*` doc
first, or the IP limit fires before the lockout and you'll believe lockout works when it doesn't — this
ordering trap is the main thing to watch. Watch `failedLoginAttempts` climb 1→5 and `lockUntil` set on the 5th.
Correct password → "account is temporarily locked", not signed in. Wrong password while locked → generic
message (proving lock state doesn't leak to a guesser). Reset `lockUntil` to the past → correct password signs
in and counters zero. Fail 3× then succeed → counter back to 0.

Timing: `time` an unknown-email login vs a known-email-wrong-password login, 5 runs each, compare medians.
Both should be ~250–400 ms at cost 12. If the unknown case is ~5 ms, `DUMMY_HASH` isn't being compared.

**CSRF** — the test that matters: save a cross-site form and open it over `file://` while logged in
(`file://` yields `Sec-Fetch-Site: cross-site`, exactly like an attacker page):
```html
<form action="http://localhost:3000/api/upload" method="POST" enctype="multipart/form-data">
  <input type="file" name="file"><input type="hidden" name="folder" value="avatars"><button>go</button>
</form>
```
Run it **before** the fix (upload succeeds) and after (403), so you've seen the vulnerability, not just the fix.
Then via curl on a JSON route: `Sec-Fetch-Site: cross-site` → 403; `Origin: https://evil.example` → 403;
`Origin: http://localhost:3000` → 200; neither header → **200** (the documented fallback — confirm it, or every
other curl test in this suite will fail confusingly); GET with `Sec-Fetch-Site: cross-site` → 200 (exempt by
design). Regression: sign in, sign out, register through the browser — `/api/auth/*` must be untouched.

**Error messages** — `grep -rn "console.log" src/app/api/` returns nothing. Stop Mongo, hit a route → body is
exactly `{"error":"Something went wrong"}`, no stack or Mongoose text, while the terminal shows the real error
with its scope tag. Every route with no cookie → identical `401 {"error":"Unauthorized"}`. Another user's
application by real id → 404 byte-identical to a nonexistent id. Check for `X-Powered-By` and set
`poweredByHeader: false` if present.

**Build gate** — `npm run build` must pass with zero TS errors after **each** of the seven phases, not just at
the end; it's the only automated net and it's what catches a `guard()` narrowing mistake or a missed
`Promise<{id}>` param. Confirm `.next/server/middleware-manifest.json` no longer has an empty `middleware` key.

## Explicitly deferred

- **Session `maxAge` / 7-day expiry / remember-me / invalidation on password change** → Step H. Nothing here
  touches `session` or `jwt` config. ⚠️ Consequence to accept: until Step H ships, a lockout blocks new
  sign-ins but does **not** kick out an already-signed-in session. If that gap matters, the answer is to pull
  Step H forward, not to widen Step A.
- **A double-submit CSRF token** — Origin/`Sec-Fetch-Site` plus the JSON Content-Type requirement is the right
  level for a same-origin cookie-session app; a token adds plumbing to every TanStack mutation for no extra
  coverage. Revisit only for a cross-origin client.
- **Zod** — by the end of Step A you will have written a distributed hand-rolled validator. The right moment to
  adopt Zod is when Step C's reset flow and Step G's forms make it a third rewrite, not now.
- **CSP / security headers** — valuable, but a strict CSP with Tailwind v4 + Next inline styles is half a day
  of nonce plumbing. Its own step.
- **Redis rate limiting** — `checkRateLimit`'s signature is storage-agnostic; swapping later is one file.
- **Lockout notification email** → needs Resend (Step C). **Reset rate limiting** → the `reset` config already
  exists; Step C just calls `checkRateLimit(key, 'reset')`.
