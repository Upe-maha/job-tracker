// src/components/notes/NoteAttachmentChip.tsx
'use client'

import { Paperclip } from 'lucide-react'
import PdfPreview from '@/components/common/PdfPreview'
import { cn } from '@/shared/utils'
import type { INoteAttachment } from '@/types'

// The one way an attachment is offered for reading; opens the preview dialog rather
// than linking at Cloudinary, which serves a raw PDF as an unrenderable attachment.
// The feed rows put their <Link> behind the card as an overlay so this can sit above
// it — nested in the anchor it would navigate *and* open, and neither
// stopPropagation nor preventDefault separates the two.
export default function NoteAttachmentChip({
  attachment,
  className,
}: {
  attachment: INoteAttachment
  className?: string
}) {
  return (
    <PdfPreview url={attachment.url} name={`${attachment.name}.pdf`}>
      <button
        type="button"
        title={attachment.name}
        className={cn(
          'inline-flex items-center gap-1.5 max-w-full',
          'text-xs px-2 py-0.5 rounded-full border',
          'bg-muted text-muted-foreground border-border',
          'hover:text-foreground transition-colors',
          className,
        )}
      >
        <Paperclip className="w-3 h-3 shrink-0" />
        <span className="truncate">{attachment.name}</span>
      </button>
    </PdfPreview>
  )
}
