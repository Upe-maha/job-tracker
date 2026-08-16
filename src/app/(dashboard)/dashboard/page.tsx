// src/app/(dashboard)/dashboard/page.tsx
'use client'

import { useDashboard } from '@/hooks/useQueries'
import { FileText, Calendar, Briefcase } from 'lucide-react'
import {
  StatsGrid,
  NotesFeed,
  DeadlinesList,
  RecentApplications,
} from '@/components/dashboard'
import PageShell, { PageGrid } from '@/components/common/PageShell'
import ErrorState from '@/components/common/ErrorState'
import { DashboardSkeleton } from '@/components/common/Skeletons'

function SectionHeading({
  icon: Icon,
  title,
  count,
}: {
  icon: typeof Calendar
  title: string
  count: number
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <h2 className="text-foreground font-semibold text-sm">{title}</h2>
      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full ml-auto">
        {count}
      </span>
    </div>
  )
}

export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useDashboard()

  // The shell renders on the first frame regardless of the query, so a
  // navigation here paints immediately. Only the body below swaps.
  return (
    <PageShell>
      {isLoading ? (
        <DashboardSkeleton />
      ) : isError || !data ? (
        // Previously `isLoading || !data` meant a failed request left this
        // page showing "Loading..." with no error and no way out.
        <ErrorState error={error} onRetry={() => refetch()} isRetrying={isFetching} />
      ) : (
        <>
          <StatsGrid stats={data.stats} />

          <PageGrid>
            <section className="md:col-span-6 space-y-3">
              <SectionHeading
                icon={Calendar}
                title="This Week"
                count={data.deadlinesThisWeek.length + data.followUpsThisWeek.length}
              />
              <DeadlinesList
                deadlines={data.deadlinesThisWeek}
                followUps={data.followUpsThisWeek}
              />
            </section>

            <section className="md:col-span-6 space-y-3">
              <SectionHeading
                icon={Briefcase}
                title="Recent Applications"
                count={data.recentApplications.length}
              />
              <RecentApplications applications={data.recentApplications} />
            </section>
          </PageGrid>

          <section className="space-y-3">
            <SectionHeading icon={FileText} title="Notes Feed" count={data.notesFeed.length} />
            <NotesFeed notes={data.notesFeed} />
          </section>
        </>
      )}
    </PageShell>
  )
}
