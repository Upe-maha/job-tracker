// src/shared/schemas/note.ts
import { z } from 'zod'
import { INTERVIEW_ROUNDS, NOTE_OUTCOMES, NOTE_TYPES } from './enums'
import { isCloudinaryUrl, objectId, text } from './common'

export const MAX_NOTE_CONTENT_LENGTH = 20000
export const MAX_NOTE_FEEDBACK_LENGTH = 5000
export const MAX_ATTACHMENT_NAME_LENGTH = 200

// Step F. One optional PDF per note; null is "none".
//
// The non-empty guard is not redundant: cloudinaryUrl treats '' as "cleared"
// and returns true for it, which is right for a field that can be blanked and
// wrong here, where an attachment either has a url or does not exist. Same trap
// prepFileCreateSchema documents.
export const noteAttachmentSchema = z
  .object({
    url: z
      .string({ error: 'Attachment is required' })
      .min(1, { error: 'Attachment is required' })
      .refine(isCloudinaryUrl, {
        error: 'Attachment must be an uploaded file URL',
      }),
    name: text('Attachment name', { min: 1, max: MAX_ATTACHMENT_NAME_LENGTH }),
  })
  .nullable()

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
  attachment: noteAttachmentSchema,
}

export const noteCreateSchema = z.object({
  type: fields.type.default('general'),
  content: fields.content,
  interviewRound: fields.interviewRound.default(null),
  outcome: fields.outcome.default(null),
  whatWentWrong: fields.whatWentWrong.default(''),
  whatToImprove: fields.whatToImprove.default(''),
  attachment: fields.attachment.default(null),
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
  attachment: fields.attachment,
})

export const noteTypeFilterSchema = z.enum(NOTE_TYPES, {
  error: 'Invalid note type filter',
})

export const noteDeleteSchema = z.object({ noteId: objectId('note id') })

// Partial for the same reason applicationUpdateSchema is: the route $sets only
// the keys it receives, so an absent field is left alone rather than cleared.
// The modal happens to send all six every time (noteFormSchema has no defaults
// and handleTypeChange clears what the new type doesn't show), which is what
// makes switching a note's type clear its stale round and outcome server-side.
//
// > 1 rather than > 0 because noteId always occupies one key — the check is
// for at least one *updatable* field, matching the application version.
export const noteUpdateSchema = z
  .object(fields)
  .partial()
  .extend({ noteId: objectId('note id') })
  .refine(v => Object.keys(v).length > 1, { error: 'No valid fields to update' })

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
export type NoteUpdatePayload = z.input<typeof noteUpdateSchema>
export type NoteFormValues = z.input<typeof noteFormSchema>
export type NoteFormOutput = z.output<typeof noteFormSchema>
export type NoteAttachmentInput = z.infer<typeof noteAttachmentSchema>
