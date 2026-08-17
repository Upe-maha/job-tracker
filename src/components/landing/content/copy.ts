// src/components/landing/content/copy.ts
//
// Every word on the landing page, separated from the markup that arranges it —
// so a copy edit never means reading JSX, and a layout change never means
// stepping around prose.
//
// Deliberately NOT in @/lib/display: that directory holds Record<SomeEnum, Meta>
// tables keyed off schemas/enums, where the compiler enforces that every enum
// member has metadata. Free-form marketing copy has no enum behind it and would
// blur what that directory is for.
//
// Icons are named here and resolved by the sections, keeping this file free of
// component imports.

export const BRAND = {
  name: 'JobTracker',
  tagline: 'Every application, one place',
}

export const hero = {
  eyebrow: 'Job search, organised',
  headline: 'Track every application without losing the thread',
  sub:
    'A single place for the roles you are chasing, the interviews you have sat, and everything you learned in them — instead of a spreadsheet you stop updating by week three.',
  primary: { label: 'Get started', href: '/register' },
  secondary: { label: 'Sign in', href: '/login' },
  // The bottom chip bar of the reference's hero panel.
  chips: ['5 pipeline stages', 'Interview notes', 'CV & PDF storage', 'Analytics'],
}

export const problem = {
  id: 'problem',
  title: 'The spreadsheet stops working around week three',
  sub: 'Not because it is a bad tool — because a job search is not a list.',
  points: [
    {
      icon: 'FileSpreadsheet',
      title: 'Applications drift out of date',
      body:
        'A row gets added, the status never changes, and after a month you cannot tell which threads are still alive.',
    },
    {
      icon: 'CalendarClock',
      title: 'Follow-ups slip quietly',
      body:
        'Nothing surfaces the deadline you set or the reply you were waiting on. The ones that go cold go cold silently.',
    },
    {
      icon: 'MessageSquareOff',
      title: 'Interview lessons evaporate',
      body:
        'The question that caught you out is remembered for a week. By the next interview it is gone, and you learn it again.',
    },
  ],
}

export const solution = {
  id: 'features',
  title: 'What this does about it',
  sub: 'Four things, each aimed at one of the failures above.',
  features: [
    {
      icon: 'KanbanSquare',
      title: 'A board that reflects reality',
      body:
        'Drag an application between wishlist, applied, interview, offer and rejected. The stage is the state — there is no separate field to remember to edit.',
    },
    {
      icon: 'NotebookPen',
      title: 'Notes that stay with the role',
      body:
        'Interview questions, how a round actually went, and what to do differently — attached to the application they came from, and readable across all of them.',
    },
    {
      icon: 'FileText',
      title: 'Documents where you need them',
      body:
        'Your CV on your profile, prep files and PDFs on the application. Previewed in the app rather than downloaded and lost in a folder.',
    },
    {
      icon: 'TrendingUp',
      title: 'Answers, not just records',
      body:
        'Response rates, where applications stall, and what your week actually looks like — from the data you were entering anyway.',
    },
  ],
}

// No testimonials: this app has no users, and inventing quotes or company logos
// would be fabricating social proof. What goes here instead is checkable — the
// audience for a portfolio project is people who can and will read the source.
export const proof = {
  id: 'proof',
  title: 'Built properly, and you can check',
  sub:
    'No testimonials here — the app has no users yet, and inventing some would tell you nothing. These are things you can verify instead.',
  stats: [
    { value: '328', label: 'automated tests', detail: 'schemas, security helpers, and DAL queries against a real MongoDB' },
    { value: '2', label: 'OAuth providers', detail: 'Google and GitHub, with verified-email account linking' },
    { value: '8', label: 'rate-limit tiers', detail: 'sized per endpoint, backed by MongoDB so limits survive cold starts' },
    { value: '100%', label: 'validated routes', detail: 'every request body and query string parsed by a shared Zod schema' },
  ],
  highlights: [
    'Email verification, password reset, and confirm-by-email password changes',
    'Account lockout and timing-equalised login, so a wrong email and a wrong password cost the same',
    'Uploads checked by magic bytes rather than the filename the browser claims',
    'Ownership enforced in the query on every route — never inferred from the URL',
  ],
}

export const about = {
  id: 'about',
  title: 'About the developer',
  // PLACEHOLDER — written by the project owner. Left obviously unfinished on
  // purpose: a plausible invented biography is worse than a blank one, because
  // nobody notices it needs replacing.
  body:
    'PLACEHOLDER: a short paragraph about who you are, what you were doing when you built this, and what you are looking for next. Two or three sentences is plenty.',
  links: [
    { label: 'GitHub', href: 'https://github.com/Upe-maha', icon: 'Github' },
    // PLACEHOLDER — replace with the real profile URL before shipping.
    { label: 'LinkedIn', href: 'PLACEHOLDER_LINKEDIN_URL', icon: 'Linkedin' },
  ],
}

export const faq = {
  id: 'faq',
  title: 'Questions worth asking',
  items: [
    {
      q: 'Who can see my applications?',
      a: 'Only you. Every query is scoped to your account in the database filter itself, and files are served through a route that refuses anything it cannot prove you own — not by a link that happens to be hard to guess.',
    },
    {
      q: 'What happens to my CV?',
      a: 'It is stored with the upload provider and served back through this app, so it is never a public URL that works for anyone who has it. You can replace or remove it at any time from your profile.',
    },
    {
      q: 'Does it cost anything?',
      a: 'No. This is a portfolio project, not a business — there is no billing, no plan, and no upsell.',
    },
    {
      q: 'Do I need to sign up with a password?',
      a: 'Only if you want to. You can sign in with Google or GitHub instead, and link either to an existing account later from your profile.',
    },
    {
      q: 'Can I get my data out?',
      a: 'Not yet — export is not built. If that matters to you, it is worth knowing before you put a full job search in here.',
    },
  ],
}

export const closing = {
  title: 'Start with the one you are chasing right now',
  sub: 'Add a single application and see how it fits. Nothing to configure first.',
  primary: { label: 'Create an account', href: '/register' },
  secondary: { label: 'I already have one', href: '/login' },
}

export const footer = {
  blurb: 'A job application tracker built as a portfolio project.',
  // The "Product" column is NOT here: it is derived from LANDING_NAV, which is
  // derived from the section registry. It was a hand-written list of anchors
  // once, and dropping a section from the registry left it pointing at an
  // anchor that no longer rendered — caught by actually removing one and
  // looking, not by reading it.
  columns: [
    {
      title: 'Account',
      links: [
        { label: 'Sign in', href: '/login' },
        { label: 'Create account', href: '/register' },
        { label: 'Forgot password', href: '/forgot-password' },
      ],
    },
  ],
  // The one place the stack is listed for visitors; @/lib/display is for enum
  // metadata, and CLAUDE.md's stack section is for contributors.
  stack: [
    'Next.js 15',
    'React 19',
    'TypeScript',
    'MongoDB',
    'NextAuth v5',
    'TanStack Query',
    'Zod',
    'Tailwind v4',
  ],
}
