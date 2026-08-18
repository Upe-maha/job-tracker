// src/components/landing/sections/Proof.tsx
import { Check } from 'lucide-react'
import Section from '../primitives/Section'
import Reveal from '../primitives/Reveal'
import { proof } from '../content/copy'

// Formula steps 4 and 5, merged — and the one place the formula was not followed.
// Step 5 is testimonials; with no users, invented quotes would be fabricated
// social proof, so this carries claims the reader can check instead.
export default function Proof() {
  return (
    <Section id={proof.id} className="py-16 sm:py-24">
      <Reveal className="lg:col-span-5">
        <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground text-balance">
          {proof.title}
        </h2>
        <p className="mt-4 text-sm sm:text-base text-muted-foreground text-pretty">
          {proof.sub}
        </p>

        <ul className="mt-8 space-y-3">
          {proof.highlights.map(item => (
            <li key={item} className="flex items-start gap-3">
              <span className="mt-0.5 rounded-full bg-stage-offer p-1 shrink-0">
                <Check className="w-3 h-3 text-stage-offer-fg" />
              </span>
              <span className="text-sm text-muted-foreground leading-relaxed text-pretty">
                {item}
              </span>
            </li>
          ))}
        </ul>
      </Reveal>

      <div className="lg:col-span-7 lg:col-start-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {proof.stats.map((stat, i) => (
          <Reveal
            key={stat.label}
            delay={i * 80}
            className="
              rounded-2xl border border-border bg-card p-5 sm:p-6
              transition-transform duration-200 ease-out hover:-translate-y-1
              motion-reduce:transition-none motion-reduce:hover:translate-y-0
            "
          >
            <p className="text-3xl sm:text-4xl font-bold tracking-tight text-brand">
              {stat.value}
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">{stat.label}</p>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed text-pretty">
              {stat.detail}
            </p>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
