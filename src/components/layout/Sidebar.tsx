// src/components/layout/Sidebar.tsx
'use client'

import { usePathname } from 'next/navigation'
import { NAV_ROUTES, isActiveRoute } from '@/client/navigation'
import { cn } from '@/shared/utils'
import { TooltipProvider } from '@/components/ui/tooltip'
import NavLink from './NavLink'
import {
  useSidebar,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_COLLAPSED,
} from './SidebarContext'

// A flex item beneath the full-width header, so nothing has to mirror its width as
// a margin. `inDrawer` is the below-lg copy: always labelled, no collapse toggle,
// and no width or border, since the sheet panel supplies both.
export default function Sidebar({ inDrawer = false }: { inDrawer?: boolean }) {
  const pathname = usePathname()
  const { collapsed: collapsedPref } = useSidebar()
  const collapsed = inDrawer ? false : collapsedPref

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'h-full bg-sidebar flex flex-col',
          inDrawer
            ? 'w-full'
            : [
                // hidden, not opacity/visibility/transform: `display: none` is what
                // takes this column out of the accessibility tree AND the tab order,
                // so the drawer's copy is never a second focusable set of links.
                'hidden lg:flex shrink-0 border-r border-sidebar-border',
                'transition-[width] duration-200 ease-out motion-reduce:transition-none',
                collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH,
              ]
        )}
      >
        {/* Named, so it is distinguishable from the header's breadcrumb nav —
            both are legitimate landmarks, and the verification script asserts
            there is exactly one of *this* one. */}
        <nav
          aria-label="Main"
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
