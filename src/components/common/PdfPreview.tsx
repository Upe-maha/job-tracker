// src/components/common/PdfPreview.tsx
'use client'

import type { ReactNode } from 'react'
import { Download, ExternalLink } from 'lucide-react'
import { displayPdfName, fileDownloadUrl, filePreviewUrl } from '@/shared/files'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

// Reads a PDF in place instead of handing the file to the browser and hoping.
// Every URL here goes through /api/files: Cloudinary serves a raw asset as
// `application/octet-stream; attachment`, so linking straight at it always
// downloaded — "check which CV is attached" meant leaving the page and finding
// a file in Downloads.
//
// The trigger is passed in as children (Radix's asChild), because the call
// sites want visibly different buttons around the identical dialog: a compact
// one on the identity card, a row action in the CV panel, and one per file in
// the prep-files tab.
export default function PdfPreview({
  url,
  name: nameProp,
  children,
}: {
  url: string
  /** Overrides the name derived from the URL — prep files store a real one. */
  name?: string
  children: ReactNode
}) {
  const name = nameProp ?? displayPdfName(url, 'document')
  const preview = filePreviewUrl(url)

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="bg-card border-border text-foreground sm:max-w-4xl max-w-[calc(100%-2rem)] p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b border-border text-left">
          <DialogTitle className="text-foreground text-sm truncate pr-8">{name}</DialogTitle>
          <DialogDescription className="sr-only">
            Preview of the CV attached to your profile
          </DialogDescription>
        </DialogHeader>

        <iframe
          src={preview}
          title={`Preview of ${name}`}
          className="w-full h-[70vh] bg-muted"
        />

        <DialogFooter className="px-4 py-3 border-t border-border sm:justify-between items-center gap-2">
          {/* Rendering a PDF inline is the browser's to provide and a few
              still won't, so the way out stays on screen rather than being
              left to be guessed at. */}
          <p className="text-muted-foreground text-xs">
            Preview not loading? Open it in a new tab.
          </p>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="border-border gap-2">
              <a href={preview} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3 h-3" /> Open
              </a>
            </Button>
            <Button asChild size="sm" className="gap-2">
              {/* &download=1 rather than the download attribute, which browsers
                  ignore cross-origin and which cannot name the file anyway —
                  the route sets Content-Disposition from the stored name. */}
              <a href={fileDownloadUrl(url)}>
                <Download className="w-3 h-3" /> Download
              </a>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
