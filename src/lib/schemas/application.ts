// src/lib/schemas/application.ts
import { z } from 'zod'
import { APPLICATION_STATUSES, JOB_TYPES, WORK_MODES } from './enums'
import {
  currency,
  httpsUrl,
  nullableDate,
  nullableNumber,
  safeUrl,
  text,
} from './common'

export const MAX_TAGS = 50
export const MAX_TAG_LENGTH = 40
export const MAX_JOB_DESCRIPTION_LENGTH = 20000

// One field map, no defaults. Defaults are applied only in the create variant
// below, because .partial() does NOT strip a .default() — an update schema
// built from defaulted fields would happily $set `status: 'wishlist'` on a
// request that never mentioned status, silently resetting it.
const fields = {
  company: text('Company', { min: 1, max: 200 }),
  role: text('Role', { min: 1, max: 200 }),
  companyLogo: httpsUrl('Company logo'),
  status: z.enum(APPLICATION_STATUSES, { error: 'Invalid status' }),
  jobUrl: safeUrl('Job URL'),
  jobDescription: text('Job description', { max: MAX_JOB_DESCRIPTION_LENGTH }),
  location: text('Location', { max: 200 }),
  workMode: z.enum(WORK_MODES, { error: 'Invalid work mode' }),
  jobType: z.enum(JOB_TYPES, { error: 'Invalid job type' }),
  salaryMin: nullableNumber('Minimum salary'),
  salaryMax: nullableNumber('Maximum salary'),
  salaryCurrency: currency('Currency'),
  appliedDate: nullableDate('Applied date'),
  deadline: nullableDate('Deadline'),
  followUpDate: nullableDate('Follow-up date'),
  tags: z
    .array(text('Tag', { min: 1, max: MAX_TAG_LENGTH }))
    .max(MAX_TAGS, { error: `No more than ${MAX_TAGS} tags` }),
}

const SALARY_ORDER_MESSAGE =
  'Minimum salary must be less than or equal to maximum salary'

// Only fires when a single request carries both bounds — comparing against a
// stored value would need a read, which validation shouldn't do.
function salaryOrder(v: {
  salaryMin?: number | null
  salaryMax?: number | null
}): boolean {
  if (v.salaryMin == null || v.salaryMax == null) return true
  return v.salaryMin <= v.salaryMax
}

// companyLogo is absent on purpose: PUT is its only writer, matching the
// behaviour of the hand-rolled route this replaces.
export const applicationCreateSchema = z
  .object({
    company: fields.company,
    role: fields.role,
    status: fields.status.default('wishlist'),
    jobUrl: fields.jobUrl.default(''),
    jobDescription: fields.jobDescription.default(''),
    location: fields.location.default(''),
    workMode: fields.workMode.default(''),
    jobType: fields.jobType.default(''),
    salaryMin: fields.salaryMin.default(null),
    salaryMax: fields.salaryMax.default(null),
    salaryCurrency: fields.salaryCurrency.default('USD'),
    appliedDate: fields.appliedDate.default(null),
    deadline: fields.deadline.default(null),
    followUpDate: fields.followUpDate.default(null),
    tags: fields.tags.default([]),
  })
  .refine(salaryOrder, { error: SALARY_ORDER_MESSAGE, path: ['salaryMax'] })

// Zod strips unknown keys, which is what the APPLICATION_UPDATABLE allowlist
// plus pickAllowed used to do — user, _id, timestamps and the subdocument
// arrays cannot be written through here.
export const applicationUpdateSchema = z
  .object(fields)
  .partial()
  .refine(v => Object.keys(v).length > 0, { error: 'No valid fields to update' })
  .refine(salaryOrder, { error: SALARY_ORDER_MESSAGE, path: ['salaryMax'] })

export const applicationStatusSchema = z.object({ status: fields.status })

// The subset the Add form owns. The fields it omits (jobDescription, tags,
// followUpDate) are filled by applicationCreateSchema's defaults server-side.
export const applicationFormSchema = z
  .object({
    company: fields.company,
    role: fields.role,
    jobUrl: fields.jobUrl,
    status: fields.status,
    workMode: fields.workMode,
    jobType: fields.jobType,
    location: fields.location,
    salaryMin: fields.salaryMin,
    salaryMax: fields.salaryMax,
    salaryCurrency: fields.salaryCurrency,
    appliedDate: fields.appliedDate,
    deadline: fields.deadline,
  })
  .refine(salaryOrder, { error: SALARY_ORDER_MESSAGE, path: ['salaryMax'] })

export const applicationStatusFilterSchema = z.enum(APPLICATION_STATUSES, {
  error: 'Invalid status filter',
})

// The /api/applications query string. `status` absent means "no filter"; an
// empty `?status=` is a present empty string and is rejected rather than
// silently treated as unfiltered.
export const applicationListQuerySchema = z.object({
  status: applicationStatusFilterSchema.optional(),
})

// What a client is allowed to *send*: fields carrying a .default() are
// optional here, which is what lets the Add form post its subset and have the
// server fill jobDescription, tags and followUpDate. z.infer is the parsed
// result — every field present — and is the wrong type for a request body.
export type ApplicationCreatePayload = z.input<typeof applicationCreateSchema>
export type ApplicationCreateInput = z.infer<typeof applicationCreateSchema>
export type ApplicationUpdateInput = z.infer<typeof applicationUpdateSchema>
export type ApplicationFormValues = z.input<typeof applicationFormSchema>
export type ApplicationFormOutput = z.output<typeof applicationFormSchema>
