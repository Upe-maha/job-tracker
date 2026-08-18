// src/app/(dashboard)/applications/page.tsx
'use client'

import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AddApplicationModal, KanbanBoard } from '@/components/applications'
import { useApplications } from '@/hooks/useQueries'
import PageShell from '@/components/common/PageShell'
import ErrorState from '@/components/common/ErrorState'
import { BoardSkeleton } from '@/components/common/Skeletons'

export default function ApplicationsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')

  const {
    data: applications = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useApplications()

  const filtered = applications.filter(
    app =>
      app.company.toLowerCase().includes(search.toLowerCase()) ||
      app.role.toLowerCase().includes(search.toLowerCase())
  )

  // fullBleed: the board scrolls horizontally and needs the whole width. The toolbar
  // stays inside the shared container so it lines up with the breadcrumb.
  return (
    <PageShell
      fullBleed
      actions={
        <>
          <div className="relative w-72 max-w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search company or role..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              disabled={isLoading || isError}
              className="pl-9 bg-input border-input text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <Button
            onClick={() => setModalOpen(true)}
            className="bg-brand hover:bg-brand-hover gap-2 shrink-0 text-primary-foreground"
          >
            <Plus className="w-4 h-4" />
            Add Job
          </Button>
        </>
      }
    >
      {isLoading ? (
        <BoardSkeleton />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} isRetrying={isFetching} />
      ) : applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
            <Plus className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-foreground font-medium">No applications yet</p>
          <p className="text-muted-foreground text-sm">Start tracking your job search</p>
          <Button
            onClick={() => setModalOpen(true)}
            className="bg-brand hover:bg-brand-hover gap-2 mt-1 text-primary-foreground"
          >
            <Plus className="w-4 h-4" />
            Add First Job
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-2">
          <p className="text-foreground font-medium">No matches</p>
          <p className="text-muted-foreground text-sm">
            Nothing matches “{search}”.
          </p>
        </div>
      ) : (
        <KanbanBoard applications={filtered} />
      )}

      <AddApplicationModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </PageShell>
  )
}
