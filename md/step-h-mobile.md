#Step H — Mobile Responsive

Status: planned → implemented in this step.

## Context

The dashboard shell was built for a desktop and had never been usable on a phone. The failure was
structural rather than cosmetic: `(dashboard)/layout.tsx` rendered `Sidebar` as a permanent flex
item, and `Header`'s brand block was a fixed `w-64`. On a 375px screen that is 256px of chrome
before any content exists, with the breadcrumb, theme toggle and avatar sharing what is left — and
the sidebar taking another 256px from the page beneath it.

Two of the roadmap's six bullets turned out to be **already satisfied**, and were measured before
being touched rather than "fixed" on the assumption they were broken:

- The Kanban board already wrapped its columns in `ScrollArea` with `min-w-max` and 280px columns.
- `PageGrid` was already `grid-cols-1 md:grid-cols-12`, so the dashboard already stacked.

The real work was the shell, the detail page's five tabs, modal widths, and one viewport-unit bug
that had nothing to do with the roadmap list.

## Decisions locked with the user

1. **Drawer below `lg` (1024px)**, so portrait tablets get it too. At 768px a permanent 256px
   sidebar leaves 512px, which is cramped for the Kanban and for the detail page's two-column
   blocks — and `md:` is exactly where those blocks begin splitting into columns.
2. **A vendored `ui/sheet.tsx`**, hand-written against the unified `radix-ui` package (the shadcn
   generator emits `@radix-ui/react-*` imports, which are not dependencies here — the same reason
   `ui/form.tsx` was hand-written). Focus trap, Escape, scroll lock and the overlay come with it.
   It takes a `side` and exports the full `Sheet*` family: a primitive shaped around exactly one
   caller is the thing the second caller forks.
3. **Mobile header: hamburger + current page title + theme toggle + avatar.** The title is the last
   crumb rather than the trail — a truncated "Applications › Very Long Comp…" in ~100px says less
   than the page name alone — and it is explicitly constrained with `truncate` and a `min-w-0`
   parent, because an unconstrained heading in a flex row pushes the avatar off the right edge,
   which is the exact overflow this step removes.

## Approach

### Only one nav may be *exposed*, not merely hidden

`Sidebar` renders twice — the permanent column and a copy inside the sheet — which is an
accessibility trap if done carelessly: two `<nav>` landmarks, two links per route, and two elements
carrying `aria-current="page"`. A screen-reader user hears the navigation twice and a keyboard user
tabs through a sidebar they cannot see.

The permanent column uses `hidden lg:flex`, and `hidden` is `display: none`, which removes it from
the accessibility tree *and* the tab order. That must not be traded for an opacity, visibility or
transform trick, all of which leave the element focusable. The drawer copy only exists while the
sheet is open, because Radix mounts `SheetContent` on open. The two therefore never coexist, and
neither needs `aria-hidden` bolted on to compensate.

The verification script asserts this directly: exactly one `nav` landmark and exactly one
`aria-current="page"` element at every width, with the drawer open and closed.

### CSS, not a JS breakpoint

No `useMediaQuery`. A JS breakpoint has to guess on the server and correct after hydration, which is
the class of problem `theme.tsx` and `SidebarContext` already avoid by reading external state
through `useSyncExternalStore`. Rendering the sidebar twice costs nothing real, since Radix portals
the sheet's copy only while it is open.

### Drawer state is transient

`SidebarContext` gains `mobileOpen`, deliberately **not** persisted the way `collapsed` is. A drawer
that reopens on next load because it was open when you left is a bug, not a restored preference.
It also closes on `pathname` change, which covers link clicks and the back button in one rule —
without that, the drawer sits over the page it just navigated to.

### `h-screen` is wrong on a phone

The shell was `h-screen`, and `100vh` on mobile means the viewport *without* the collapsible URL
bar. The shell is therefore taller than the visible area and the bottom of `<main>` sits under
browser chrome. `h-dvh` tracks the bar as it collapses. This was not on the roadmap's list; it is
the kind of thing only a landscape phone test surfaces, which is why one exists.

### The landing page got the same treatment

Its section nav was `hidden md:flex` with no mobile equivalent, so a phone visitor had a header with
no navigation at all. `LandingMobileNav` is a second caller of the `Sheet` primitive — which is the
whole reason it was built as general infrastructure rather than as "the sidebar drawer", and the
first test of that decision. Links come from `LANDING_NAV`, so the mobile nav cannot drift from the
desktop one or outlive a section dropped from the registry.

One difference from the dashboard drawer, and it matters: **it closes on click, not on a pathname
change.** These are in-page anchors, so the pathname never changes and the dashboard's rule would
never fire. Copying that rule across would have produced a drawer that stayed open over the section
it had just scrolled to.

