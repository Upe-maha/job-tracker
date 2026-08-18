// src/components/landing/primitives/Section.tsx
import type { ReactNode } from 'react'
import { cn } from '@/shared/utils'

// The page's one grid rhythm: full-bleed <section>, a 1200px container, a
// 12-column grid. The zig-zag falls out of that grid instead of being positioned
// by hand. PageShell is not reused — it cannot bleed, which is what this needs.
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
      // scroll-mt clears the sticky header; without it a nav jump leaves the
      // heading behind it, which reads as landing on the wrong section.
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
