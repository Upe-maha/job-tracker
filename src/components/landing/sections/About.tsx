// src/components/landing/sections/About.tsx
import type { ComponentType } from 'react'
import Section from '../primitives/Section'
import Reveal from '../primitives/Reveal'
import { GitHubMark, LinkedInMark } from '@/components/common/ProviderMarks'
import { about } from '../content/copy'

// Formula step 6. The copy is a marked PLACEHOLDER for the project owner. Brand
// marks come from ProviderMarks — lucide has no GitHub icon, it is a build error.
const MARKS: Record<string, ComponentType<{ className?: string }>> = {
  Github: GitHubMark,
  Linkedin: LinkedInMark,
}

export default function About() {
  return (
    <Section id={about.id} className="py-16 sm:py-24">
      <Reveal className="lg:col-span-8 lg:col-start-3">
        <div className="rounded-[28px] border border-border bg-card p-6 sm:p-10 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {about.title}
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base text-muted-foreground leading-relaxed text-pretty">
            {about.body}
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            {about.links.map(link => {
              const Mark = MARKS[link.icon]

              return (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    inline-flex items-center gap-2 rounded-full border border-border
                    px-4 py-2 text-sm text-foreground
                    transition-colors duration-150 hover:bg-accent
                    motion-reduce:transition-none
                  "
                >
                  {Mark && <Mark className="w-4 h-4" />}
                  {link.label}
                </a>
              )
            })}
          </div>
        </div>
      </Reveal>
    </Section>
  )
}
