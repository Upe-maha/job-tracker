// src/lib/display/notes.ts
import { BookOpen, Brain, FileText, MessageSquare } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NOTE_TYPES } from '@/lib/schemas/enums'
import type { InterviewRound, NoteOutcome, NoteType } from '@/lib/schemas/enums'

interface NoteTypeMeta {
  /** Full name — note cards, page headings. */
  label: string
  /** Abbreviated — the dashboard feed, where rows are one line. */
  shortLabel: string
  /** Plural — the filter pills on the notes page. */
  pluralLabel: string
  icon: LucideIcon
  color: string
  /** Tinted surface + border, for a card. */
  bg: string
  /** Solid dot, for a dense list row. */
  dot: string
}

// Three label variants because the three consumers genuinely differ: a card
// has room for 'Interview Question', a feed row does not, and a filter pill
// reads as a plural. Previously these lived in three separate config objects
// that had already drifted apart.
export const NOTE_TYPE_META: Record<NoteType, NoteTypeMeta> = {
  interview_question: {
    label: 'Interview Question',
    shortLabel: 'Interview Q',
    pluralLabel: 'Interview Questions',
    icon: MessageSquare,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10 border-blue-500/20',
    dot: 'bg-blue-500',
  },
  personal_experience: {
    label: 'Personal Experience',
    shortLabel: 'Experience',
    pluralLabel: 'Experiences',
    icon: Brain,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10 border-purple-500/20',
    dot: 'bg-purple-500',
  },
  experience_log: {
    label: 'Experience Log',
    shortLabel: 'Exp Log',
    pluralLabel: 'Experience Logs',
    icon: BookOpen,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10 border-orange-500/20',
    dot: 'bg-orange-500',
  },
  general: {
    label: 'General Note',
    shortLabel: 'Note',
    pluralLabel: 'General',
    icon: FileText,
    color: 'text-muted-foreground',
    bg: 'bg-muted border-border',
    dot: 'bg-muted-foreground',
  },
}

export const NOTE_TYPE_OPTIONS = NOTE_TYPES.map(value => ({
  value,
  ...NOTE_TYPE_META[value],
}))

// The notes page filter bar: every type, preceded by an 'all' pseudo-filter
// that is not a NoteType and never reaches the API as one.
export const NOTE_FILTERS = [
  { key: 'all' as const, label: 'All Notes' },
  ...NOTE_TYPES.map(key => ({ key, label: NOTE_TYPE_META[key].pluralLabel })),
]

export type NoteFilterKey = (typeof NOTE_FILTERS)[number]['key']

export const INTERVIEW_ROUND_LABELS: Record<InterviewRound, string> = {
  round_1: 'Round 1',
  round_2: 'Round 2',
  hr: 'HR Round',
  technical: 'Technical',
  final: 'Final Round',
  other: 'Other',
}

export const NOTE_OUTCOME_BADGES: Record<NoteOutcome, string> = {
  passed: 'bg-green-500/10 text-green-500 border-green-500/20',
  failed: 'bg-red-500/10 text-red-500 border-red-500/20',
  waiting: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
}

export const NOTE_OUTCOME_LABELS: Record<NoteOutcome, string> = {
  passed: 'Passed',
  failed: 'Failed',
  waiting: 'Waiting',
}
