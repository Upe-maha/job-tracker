// src/client/navigation.ts
//
// One declaration site for every route's identity. The sidebar and the header
// breadcrumb previously kept separate lists of the same six routes, so a new
// page had to be added twice and the header's title map could silently drift
// out of step with the nav.
import {
  Briefcase,
  FileText,
  LayoutDashboard,
  Settings,
  TrendingUp,
  User,
  type LucideIcon,
} from 'lucide-react'

export interface RouteMeta {
  href: string
  label: string
  /** Shown under the breadcrumb in the header — the page's one-line purpose. */
  description: string
  icon: LucideIcon
  /** Whether it appears in the sidebar. */
  nav: boolean
}

export const ROUTES: RouteMeta[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    description: 'Your job search at a glance',
    icon: LayoutDashboard,
    nav: true,
  },
  {
    href: '/applications',
    label: 'Applications',
    description: 'Track every application through its stages',
    icon: Briefcase,
    nav: true,
  },
  {
    href: '/notes',
    label: 'Notes',
    description: 'All notes across your job applications',
    icon: FileText,
    nav: true,
  },
  {
    href: '/analytics',
    label: 'Analytics',
    description: 'Insights into your job search performance',
    icon: TrendingUp,
    nav: true,
  },
  {
    href: '/profile',
    label: 'Profile',
    description: 'Your personal information and preferences',
    icon: User,
    nav: true,
  },
  {
    href: '/settings',
    label: 'Settings',
    description: 'Manage your account settings',
    icon: Settings,
    nav: true,
  },
]

export const NAV_ROUTES = ROUTES.filter(r => r.nav)

// Longest match wins, so /applications/123 resolves to the Applications route
// rather than to whichever entry happened to be checked first.
export function matchRoute(pathname: string): RouteMeta | undefined {
  return ROUTES.filter(
    r => pathname === r.href || pathname.startsWith(`${r.href}/`)
  ).sort((a, b) => b.href.length - a.href.length)[0]
}

export function isActiveRoute(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export interface Crumb {
  label: string
  href?: string
}

// Builds the trail shown in the header. `childLabel` is supplied by a detail
// page (the company name on /applications/[id]); until it resolves the crumb
// renders as a placeholder rather than collapsing the trail, so the header
// does not change height when the data lands.
export function buildCrumbs(pathname: string, childLabel?: string): Crumb[] {
  const route = matchRoute(pathname)
  if (!route) return [{ label: 'Dashboard' }]

  const isChild = pathname !== route.href
  if (!isChild) return [{ label: route.label }]

  return [
    { label: route.label, href: route.href },
    { label: childLabel ?? '…' },
  ]
}
