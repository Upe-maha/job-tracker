// src/components/common/PageShell.tsx
'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// The single content container. Pages previously picked their own width —
// max-w-6xl, 4xl, 3xl, 2xl and one full-bleed — so moving between them shifted
// the content box on every navigation. One width means the left edge of the
// content never moves.
//
// Crucially this shell renders *immediately*, before any data resolves: the
// body swaps between skeleton, error and content while the frame stays put.
// The old pages returned a centered "Loading..." in place of the whole page,
// which is why navigation felt like nothing had happened.
export const CONTENT_WIDTH = 'max-w-[1200px]'

export default function PageShell({
  children,
  actions,
  fullBleed = false,
  className,
}: {
  children: ReactNode
  /** Page-level controls (search, primary button) — pinned above the content. */
  actions?: ReactNode
  /** For the Kanban board, which scrolls horizontally and needs the full width. */
  fullBleed?: boolean
  className?: string
}) {
  return (
    <div className={cn('w-full mx-auto', fullBleed ? 'max-w-none' : CONTENT_WIDTH)}>
      {actions && (
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          {actions}
        </div>
      )}
      <div className={cn('space-y-6', className)}>{children}</div>
    </div>
  )
}

// A 12-column grid so cards line up across pages instead of each page
// inventing its own column split.
export function PageGrid({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-12 gap-6', className)}>
      {children}
    </div>
  )
}
