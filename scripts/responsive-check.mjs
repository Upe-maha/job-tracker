// scripts/responsive-check.mjs
//
// Step H's verification. Responsive layout is not something the Vitest suite
// can assert — it is Node-only with no jsdom, so nothing in it renders — so a
// browser driver is the right tool rather than a fallback.
//
// Re-runnable on purpose: "it looked fine when I built it" is not a regression
// guard. Run it after any layout change.
//
//   node scripts/responsive-check.mjs [baseUrl]
//
// Needs a dev/prod server already running and a session cookie in
// RESPONSIVE_CHECK_TOKEN (see the accompanying note in md/step-h-mobile.md).
//
// Do NOT run `npm run build` against the server you are checking: the build
// replaces .next underneath the running dev server, the page then loads with no
// CSS at all, and every control measures as unstyled — a 370px-tall header and
// a wall of "small target" failures that have nothing to do with the layout.
// Stop the dev server first, or point this at a separate origin.
//
// Playwright is deliberately NOT a dependency of this project: it is a ~50MB
// install plus browser downloads, for a script that runs by hand a few times a
// release. It is resolved at runtime instead, so the script works with a global
// or npx-cached copy today and picks up a local devDependency if one is ever
// added. CHROMIUM_PATH points at a system browser so no browser download is
// needed either.
async function loadPlaywright() {
  try {
    return await import('playwright')
  } catch {
    if (process.env.PLAYWRIGHT_PATH) return await import(process.env.PLAYWRIGHT_PATH)
    console.error(
      'playwright not found. Either `npm i -D playwright`, or point PLAYWRIGHT_PATH at an\n' +
        'existing copy, e.g. PLAYWRIGHT_PATH=~/.npm/_npx/<hash>/node_modules/playwright/index.mjs',
    )
    process.exit(2)
  }
}

const { chromium } = await loadPlaywright()

const BASE = process.argv[2] ?? 'http://localhost:3000'
const TOKEN = process.env.RESPONSIVE_CHECK_TOKEN
const CHROME = process.env.CHROMIUM_PATH ?? '/usr/bin/chromium'

const VIEWPORTS = [
  { name: '375 iphone-se', width: 375, height: 667 },
  { name: '390 iphone-12', width: 390, height: 844 },
  { name: '768 tablet', width: 768, height: 1024 },
  { name: '1024 laptop', width: 1024, height: 768 },
  { name: '1440 desktop', width: 1440, height: 900 },
  { name: '844x390 landscape', width: 844, height: 390 },
]

const ROUTES = ['/dashboard', '/applications', '/notes', '/analytics', '/profile', '/settings']

// Two thresholds, because one number cannot be defended for every control.
//
//   44px for icon-only controls — no visible label, nothing to aim at but the
//   glyph. This is WCAG 2.2's *enhanced* figure (2.5.5) and Apple's HIG.
//   32px for controls with a text label, comfortably above WCAG 2.2 AA's
//   minimum of 24px (2.5.8), which the app's 32px control scale already meets.
//
// Holding everything to 44 would flag a hundred controls and amount to
// redesigning the app's density rather than making it usable on a phone — and a
// gate nobody can satisfy is a gate everyone learns to ignore.
const MIN_HIT_ICON = 44
const MIN_HIT_LABELLED = 32

// The narrowest the content region may get. This exists because the overflow
// check alone is not sufficient, which the baseline run proved: with a
// shrink-0 sidebar and a min-w-0 main, a 375px screen produced *zero*
// horizontal overflow while squeezing the content to about 119px. Nothing
// overflowed; the page was simply unusable. A layout can pass "nothing sticks
// out" and still be broken, so the readable width is asserted directly.
const MIN_MAIN_RATIO = 0.85

const failures = []
function check(ok, label) {
  if (!ok) failures.push(label)
  return ok
}

