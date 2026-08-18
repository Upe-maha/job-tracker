// src/components/profile/ResumeCard.tsx
'use client'

import { useRef, useState } from 'react'
import { Eye, FileText, Loader2, Trash2, Upload } from 'lucide-react'
import { useUpdateProfile, useUpload } from '@/hooks/useMutations'
import { MAX_UPLOAD_BYTES } from '@/shared/schemas/common'
import { displayPdfName } from '@/shared/files'
import ConfirmDeleteDialog from '@/components/common/ConfirmDeleteDialog'
import PdfPreview from '@/components/common/PdfPreview'
import { Button } from '@/components/ui/button'

// Unlike the avatar, this persists the moment the upload returns rather than
// waiting for "Save Profile". The card sits outside the form and carries its
// own actions, so a CV that visibly uploaded and then silently wasn't saved is
// the obvious trap — and there is no field on screen for the user to notice is
// still unsaved.
//
// The resulting ['profile'] invalidation is safe next to the form: the page
// hydrates on `loadedId !== hydratedId`, so a refetch of the same user does not
// reset() over edits in progress beside it.

export default function ResumeCard({ resume }: { resume: string }) {
  const upload = useUpload()
  const updateProfile = useUpdateProfile()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

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

    // Matches the server's cap, so an oversized file fails here instead of
    // after a full round trip. The route sniffs the bytes regardless — the
    // type check above is a courtesy, not a control.
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('File too large. Max 5MB.')
      return
    }

    setUploading(true)
    try {
      const { url } = await upload.mutateAsync({ file, folder: 'resumes' })
      await updateProfile.mutateAsync({ resume: url })
    } catch {
      // Both mutations report the real reason as a toast.
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  async function handleRemove() {
    // '' is what clears it — cloudinaryUrl accepts the empty string for exactly
    // this, so there is no separate delete route to own.
    await updateProfile.mutateAsync({ resume: '' })
    setConfirmOpen(false)
  }

  const busy = uploading || updateProfile.isPending

  return (
    <div className="space-y-3">
      {resume ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
          <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
          <p
            className="text-foreground text-sm truncate flex-1"
            title={displayPdfName(resume, 'resume')}
          >
            {displayPdfName(resume, 'resume')}
          </p>
          {/* Opens the preview rather than the file: the point is to check
              which CV is attached, which a download does not answer. Opening
              and downloading are both still offered inside. */}
          <PdfPreview url={resume}>
            <button
              type="button"
              className="
                text-primary text-xs hover:underline
                flex items-center justify-center gap-1 shrink-0
                min-h-9 px-2 -mr-2 lg:min-h-0 lg:px-0 lg:mr-0
              "
            >
              <Eye className="w-3 h-3" /> View
            </button>
          </PdfPreview>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          No CV uploaded yet. PDF only, max 5MB.
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="gap-2 border-border"
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          {busy ? 'Uploading...' : resume ? 'Replace CV' : 'Upload CV'}
        </Button>

        {resume && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => setConfirmOpen(true)}
            className="gap-2 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-3 h-3" /> Remove
          </Button>
        )}
      </div>

      {error && <p className="text-destructive text-xs">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove CV?"
        description="This clears the CV from your profile. The file itself stays in storage."
        onConfirm={handleRemove}
        isPending={updateProfile.isPending}
      />
    </div>
  )
}
