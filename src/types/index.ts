// This file describes the *wire* shapes — the JSON an API route returns, i.e.
// a serialized Mongoose document (Dates as strings, plus _id/user/timestamps).
// The Zod schemas in @/shared/schemas describe the opposite direction: what a
// route *accepts*. Neither can be derived from the other, so input types come
// from `z.infer` at the bottom of each schema file and output types are these
// hand-written interfaces.
//
// The one thing both directions share is the enum members, which live in
// @/shared/schemas/enums and are re-exported here so `@/types` stays the single
// import site for consumers.
export type {
  ApplicationStatus,
  InterviewRound,
  JobSearchStatus,
  JobType,
  NoteOutcome,
  NoteType,
  OAuthProvider,
  PrepFileType,
  WorkMode,
} from '@/shared/schemas/enums'

import type {
  ApplicationStatus,
  InterviewRound,
  JobSearchStatus,
  JobType,
  NoteOutcome,
  NoteType,
  OAuthProvider,
  PrepFileType,
  WorkMode,
} from '@/shared/schemas/enums'

// ─── Note ─────────────────────────────────────────────
// Step F. The url is the file's identity — it is what /api/files serves from
// and what resolveOwnedFile checks ownership against. Nothing else about the
// Cloudinary asset is stored; see md/step-f-notes-pdf.md.
export interface INoteAttachment {
  url: string
  name: string
}

export interface INote {
  _id: string
  type: NoteType
  content: string
  interviewRound?: InterviewRound | null
  outcome?: NoteOutcome | null
  whatWentWrong?: string
  whatToImprove?: string
  attachment?: INoteAttachment | null
  createdAt: string
  updatedAt: string
}

// ─── Prep File ────────────────────────────────────────
export interface IPrepFile {
  _id: string
  name: string
  type: PrepFileType
  url: string
  createdAt: string
  updatedAt: string
}

// ─── Contact ──────────────────────────────────────────
export interface IContact {
  _id: string
  name: string
  role?: string
  email?: string
  phone?: string
  linkedIn?: string
}

// ─── Application ──────────────────────────────────────
export interface IApplication {
  _id: string
  user: string // User ID string
  company: string
  role: string
  companyLogo?: string
  status: ApplicationStatus
  jobUrl?: string
  jobDescription?: string
  location?: string
  workMode?: WorkMode
  jobType?: JobType
  salaryMin?: number | null
  salaryMax?: number | null
  salaryCurrency?: string
  appliedDate?: string | null
  deadline?: string | null
  followUpDate?: string | null
  notes: INote[]
  prepFiles: IPrepFile[]
  contacts: IContact[]
  tags: string[]
  createdAt: string
  updatedAt: string
}

// ─── User ─────────────────────────────────────────────
export interface ILinkedAccount {
  provider: OAuthProvider
  providerAccountId: string
  linkedAt: string
}

export interface IUser {
  _id: string
  name: string
  email: string
  accounts?: ILinkedAccount[]
  emailVerified?: string | null
  photo?: string
  bio?: string
  location?: string
  phone?: string
  linkedIn?: string
  portfolio?: string
  github?: string
  resume?: string
  currency?: string
  jobSearchStatus?: JobSearchStatus
  failedLoginAttempts?: number
  lockUntil?: string | null
  passwordChangedAt?: string | null
  createdAt: string
  updatedAt: string
}

// ─── Dashboard ────────────────────────────────────────
// The payload /api/dashboard actually returns. The previous IDashboardStats
// nested the deadline lists inside the counts, which never matched the route.
export type IDashboardStats = Record<ApplicationStatus, number> & { total: number }

// Widget rows are projected, not whole applications (CARD_FIELDS in the
// route), and each list projects a different extra field — so the date it
// carries is part of its type rather than an optional on a shared one.
export type IApplicationCard = Pick<
  IApplication,
  '_id' | 'company' | 'role' | 'status' | 'companyLogo'
>

export interface IDashboardResponse {
  stats: IDashboardStats
  deadlinesThisWeek: (IApplicationCard & { deadline: string })[]
  followUpsThisWeek: (IApplicationCard & { followUpDate: string })[]
  notesFeed: INoteFeedItem[]
  recentApplications: (IApplicationCard & { createdAt: string })[]
}

// ─── Notes Feed (dashboard) ───────────────────────────
export interface INoteFeedItem {
  noteId: string
  applicationId: string
  company: string
  companyLogo?: string
  noteType: NoteType
  content: string
  attachment?: INoteAttachment | null
  createdAt: string
}