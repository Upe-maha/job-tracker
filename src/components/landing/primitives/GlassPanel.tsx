// src/components/landing/primitives/GlassPanel.tsx
import type { ReactNode } from 'react'
import { cn } from '@/shared/utils'

// The frosted frame, defined once. The visual weight lives in .glass-panel
// (globals.css) because backdrop-filter needs an @supports fallback.
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
