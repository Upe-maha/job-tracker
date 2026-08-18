// src/shared/display/applications.ts
//
// Presentation metadata for application enums. Isomorphic — same import rule
// as @/shared/schemas: no mongoose, no next/server, no @/lib/api or @/lib/dal.
//
// Typed as Record<Enum, Meta> on purpose: adding a status to
// @/shared/schemas/enums becomes a compile error here until its label and colours
// exist, instead of silently rendering an unstyled column.
import { APPLICATION_STATUSES, JOB_TYPES, WORK_MODES } from '@/shared/schemas/enums'
import type { ApplicationStatus, JobType, WorkMode } from '@/shared/schemas/enums'

interface StatusMeta {
  label: string
  /** Badge classes — detail header, recent-applications list. */
  badge: string
  /** Solid dot — Kanban column headers. */
  dot: string
  /** Dashed border of an empty Kanban column. */
  emptyBorder: string
  /**
   * For Recharts, which renders SVG and cannot read a Tailwind class. A raw
   * `var()` rather than a fixed hex: `fill` is a presentation attribute, so
   * the browser resolves it as a CSS property and the chart re-colours with
   * the theme instead of freezing one mode's palette into the other.
   */
  chart: string
}

// Every stage reads from the --stage-* tokens in globals.css, so a colour
// exists in exactly one place and light/dark are defined together. The chips
// are deliberately off the teal hue family that carries the UI itself —
// status is information, not brand.
export const APPLICATION_STATUS_META: Record<ApplicationStatus, StatusMeta> = {
  wishlist: {
    label: 'Wishlist',
    badge: 'bg-stage-wishlist text-stage-wishlist-fg border-stage-wishlist-fg/20',
    dot: 'bg-stage-wishlist-fg',
    emptyBorder: 'border-stage-wishlist-fg/20',
    chart: 'var(--stage-wishlist-fg)',
  },
  applied: {
    label: 'Applied',
    // Violet, not blue: blue sits too near the cyan primary and the chip would
    // read as a button.
    badge: 'bg-stage-applied text-stage-applied-fg border-stage-applied-fg/20',
    dot: 'bg-stage-applied-fg',
    emptyBorder: 'border-stage-applied-fg/20',
    chart: 'var(--stage-applied-fg)',
  },
  interview: {
    label: 'Interview',
    badge: 'bg-stage-interview text-stage-interview-fg border-stage-interview-fg/20',
    dot: 'bg-stage-interview-fg',
    emptyBorder: 'border-stage-interview-fg/20',
    chart: 'var(--stage-interview-fg)',
  },
  offer: {
    label: 'Offer',
    // 143°, not emerald's ~160° — 160° is only 25° from the cyan and the two
    // would read as siblings rather than as different information.
    badge: 'bg-stage-offer text-stage-offer-fg border-stage-offer-fg/20',
    dot: 'bg-stage-offer-fg',
    emptyBorder: 'border-stage-offer-fg/20',
    chart: 'var(--stage-offer-fg)',
  },
  rejected: {
    label: 'Rejected',
    badge: 'bg-stage-rejected text-stage-rejected-fg border-stage-rejected-fg/20',
    dot: 'bg-stage-rejected-fg',
    emptyBorder: 'border-stage-rejected-fg/20',
    chart: 'var(--stage-rejected-fg)',
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
