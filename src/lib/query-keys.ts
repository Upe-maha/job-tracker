// src/lib/query-keys.ts
//
// Every TanStack key in the app. Keys were previously written inline, which is
// how ['dashboard'] and ['notes', filter] ended up with no invalidator at all
// and how ['application', id] failed to match a prefix invalidation of
// ['applications'].
import type { NoteFilterKey } from '@/shared/display'

export const qk = {
  applications: {
    // Invalidating this prefix also covers every detail() below it.
    all: ['applications'] as const,
    detail: (id: string) => ['applications', id] as const,
  },
  dashboard: ['dashboard'] as const,
  notes: (filter: NoteFilterKey) => ['notes', filter] as const,
  profile: ['profile'] as const,
} as const
