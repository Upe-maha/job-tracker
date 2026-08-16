// src/app/(dashboard)/profile/loading.tsx
// Route-level Suspense boundary. Its presence is what lets the router commit
// the navigation immediately instead of holding the user on the previous page
// until this segment resolves — the page then swaps this for its own skeleton
// while TanStack Query fetches, so the shape never changes.
import PageShell from '@/components/common/PageShell'
import { FormSkeleton } from '@/components/common/Skeletons'

export default function Loading() {
  return (
    <PageShell>
      <FormSkeleton />
    </PageShell>
  )
}
