// src/lib/schemas/enums.ts
//
// Single source of truth for every enumerated field in the app. Imported by the
// Zod schemas next door, by the Mongoose models' `enum:` arrays, and re-exported
// as unions from @/types — so adding a status is a one-line change instead of a
// five-file hunt.
//
// Must stay free of server-only imports (mongoose, next/server, @/lib/api/*):
// 'use client' forms import the schemas built on this file. Same rule as
// src/lib/security/loginErrors.ts.

export const APPLICATION_STATUSES = [
  'wishlist',
  'applied',
  'interview',
  'offer',
  'rejected',
] as const

// '' is a real, storable value in these two — the "not specified" option the
// Add form leaves blank — not an absent field. That's why it's an enum member
// rather than the field being optional.
export const WORK_MODES = ['remote', 'hybrid', 'on-site', ''] as const

export const JOB_TYPES = [
  'full-time',
  'part-time',
  'contract',
  'internship',
  '',
] as const

export const NOTE_TYPES = [
  'interview_question',
  'personal_experience',
  'experience_log',
  'general',
] as const

export const INTERVIEW_ROUNDS = [
  'round_1',
  'round_2',
  'hr',
  'technical',
  'final',
  'other',
] as const

export const NOTE_OUTCOMES = ['passed', 'failed', 'waiting'] as const

export const PREP_FILE_TYPES = ['pdf', 'link'] as const

export const JOB_SEARCH_STATUSES = [
  'actively_looking',
  'open',
  'not_looking',
] as const

export const OAUTH_PROVIDERS = ['google', 'github'] as const

// Step C. The type is part of the security boundary, not a label: consumeToken
// matches on it so a password_reset link can never be redeemed against
// verify-email, which would hand a token a capability it was not issued for.
// Step E adds 'account_link': proof that the OAuth round trip about to happen
// was started by an already-signed-in user, so the signIn callback links the
// provider to *that* user instead of resolving one from the provider's email.
export const TOKEN_TYPES = [
  'email_verify',
  'password_reset',
  'password_change',
  'account_link',
] as const

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]
export type WorkMode = (typeof WORK_MODES)[number]
export type JobType = (typeof JOB_TYPES)[number]
export type NoteType = (typeof NOTE_TYPES)[number]
export type InterviewRound = (typeof INTERVIEW_ROUNDS)[number]
export type NoteOutcome = (typeof NOTE_OUTCOMES)[number]
export type PrepFileType = (typeof PREP_FILE_TYPES)[number]
export type JobSearchStatus = (typeof JOB_SEARCH_STATUSES)[number]
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number]
export type TokenType = (typeof TOKEN_TYPES)[number]
