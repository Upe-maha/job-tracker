// src/components/layout/Header.tsx
'use client'

import { signOut } from 'next-auth/react'
import { usePathname, useParams } from 'next/navigation'
import Link from 'next/link'
import { Briefcase, ChevronRight, LogOut, Menu, Settings, User } from 'lucide-react'
import { useProfile, useApplication } from '@/hooks/useQueries'
import { buildCrumbs, matchRoute } from '@/client/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CONTENT_WIDTH } from '@/components/common/PageShell'
import { cn } from '@/shared/utils'
import { useSidebar, SIDEBAR_WIDTH } from './SidebarContext'
import ThemeToggle from './ThemeToggle'

interface HeaderProps {
  user: {
    name?: string | null
    email?: string | null
    photo?: string | null
    image?: string | null
  }
}

export default function Header({ user }: HeaderProps) {
  const pathname = usePathname()
  const params = useParams()

  const { data: profile } = useProfile()
  const { collapsed, toggle, mobileOpen, setMobileOpen } = useSidebar()

  // On /applications/[id] the trail ends in the company name. This reads the
  // same ['applications', id] cache entry the detail page uses, so it is
  // deduped rather than a second request — and it resolves from cache
  // instantly when arriving from the list.
  const applicationId =
    typeof params?.id === 'string' && pathname.startsWith('/applications/')
      ? params.id
      : ''
  const { data: application } = useApplication(applicationId)

  const route = matchRoute(pathname)
  const crumbs = buildCrumbs(pathname, application?.company)
  const isChildPage = crumbs.length > 1

  const displayName = profile?.name ?? user.name ?? ''
  const displayEmail = profile?.email ?? user.email ?? ''
  const displayPhoto = profile?.photo ?? user.photo ?? user.image ?? ''

  const initials =
    displayName
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U'

  return (
    <header className="bg-card border-b border-border shrink-0 flex h-16">

      {/* Brand — the app's identity plus the control that collapses the nav.
          Its width is fixed on purpose: the toggle collapses the column
          below it, not this block, so the logo never shrinks away. */}
      <div className={cn(
        SIDEBAR_WIDTH,
        // Desktop only. Below lg this fixed 256px block was two-thirds of a
        // phone's width before any content existed — the hamburger below
        // replaces it.
        'shrink-0 hidden lg:flex items-center gap-3 px-4 border-r border-border'
      )}>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Briefcase className="w-4 h-4 text-primary-foreground" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-foreground font-semibold text-sm leading-none truncate">
            JobTracker
          </p>
          <p className="text-muted-foreground text-xs mt-1 truncate">
            Job Search Manager
          </p>
        </div>

        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="
            shrink-0 w-11 h-11 rounded-lg flex items-center justify-center
            text-muted-foreground hover:text-foreground hover:bg-accent
            focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2
            transition-colors
          "
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Below lg, in place of the brand block. A different control from the
          collapse toggle above — that one narrows the permanent column, this
          one opens the drawer — which is why they carry different labels
          despite sharing an icon. Only one is ever visible. */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
        // The drawer focuses this on close — see SidebarDrawer.
        data-sidebar-trigger=""
        aria-expanded={mobileOpen}
        className="
          lg:hidden shrink-0 w-11 h-11 ml-1 rounded-lg
          flex items-center justify-center
          text-muted-foreground hover:text-foreground hover:bg-accent
          focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2
          transition-colors
        "
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* The brand, below lg, where the full brand block is hidden. A link
          rather than decoration: it is the only route back to the landing page
          from inside the app.

          The wordmark drops below sm and the mark alone carries it — at 375px
          the row is hamburger + brand + page title + theme + avatar, and the
          title is what tells the reader which page they are on. The logo earns
          its place; the word beside it does not earn a third of the row. */}
      <Link
        href="/"
        aria-label="JobTracker home"
        className="lg:hidden shrink-0 flex items-center gap-2 pl-1 pr-1 sm:pr-2 h-11"
      >
        <span className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Briefcase className="w-4 h-4 text-primary-foreground" />
        </span>
        <span className="hidden sm:inline text-foreground font-semibold text-sm">
          JobTracker
        </span>
      </Link>

      {/* Everything right of the brand block. */}
      <div className="flex-1 min-w-0 flex items-center px-3 sm:px-6">
        <div className={`${CONTENT_WIDTH} mx-auto w-full flex items-center justify-between gap-4 min-w-0`}>

        {/* min-w-0 + flex-1 is load-bearing, not tidiness: a flex item defaults
            to min-width:auto and refuses to shrink below its content, so an
            untruncated company name here pushes the avatar off the right edge
            rather than ellipsing. That is the horizontal overflow this step
            exists to remove. */}
        <div className="min-w-0 flex-1">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 min-w-0">
            {crumbs.map((crumb, i) => {
              const isLast = i === crumbs.length - 1
              return (
                // Below lg only the last crumb survives. A truncated
                // "Applications › Very Long Comp…" in ~100px tells the reader
                // less than the page name alone, and with the sidebar's active
                // state now inside a drawer, the name is the only thing on
                // screen saying which page this is.
                <span
                  key={`${crumb.label}-${i}`}
                  className={cn(
                    'flex items-center gap-1.5 min-w-0',
                    !isLast && 'hidden lg:flex'
                  )}
                >
                  {i > 0 && (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 hidden lg:block" />
                  )}
                  {crumb.href && !isLast ? (
                    <Link
                      href={crumb.href}
                      className="text-muted-foreground hover:text-foreground text-sm transition-colors shrink-0"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <h2
                      title={crumb.label}
                      className="text-foreground font-semibold text-base truncate"
                    >
                      {crumb.label}
                    </h2>
                  )}
                </span>
              )
            })}
          </nav>

          {/* The page's purpose, moved off the page body — it used to be
              repeated as an <h1> plus subtitle on every page while the header
              showed the same title again. */}
          {!isChildPage && route && (
            <p className="text-muted-foreground text-xs mt-0.5 truncate hidden lg:block">
              {route.description}
            </p>
          )}
          {isChildPage && application?.role && (
            <p className="text-muted-foreground text-xs mt-0.5 truncate hidden lg:block">
              {application.role}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {/* h-11 on the trigger, not on the avatar: the picture stays 32px
                  while the pressable area clears 44. */}
              <button
                aria-label="Account menu"
                className="flex items-center gap-2 h-11 px-1 ml-1 rounded-lg hover:opacity-80 transition-opacity"
              >
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarImage src={displayPhoto} alt={displayName} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left hidden sm:block">
                  <p className="text-foreground text-sm font-medium leading-none">
                    {displayName}
                  </p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {displayEmail}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
              <DropdownMenuLabel className="text-muted-foreground">
                My Account
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                  <User className="w-4 h-4" />
                  Profile
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                // Home, not /login: signing out is not the first half of
                // signing back in, and dropping someone straight onto a login
                // form implies it is. The landing page also has the sign-in
                // button right there for the times it was.
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center gap-2 text-destructive cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        </div>
      </div>
    </header>
  )
}
