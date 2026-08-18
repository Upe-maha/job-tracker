# `src/server` — server-only

Runs on the server and never ships to a browser. `guard()` in `http/` is every
route's first line; `data/` is the only place Mongoose is touched.

| | |
|---|---|
| **May import** | `@/shared/*`, `@/models/*`, `@/types` |
| **Must not import** | `@/client/*`, `@/components/*`, `@/hooks/*` |

`data/` additionally may not import `next/server`, `next/headers`,
`@/server/http/*` or `@/server/auth` — it returns data, never a `Response`,
which is what keeps it callable from a test without booting NextAuth.

**Contains:** `data/` (data access) · `http/` (guard, validate, respond) ·
`security/` (csrf, rate limiting, session cookie, link intent) · `email/` ·
`auth.ts` · `db.ts`

Enforced by `no-restricted-imports` in `eslint.config.mjs`, not by convention.
