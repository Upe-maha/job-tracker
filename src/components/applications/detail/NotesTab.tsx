// src/components/applications/detail/NotesTab.tsx
'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import NoteCard from '@/components/notes/NoteCard'
import AddNoteModal from '@/components/notes/AddNoteModal'
import { INote } from '@/types'

interface NotesTabProps {
  notes: INote[]
  onAdd: (note: Partial<INote>) => Promise<void>
  onDelete: (noteId: string) => Promise<void>
}

export default function NotesTab({ notes, onAdd, onDelete }: NotesTabProps) {
  const [modalOpen, setModalOpen] = useState(false)

  const generalNotes = notes.filter(n => n.type === 'general')

  return (
    <div className="space-y-4">

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          General notes about this application
        </p>
        <Button
          onClick={() => setModalOpen(true)}
          size="sm"
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Note
        </Button>
      </div>

      {/* Notes list */}
      {generalNotes.length === 0 ? (
        <EmptyState message="No notes yet. Add your first note." />
      ) : (
        <div className="space-y-3">
          {generalNotes.map(note => (
            <NoteCard
              key={note._id}
              note={note}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      <AddNoteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={onAdd}
        defaultType="general"
      />
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="
      border-2 border-dashed border-border rounded-xl
      flex items-center justify-center h-32
    ">
      <p className="text-muted-foreground/50 text-sm">{message}</p>
    </div>
  )
}