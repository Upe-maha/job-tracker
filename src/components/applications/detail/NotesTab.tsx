// src/components/applications/detail/NotesTab.tsx
'use client'

import NoteCard from '@/components/notes/NoteCard'
import NotesTabShell from './NotesTabShell'
import { INote } from '@/types'
import type { NoteCreatePayload } from '@/shared/schemas/note'

interface NotesTabProps {
  notes: INote[]
  onAdd: (note: NoteCreatePayload) => Promise<void>
  onEdit: (note: INote) => void
  onDelete: (noteId: string) => Promise<void>
}

export default function NotesTab({
  notes,
  onAdd,
  onEdit,
  onDelete,
}: NotesTabProps) {
  const generalNotes = notes.filter(n => n.type === 'general')

  return (
    <NotesTabShell
      description="General notes about this application"
      addLabel="Add Note"
      emptyMessage="No notes yet. Add your first note."
      isEmpty={generalNotes.length === 0}
      defaultType="general"
      onAdd={onAdd}
    >
      <div className="space-y-3">
        {generalNotes.map(note => (
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
