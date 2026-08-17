// src/components/notes/NoteAttachmentField.tsx
'use client'

import { useRef, useState } from 'react'
import { FileText, Loader2, Paperclip, X } from 'lucide-react'
import { useUpload } from '@/hooks/useMutations'
import { MAX_UPLOAD_BYTES } from '@/lib/schemas/common'
import { Button } from '@/components/ui/button'
import type { INoteAttachment } from '@/types'

// The note's optional PDF. Controlled by the form rather than owning its own
// value, because the attachment is saved with the note through the existing
// POST/PUT — there is no separate write path for it.
//
// Upload and persist are different events here, deliberately: the file reaches
// Cloudinary as soon as it is picked, but the note only gains it on submit.
// That is what keeps Cancel meaning "nothing changed". The abandoned asset it
// can leave behind is R4's to collect — see md/step-f-notes-pdf.md; do not add
// cleanup here, since only one of the three orphan paths could be handled from
// this component and partial cleanup is worse than none.
export default function NoteAttachmentField({
  value,
  onChange,
}: {
  value: INoteAttachment | null | undefined
  onChange: (next: INoteAttachment | null) => void
}) {
  const upload = useUpload()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Reset so picking the same file twice in a row still fires onChange.
    e.target.value = ''
    if (!file) return

    setError('')

    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file')
      return
    }

    // Matches the server's cap so an oversized file fails before the round
    // trip. The route sniffs the magic bytes regardless — this is a courtesy,
    // not a control.
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('File too large. Max 5MB.')
      return
    }

    try {
      const { url } = await upload.mutateAsync({ file, folder: 'note-files' })
      // Strip only a trailing .pdf, matching PrepFilesTab: String.replace would
      // take the first occurrence anywhere and mangle "cv.pdf.backup.pdf".
      onChange({ url, name: file.name.replace(/\.pdf$/i, '') })
    } catch {
      // useUpload reports the real reason as a toast.
      setError('Upload failed. Please try again.')
    }
  }

  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground text-xs">Attachment</p>

      {value ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
          <p className="text-foreground text-sm truncate flex-1" title={value.name}>
            {value.name}
          </p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={upload.isPending}
            className="text-primary text-xs hover:underline shrink-0 disabled:opacity-50"
          >
            Replace
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remove attachment"
            className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={upload.isPending}
          onClick={() => inputRef.current?.click()}
          className="gap-2 border-border"
        >
          {upload.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Paperclip className="w-3 h-3" />
          )}
          {upload.isPending ? 'Uploading...' : 'Attach PDF'}
        </Button>
      )}

      {error && <p className="text-destructive text-xs">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
