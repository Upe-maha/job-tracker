#Step G — Landing / Home Page

Status: planned → implemented in this step.

## Context

`src/app/page.tsx` was a developer placeholder telling the reader to *"type /login in url to get
login page"*, and it was **unreachable anyway**: `middleware.ts` redirected `/` to `/dashboard` or
`/login` for everyone, so the file had never rendered for anybody. Every other public surface — login,
register, and Step C's four token pages — was finished, which left `/` as the one place a first-time
visitor arrived with nothing to read.

Two references were supplied and they answer different questions, which is why both are used:

- **The AKINA hotel page → visual language.** A glass panel floating on a full-bleed backdrop, a card
  grid that alternates sides down the page, oversized radii, pill controls. None of its content,
  imagery or branding carries over.
- **The "Landing Page Winning Formula" infographic → information architecture.** Headline → problem
  → solution → proof → about → FAQ → closing CTA → footer, with header and CTA always visible.

## Decisions locked with the user

1. **Signed-in visitors still go straight to `/dashboard`.** Only the signed-out half of the `/`
   redirect came out. A returning user never sees marketing copy again, and `/` stays a one-line
   middleware decision rather than a session-aware page.
2. **The backdrop is a CSS gradient mesh, not photography.** The reference's mood is carried entirely
   by photos; there are no image assets here, one photo cannot serve both themes, and a committed
   image goes stale as the product changes. A slow drifting radial mesh built from the existing brand
   tokens gives the glass panel something to refract for zero bytes.
3. **Animation is CSS plus one IntersectionObserver hook — no new dependency.** `tw-animate-css` was
   already imported by `globals.css`, and `motion-reduce:` was already the codebase's opt-out idiom.
4. **Both themes.** `ThemeToggle` stays in the landing header, so no page in the app looks broken
   after a toggle.
5. **The proof section is real or it does not ship.** There are no users, so there are no
   testimonials — inventing quotes or company logos was refused. The slot carries verifiable things
   instead: the product preview, the repository, and engineering the actual audience (recruiters and
   developers) can check.
6. **About is about the developer, and its copy is a placeholder** for the user to write. Inventing
   somebody's biography is not the assistant's to do.

## Approach

### Modular by registry

The brief asked for a modular architecture, so **order and membership live in exactly one file**:
`components/landing/sections.ts` exports an ordered array of `{ id, Component }` and `page.tsx` maps
over it, rendering nothing else itself. Adding, dropping or reordering a section is a one-line change
there.

What makes that real rather than decorative is the constraint on the sections: **every section takes
no props, imports its own copy from `content/`, and renders inside the shared `Section` primitive.**
No section knows its own index or its neighbours, so none of them break when the order changes. The
one temptation to resist is a section reaching for "am I first?" to size its own spacing — that is
what puts order back into two places at once.

Header and footer sit outside the registry on purpose: the formula treats them as always-present
chrome, not as steps in the argument.

### One grid, stated once

`primitives/Section.tsx` owns the rhythm — a full-bleed outer element so backdrops can reach the
window edges, an inner `max-w-[1200px]` container matching the app's own `CONTENT_WIDTH`, and a
12-column grid inside that. The reference's zig-zag then *falls out of the grid* (alternating
`lg:col-span-7` / `lg:col-span-5` rows and their mirrors) instead of being positioned by hand.

`PageShell` is deliberately not reused: it is the dashboard's content frame and cannot bleed.

### Motion, and the two ways it goes wrong

`useReveal` unobserves after the first intersection, so a section reveals once and stays revealed
rather than replaying every time it scrolls back into view.

Both failure modes of this pattern are guarded:

- **A reveal that depends on an animation which never runs hides the content permanently.** Under
  `prefers-reduced-motion: reduce` the revealed state is applied unconditionally by CSS, so the text
  is simply *there* rather than waiting for a transition that has been switched off.
- **A permanently drifting full-page gradient is exactly what that setting exists for**, so the
  drift keyframe stops under the same media query.

Everything animates transform and opacity only, so nothing in the page triggers reflow while
scrolling.

`useReveal` uses a **callback ref rather than `useEffect`**. Two reasons: it observes the node the
moment it attaches instead of waiting a render, and it keeps the "no `IntersectionObserver`"
fallback out of an effect, where setting state synchronously is what the `react-hooks` lint rule
warns about. A `revealed` ref latches the result so a re-attach — Fast Refresh, a re-key — cannot
drop a section back to hidden and replay the animation.

