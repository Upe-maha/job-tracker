import { defineConfig } from 'vitest/config'

// Node environment on purpose: everything under test here is isomorphic
// (schemas, security predicates) or server-only. Nothing renders, so jsdom
// would only add startup cost — add a per-file environment override if a
// component test ever lands.
//
// `resolve.tsconfigPaths` is Vite's native replacement for the
// vite-tsconfig-paths plugin; it reads the `@/*` alias out of tsconfig.json.
// That alias still points at ./src, which is what lets a file under tests/
// address its subject by the same specifier the application uses.
//
// The include is a directory contract, not a filename one: tests/unit holds
// the files that run in-process, tests/integration the ones that boot
// mongodb-memory-server. `npm run test:unit` is therefore the fast loop, and
// it cannot accidentally pick up a mongod-booting file -- that file would have
// to be in the wrong directory to be found. No hookTimeout here: each
// integration file already passes 60_000 to its own beforeAll.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