The header's CTA is now **Sign in** alone. "Get started" already leads the hero and the closing
section; a third instance in the header made it the only thing the page said, while the one action a
*returning* visitor wants from a header was a secondary button that disappeared below `sm`.

### The brand is back in the dashboard header on mobile

Step H hid the whole `w-64` brand block below `lg`, which took the logo with it — the app had no
identity on a phone and no route back to the landing page from inside it. A compact mark now sits
between the hamburger and the page title, and it is a link to `/` rather than decoration.

The wordmark drops below `sm` and the mark alone carries it. At 375px the row is hamburger + brand +
page title + theme + avatar, and the page title is what tells the reader where they are now that the
sidebar's active state lives in a drawer. The logo earns its place; the word beside it does not earn
a third of the row.

### Two bugs the roadmap did not list

Both were found by measuring rather than by reading:

- **The Kanban drag handle did not exist on touch.** It was `opacity-0
  group-hover:opacity-100`, and there is no hover on a touch screen — so the only way to reorder the
  board was an invisible 20px target. Below `lg` it is now always visible and a full 44px, sitting
  just *outside* the card's top-left corner rather than over it: a handle that swallows the card's
  own tap target trades one broken interaction for another.
- **Control heights were a desktop density everywhere.** Buttons and inputs were `h-8` (32px) at
  every width. They are now `h-10` below `lg` and unchanged above it, so the desktop scale is
  untouched. The breakpoint is `lg` rather than `sm` deliberately — a tablet is a touch device, and
  sizing its controls for a mouse was the same mistake one breakpoint up.

### The gate is two numbers, not one

Holding every control to 44px would have flagged over a hundred and amounted to redesigning the
app's density. The script uses **44px for icon-only controls** (WCAG 2.2's enhanced figure, and
Apple's) and **32px for controls with a text label**, comfortably above WCAG 2.2 AA's 24px minimum,
which the app's scale already met. Inline links in a run of prose are exempt, as the criteria
themselves exempt them. A gate nobody can satisfy is a gate everyone learns to ignore.

### Verified by a script, not by a look

`scripts/responsive-check.mjs` drives Chromium over every dashboard route at five widths plus
landscape. It is re-runnable, which is the point — "it looked fine when I built it" is not a
regression guard. Playwright is resolved at runtime rather than added as a dependency: it is a
~50MB install for a script run by hand a few times a release, and `CHROMIUM_PATH` points it at a
system browser so no browser download is needed either.

**The script's own assertions were wrong three times before they caught anything**, which is worth
recording because each error was the plausible version:

- *"No horizontal overflow"* is necessary but nowhere near sufficient. The baseline run reported
  **zero overflow at 375px** while the content was squeezed to 119px — a `shrink-0` sidebar beside a
  `min-w-0` main simply crushes the page instead of bursting it. The script now asserts the content
  region is at least 85% of the viewport below `lg`; that number went 32% → 100%.
- *"Exactly one `nav` landmark"* flagged every page at every width, because the breadcrumb is also a
  `nav` and legitimately so. It now looks for the primary nav by its accessible name.
- *Counting DOM nodes* then flagged the open drawer, because the permanent sidebar is still in the
  document at `display: none` behind it. What matters is what a screen reader reaches and Tab lands
  on, so the count is now of **exposed** elements via `checkVisibility()` — and the invariant is
  *at most* one, since below `lg` with the drawer shut, zero exposed navs is correct.

The hit-area measurement takes the union of a control's box with any wrapping label or anchor,
because measuring an icon's own rect reports failures that are not real and misses the ones that are.

### What is verified, and what is not

Verified in a browser: the sweep above (36 route/viewport combinations, all passing), the drawer's
full behaviour (opens, Escape closes, focus enters the panel and returns to the hamburger, navigation
closes it, background scroll locked, desktop unaffected with its collapse toggle still working), the
detail page's tab strip scrolling rather than overflowing, and every modal fitting inside a 375px
viewport with its own body scrolling.

**Not verified: an actual touch swipe scrolling the Kanban board.** The board is scrollable —
`scrollWidth` 1464 against a 343px viewport, `overflow-x: scroll`, `touch-action: auto` up the whole
ancestor chain, and it scrolls both programmatically and by wheel — but synthetic touch gestures do
not drive the compositor in headless Chromium, including CDP's `synthesizeScrollGesture`. Every
precondition is present; the gesture itself needs real hardware to confirm. Press-and-hold to drag
*was* confirmed, as was the handle now being visible without hover.