// The union of a control's own box with any wrapping label/anchor, because a
// 16px icon inside a 40px padded button is fine and a tall row whose clickable
// area is really its text span is not. Measuring the icon's own rect reports
// failures that are not real and misses the ones that are.
//
// Inline links are skipped: WCAG's target-size criteria both exempt a link
// sitting in a run of text, and flagging every sentence-embedded link buries
// the controls that genuinely need a thumb.
const HIT_AREA_SCRIPT = (iconMin, labelledMin) => `
  (() => {
    const sel = 'a[href], button, [role="button"], input:not([type="hidden"]), select, textarea, summary'
    const bad = []
    for (const el of document.querySelectorAll(sel)) {
      const style = getComputedStyle(el)
      if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') continue
      const own = el.getBoundingClientRect()
      if (own.width === 0 || own.height === 0) continue
      if (own.bottom < 0 || own.top > innerHeight) continue

      // An <a> whose parent is a text block is prose, not a control.
      if (el.tagName === 'A') {
        const p = el.parentElement
        const inline = p && ['P', 'SPAN', 'LI', 'TD'].includes(p.tagName) && p.textContent.trim() !== el.textContent.trim()
        if (inline) continue
      }

      const wrapper = el.closest('label, a[href], button')
      const box = wrapper && wrapper !== el ? wrapper.getBoundingClientRect() : own
      const w = Math.max(own.width, box.width), h = Math.max(own.height, box.height)

      // A field is not an icon control: it has no textContent but is a wide,
      // easily-hit target. Only a genuinely label-less button is held to 44.
      const isField = ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)
      const hasText = isField || (el.textContent || '').trim().length > 0
      const min = hasText ? ${labelledMin} : ${iconMin}
      if (Math.min(w, h) < min) {
        bad.push((el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 40)
          + ' [' + Math.round(w) + 'x' + Math.round(h) + ' min ' + min + ']')
      }
    }
    return bad
  })()
`

const browser = await chromium.launch({ executablePath: CHROME })
const results = []

for (const vp of VIEWPORTS) {
  vp.hasTouch = vp.width < 1024
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    hasTouch: vp.hasTouch,
  })
  if (TOKEN) {
    await ctx.addCookies([
      { name: 'authjs.session-token', value: TOKEN, domain: 'localhost', path: '/' },
    ])
  }
  const page = await ctx.newPage()

  for (const route of ROUTES) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    // Counted as *exposed*, not as present in the DOM, and the difference is
    // the whole point. Two earlier versions of this assertion were wrong:
    // counting every <nav> flagged the breadcrumb (a legitimate second
    // landmark), and counting DOM nodes flagged the permanent sidebar sitting
    // at display:none behind an open drawer. What matters is what a screen
    // reader reaches and a Tab key lands on, which is what checkVisibility()
    // approximates — display:none is excluded, an offscreen-but-rendered
    // element is not.
    //
    // "At most one" rather than "exactly one": below lg with the drawer shut,
    // zero exposed navs is the correct state — the navigation is in the drawer.
    const exposed = sel =>
      page.evaluate(
        s => [...document.querySelectorAll(s)].filter(el => el.checkVisibility()).length,
        sel,
      )
    const navs = await exposed('nav[aria-label="Main"]')
    const current = await exposed('[aria-current="page"]')
    const mainRatio = await page.evaluate(() => {
      const main = document.querySelector('main')
      return main ? main.getBoundingClientRect().width / window.innerWidth : 1
    })
    const small = vp.hasTouch ? await page.evaluate(HIT_AREA_SCRIPT(MIN_HIT_ICON, MIN_HIT_LABELLED)) : []

    check(overflow <= 0, `${vp.name} ${route}: horizontal overflow ${overflow}px`)
    check(navs <= 1, `${vp.name} ${route}: ${navs} exposed primary navs (want ≤1)`)
    check(current <= 1, `${vp.name} ${route}: ${current} exposed aria-current (want ≤1)`)
    check(
      vp.width >= 1024 || mainRatio >= MIN_MAIN_RATIO,
      `${vp.name} ${route}: content is ${Math.round(mainRatio * 100)}% of the viewport (want ≥${MIN_MAIN_RATIO * 100}%)`,
    )
    check(small.length === 0, `${vp.name} ${route}: ${small.length} small targets — ${small.slice(0, 3).join('; ')}`)

    results.push({
      vp: vp.name,
      route,
      overflow,
      navs,
      current,
      main: Math.round(mainRatio * 100),
      small: small.length,
    })
  }
  await ctx.close()
}

await browser.close()

const pad = (s, n) => String(s).padEnd(n)
console.log(`\n${pad('viewport', 20)}${pad('route', 15)}${pad('ovfl', 6)}${pad('navs', 6)}${pad('cur', 5)}${pad('main%', 7)}small`)
for (const r of results) {
  const flag = r.overflow > 0 || r.navs > 1 || r.current > 1 || r.small > 0 ? ' ✗' : ' ✓'
  console.log(`${pad(r.vp, 20)}${pad(r.route, 15)}${pad(r.overflow, 6)}${pad(r.navs, 6)}${pad(r.current, 5)}${pad(r.main, 7)}${r.small}${flag}`)
}

if (failures.length) {
  console.log(`\n${failures.length} failures:`)
  for (const f of failures.slice(0, 25)) console.log('  ✗ ' + f)
  process.exit(1)
}
console.log('\nAll checks passed.')
