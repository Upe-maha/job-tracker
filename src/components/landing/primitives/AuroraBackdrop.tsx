// src/components/landing/primitives/AuroraBackdrop.tsx
import { cn } from '@/lib/utils'

// What the glass panel refracts. The reference achieves its mood with
// full-bleed photography; this is the same job done with gradients, which is
// what lets it follow the theme, weigh nothing, and never go stale.
//
// Decorative in the strict sense — it carries no information — so it is
// aria-hidden and transparent to pointers, and it must never be the only thing
// distinguishing one section from another.
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
