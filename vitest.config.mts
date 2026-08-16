import { defineConfig } from 'vitest/config'

// Node environment on purpose: everything under test here is isomorphic
// (schemas, security predicates) or server-only. Nothing renders, so jsdom
// would only add startup cost — add a per-file environment override if a
// component test ever lands.
//
// `resolve.tsconfigPaths` is Vite's native replacement for the
// vite-tsconfig-paths plugin; it reads the `@/*` alias out of tsconfig.json.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
