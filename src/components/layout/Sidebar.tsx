// src/components/layout/Sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Briefcase,
  User,
  FileText,
  Settings,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import ThemeToggle from './ThemeToggle'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Applications', href: '/applications', icon: Briefcase },
  { label: 'Notes', href: '/notes', icon: FileText },
  { label: 'Analytics', href: '/analytics', icon: TrendingUp },
  { label: 'Profile', href: '/profile', icon: User },
  { label: 'Settings', href: '/settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="
      fixed left-0 top-0 h-full w-64 z-40
      bg-sidebar border-r border-sidebar-border
      flex flex-col
    ">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="
            w-8 h-8 rounded-lg
            bg-primary
            flex items-center justify-center
          ">
            <Briefcase className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sidebar-foreground font-semibold text-sm">
              JobTracker
            </h1>
            <p className="text-muted-foreground text-xs">
              Job Search Manager
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-sidebar-border">
        <p className="text-muted-foreground text-xs text-center">
          JobTracker v1.0
        </p>
      </div>
    </aside>
  )
}