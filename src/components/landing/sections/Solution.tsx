// src/components/landing/sections/Solution.tsx
import { FileText, KanbanSquare, NotebookPen, TrendingUp } from 'lucide-react'
import type { ComponentType } from 'react'
import Section from '../primitives/Section'
import Reveal from '../primitives/Reveal'
import { solution } from '../content/copy'
import { cn } from '@/shared/utils'

// Formula step 3, the reference's alternating grid. The alternation is derived
// from the index, so adding a feature re-stripes the rows automatically.
const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  KanbanSquare,
  NotebookPen,
  FileText,
  TrendingUp,
}

export default function Solution() {
  return (
    <Section id={solution.id} className="py-16 sm:py-24">
      <Reveal className="lg:col-span-12 max-w-2xl">
        <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground text-balance">
          {solution.title}
        </h2>
        <p className="mt-4 text-sm sm:text-base text-muted-foreground">{solution.sub}</p>
      </Reveal>

      {solution.features.map((feature, i) => {
        const Icon = ICONS[feature.icon]
        // Even rows lead wide-left, odd rows lead wide-right.
        const wide = i % 2 === 0

        return (
          <Reveal
            key={feature.title}
            delay={(i % 2) * 90}
            className={cn(
              'mt-2 rounded-[28px] border p-6 sm:p-8',
              'transition-transform duration-200 ease-out hover:-translate-y-1',
              'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
              wide
                ? 'lg:col-span-7 bg-brand/10 border-brand/20'
                : 'lg:col-span-5 bg-card border-border',
            )}
          >
            <span
              className={cn(
                'inline-flex rounded-xl p-2.5',
                wide ? 'bg-brand/15' : 'bg-muted',
              )}
            >
              {Icon && (
                <Icon
                  className={cn('w-5 h-5', wide ? 'text-brand' : 'text-muted-foreground')}
                />
              )}
            </span>

            <h3 className="mt-5 text-lg sm:text-xl font-semibold text-foreground text-balance">
              {feature.title}
            </h3>
            <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed text-pretty">
              {feature.body}
            </p>
          </Reveal>
        )
      })}
    </Section>
  )
}
