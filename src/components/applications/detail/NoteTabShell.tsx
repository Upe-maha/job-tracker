// src/components/applications/detail/NoteTabShell.tsx
'use client'

import { useState, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import EmptyState from '@/components/common/EmptyState'
import NoteModal from '@/components/notes/NoteModal'
import type { NoteCreatePayload } from '@/lib/schemas/note'
import type { NoteType } from '@/types'

interface NoteTabShellProps {
  description: string
  addLabel: string
  emptyMessage: string
  isEmpty: boolean
  defaultType: NoteType
  onAdd: (note: NoteCreatePayload) => Promise<void>
  /** The tab's own list rendering — the one part that genuinely differs. */
  children: ReactNode
  /** Rendered above the toolbar (ExperienceTab's summary card). */
  header?: ReactNode
  /** ExperienceTab's add button is orange rather than the primary colour. */
  addButtonClass?: string
}

// The toolbar + empty-state + modal scaffold shared by the three note tabs.
// InterviewTab groups its notes by round and ExperienceTab shows a summary
// card, so the list itself stays with each tab rather than being generalised
// into a prop-driven renderer.
export default function NoteTabShell({
  description,
  addLabel,
  emptyMessage,
  isEmpty,
  defaultType,
  onAdd,
  children,
  header,
  addButtonClass = 'bg-primary hover:bg-primary/90 text-primary-foreground',
}: NoteTabShellProps) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="space-y-4">
      {header}

      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">{description}</p>
        <Button
          onClick={() => setModalOpen(true)}
          size="sm"
          className={`${addButtonClass} gap-2`}
        >
          <Plus className="w-3.5 h-3.5" />
          {addLabel}
        </Button>
      </div>

      {isEmpty ? <EmptyState message={emptyMessage} /> : children}

      {/* The shell keeps owning the *add* modal — defaultType is genuinely
          per-tab. The edit modal lives in the detail page, which already owns
          every note handler. */}
      <NoteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={onAdd}
        defaultType={defaultType}
      />
    </div>
  )
}
