// src/app/(dashboard)/analytics/loading.tsx
// Route-level Suspense boundary: its presence is what lets the router commit the
// navigation immediately instead of holding the previous page on screen.
import PageShell from '@/components/common/PageShell'
import { AnalyticsSkeleton } from '@/components/common/Skeletons'

export default function Loading() {
  return (
    <PageShell>
      <AnalyticsSkeleton />
    </PageShell>
  )
}
