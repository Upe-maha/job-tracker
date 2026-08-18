// src/components/common/ConfirmDeleteDialog.tsx
'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// The one confirmation step in the app; deleting an application takes every note,
// contact and prep file with it. `open`/`isPending` belong to whichever component
// renders the button — threading a deletingId down from the page costs more.
interface ConfirmDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => void | Promise<void>
  isPending?: boolean
}

export default function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  isPending = false,
}: ConfirmDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-card border-border text-foreground">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isPending}
            className="border-border text-muted-foreground hover:bg-muted"
          >
            Cancel
          </AlertDialogCancel>
          {/* preventDefault keeps the dialog open while the request is in
              flight — Radix closes on Action click otherwise, and the pending
              label would never be seen. The caller closes it on success. */}
          <AlertDialogAction
            disabled={isPending}
            onClick={event => {
              event.preventDefault()
              void onConfirm()
            }}
            className="bg-destructive/10 text-destructive hover:bg-destructive/20"
          >
            {isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
