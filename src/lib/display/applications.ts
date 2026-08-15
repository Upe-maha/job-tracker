// src/lib/display/applications.ts
//
// Presentation metadata for application enums. Isomorphic — same import rule
// as @/lib/schemas: no mongoose, no next/server, no @/lib/api or @/lib/dal.
//
// Typed as Record<Enum, Meta> on purpose: adding a status to
// @/lib/schemas/enums becomes a compile error here until its label and colors
// exist, instead of silently rendering an unstyled column.
import { APPLICATION_STATUSES, JOB_TYPES, WORK_MODES } from '@/lib/schemas/enums'
import type { ApplicationStatus, JobType, WorkMode } from '@/lib/schemas/enums'

interface StatusMeta {
  label: string
  /** Badge classes — detail header, recent-applications list. */
  badge: string
  /** Solid dot — Kanban column headers. */
  dot: string
  /** Dashed border of an empty Kanban column. */
  emptyBorder: string
  /** Raw hex for Recharts, which cannot read Tailwind classes. */
  hex: string
}

export const APPLICATION_STATUS_META: Record<ApplicationStatus, StatusMeta> = {
  wishlist: {
    label: 'Wishlist',
    badge: 'bg-muted text-muted-foreground border-border',
    dot: 'bg-muted-foreground',
    emptyBorder: 'border-border',
    hex: '#64748b',
  },
  applied: {
    label: 'Applied',
    badge: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    dot: 'bg-blue-500',
    emptyBorder: 'border-blue-500/20',
    hex: '#3b82f6',
  },
  interview: {
    label: 'Interview',
    badge: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    dot: 'bg-yellow-500',
    emptyBorder: 'border-yellow-500/20',
    hex: '#eab308',
  },
  offer: {
    label: 'Offer',
    badge: 'bg-green-500/10 text-green-500 border-green-500/20',
    dot: 'bg-green-500',
    emptyBorder: 'border-green-500/20',
    hex: '#22c55e',
  },
  rejected: {
    label: 'Rejected',
    badge: 'bg-red-500/10 text-red-500 border-red-500/20',
    dot: 'bg-red-500',
    emptyBorder: 'border-red-500/20',
    hex: '#ef4444',
  },
}

// Ordered list for Kanban columns and <Select> options, derived from the enum
// so column order and enum order cannot disagree.
export const APPLICATION_STATUS_OPTIONS = APPLICATION_STATUSES.map(value => ({
  value,
  ...APPLICATION_STATUS_META[value],
}))

// '' is a real member of these two — the "not specified" option — but it is
// not selectable: the Select renders a placeholder for it instead.
export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  'on-site': 'On-site',
  '': 'Not specified',
}

export const WORK_MODE_OPTIONS = WORK_MODES.filter(v => v !== '').map(value => ({
  value,
  label: WORK_MODE_LABELS[value],
}))

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
  '': 'Not specified',
}

export const JOB_TYPE_OPTIONS = JOB_TYPES.filter(v => v !== '').map(value => ({
  value,
  label: JOB_TYPE_LABELS[value],
}))
