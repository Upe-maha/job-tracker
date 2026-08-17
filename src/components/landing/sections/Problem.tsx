// src/components/landing/sections/Problem.tsx
import { CalendarClock, FileSpreadsheet, MessageSquareOff } from 'lucide-react'
import type { ComponentType } from 'react'
import Section from '../primitives/Section'
import Reveal from '../primitives/Reveal'
import { problem } from '../content/copy'

// Formula step 2: name the problem before offering anything. Deliberately not
// a feature list — each point is a failure mode of the thing the reader is
// using now, and Solution answers them one for one in the same order.
const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  FileSpreadsheet,
  CalendarClock,
  MessageSquareOff,
}

export default function Problem() {
  return (
    <Section id={problem.id} className="py-16 sm:py-24">
      <Reveal className="lg:col-span-5">
        <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground text-balance">
          {problem.title}
        </h2>
        <p className="mt-4 text-sm sm:text-base text-muted-foreground text-pretty">
          {problem.sub}
        </p>
      </Reveal>

      <div className="lg:col-span-7 lg:col-start-6 space-y-4">
        {problem.points.map((point, i) => {
          const Icon = ICONS[point.icon]

          return (
            <Reveal
              key={point.title}
              delay={i * 90}
              className="
                rounded-2xl border border-border bg-card p-5 sm:p-6
                transition-transform duration-200 ease-out hover:-translate-y-0.5
                motion-reduce:transition-none motion-reduce:hover:translate-y-0
              "
            >
              <div className="flex items-start gap-4">
                <span className="rounded-xl bg-muted p-2.5 shrink-0">
                  {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-foreground">
                    {point.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed text-pretty">
                    {point.body}
                  </p>
                </div>
              </div>
            </Reveal>
          )
        })}
      </div>
    </Section>
  )
}
