// src/components/landing/primitives/Reveal.tsx
'use client'

import type { ReactNode } from 'react'
import { useReveal } from '@/hooks/useReveal'
import { cn } from '@/shared/utils'

// Declarative wrapper over useReveal. Always a <div> — a polymorphic `as` prop
// collapses the ref type to an intersection no single ref can satisfy.
export default function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  /** Milliseconds. Keep the spread short — a long stagger reads as slow. */
  delay?: number
  className?: string
}) {
  const { ref, isVisible } = useReveal<HTMLDivElement>()

  return (
    <div
      ref={ref}
      // .reveal holds the hidden state; prefers-reduced-motion resolves it to
      // visible outright, so nothing here can strand content invisible.
      className={cn('reveal', isVisible && 'reveal-visible', className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}