### Two things the screenshots caught that the markup did not

Both were found by rendering the page at four configurations (light, dark, 375px, reduced-motion)
rather than by reading the JSX:

- **The mock board was illegible on a phone.** Five columns inside 375px leaves each about 60px
  wide, and the company names rendered as smears. Below `sm` the last two columns are now dropped:
  three legible columns say "a board with stages" better than five unreadable ones, and this is an
  illustration rather than data. A horizontally scrolling strip was the alternative and was rejected
  — it would fight the page's own scroll under a thumb.
- **The light theme's backdrop washed out to almost nothing.** The same `color-mix` percentage reads
  very differently against the two grounds: light mode's `--brand` is a *dark* teal, so a mix that
  glows on a near-black background disappears on a near-white one. The strength is now a per-theme
  token (`--aurora-strength`), tuned by looking at both rather than by assuming one number works
  twice.

### The hero is the one section with no reveal

Found the same way. Driving a real sign-out landed on `/` and screenshotted a **glass panel empty
below the wordmark** — the hero mid-fade. Measuring it showed nothing was actually broken: the
observer fires immediately and the headline is at opacity 0.998 within the first frame.

It was removed anyway, because the measurement showed the wrong thing was being animated. The `<h1>`
is above the fold on every visit and is the page's LCP element, and an element at `opacity: 0` has
not painted — so a reveal there delays the largest contentful paint and blanks the page's main
message for 600ms in exchange for an effect nobody scrolls to see. **Reveals belong to what the
reader scrolls to, not to what greets them.**

### Getting back out

Two small routing changes shipped with this step, both consequences of the landing page existing:

- **Signing out goes to `/`, not `/login`** (the header menu and the settings page, which had drifted
  to the same literal in two places). Signing out is not the first half of signing back in, and
  dropping someone onto a login form implies it is — the landing page carries a Sign in button
  anyway.
- **Every `(auth)` page gained a "Back to JobTracker" link**, in the layout rather than in each page.
  Someone who followed "Sign in" from the landing page and then wanted to keep reading had no way
  back except the browser's Back button; six copies of one link is how they drift apart.

### Section nav — derived, or it rots

The header's section nav is built from `LANDING_NAV`, which is `LANDING_SECTIONS` filtered to the
entries carrying a `navLabel`. Two properties matter and both were tested by actually removing a
section rather than by reading the code:

- **A dropped section takes its nav link with it.** A hand-maintained nav is how a link ends up
  pointing at an anchor that no longer renders — an in-page link that scrolls nowhere and reports
  nothing.
- **The anchor is never retyped.** Registry entries take `anchor: solution.id`, importing the same
  constant the section renders. The registry key and the DOM id genuinely disagree in one case —
  the `solution` module renders `#features` — and a second literal is precisely what would break.

The footer's "Product" column was a hand-written list of the same anchors, and the removal test
caught it still linking to `#proof` after the section was gone. It is derived from `LANDING_NAV`
now too. The comment warning against a hand-maintained nav had been written one file away from a
hand-maintained nav.

Smooth scrolling is scoped with `html:has(.landing-root)` rather than set on `html` globally, so the
rest of the app keeps default scroll behaviour, and it is dropped under reduced motion where an
instant jump is the point. Sections carry `scroll-mt-20` to clear the sticky header — without it a
nav jump puts the heading *behind* the header, which reads as landing on the wrong section.

Below `md` the nav is hidden: five labels plus two CTAs do not fit a phone, and a page this short is
scrolled rather than navigated. A drawer would duplicate what Step H is about to build for the
dashboard, and is better done once, there.

### The theme toggle shows state, not action

The icon was a sun while in dark mode, because it described what pressing it would do. Both
conventions exist, but the state reading is what people expect from a moon — and with dark as the
default, the app opened on a sun, which reads as "you are in light mode" to anyone holding that
convention. It is now a moon while dark and a sun while light. The `aria-label` still describes the
action, because that is what a button does when pressed.

The default theme is unchanged: dark, as `lib/theme.tsx` has always had it.

### Brand marks

lucide dropped its brand icon set, so `import { Github } from 'lucide-react'` is a compile error
rather than a fallback. GitHub already lived in `components/common/ProviderMarks.tsx` from Step E;
LinkedIn was added there for the About section. That file is now "brand marks the app draws" rather
than strictly OAuth providers — LinkedIn is a profile link here, not a sign-in method.
