# `src/shared` — environment-neutral

Imported by a route handler and a `'use client'` form alike. That is the whole
point: one definition of a validation rule, one set of enum members, one label
table, used by both sides.

| | |
|---|---|
| **May import** | `@/types` and third-party packages only |
| **Must not import** | `@/server/*`, `@/client/*`, `@/components/*`, `@/hooks/*` |

A single `mongoose` or `next/server` import here breaks the property silently,
which is why the ban is a lint rule rather than a note.

**Contains:** `schemas/` (Zod — the single source of truth for validation and
enums) · `display/` (labels, colours, icons) · `security/` (sanitize,
loginErrors, sessionPolicy — all pure) · `files.ts` · `utils.ts`
