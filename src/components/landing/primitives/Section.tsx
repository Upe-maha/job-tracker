// src/components/landing/primitives/Section.tsx
import type { ReactNode } from 'react'
import { cn } from '@/shared/utils'

// The page's one grid rhythm, stated once so no section has to re-improvise it.
//
// Three layers, and each earns its place: a full-bleed outer <section> so a
// backdrop can reach the window edges, an inner container capped at the same
// 1200px the dashboard's PageShell uses, and a 12-column grid inside that. The
// reference's zig-zag then falls out of the grid — alternating col-span rows —
// instead of being positioned by hand.
//
// PageShell itself is deliberately not reused: it is the dashboard's content
// frame and cannot bleed, which is the one thing this page needs.
export const LANDING_WIDTH = 'max-w-[1200px]'

export default function Section({
  id,
  children,
  className,
  innerClassName,
  grid = true,
}: {
  /** Also the anchor target for in-page links. */
  id?: string
  children: ReactNode
  /** Full-bleed layer — backdrops and section-wide background colour. */
  className?: string
  /** The capped container. */
  innerClassName?: string
  /** Off for sections that own their own internal layout (hero, footer). */
  grid?: boolean
}) {
  return (
    <section
      id={id}
      // scroll-mt clears the sticky header (h-16). Without it a nav jump puts
      // the section's heading *behind* the header, which reads as landing on
      // the wrong section.
      className={cn('relative w-full scroll-mt-20', className)}
    >
      <div
        className={cn(
          'mx-auto w-full px-5 sm:px-8',
          LANDING_WIDTH,
          grid && 'grid grid-cols-1 lg:grid-cols-12 gap-6',
          innerClassName,
        )}
      >
        {children}
      </div>
    </section>
  )
}
