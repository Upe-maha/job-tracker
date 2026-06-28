
// ─── Note ─────────────────────────────────────────────
export type NoteType =
  | 'interview_question'
  | 'personal_experience'
  | 'experience_log'
  | 'general'

export type InterviewRound =
  | 'round_1'
  | 'round_2'
  | 'hr'
  | 'technical'
  | 'final'
  | 'other'

export type NoteOutcome = 'passed' | 'failed' | 'waiting'

export interface INote {
  _id: string
  type: NoteType
  content: string
  interviewRound?: InterviewRound
  outcome?: NoteOutcome
  whatWentWrong?: string
  whatToImprove?: string
  createdAt: string
  updatedAt: string
}

// ─── Prep File ────────────────────────────────────────
export interface IPrepFile {
  _id: string
  name: string
  type: 'pdf' | 'link'
  url: string
  scrapedContent?: string
  createdAt: string
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
export type ApplicationStatus =
  | 'wishlist'
  | 'applied'
  | 'interview'
  | 'offer'
  | 'rejected'

export type WorkMode = 'remote' | 'hybrid' | 'on-site' | ''
export type JobType =
  | 'full-time'
  | 'part-time'
  | 'contract'
  | 'internship'
  | ''

export interface IApplication {
  _id: string
  user: string
  company: string
  role: string
  companyLogo?: string
  status: ApplicationStatus
  jobUrl?: string
  jobDescription?: string
  location?: string
  workMode?: WorkMode
  jobType?: JobType
  salaryMin?: number
  salaryMax?: number
  salaryCurrency?: string
  appliedDate?: string
  deadline?: string
  followUpDate?: string
  notes: INote[]
  prepFiles: IPrepFile[]
  contacts: IContact[]
  tags: string[]
  createdAt: string
  updatedAt: string
}





// ─── User ─────────────────────────────────────────────
export type JobSearchStatus =
  | 'actively_looking'
  | 'open'
  | 'not_looking'

export interface IUser {
  _id: string
  name: string
  email: string
  photo?: string
  bio?: string
  location?: string
  phone?: string
  linkedIn?: string
  portfolio?: string
  resume?: string
  currency?: string
  jobSearchStatus?: JobSearchStatus
  createdAt: string
  updatedAt: string
}

// ─── Dashboard ────────────────────────────────────────
export interface IDashboardStats {
  total: number
  wishlist: number
  applied: number
  interview: number
  offer: number
  rejected: number
  deadlinesThisWeek: IApplication[]
  followUpsThisWeek: IApplication[]
}

// ─── Notes Feed (dashboard) ───────────────────────────
export interface INoteFeedItem {
  noteId: string
  applicationId: string
  company: string
  companyLogo?: string
  noteType: NoteType
  content: string
  createdAt: string
}