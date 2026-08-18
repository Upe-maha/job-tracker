// src/lib/schemas/prep-file.ts
import { z } from 'zod'
import { PREP_FILE_TYPES } from './enums'
import { isCloudinaryUrl, objectId, text } from './common'
import { isSafeUrl } from '@/lib/security/sanitize'

const fields = {
  name: text('Name', { min: 1, max: 200 }),
  type: z.enum(PREP_FILE_TYPES, { error: 'Type must be pdf or link' }),
  url: z.string({ error: 'URL is required' }).trim().min(1, { error: 'URL is required' }),
}

// The url rule depends on type, so it can't live on the field. Both helpers
// treat '' as "cleared" and return true for it — fine everywhere else, wrong
// here, where url is required. Hence the explicit non-empty guard.
function urlMatchesType(type: (typeof PREP_FILE_TYPES)[number], url: string) {
  if (url === '') return false
  // PDFs only ever come from our own /api/upload -> Cloudinary.
  return type === 'pdf' ? isCloudinaryUrl(url) : isSafeUrl(url)
}

export const prepFileCreateSchema = z
  .object(fields)
  .superRefine((v, ctx) => {
    if (urlMatchesType(v.type, v.url)) return
    ctx.addIssue({
      code: 'custom',
      path: ['url'],
      message:
        v.type === 'pdf'
          ? 'PDF must be an uploaded file URL'
          : 'Link must be a valid http(s) URL',
    })
  })

// PrepFilesTab's link form; the PDF path builds its payload from the upload
// response rather than from form state.
export const prepFileLinkFormSchema = z.object({
  name: fields.name,
  url: fields.url,
})

export const prepFileDeleteSchema = z.object({ fileId: objectId('file id') })

export type PrepFileCreateInput = z.infer<typeof prepFileCreateSchema>
export type PrepFileLinkFormValues = z.input<typeof prepFileLinkFormSchema>
