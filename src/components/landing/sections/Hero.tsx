// src/components/landing/sections/Hero.tsx
import { ArrowRight } from 'lucide-react'
import Section from '../primitives/Section'
import GlassPanel from '../primitives/GlassPanel'
import AuroraBackdrop from '../primitives/AuroraBackdrop'
import PillButton from '../primitives/PillButton'
import BoardPreview from './BoardPreview'
import { BRAND, hero } from '../content/copy'

// The reference's opening: a frosted panel floating on a full-bleed backdrop,
// with the wordmark centred at its top, the headline oversized beneath, a pill
// CTA under that, and a bar of chips along the bottom edge.
//
// grid={false} because this section owns its own internal layout — the panel is
// a single full-width element, not a row of columns. Every other section keeps
// the shared 12-column grid.
//
// Deliberately the one section with NO scroll reveal. It is above the fold on
// every visit, so a reveal here means the page's main message starts at
// opacity 0 and fades in over 600ms — and the <h1> is the LCP element, which an
// invisible paint does not satisfy. Measured before removing it: the reveal did
// fire immediately, so nothing was broken; it was just animating the one thing
// that should never be animated in. Reveals belong to what the reader scrolls
// to, not to what greets them.
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
