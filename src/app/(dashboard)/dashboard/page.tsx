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

export default function DashboardPage() {
  const { data, isLoading } = useDashboard()

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground text-sm">Loading dashboard...</p>
      </div>
    )
  }

  const {
    stats,
    deadlinesThisWeek,
    followUpsThisWeek,
    notesFeed,
    recentApplications,
  } = data

  return (
    <div className="space-y-8 max-w-6xl mx-auto">

      {/* Welcome */}
      <div>
        <h1 className="text-foreground text-2xl font-bold">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your job search at a glance
        </p>
      </div>

      {/* Stats */}
      <StatsGrid stats={stats} />

      {/* Middle row — deadlines + recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Upcoming deadlines + follow-ups */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-foreground font-semibold text-sm">
              This Week
            </h2>
            <span className="
              text-xs bg-muted text-muted-foreground
              px-2 py-0.5 rounded-full ml-auto
            ">
              {deadlinesThisWeek.length + followUpsThisWeek.length}
            </span>
          </div>
          <DeadlinesList
            deadlines={deadlinesThisWeek}
            followUps={followUpsThisWeek}
          />
        </section>

        {/* Recent applications */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-foreground font-semibold text-sm">
              Recent Applications
            </h2>
            <span className="
              text-xs bg-muted text-muted-foreground
              px-2 py-0.5 rounded-full ml-auto
            ">
              {recentApplications.length}
            </span>
          </div>
          <RecentApplications applications={recentApplications} />
        </section>

      </div>

      {/* Notes feed */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-foreground font-semibold text-sm">
            Notes Feed
          </h2>
          <span className="
            text-xs bg-muted text-muted-foreground
            px-2 py-0.5 rounded-full ml-auto
          ">
            {notesFeed.length}
          </span>
        </div>
        <NotesFeed notes={notesFeed} />
      </section>

    </div>
  )
}