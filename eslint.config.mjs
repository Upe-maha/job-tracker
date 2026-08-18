import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Server-only modules. Importing any of these from an isomorphic or client
// file either breaks the build or silently ships Mongoose to the browser.
//
// src/server is banned as a whole directory rather than as a list of its
// subpaths. The list was the hole: it named dal, db, api and email, so
// @/lib/auth, @/lib/security/csrf and @/lib/security/rateLimiter were
// importable from a 'use client' file with no complaint. A directory cannot
// fall out of date as new modules land beside the old ones.
//
// Both "*" and "**" are listed because ESLint matches these gitignore-style,
// where a single * does not cross a slash.
const SERVER_ONLY = [
  { group: ["mongoose", "@/models/*"], message: "Server-only. Keep this layer importable from a 'use client' file." },
  { group: ["next/server", "next/headers"], message: "Server-only. Keep this layer importable from a 'use client' file." },
  { group: ["@/server", "@/server/*", "@/server/**"], message: "src/server never ships to the browser. Reach it through /api." },
  // The Resend SDK carries the API key and has no business in a bundle. It is
  // named separately so the transport cannot be smuggled past the @/server ban
  // by importing the SDK directly.
  { group: ["resend"], message: "Server-only. Mail is sent by a route, not by a component." },
];

// The UI tiers sit above shared and server: both may import downward, neither
// may be imported back. Without this, a schema is one autocomplete away from
// depending on a React component and ceasing to be environment-neutral.
const NO_UPWARD_IMPORTS = [
  {
    group: ["@/client", "@/client/*", "@/client/**", "@/components/*", "@/components/**", "@/hooks/*", "@/hooks/**"],
    message: "Shared code is imported by the UI, never the other way round.",
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // ── Layering ────────────────────────────────────────────────────────────
  // The one-way rule the architecture depends on, enforced rather than
  // documented: schemas and display metadata are imported by both a route
  // handler and a 'use client' form, which is what lets one definition serve
  // both sides. A single mongoose import inside them breaks that silently.
  //
  // This used to be four globs, two of them naming individual files, because
  // src/lib/security/ mixed isomorphic modules (sanitize, loginErrors) with
  // server-only ones (csrf, rateLimiter). src/shared/ does not mix, so
  // membership is decided by location and the list cannot fall out of date.
  {
    files: ["src/shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [...SERVER_ONLY, ...NO_UPWARD_IMPORTS] },
      ],
    },
  },

  // Models own persistence shape only; they import enum values from the
  // schema layer and nothing else from the app.
  {
    files: ["src/models/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["next/server", "@/server/*", "@/server/**", "@/client/*", "@/client/**"], message: "Models declare schema and indexes only." },
          ],
        },
      ],
    },
  },

  // The DAL stays free of HTTP concerns — that is what keeps it callable from
  // a test without booting NextAuth, and what would let a Server Action reuse
  // it unchanged.
  {
    files: ["src/server/data/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["next/server", "next/headers", "@/server/http/*", "@/server/auth"], message: "The DAL returns data, never a Response." },
          ],
        },
      ],
    },
  },

  // The server tier is the bottom of the stack: it imports downward only. A
  // route handler reaching for apiGet() would have the server fetch itself,
  // and a TanStack query key belongs to the browser, not to Mongoose.
  {
    files: ["src/server/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/client", "@/client/*", "@/client/**", "@/components/*", "@/components/**", "@/hooks/*", "@/hooks/**"],
              message: "src/server is the bottom of the stack. It imports downward only.",
            },
          ],
        },
      ],
    },
  },

  // Client code reaches the database through /api, never directly. src/client
  // is browser-oriented code -- api-client, query keys, the nav table, the
  // theme context -- and the tier exists so that "a route handler must not
  // import apiGet()" is a rule rather than a habit.
  //
  // Note *.{ts,tsx} rather than *.tsx: six .ts files under src/components (the
  // four barrels, landing/sections.ts, landing/content/copy.ts) sat outside
  // the old glob and were unguarded.
  {
    files: ["src/components/**/*.{ts,tsx}", "src/hooks/**/*.{ts,tsx}", "src/client/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: SERVER_ONLY }],
    },
  },

  // App Router pages, layouts and loading boundaries are a composition layer,
  // so this enumerates rather than banning @/server wholesale: a server
  // component legitimately calls auth(), and (dashboard)/layout.tsx's
  // auth() + redirect() is the real enforcement for every dashboard route --
  // middleware.ts only handles the redirect UX. Everything else under
  // src/server is listed, which keeps adding a new server subdirectory a
  // deliberate decision rather than an accident.
  {
    files: ["src/app/**/page.tsx", "src/app/**/layout.tsx", "src/app/**/loading.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["mongoose", "@/models/*", "@/server/db", "@/server/data/*", "@/server/data/**"], message: "Page and layout code talks to /api, not to Mongoose." },
            { group: ["resend", "@/server/email/*", "@/server/email/**"], message: "Mail is sent by a route, not by a page." },
            { group: ["@/server/http/*", "@/server/security/*"], message: "guard()/respond() are for route handlers. A page uses auth() and redirect()." },
          ],
        },
      ],
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
