// src/components/layout/Sidebar.tsx
'use client'

import { usePathname } from 'next/navigation'
import { NAV_ROUTES, isActiveRoute } from '@/lib/navigation'
import { cn } from '@/lib/utils'
import { TooltipProvider } from '@/components/ui/tooltip'
import NavLink from './NavLink'
import {
  useSidebar,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_COLLAPSED,
} from './SidebarContext'

// A flex item beneath the full-width header, not a fixed overlay: the content
// beside it takes the remaining space on its own, so nothing has to mirror
// this width as a margin. The brand and the collapse toggle both live in the
// header now.
export default function Sidebar() {
  const pathname = usePathname()
  const { collapsed } = useSidebar()

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'shrink-0 h-full bg-sidebar border-r border-sidebar-border flex flex-col',
          'transition-[width] duration-200 ease-out motion-reduce:transition-none',
          collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH
        )}
      >
        <nav
          className={cn(
            'flex-1 space-y-1 overflow-y-auto overflow-x-hidden py-4',
            collapsed ? 'px-2' : 'px-4'
          )}
        >
          {NAV_ROUTES.map(item => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              isActive={isActiveRoute(pathname, item.href)}
              collapsed={collapsed}
            />
          ))}
        </nav>

        <div
          className={cn(
            'border-t border-sidebar-border shrink-0 py-3 overflow-hidden',
            collapsed ? 'px-2' : 'px-4'
          )}
        >
          <p
            className={cn(
              'text-sidebar-muted-foreground text-xs text-center whitespace-nowrap',
              'transition-opacity duration-200 motion-reduce:transition-none',
              collapsed ? 'opacity-0' : 'opacity-100'
            )}
          >
            JobTracker v1.0
          </p>
        </div>
      </aside>
    </TooltipProvider>
  )
}
