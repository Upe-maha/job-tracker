// src/components/notes/NoteAttachmentChip.tsx
'use client'

import { Paperclip } from 'lucide-react'
import PdfPreview from '@/components/common/PdfPreview'
import { cn } from '@/shared/utils'
import type { INoteAttachment } from '@/types'

// The one way an attachment is offered for reading: on the note card and on
// both feed surfaces. It opens the preview dialog rather than linking at
// Cloudinary, which serves a raw PDF as an octet-stream attachment that no
// browser will render — see md/step-e-profile.md.
//
// The two feed rows are wrapped in a <Link> to the detail page, so a chip
// rendered inside one would navigate *and* open the dialog: the anchor's
// default action is not something stopPropagation can call off, and
// preventDefault would suppress the dialog too, since Radix's DialogTrigger
// skips its own handler on a defaultPrevented event. Those callers put the link
// behind the card as an overlay and lift this chip above it instead.
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
