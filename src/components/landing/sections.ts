// src/components/landing/sections.ts — the page's order of argument, and the only
// place it lives. Every section takes no props, imports its own copy and renders
// inside Section, so none of them knows its index and reordering stays one line.
import type { ComponentType } from 'react'
import Hero from './sections/Hero'
import Problem from './sections/Problem'
import Solution from './sections/Solution'
import Proof from './sections/Proof'
import About from './sections/About'
import Faq from './sections/Faq'
import ClosingCta from './sections/ClosingCta'
import { about, faq, problem, proof, solution } from './content/copy'

export interface LandingSection {
  /** Stable React key. */
  id: string
  Component: ComponentType
  /**
   * The DOM id the section renders on itself, taken from the same constant the
   * section imports — never retyped here. The two disagree by design in one
   * case (the `solution` module renders `#features`), and a second literal
   * would be the thing that silently breaks the nav link.
   */
  anchor?: string
  /** Present ⇒ the header nav offers a jump to it. */
  navLabel?: string
}

// Order follows the landing-page formula: headline → problem → solution →
// proof → about → FAQ → closing CTA.
export const LANDING_SECTIONS: LandingSection[] = [
  { id: 'hero', Component: Hero },
  { id: 'problem', Component: Problem, anchor: problem.id, navLabel: 'The problem' },
  { id: 'solution', Component: Solution, anchor: solution.id, navLabel: 'Features' },
  { id: 'proof', Component: Proof, anchor: proof.id, navLabel: 'Proof' },
  { id: 'about', Component: About, anchor: about.id, navLabel: 'About' },
  { id: 'faq', Component: Faq, anchor: faq.id, navLabel: 'FAQ' },
  { id: 'closing', Component: ClosingCta },
]

// Derived, not a second list — dropping a section takes its nav entry with it.
// Hero and the closing CTA carry no navLabel: one is where the reader already is.
export const LANDING_NAV = LANDING_SECTIONS.filter(
  (section): section is LandingSection & { anchor: string; navLabel: string } =>
    Boolean(section.anchor && section.navLabel),
)
