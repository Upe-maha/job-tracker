// src/lib/files.ts
//
// Derivations over an uploaded file's delivery URL. Isomorphic and dependency
// free: the upload route persists nothing but the URL, so anything shown about
// a file has to be recovered from it — and both the client and /api/files need
// the same answers.

// Cloudinary's raw delivery URL ends in the public id, which is the only trace
// of a filename that survives the upload.
export function fileNameFromUrl(url: string, fallback = 'file'): string {
  try {
    const last = new URL(url).pathname.split('/').pop()
    return last ? decodeURIComponent(last) : fallback
  } catch {
    return fallback
  }
}

// The upload route appends '-' + 8 hex chars to keep two uploads of
// "resume.pdf" from colliding. That is plumbing, not something to show a user,
// so it comes off again here.
const UPLOAD_SUFFIX = /-[0-9a-f]{8}$/

export function displayPdfName(url: string, fallback = 'document'): string {
  const raw = fileNameFromUrl(url, fallback)
  const base = raw.replace(/\.pdf$/i, '').replace(UPLOAD_SUFFIX, '') || fallback
  return `${base}.pdf`
}

// PDFs are read through this app, never straight from Cloudinary.
//
// Two reasons, one forced and one wanted. Forced: a raw asset is delivered as
// `application/octet-stream; Content-Disposition: attachment`, so a browser
// downloads it rather than previewing it, and the .pdf extension that would fix
// the content type is refused by Cloudinary unless the account opts into PDF
// delivery. Wanted: /api/files is ownership-scoped, so a CV stops being
// readable by anyone who has the link.
export function filePreviewUrl(url: string): string {
  return `/api/files?url=${encodeURIComponent(url)}`
}

export function fileDownloadUrl(url: string): string {
  return `${filePreviewUrl(url)}&download=1`
}
