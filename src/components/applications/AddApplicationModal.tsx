// src/components/applications/AddApplicationModal.tsx
'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import ApplicationForm from './ApplicationForm'
import type {
  ApplicationFormOutput,
  ApplicationFormValues,
} from '@/lib/schemas/application'
import { useCreateApplication } from '@/hooks/useMutations'

interface AddApplicationModalProps {
  open: boolean
  onClose: () => void
}

// z.input, not z.output: the form holds what the controls produce — a date
// input gives '' or 'YYYY-MM-DD', a number input gives a string — and the
// schema coerces those on submit. Both types are exported for exactly this.
const defaultValues: ApplicationFormValues = {
  company: '',
  role: '',
  companyLogo: '',
  jobUrl: '',
  status: 'wishlist',
  workMode: '',
  jobType: '',
  location: '',
  salaryMin: '',
  salaryMax: '',
  salaryCurrency: 'USD',
  appliedDate: '',
  deadline: '',
}

export default function AddApplicationModal({
  open,
  onClose,
}: AddApplicationModalProps) {
  const createApplication = useCreateApplication()

  async function onSubmit(values: ApplicationFormOutput) {
    await createApplication.mutateAsync(values)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent
        className="bg-card border-border text-foreground sm:max-w-lg max-h-[85vh] overflow-y-auto"
        onPointerDownOutside={e => e.preventDefault()}
        onInteractOutside={e => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">Add Job Application</DialogTitle>
        </DialogHeader>

        {/* Keyed on `open` so each opening gets a fresh form. This replaces the
            form.reset(defaultValues) the modal used to run on close and on
            successful submit — the reset existed because cancelling and
            reopening otherwise showed the abandoned draft, and remounting
            achieves the same thing without a second source of truth for what
            "empty" means. */}
        {open && (
          <ApplicationForm
            defaultValues={defaultValues}
            onSubmit={onSubmit}
            onCancel={onClose}
            submitLabel="Add Application"
            submittingLabel="Adding..."
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
