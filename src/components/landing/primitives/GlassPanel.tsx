// src/components/landing/primitives/GlassPanel.tsx
import type { ReactNode } from 'react'
import { cn } from '@/shared/utils'

// The reference's frosted floating frame, defined once. The visual weight is
// in the .glass-panel utility (globals.css) because backdrop-filter needs a
// @supports fallback — without support the panel stays a legible translucent
// card instead of turning transparent and dropping its contents onto the
// gradient.
export default function GlassPanel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('glass-panel rounded-[28px] sm:rounded-[36px]', className)}>
      {children}
    </div>
  )
}
