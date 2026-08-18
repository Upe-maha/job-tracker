// src/server/data/files.ts
import type mongoose from 'mongoose'
import User from '@/models/User'
import Application from '@/models/Application'
import { displayPdfName } from '@/shared/files'

// Which stored file a user is allowed to read, and what to call it.
//
// The check is deliberately "does this exact URL appear on a document this user
// owns", not "is this a Cloudinary URL". Every asset in the account lives under
// one cloud name, so accepting any well-formed Cloudinary URL would let a
// signed-in user stream another user's CV through the proxy — turning a route
// added to *narrow* access into the thing that widens it.
//
// userId is the first and required argument, like every other helper here, so
// an ownership-scoped query cannot be written without one.
export async function resolveOwnedFile(
  userId: string | mongoose.Types.ObjectId,
  url: string,
): Promise<{ filename: string } | null> {
  if (!url) return null

  // The CV. Matched on the field rather than looked up and compared, so the
  // query is the check.
  const owner = await User.findOne({ _id: userId, resume: url }).select('_id')
  if (owner) return { filename: displayPdfName(url, 'resume') }

  // A prep file on one of this user's applications. The projection is
  // positional so a document with fifty prep files still returns one.
  const app = await Application.findOne(
    { user: userId, 'prepFiles.url': url },
    { 'prepFiles.$': 1 },
  )

  const prepFile = app?.prepFiles?.[0]
  if (prepFile) return { filename: pdfFilename(prepFile.name, url) }

  // Step F. A note attachment on one of this user's applications. Same
  // positional projection, and the same reason it is a separate query rather
  // than an $or: each is a distinct indexable path, and an $or across two array
  // paths cannot use the positional projection to say *which* one matched.
  const withNote = await Application.findOne(
    { user: userId, 'notes.attachment.url': url },
    { 'notes.$': 1 },
  )

  const note = withNote?.notes?.[0]
  if (note?.attachment) return { filename: pdfFilename(note.attachment.name, url) }

  return null
}

// Stored names are user-supplied and end up in a Content-Disposition header, so
// quotes and CRLF have to go — a name is a label here, never a header
// construction kit.
function pdfFilename(stored: unknown, url: string): string {
  const safe = String(stored ?? '')
    .replace(/[^\w .-]+/g, ' ')
    .trim()
    .slice(0, 100)

  return safe ? `${safe.replace(/\.pdf$/i, '')}.pdf` : displayPdfName(url)
}
