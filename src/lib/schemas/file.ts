// src/lib/schemas/file.ts
import { z } from 'zod'
import { isCloudinaryUrl } from './common'

// The query /api/files accepts. `url` is format-checked here and
// ownership-checked by the DAL — a well-formed Cloudinary URL proves only that
// it could not be pointed at somewhere else, which is the SSRF half of the
// problem, not the access-control half.
export const fileProxyQuerySchema = z.object({
  url: z
    .string({ error: 'File is required' })
    .min(1, { error: 'File is required' })
    .refine(isCloudinaryUrl, { error: 'File must be an uploaded file URL' }),
  // Present at all means "download"; the value is irrelevant, which is what a
  // link building `&download=1` by hand needs.
  download: z.string().optional(),
})

export type FileProxyQuery = z.infer<typeof fileProxyQuerySchema>
