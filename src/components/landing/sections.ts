// src/components/landing/sections.ts
//
// The landing page's order of argument, and the ONLY place it lives. page.tsx
// maps over this array and renders nothing else itself, so adding a section,
// dropping one, or reordering the page is a one-line change here.
//
// What makes that real rather than decorative is the contract every section
// keeps: it takes no props, imports its own copy from ./content/copy, and
// renders inside the shared Section primitive. No section knows its index or
// its neighbours, so none of them break when this array changes. The temptation
// to resist is a section asking "am I first?" to size its own spacing — that
// puts the order back in two places, and they will disagree.
//
// Header and footer are not entries here: the formula this follows treats them
// as always-present chrome, and a footer that could be reordered into the
// middle of the page is an entry with only one valid position.
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

// Derived, not a second list. Dropping a section from the array above removes
// its nav entry with it — a hand-maintained nav is exactly how a link ends up
// pointing at an anchor that no longer renders.
//
// Hero and the closing CTA carry no navLabel on purpose: the first is where the
// reader already is, and the last is the CTA the header itself duplicates.
export const LANDING_NAV = LANDING_SECTIONS.filter(
  (section): section is LandingSection & { anchor: string; navLabel: string } =>
    Boolean(section.anchor && section.navLabel),
)
