// src/components/landing/sections/Hero.tsx
import { ArrowRight } from 'lucide-react'
import Section from '../primitives/Section'
import GlassPanel from '../primitives/GlassPanel'
import AuroraBackdrop from '../primitives/AuroraBackdrop'
import PillButton from '../primitives/PillButton'
import BoardPreview from './BoardPreview'
import { BRAND, hero } from '../content/copy'

// The reference's opening panel. grid={false} because this section owns its own
// internal layout. Deliberately the one section with NO reveal: the <h1> is the
// LCP element, which a paint at opacity 0 does not satisfy.
export default function Hero() {
  return (
    <Section className="pt-4 pb-16 sm:pb-24" grid={false}>
      <AuroraBackdrop />

      <GlassPanel className="relative px-5 py-12 sm:px-10 sm:py-16 lg:py-20">
        <p className="text-center text-xs sm:text-sm tracking-[0.2em] uppercase text-foreground/60">
          {BRAND.name}
        </p>

        <div className="mt-8 sm:mt-10 text-center">
          <p className="text-xs sm:text-sm text-foreground/70 mb-3">{hero.eyebrow}</p>

          <h1 className="mx-auto max-w-3xl text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground text-balance">
            {hero.headline}
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-sm sm:text-base leading-relaxed text-foreground/70 text-pretty">
            {hero.sub}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <PillButton href={hero.primary.href} icon={ArrowRight}>
              {hero.primary.label}
            </PillButton>
            <PillButton href={hero.secondary.href} tone="glass">
              {hero.secondary.label}
            </PillButton>
          </div>
        </div>

        <div className="mt-10 sm:mt-14">
          <div className="rounded-2xl border border-border/60 bg-background/40 p-3 sm:p-5">
            <BoardPreview />
          </div>
        </div>

        {/* The reference's bottom chip bar. Wraps rather than scrolls, so a
            narrow screen gets two tidy rows instead of a hidden overflow. */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {hero.chips.map(chip => (
            <span
              key={chip}
              className="rounded-full border border-foreground/10 bg-background/40 px-3 py-1.5 text-[11px] sm:text-xs text-foreground/70"
            >
              {chip}
            </span>
          ))}
        </div>
      </GlassPanel>
    </Section>
  )
}
