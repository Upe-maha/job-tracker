// src/components/layout/Header.tsx
'use client'

import { signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, User, Settings } from 'lucide-react'
import Link from 'next/link'
import ThemeToggle from './ThemeToggle'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/applications': 'Applications',
  '/notes': 'Notes',
  '/analytics': 'Analytics',
  '/profile': 'Profile',
  '/settings': 'Settings',
}

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

  const title =
    pageTitles[pathname] ??
    Object.entries(pageTitles).find(
      ([key]) => pathname.startsWith(key) && key !== '/dashboard'
    )?.[1] ??
    'Dashboard'

  const initials =
    user.name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ?? 'U'

  return (
    <header className="
      h-16 px-6
      bg-sidebar border-b border-sidebar-border
      flex items-center justify-between
      shrink-0
    ">
      {/* Page title */}
      <h2 className="text-foreground font-semibold text-lg">{title}</h2>

      {/* Right side */}
      <div className="flex items-center gap-2">

        {/* Theme toggle */}
        <ThemeToggle />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="
              flex items-center gap-2 ml-2
              hover:opacity-80 transition-opacity
            ">
              <Avatar className="w-8 h-8">
                <AvatarImage
                  src={user.photo ?? user.image ?? ''}
                  alt={user.name ?? 'User'}
                />
                <AvatarFallback className="
                  bg-primary text-primary-foreground text-xs
                ">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden sm:block">
                <p className="text-foreground text-sm font-medium leading-none">
                  {user.name}
                </p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {user.email}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-56 bg-popover border-border"
          >
            <DropdownMenuLabel className="text-muted-foreground">
              My Account
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link
                href="/profile"
                className="flex items-center gap-2 cursor-pointer"
              >
                <User className="w-4 h-4" />
                Profile
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link
                href="/settings"
                className="flex items-center gap-2 cursor-pointer"
              >
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
    </header>
  )
}