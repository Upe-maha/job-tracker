// src/app/api/upload/route.ts
import { v2 as cloudinary } from 'cloudinary'
import { guard } from '@/lib/api/guard'
import { fail, serverError } from '@/lib/api/respond'
import { NextResponse } from 'next/server'

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5MB

const ALLOWED_FOLDERS = ['avatars', 'prep-files'] as const
type AllowedFolder = (typeof ALLOWED_FOLDERS)[number]

type SniffedType = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'

const ALLOWED_MIME: Record<AllowedFolder, SniffedType[]> = {
  avatars: ['image/jpeg', 'image/png', 'image/webp'],
  'prep-files': ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
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

export async function POST(req: Request) {
  const g = await guard(req)
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
    const folderRaw = formData.get('folder')
    const folder: AllowedFolder =
      typeof folderRaw === 'string' && (ALLOWED_FOLDERS as readonly string[]).includes(folderRaw)
        ? (folderRaw as AllowedFolder)
        : 'prep-files'

    if (!(file instanceof File)) {
      return fail(400, 'No file provided')
    }

    if (file.size > MAX_FILE_BYTES) {
      return fail(400, 'File too large. Max 5MB.')
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const sniffed = sniffMimeType(buffer)
    if (!sniffed || !ALLOWED_MIME[folder].includes(sniffed)) {
      return fail(400, 'Unsupported file type')
    }

    const base64 = `data:${sniffed};base64,${buffer.toString('base64')}`

    const result = await cloudinary.uploader.upload(base64, {
      folder: `job-tracker/${folder}`,
      transformation:
        folder === 'avatars'
          ? [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }]
          : undefined,
      resource_type: sniffed === 'application/pdf' ? 'raw' : 'image',
    })

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
    })
  } catch (error) {
    return serverError('upload.POST', error)
  }
}
