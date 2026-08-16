// src/components/layout/Header.tsx
'use client'

import { signOut } from 'next-auth/react'
import { usePathname, useParams } from 'next/navigation'
import Link from 'next/link'
import { Briefcase, ChevronRight, LogOut, Menu, Settings, User } from 'lucide-react'
import { useProfile, useApplication } from '@/hooks/useQueries'
import { buildCrumbs, matchRoute } from '@/lib/navigation'
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
import { cn } from '@/lib/utils'
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
  const { collapsed, toggle } = useSidebar()

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
        'shrink-0 flex items-center gap-3 px-4 border-r border-border'
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
            shrink-0 w-9 h-9 rounded-lg flex items-center justify-center
            text-muted-foreground hover:text-foreground hover:bg-accent
            focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2
            transition-colors
          "
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Everything right of the brand block. */}
      <div className="flex-1 min-w-0 flex items-center px-6">
        <div className={`${CONTENT_WIDTH} mx-auto w-full flex items-center justify-between gap-4 min-w-0`}>

        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 min-w-0">
            {crumbs.map((crumb, i) => {
              const isLast = i === crumbs.length - 1
              return (
                <span key={`${crumb.label}-${i}`} className="flex items-center gap-1.5 min-w-0">
                  {i > 0 && (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                  )}
                  {crumb.href && !isLast ? (
                    <Link
                      href={crumb.href}
                      className="text-muted-foreground hover:text-foreground text-sm transition-colors shrink-0"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <h2 className="text-foreground font-semibold text-base truncate">
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
            <p className="text-muted-foreground text-xs mt-0.5 truncate">
              {route.description}
            </p>
          )}
          {isChildPage && application?.role && (
            <p className="text-muted-foreground text-xs mt-0.5 truncate">
              {application.role}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 ml-2 hover:opacity-80 transition-opacity">
                <Avatar className="w-8 h-8">
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
                onClick={() => signOut({ callbackUrl: '/login' })}
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
