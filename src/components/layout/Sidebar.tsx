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
// `inDrawer` is the below-lg copy rendered inside the sheet: it always shows
// labels (the collapse toggle is a desktop affordance and is not offered there)
// and drops the width/border the permanent column carries, since the sheet
// panel supplies both.
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
                // hidden, not opacity/visibility/transform: `display: none` is
                // what takes the permanent column out of the accessibility tree
                // AND the tab order below lg. With the drawer rendering the same
                // links, anything that merely hides it visually would leave a
                // second copy of every nav link focusable and announced.
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
