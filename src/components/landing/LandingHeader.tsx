// src/components/landing/LandingHeader.tsx
import Link from 'next/link'
import ThemeToggle from '@/components/layout/ThemeToggle'
import PillButton from './primitives/PillButton'
import { LANDING_WIDTH } from './primitives/Section'
import { LANDING_NAV } from './sections'
import LandingMobileNav from './LandingMobileNav'
import { BRAND, hero } from './content/copy'

// Formula step 1: the logo, the tagline and a way to act on them stay visible.
// Sticky rather than fixed, so it never overlaps the content it sits above and
// no section needs a compensating top padding.
//
// ThemeToggle is reused untouched: ThemeProvider is mounted in the root layout
// via components/providers.tsx, so it works on a public page with no wiring.
// Keeping it here is what stops a dark-mode visitor meeting a bright page and
// then a dark app.
export default function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/70 backdrop-blur-lg">
      <div className={`mx-auto flex h-16 w-full items-center gap-4 px-5 sm:px-8 ${LANDING_WIDTH}`}>
        <Link href="/" className="flex min-w-0 items-baseline gap-2">
          <span className="text-base font-semibold tracking-tight text-foreground">
            {BRAND.name}
          </span>
          {/* The tagline is the first thing to go when space runs out — the
              wordmark and the CTA are what the header is for. */}
          <span className="hidden truncate text-xs text-muted-foreground lg:inline">
            {BRAND.tagline}
          </span>
        </Link>

        {/* Built from LANDING_NAV, so a section dropped from the registry takes
            its nav link with it rather than leaving one pointing at an anchor
            that no longer renders.

            Hidden below md: five labels plus two CTAs do not fit a phone, and a
            landing page this short is scrolled rather than navigated. A drawer
            would duplicate the work Step H is about to do for the dashboard,
            and is better done once, there. */}
        <nav aria-label="Page sections" className="ml-8 hidden md:flex items-center gap-1">
          {LANDING_NAV.map(section => (
            <a
              key={section.id}
              href={`#${section.anchor}`}
              className="
                rounded-full px-3 py-1.5 text-sm text-muted-foreground
                transition-colors duration-150 hover:text-foreground hover:bg-accent
                motion-reduce:transition-none
              "
            >
              {section.navLabel}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />

          {/* One CTA, and it is Sign in. "Get started" still leads both the
              hero and the closing section — repeating it here made the header
              a third ask for the same action, while the thing a returning
              visitor actually wants from a header had been demoted to a
              secondary button that vanished below sm. */}
          <PillButton href={hero.secondary.href}>{hero.secondary.label}</PillButton>

          <LandingMobileNav />
        </div>
      </div>
    </header>
  )
}
