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

// The one confirmation step in the app. Nothing gated a delete before this —
// NoteCard's trash icon called onDelete straight from onClick — and application
// delete takes every note, contact and prep file on the document with it.
//
// `open`/`isPending` are owned by whichever component renders the delete
// button, not by the page that owns the mutation: the mutation's isPending
// lives too far away to reach, and threading a deletingId down through the
// parents to reach it would cost more than the local boolean it replaces.
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
