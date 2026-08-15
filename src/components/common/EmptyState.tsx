// src/components/common/EmptyState.tsx
'use client'

import { cn } from '@/lib/utils'

// Was defined three times byte-identically, in NotesTab, InterviewTab and
// ExperienceTab. Not in components/ui/ — that directory is vendored shadcn.
export default function EmptyState({
  message,
  className,
}: {
  message: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'border-2 border-dashed border-border rounded-xl',
        'flex items-center justify-center h-32',
        className
      )}
    >
      <p className="text-muted-foreground/50 text-sm">{message}</p>
    </div>
  )
}
