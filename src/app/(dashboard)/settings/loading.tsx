// src/app/(dashboard)/settings/loading.tsx
// Route-level Suspense boundary: its presence is what lets the router commit the
// navigation immediately instead of holding the previous page on screen.
import PageShell from '@/components/common/PageShell'
import { FormSkeleton } from '@/components/common/Skeletons'

export default function Loading() {
  return (
    <PageShell>
      <FormSkeleton />
    </PageShell>
  )
}
