// src/app/page.tsx
import type { Metadata } from 'next'
import LandingHeader from '@/components/landing/LandingHeader'
import LandingFooter from '@/components/landing/LandingFooter'
import { LANDING_SECTIONS } from '@/components/landing/sections'

// Its own metadata rather than inheriting the layout's generic "Job Tracker":
// this is the page that actually gets linked to and shared, so it is the one
// that needs a description and OpenGraph tags.
export const metadata: Metadata = {
  title: 'JobTracker — every job application in one place',
  description:
    'Track applications through five stages, keep interview notes with the role they came from, store your CV and prep files, and see where your job search actually stands.',
  openGraph: {
    title: 'JobTracker — every job application in one place',
    description:
      'Track applications through five stages, keep interview notes with the role they came from, and see where your job search actually stands.',
    type: 'website',
  },
}

// Renders the registry and nothing else. Every section is self-contained, so
// the page has no layout opinions of its own to keep in sync with them — see
// components/landing/sections.ts.
//
// Signed-in visitors never reach this: middleware.ts redirects `/` to
// /dashboard for them, and only for them.
export default function LandingPage() {
  return (
    // landing-root is not decorative: globals.css scopes smooth scrolling to
    // `html:has(.landing-root)` so the section nav glides while the rest of the
    // app keeps default scroll behaviour.
    <div className="landing-root min-h-screen bg-background">
      <LandingHeader />

      <main>
        {LANDING_SECTIONS.map(({ id, Component }) => (
          <Component key={id} />
        ))}
      </main>

      <LandingFooter />
    </div>
  )
}
