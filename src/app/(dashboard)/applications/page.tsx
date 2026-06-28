// src/app/(dashboard)/applications/page.tsx
'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AddApplicationModal, KanbanBoard } from '@/components/applications'
import { IApplication } from '@/types'

async function fetchApplications(): Promise<IApplication[]> {
  const res = await fetch('/api/applications')
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export default function ApplicationsPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: fetchApplications,
  })

  const filtered = applications.filter(app =>
    app.company.toLowerCase().includes(search.toLowerCase()) ||
    app.role.toLowerCase().includes(search.toLowerCase())
  )

  function handleSuccess() {
    queryClient.invalidateQueries({ queryKey: ['applications'] })
  }

  return (
    <div className="flex flex-col gap-6 h-full bg-background">

      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search company or role..."
            value={search}
            onChange={e => setSearch(e.target.value)}
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
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && applications.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
            <Plus className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-foreground font-medium">No applications yet</p>
          <p className="text-muted-foreground text-sm">
            Start tracking your job search
          </p>
          <Button
            onClick={() => setModalOpen(true)}
            className="bg-brand hover:bg-brand-hover gap-2 mt-1 text-primary-foreground"
          >
            <Plus className="w-4 h-4" />
            Add First Job
          </Button>
        </div>
      )}

      {/* Kanban board */}
      {!isLoading && applications.length > 0 && (
        <KanbanBoard applications={filtered} />
      )}

      {/* Modal */}
      <AddApplicationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
      />

    </div>
  )
}