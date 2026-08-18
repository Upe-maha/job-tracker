// src/components/applications/detail/InterviewTab.tsx
'use client'

import NoteCard from '@/components/notes/NoteCard'
import NotesTabShell from './NotesTabShell'
import { INTERVIEW_ROUNDS } from '@/shared/schemas/enums'
import { INTERVIEW_ROUND_LABELS } from '@/shared/display'
import { INote } from '@/types'
import type { NoteCreatePayload } from '@/shared/schemas/note'

interface InterviewTabProps {
  notes: INote[]
  onAdd: (note: NoteCreatePayload) => Promise<void>
  onEdit: (note: INote) => void
  onDelete: (noteId: string) => Promise<void>
}

// Group by round for better readability. The trailing null is a grouping
// bucket for notes with no round, not an enum member.
const rounds = [...INTERVIEW_ROUNDS, null]

export default function InterviewTab({
  notes,
  onAdd,
  onEdit,
  onDelete,
}: InterviewTabProps) {
  const interviewNotes = notes.filter(
    n => n.type === 'interview_question' || n.type === 'personal_experience'
  )

  return (
    <NotesTabShell
      description="Questions asked and personal experiences per round"
      addLabel="Add Note"
      emptyMessage="No interview notes yet. Add questions or experiences."
      isEmpty={interviewNotes.length === 0}
      defaultType="interview_question"
      onAdd={onAdd}
    >
      {/* The one thing this tab does differently: group the list by round. */}
      <div className="space-y-6">
        {rounds.map(round => {
          const roundNotes = interviewNotes.filter(n => n.interviewRound === round)
          if (roundNotes.length === 0) return null

          return (
            <div key={round ?? 'no-round'} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="
                  text-xs font-semibold text-muted-foreground uppercase
                  tracking-wider
                ">
                  {round ? INTERVIEW_ROUND_LABELS[round] : 'No Round Specified'}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {roundNotes.map(note => (
                <NoteCard
                  key={note._id}
                  note={note}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )
        })}
      </div>
    </NotesTabShell>
  )
}
