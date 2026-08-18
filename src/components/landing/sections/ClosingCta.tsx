// src/components/landing/sections/ClosingCta.tsx
import { ArrowRight } from 'lucide-react'
import Section from '../primitives/Section'
import GlassPanel from '../primitives/GlassPanel'
import AuroraBackdrop from '../primitives/AuroraBackdrop'
import PillButton from '../primitives/PillButton'
import Reveal from '../primitives/Reveal'
import { BRAND, closing } from '../content/copy'

// Formula step 8: the hero's backdrop and glass again, so the page ends where it
// began. The ask is one application on purpose, not a spreadsheet migration.
export default function ClosingCta() {
  return (
    <Section className="py-16 sm:py-24" grid={false}>
      <AuroraBackdrop />

      <GlassPanel className="relative px-5 py-14 sm:px-10 sm:py-20 text-center">
        <Reveal>
          <p className="text-xs sm:text-sm tracking-[0.2em] uppercase text-foreground/60">
            {BRAND.name}
          </p>

          <h2 className="mx-auto mt-6 max-w-2xl text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground text-balance">
            {closing.title}
          </h2>

          <p className="mx-auto mt-4 max-w-lg text-sm sm:text-base text-foreground/70 text-pretty">
            {closing.sub}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <PillButton href={closing.primary.href} icon={ArrowRight}>
              {closing.primary.label}
            </PillButton>
            <PillButton href={closing.secondary.href} tone="glass">
              {closing.secondary.label}
            </PillButton>
          </div>
        </Reveal>
      </GlassPanel>
    </Section>
  )
}
