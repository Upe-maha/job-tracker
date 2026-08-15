// src/components/notes/NoteCard.tsx
'use client'

import { INote } from '@/types'
import { format } from 'date-fns'
import { Trash2 } from 'lucide-react'
import {
  INTERVIEW_ROUND_LABELS,
  NOTE_OUTCOME_BADGES,
  NOTE_TYPE_META,
} from '@/lib/display'

interface NoteCardProps {
  note: INote
  onDelete: (noteId: string) => void
}

export default function NoteCard({ note, onDelete }: NoteCardProps) {
  const config = NOTE_TYPE_META[note.type] ?? NOTE_TYPE_META.general
  const Icon = config.icon

  return (
    <div className={`
      border rounded-xl p-4 space-y-3
      bg-card ${config.bg}
    `}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`flex items-center gap-1.5 ${config.color}`}>
            <Icon className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{config.label}</span>
          </div>

          {/* Round badge */}
          {note.interviewRound && (
            <span className="
              text-xs px-2 py-0.5 rounded-full border
              bg-muted text-muted-foreground border-border
            ">
              {INTERVIEW_ROUND_LABELS[note.interviewRound]}
            </span>
          )}

          {/* Outcome badge */}
          {note.outcome && (
            <span className={`
              text-xs px-2 py-0.5 rounded-full border capitalize
              ${NOTE_OUTCOME_BADGES[note.outcome]}
            `}>
              {note.outcome}
            </span>
          )}
        </div>

        {/* Delete */}
        <button
          onClick={() => onDelete(note._id)}
          className="
            text-muted-foreground hover:text-destructive
            transition-colors shrink-0
          "
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content */}
      <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
        {note.content}
      </p>

      {/* Experience log fields */}
      {note.type === 'experience_log' && (
        <div className="space-y-2 pt-1 border-t border-border">
          {note.whatWentWrong && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                What went wrong
              </p>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {note.whatWentWrong}
              </p>
            </div>
          )}
          {note.whatToImprove && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                What to improve
              </p>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {note.whatToImprove}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Timestamp */}
      <p className="text-xs text-muted-foreground/60">
        {format(new Date(note.createdAt), 'MMM d, yyyy · h:mm a')}
      </p>
    </div>
  )
}