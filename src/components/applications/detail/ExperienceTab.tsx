// src/components/applications/detail/ExperienceTab.tsx
'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import NoteCard from '@/components/notes/NoteCard'
import AddNoteModal from '@/components/notes/AddNoteModal'
import { INote } from '@/types'

interface ExperienceTabProps {
  notes: INote[]
  onAdd: (note: Partial<INote>) => Promise<void>
  onDelete: (noteId: string) => Promise<void>
}

export default function ExperienceTab({
  notes,
  onAdd,
  onDelete,
}: ExperienceTabProps) {
  const [modalOpen, setModalOpen] = useState(false)

  const experienceLogs = notes.filter(n => n.type === 'experience_log')

  return (
    <div className="space-y-4">

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Reflections and lessons for future reference
        </p>
        <Button
          onClick={() => setModalOpen(true)}
          size="sm"
          className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Log
        </Button>
      </div>

      {/* Logs */}
      {experienceLogs.length === 0 ? (
        <EmptyState message="No experience logs yet. Log what happened for future reference." />
      ) : (
        <div className="space-y-3">
          {experienceLogs.map(note => (
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
        defaultType="experience_log"
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