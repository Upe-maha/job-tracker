# `src/client` — browser-oriented

Modules written for the browser: the fetch wrapper every hook goes through,
the TanStack query-key registry, the nav table the sidebar and breadcrumbs
share, and the theme context.

| | |
|---|---|
| **May import** | `@/shared/*`, `@/types` |
| **Must not import** | `@/server/*`, `@/components/*`, `@/hooks/*` |

The `@/server` ban is what this tier is for. Without it, a route handler
importing `apiGet()` — the server fetching itself over HTTP — is a legal
import that nothing would flag.

**Contains:** `api-client.ts` · `query-keys.ts` · `navigation.ts` · `theme.tsx`
