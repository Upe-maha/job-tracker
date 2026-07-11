// src/components/applications/detail/InterviewTab.tsx
'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import NoteCard from '@/components/notes/NoteCard'
import AddNoteModal from '@/components/notes/AddNoteModal'
import { INote } from '@/types'

interface InterviewTabProps {
  notes: INote[]
  onAdd: (note: Partial<INote>) => Promise<void>
  onDelete: (noteId: string) => Promise<void>
}

export default function InterviewTab({
  notes,
  onAdd,
  onDelete,
}: InterviewTabProps) {
  const [modalOpen, setModalOpen] = useState(false)

  const interviewNotes = notes.filter(
    n => n.type === 'interview_question' || n.type === 'personal_experience'
  )

  // Group by round for better readability
  const rounds = [
    'round_1', 'round_2', 'hr',
    'technical', 'final', 'other', null
  ]

  const roundLabels: Record<string, string> = {
    round_1: 'Round 1',
    round_2: 'Round 2',
    hr: 'HR Round',
    technical: 'Technical',
    final: 'Final Round',
    other: 'Other',
  }

  return (
    <div className="space-y-4">

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Questions asked and personal experiences per round
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

      {/* Notes */}
      {interviewNotes.length === 0 ? (
        <EmptyState message="No interview notes yet. Add questions or experiences." />
      ) : (
        <div className="space-y-6">
          {rounds.map(round => {
            const roundNotes = interviewNotes.filter(
              n => n.interviewRound === round
            )
            if (roundNotes.length === 0) return null

            return (
              <div key={round ?? 'no-round'} className="space-y-3">
                {/* Round label */}
                <div className="flex items-center gap-2">
                  <span className="
                    text-xs font-semibold text-muted-foreground uppercase
                    tracking-wider
                  ">
                    {round ? roundLabels[round] : 'No Round Specified'}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {roundNotes.map(note => (
                  <NoteCard
                    key={note._id}
                    note={note}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )
          })}
        </div>
      )}

      <AddNoteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={onAdd}
        defaultType="interview_question"
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