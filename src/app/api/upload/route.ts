// src/app/api/upload/route.ts
import { randomBytes } from 'node:crypto'
import { v2 as cloudinary } from 'cloudinary'
import { guard } from '@/lib/api/guard'
import { MAX_UPLOAD_BYTES } from '@/shared/schemas/common'
import { fail, serverError } from '@/lib/api/respond'
import { NextResponse } from 'next/server'

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})


const ALLOWED_FOLDERS = ['avatars', 'prep-files', 'resumes', 'note-files'] as const
type AllowedFolder = (typeof ALLOWED_FOLDERS)[number]

type SniffedType = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'

// Per folder, not one list for the route: 'resumes' (Step E) is PDF-only
// rather than reusing 'prep-files', which accepts images. A CV that is a
// screenshot is not a CV, and widening an existing bucket's meaning is how a
// caller ends up in a MIME allowlist it never intended.
const ALLOWED_MIME: Record<AllowedFolder, SniffedType[]> = {
  avatars: ['image/jpeg', 'image/png', 'image/webp'],
  'prep-files': ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  resumes: ['application/pdf'],
  'note-files': ['application/pdf'],
}

// file.type is client-supplied and trivially spoofed, so it's never trusted
// for the actual upload — only the magic bytes are.
function sniffMimeType(buffer: Buffer): SniffedType | null {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('latin1') === '%PDF-') {
    return 'application/pdf'
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png'
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('latin1') === 'RIFF' &&
    buffer.subarray(8, 12).toString('latin1') === 'WEBP'
  ) {
    return 'image/webp'
  }
  return null
}

// A recognisable public id built from the name the user uploaded, so a stored
// URL reads as ".../ada-cv-3f9c1b2e" rather than ".../kmgkwtebjqsomdujtos2".
//
// Deliberately WITHOUT a .pdf extension, which is the counter-intuitive part
// and was measured, not assumed. Cloudinary infers a raw asset's Content-Type
// from that extension — but delivery of .pdf URLs is refused outright (HTTP 401
// and a placeholder GIF) unless the account enables "Allow delivery of PDF and
// ZIP files", which is off by default. So adding the extension turns a file
// that downloads into a file that 404s. Extension-less it serves as
// application/octet-stream, and /api/files re-labels it on the way through.
//
// file.name is client-supplied and goes straight into a delivery path, so it is
// reduced to [A-Za-z0-9_-] rather than escaped — nothing else survives, which
// rules out traversal and a public id that would need encoding. The random
// suffix keeps two uploads of "resume.pdf" from overwriting each other, which is
// what Cloudinary's auto-generated ids were buying.
function pdfPublicId(originalName: string): string {
  const base =
    originalName
      .replace(/\.pdf$/i, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'document'

  return `${base}-${randomBytes(4).toString('hex')}`
}

export async function POST(req: Request) {
  const g = await guard(req, { rateLimit: 'upload' })
  if (!g.ok) return g.response

  // Forces a CORS preflight on any cross-origin request (this app answers
  // none), independent of Sec-Fetch-Site/Origin trust — belt-and-braces on
  // top of guard()'s CSRF check, since this is the one route reachable by a
  // plain cross-site <form enctype="multipart/form-data"> with no preflight.
  if (req.headers.get('x-upload-request') !== '1') {
    return fail(403, 'Request blocked')
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file')
    // Fail closed. Falling back to 'prep-files' meant a caller intending
    // 'avatars' that mistyped the field silently got the PDF-permitting
    // bucket and a 200. Both callers always send a valid folder.
    const folderRaw = formData.get('folder')
    if (typeof folderRaw !== 'string' || !(ALLOWED_FOLDERS as readonly string[]).includes(folderRaw)) {
      return fail(400, 'Invalid upload folder')
    }
    const folder = folderRaw as AllowedFolder

    if (!(file instanceof File)) {
      return fail(400, 'No file provided')
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return fail(400, 'File too large. Max 5MB.')
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const sniffed = sniffMimeType(buffer)
    if (!sniffed || !ALLOWED_MIME[folder].includes(sniffed)) {
      return fail(400, 'Unsupported file type')
    }

    const base64 = `data:${sniffed};base64,${buffer.toString('base64')}`
    const isPdf = sniffed === 'application/pdf'

    const result = await cloudinary.uploader.upload(base64, {
      folder: `job-tracker/${folder}`,
      transformation:
        folder === 'avatars'
          ? [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }]
          : undefined,
      resource_type: isPdf ? 'raw' : 'image',
      ...(isPdf ? { public_id: pdfPublicId(file.name) } : {}),
    })

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
    })
  } catch (error) {
    return serverError('upload.POST', error)
  }
}
