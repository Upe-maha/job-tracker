// src/components/applications/detail/ExperienceTab.tsx
'use client'

import NoteCard from '@/components/notes/NoteCard'
import NotesTabShell from './NotesTabShell'
import { INote } from '@/types'
import type { NoteCreatePayload } from '@/lib/schemas/note'

interface ExperienceTabProps {
  notes: INote[]
  onAdd: (note: NoteCreatePayload) => Promise<void>
  onEdit: (note: INote) => void
  onDelete: (noteId: string) => Promise<void>
}

export default function ExperienceTab({
  notes,
  onAdd,
  onEdit,
  onDelete,
}: ExperienceTabProps) {
  const experienceLogs = notes.filter(n => n.type === 'experience_log')

  return (
    <NotesTabShell
      description="Reflections and lessons for future reference"
      addLabel="Add Log"
      emptyMessage="No experience logs yet. Log what happened for future reference."
      isEmpty={experienceLogs.length === 0}
      defaultType="experience_log"
      onAdd={onAdd}
      addButtonClass="bg-stage-interview-fg/90 hover:bg-stage-interview-fg text-background"
    >
      <div className="space-y-3">
        {experienceLogs.map(note => (
          <NoteCard
            key={note._id}
            note={note}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </NotesTabShell>
  )
}
