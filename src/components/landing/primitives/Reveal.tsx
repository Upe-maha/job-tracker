// src/components/landing/primitives/Reveal.tsx
'use client'

import type { ReactNode } from 'react'
import { useReveal } from '@/hooks/useReveal'
import { cn } from '@/lib/utils'

// Declarative wrapper over useReveal, so a section describes what should
// reveal instead of wiring an observer itself.
//
// Always a <div>. A polymorphic `as` prop was tried and removed: with a union
// of tags the ref type collapses to the intersection of every element type,
// which no single ref can satisfy — and nothing here needs to reveal anything
// but a block.
//
// `delay` staggers siblings, inline rather than as a class because the values
// are per-item and arbitrary; a utility per delay would be a dozen classes
// each holding one number.
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
      // .reveal carries the hidden state and the transition; under
      // prefers-reduced-motion it resolves to the visible state outright, so
      // nothing here can strand content invisible.
      className={cn('reveal', isVisible && 'reveal-visible', className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}
