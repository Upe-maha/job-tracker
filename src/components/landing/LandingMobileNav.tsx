// src/components/landing/LandingMobileNav.tsx
'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { LANDING_NAV } from './sections'
import { BRAND, hero } from './content/copy'

// The below-md counterpart to the header nav, over the same Sheet primitive as
// the dashboard drawer. Links come from LANDING_NAV, so the two cannot drift.
export default function LandingMobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open menu"
        className="
          md:hidden shrink-0 w-11 h-11 rounded-lg
          flex items-center justify-center
          text-muted-foreground hover:text-foreground hover:bg-accent
          focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2
          transition-colors motion-reduce:transition-none
        "
      >
        <Menu className="w-5 h-5" />
      </SheetTrigger>

      <SheetContent side="right" className="w-72 bg-background md:hidden">
        <SheetTitle className="px-4 pt-4 text-base">{BRAND.name}</SheetTitle>

        <nav aria-label="Page sections" className="flex flex-col p-2 mt-2">
          {LANDING_NAV.map(section => (
            <a
              key={section.id}
              href={`#${section.anchor}`}
              // Closed on click, not on a pathname change: these are in-page
              // anchors, so the dashboard drawer's rule would never fire.
              onClick={() => setOpen(false)}
              className="
                rounded-lg px-4 min-h-11 flex items-center text-sm text-foreground/80
                hover:text-foreground hover:bg-accent
                transition-colors motion-reduce:transition-none
              "
            >
              {section.navLabel}
            </a>
          ))}
        </nav>

        <div className="mt-auto p-4 border-t border-border">
          <a
            href={hero.secondary.href}
            className="
              flex items-center justify-center rounded-full
              bg-brand text-primary-foreground min-h-11 px-5 text-sm font-medium
              hover:bg-brand-hover transition-colors motion-reduce:transition-none
            "
          >
            {hero.secondary.label}
          </a>
        </div>
      </SheetContent>
    </Sheet>
  )
}
