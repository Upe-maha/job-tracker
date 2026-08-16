// src/components/applications/detail/NotesTab.tsx
'use client'

import NoteCard from '@/components/notes/NoteCard'
import NoteTabShell from './NoteTabShell'
import { INote } from '@/types'
import type { NoteCreatePayload } from '@/lib/schemas/note'

interface NotesTabProps {
  notes: INote[]
  onAdd: (note: NoteCreatePayload) => Promise<void>
  onDelete: (noteId: string) => Promise<void>
}

export default function NotesTab({ notes, onAdd, onDelete }: NotesTabProps) {
  const generalNotes = notes.filter(n => n.type === 'general')

  return (
    <NoteTabShell
      description="General notes about this application"
      addLabel="Add Note"
      emptyMessage="No notes yet. Add your first note."
      isEmpty={generalNotes.length === 0}
      defaultType="general"
      onAdd={onAdd}
    >
      <div className="space-y-3">
        {generalNotes.map(note => (
          <NoteCard key={note._id} note={note} onDelete={onDelete} />
        ))}
      </div>
    </NoteTabShell>
  )
}
