// src/components/notes/NoteCard.tsx
'use client'

import { useState } from 'react'
import { INote } from '@/types'
import { format } from 'date-fns'
import { Pencil, Trash2 } from 'lucide-react'
import ConfirmDeleteDialog from '@/components/common/ConfirmDeleteDialog'
import NoteAttachmentChip from '@/components/notes/NoteAttachmentChip'
import {
  INTERVIEW_ROUND_LABELS,
  NOTE_OUTCOME_BADGES,
  NOTE_TYPE_META,
} from '@/shared/display'

interface NoteCardProps {
  note: INote
  onEdit: (note: INote) => void
  // Widened from `void` so the card can await it and show a pending state.
  onDelete: (noteId: string) => void | Promise<void>
}

export default function NoteCard({ note, onEdit, onDelete }: NoteCardProps) {
  const config = NOTE_TYPE_META[note.type] ?? NOTE_TYPE_META.general
  const Icon = config.icon

  // Both local: the page owns the mutation, so its isPending is out of reach
  // here. onDelete's signature is unchanged — this is the same capability, now
  // behind a confirmation rather than firing straight from the click.
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleConfirmDelete() {
    setIsDeleting(true)
    try {
      await onDelete(note._id)
      setConfirmOpen(false)
    } finally {
      setIsDeleting(false)
    }
  }

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

        {/* Edit + delete */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onEdit(note)}
            aria-label="Edit note"
            className="
              text-muted-foreground hover:text-foreground
              transition-colors
            "
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setConfirmOpen(true)}
            aria-label="Delete note"
            className="
              text-muted-foreground hover:text-destructive
              transition-colors
            "
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
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

      {/* Attachment + timestamp. The chip opens the preview dialog rather than
          linking at Cloudinary, which serves a raw PDF as an octet-stream
          attachment — see md/step-e-profile.md. */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground/60">
          {format(new Date(note.createdAt), 'MMM d, yyyy · h:mm a')}
        </p>

        {note.attachment && (
          <NoteAttachmentChip attachment={note.attachment} className="shrink-0 max-w-[55%]" />
        )}
      </div>

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this note?"
        description="This note will be permanently removed from the application. This cannot be undone."
        onConfirm={handleConfirmDelete}
        isPending={isDeleting}
      />
    </div>
  )
}