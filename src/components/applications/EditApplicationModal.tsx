// src/components/applications/EditApplicationModal.tsx
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
} from '@/shared/schemas/application'
import { useUpdateApplication } from '@/hooks/useMutations'
import type { IApplication } from '@/types'

interface EditApplicationModalProps {
  open: boolean
  onClose: () => void
  application: IApplication
}

// IApplication is the *wire* shape (dates as ISO strings); ApplicationFormValues is
// z.input, what the controls hold. This mapping is the reverse of the schema's coercion.
function toFormValues(application: IApplication): ApplicationFormValues {
  return {
    company: application.company,
    role: application.role,
    companyLogo: application.companyLogo ?? '',
    jobUrl: application.jobUrl ?? '',
    status: application.status,
    workMode: application.workMode ?? '',
    jobType: application.jobType ?? '',
    location: application.location ?? '',
    salaryMin: application.salaryMin == null ? '' : String(application.salaryMin),
    salaryMax: application.salaryMax == null ? '' : String(application.salaryMax),
    salaryCurrency: application.salaryCurrency ?? 'USD',
    // <input type="date"> wants YYYY-MM-DD, not a full ISO timestamp.
    appliedDate: application.appliedDate?.slice(0, 10) ?? '',
    deadline: application.deadline?.slice(0, 10) ?? '',
  }
}

export default function EditApplicationModal({
  open,
  onClose,
  application,
}: EditApplicationModalProps) {
  const updateApplication = useUpdateApplication(application._id)

  // ApplicationFormOutput is structurally assignable to ApplicationUpdateInput — the
  // update schema is a .partial() over the same field map — so no cast is needed.
  async function onSubmit(values: ApplicationFormOutput) {
    await updateApplication.mutateAsync(values)
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
          <DialogTitle className="text-foreground">Edit Application</DialogTitle>
        </DialogHeader>

        {/* The caller mounts this modal conditionally, so the form below is
            constructed fresh on each open and picks up values changed
            elsewhere in the meantime (a Kanban status drag, say). A key on
            application._id would not do the same job — there is exactly one
            application on a detail page, so that key never changes. */}
        <ApplicationForm
          defaultValues={toFormValues(application)}
          onSubmit={onSubmit}
          onCancel={onClose}
          submitLabel="Save Changes"
          submittingLabel="Saving..."
        />
      </DialogContent>
    </Dialog>
  )
}
