// src/components/common/Panel.tsx
'use client'

import type { ComponentType, ReactNode } from 'react'
import { cn } from '@/shared/utils'

// The dashboard's card shape: titled bar, rule, body, room for actions. Pages used
// to hand-roll it, so padding and heading size drifted between them.
export default function Panel({
  title,
  icon: Icon,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: string
  icon?: ComponentType<{ className?: string }>
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn('bg-card border border-border rounded-xl', className)}>
      {title && (
        <header className="flex items-center gap-2 px-5 h-12 border-b border-border">
          {Icon && <Icon className="w-4 h-4 text-muted-foreground shrink-0" />}
          <h2 className="text-foreground font-semibold text-sm truncate">{title}</h2>
          {actions && <div className="ml-auto flex items-center gap-1">{actions}</div>}
        </header>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  )
}

// A labelled value for the identity card's fact grid. Renders an em dash rather
// than collapsing, so a sparse profile keeps the grid's shape.
export function Fact({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value?: string | null
  icon?: ComponentType<{ className?: string }>
}) {
  return (
    <div className="min-w-0">
      <p className="text-muted-foreground text-xs flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3 shrink-0" />}
        {label}
      </p>
      <p className="text-foreground text-sm mt-1 truncate" title={value || undefined}>
        {value?.trim() ? value : '—'}
      </p>
    </div>
  )
}
