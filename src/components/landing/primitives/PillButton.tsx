// src/components/landing/primitives/PillButton.tsx
import Link from 'next/link'
import type { ComponentType, ReactNode } from 'react'
import { cn } from '@/lib/utils'

// The reference's pill control, in the three weights the page actually uses.
//
// A plain anchor rather than the shadcn Button: every pill here is a link, and
// Button's variants are sized for the dashboard's denser controls. Wrapping
// Button in asChild would mean overriding its padding and radius at every call
// site, which is a copy of this component with extra steps.
type Tone = 'solid' | 'outline' | 'glass'

const TONES: Record<Tone, string> = {
  solid: 'bg-brand text-primary-foreground hover:bg-brand-hover',
  outline: 'border border-border text-foreground hover:bg-accent',
  // For use over the gradient, where the page background is not behind it.
  glass:
    'border border-foreground/15 bg-background/40 text-foreground backdrop-blur-md hover:bg-background/60',
}

export default function PillButton({
  href,
  children,
  tone = 'solid',
  icon: Icon,
  className,
}: {
  href: string
  children: ReactNode
  tone?: Tone
  icon?: ComponentType<{ className?: string }>
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full',
        'px-5 py-2.5 text-sm font-medium whitespace-nowrap',
        'transition-colors duration-150 motion-reduce:transition-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        TONES[tone],
        className,
      )}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0" />}
      {children}
    </Link>
  )
}
