import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Server-only modules. Importing any of these from an isomorphic or client
// file either breaks the build or silently ships Mongoose to the browser.
const SERVER_ONLY = [
  { group: ["mongoose"], message: "Server-only. Keep this layer importable from a 'use client' file." },
  { group: ["next/server"], message: "Server-only. Keep this layer importable from a 'use client' file." },
  { group: ["@/lib/db", "@/models/*"], message: "Server-only. Keep this layer importable from a 'use client' file." },
  { group: ["@/lib/api/*", "@/lib/dal/*"], message: "Server-only. Keep this layer importable from a 'use client' file." },
  // The Resend SDK carries the API key and has no business in a bundle.
  // templates.ts is pure, but it is grouped with the mailer so there is one
  // answer to "may I import from lib/email here" rather than a per-file one.
  { group: ["resend", "@/lib/email/*"], message: "Server-only. Keep this layer importable from a 'use client' file." },
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
            { group: ["next/server", "@/lib/api/*", "@/lib/dal/*", "@/lib/db"], message: "Models declare schema and indexes only." },
          ],
        },
      ],
    },
  },

  // The DAL stays free of HTTP concerns — that is what keeps it callable from
  // a test without booting NextAuth, and what would let a Server Action reuse
  // it unchanged.
  {
    files: ["src/lib/dal/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["next/server", "@/lib/api/*"], message: "The DAL returns data, never a Response." },
          ],
        },
      ],
    },
  },

  // Client code reaches the database through /api, never directly.
  {
    files: ["src/components/**/*.tsx", "src/app/**/page.tsx", "src/app/**/layout.tsx", "src/hooks/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["mongoose", "@/models/*", "@/lib/dal/*", "@/lib/db"], message: "Client code talks to /api, not to Mongoose." },
            { group: ["resend", "@/lib/email/*"], message: "Mail is sent by a route, not by a component." },
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
