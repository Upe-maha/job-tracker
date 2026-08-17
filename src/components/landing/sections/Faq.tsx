// src/components/landing/sections/Faq.tsx
import Section from '../primitives/Section'
import Reveal from '../primitives/Reveal'
import { faq } from '../content/copy'

// Formula step 7. Native <details>/<summary> rather than an accordion
// component: it is keyboard accessible, searchable by the browser's find-in-page
// even while collapsed, and works with JavaScript disabled — none of which a
// state-driven accordion gives for free on a static marketing page.
//
// The last question answers "can I export my data" with "not yet". Leaving that
// out would be the more flattering choice and the less useful one; someone
// deciding whether to put a whole job search in here deserves to know before
// they start rather than after.
export default function Faq() {
  return (
    <Section id={faq.id} className="py-16 sm:py-24">
      <Reveal className="lg:col-span-4">
        <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground text-balance lg:sticky lg:top-8">
          {faq.title}
        </h2>
      </Reveal>

      <div className="lg:col-span-7 lg:col-start-6 space-y-3">
        {faq.items.map((item, i) => (
          <Reveal key={item.q} delay={i * 70}>
            <details className="group rounded-2xl border border-border bg-card px-5 sm:px-6">
              <summary
                className="
                  flex cursor-pointer items-center justify-between gap-4 py-5
                  text-sm sm:text-base font-medium text-foreground
                  list-none [&::-webkit-details-marker]:hidden
                "
              >
                {item.q}
                {/* Rotates in place, so the row height never changes and the
                    list below it cannot jump on open. */}
                <span
                  aria-hidden
                  className="
                    shrink-0 text-muted-foreground transition-transform duration-200
                    group-open:rotate-45 motion-reduce:transition-none
                  "
                >
                  +
                </span>
              </summary>

              <p className="pb-5 -mt-1 text-sm text-muted-foreground leading-relaxed text-pretty">
                {item.a}
              </p>
            </details>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
