// src/components/landing/LandingFooter.tsx
import Link from 'next/link'
import Section from './primitives/Section'
import { LANDING_NAV } from './sections'
import { BRAND, footer } from './content/copy'

// Formula step 9. Outside the section registry along with the header: the
// formula treats both as always-present chrome rather than as steps in the
// argument, and a footer that could be reordered into the middle of the page
// is a registry entry that only ever has one valid position.
export default function LandingFooter() {
  return (
    <footer className="border-t border-border bg-card/40">
      <Section className="py-12 sm:py-16">
        <div className="lg:col-span-5">
          <p className="text-base font-semibold tracking-tight text-foreground">
            {BRAND.name}
          </p>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground text-pretty">
            {footer.blurb}
          </p>
        </div>

        {/* Derived from the section registry, like the header nav. This column
            used to be a hand-written list of anchors in content/copy.ts, and
            removing a section from the registry left it linking to an anchor
            that no longer rendered — a dead in-page link that scrolls nowhere
            and says nothing. One source or it drifts. */}
        <div className="lg:col-span-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Product
          </p>
          <ul className="mt-4 space-y-2.5">
            {LANDING_NAV.map(section => (
              <li key={section.id}>
                <a
                  href={`#${section.anchor}`}
                  className="text-sm text-foreground/80 transition-colors hover:text-foreground motion-reduce:transition-none"
                >
                  {section.navLabel}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {footer.columns.map(column => (
          <div key={column.title} className="lg:col-span-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {column.title}
            </p>
            <ul className="mt-4 space-y-2.5">
              {column.links.map(link => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-foreground/80 transition-colors hover:text-foreground motion-reduce:transition-none"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* The stack, for the visitor rather than the contributor — CLAUDE.md
            is where the same list lives for people working on the code. */}
        <div className="lg:col-span-12 mt-10 border-t border-border pt-8">
          <div className="flex flex-wrap items-center gap-2">
            {footer.stack.map(tech => (
              <span
                key={tech}
                className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground"
              >
                {tech}
              </span>
            ))}
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            © {new Date().getFullYear()} {BRAND.name}
          </p>
        </div>
      </Section>
    </footer>
  )
}
