// src/components/notes/NoteCard.tsx
'use client'

import { INote } from '@/types'
import { format } from 'date-fns'
import { Trash2, MessageSquare, Brain, BookOpen, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface NoteCardProps {
  note: INote
  onDelete: (noteId: string) => void
}

const noteTypeConfig = {
  interview_question: {
    label: 'Interview Question',
    icon: MessageSquare,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10 border-blue-500/20',
  },
  personal_experience: {
    label: 'Personal Experience',
    icon: Brain,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10 border-purple-500/20',
  },
  experience_log: {
    label: 'Experience Log',
    icon: BookOpen,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10 border-orange-500/20',
  },
  general: {
    label: 'General Note',
    icon: FileText,
    color: 'text-muted-foreground',
    bg: 'bg-muted border-border',
  },
}

const outcomeConfig = {
  passed: 'bg-green-500/10 text-green-500 border-green-500/20',
  failed: 'bg-red-500/10 text-red-500 border-red-500/20',
  waiting: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
}

const roundLabels: Record<string, string> = {
  round_1: 'Round 1',
  round_2: 'Round 2',
  hr: 'HR Round',
  technical: 'Technical',
  final: 'Final Round',
  other: 'Other',
}

export default function NoteCard({ note, onDelete }: NoteCardProps) {
  const config = noteTypeConfig[note.type] ?? noteTypeConfig.general
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
              {roundLabels[note.interviewRound]}
            </span>
          )}

          {/* Outcome badge */}
          {note.outcome && (
            <span className={`
              text-xs px-2 py-0.5 rounded-full border capitalize
              ${outcomeConfig[note.outcome]}
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