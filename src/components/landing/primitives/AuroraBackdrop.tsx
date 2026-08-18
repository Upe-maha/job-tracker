// src/components/landing/primitives/AuroraBackdrop.tsx
import { cn } from '@/shared/utils'

// The reference's mood done with gradients rather than photography, so it follows
// the theme and weighs nothing. Decorative: aria-hidden, and never the only thing
// separating one section from another.
export default function AuroraBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      <div className="aurora-mesh absolute inset-0" />
      {/* Fades the mesh into the page background at the seam, so a section
          boundary is a gradient rather than a hard edge. */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background" />
    </div>
  )
}
