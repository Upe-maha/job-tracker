// src/lib/schemas/note.ts
import { z } from 'zod'
import { INTERVIEW_ROUNDS, NOTE_OUTCOMES, NOTE_TYPES } from './enums'
import { objectId, text } from './common'

export const MAX_NOTE_CONTENT_LENGTH = 20000
export const MAX_NOTE_FEEDBACK_LENGTH = 5000

// interviewRound and outcome are .nullish() rather than .optional(): the route
// they replace tested `!= null`, so an explicit null has always meant "not
// applicable" and had to be accepted alongside an absent key.
const fields = {
  type: z.enum(NOTE_TYPES, { error: 'Invalid note type' }),
  content: text('Content', { min: 1, max: MAX_NOTE_CONTENT_LENGTH }),
  interviewRound: z
    .enum(INTERVIEW_ROUNDS, { error: 'Invalid interview round' })
    .nullish(),
  outcome: z.enum(NOTE_OUTCOMES, { error: 'Invalid outcome' }).nullish(),
  whatWentWrong: text('What went wrong', { max: MAX_NOTE_FEEDBACK_LENGTH }),
  whatToImprove: text('What to improve', { max: MAX_NOTE_FEEDBACK_LENGTH }),
}

export const noteCreateSchema = z.object({
  type: fields.type.default('general'),
  content: fields.content,
  interviewRound: fields.interviewRound.default(null),
  outcome: fields.outcome.default(null),
  whatWentWrong: fields.whatWentWrong.default(''),
  whatToImprove: fields.whatToImprove.default(''),
})

// What AddNoteModal binds to. Same rules, but every field is present in the
// form state, so nothing is defaulted away.
export const noteFormSchema = z.object({
  type: fields.type,
  content: fields.content,
  interviewRound: fields.interviewRound,
  outcome: fields.outcome,
  whatWentWrong: fields.whatWentWrong,
  whatToImprove: fields.whatToImprove,
})

export const noteTypeFilterSchema = z.enum(NOTE_TYPES, {
  error: 'Invalid note type filter',
})

export const noteDeleteSchema = z.object({ noteId: objectId('note id') })

export const NOTES_PAGE_SIZE = 20
export const NOTES_MAX_PAGE_SIZE = 50

// page feeds $skip: page * limit, and a deep skip makes Mongo walk the whole
// $unwind+$sort before discarding it. Nobody pages 500 deep through their own
// notes by hand, so this only bounds abuse.
export const NOTES_MAX_PAGE = 500

// The /api/notes query string. Callers pass `searchParams.get(k) ?? undefined`
// so a missing param hits the default — passing the raw null instead would
// coerce to 0 and quietly make `limit` zero rather than 20.
export const notesQuerySchema = z.object({
  type: noteTypeFilterSchema.optional(),
  page: z.coerce
    .number({ error: 'Invalid page' })
    .int({ error: 'Invalid page' })
    .min(0, { error: 'Invalid page' })
    .max(NOTES_MAX_PAGE, { error: 'Invalid page' })
    .default(0),
  limit: z.coerce
    .number({ error: 'Invalid limit' })
    .int({ error: 'Invalid limit' })
    .min(1, { error: 'Invalid limit' })
    .max(NOTES_MAX_PAGE_SIZE, { error: 'Invalid limit' })
    .default(NOTES_PAGE_SIZE),
})

// What a client may send — defaulted fields optional. See the note on
// ApplicationCreatePayload for why z.infer is the wrong type for a body.
export type NoteCreatePayload = z.input<typeof noteCreateSchema>
export type NoteCreateInput = z.infer<typeof noteCreateSchema>
export type NoteFormValues = z.input<typeof noteFormSchema>
export type NoteFormOutput = z.output<typeof noteFormSchema>
