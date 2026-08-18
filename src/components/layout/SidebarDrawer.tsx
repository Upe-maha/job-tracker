// src/components/layout/SidebarDrawer.tsx
'use client'

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useSidebar } from './SidebarContext'
import Sidebar from './Sidebar'

// The below-lg navigation. Only one nav is ever exposed: the permanent column is
// `display: none` below lg and Radix mounts this only while open. Closing on
// navigation is handled once in SidebarContext, not per link.
export default function SidebarDrawer() {
  const { mobileOpen, setMobileOpen } = useSidebar()

  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetContent
        side="left"
        className="w-72 p-0 lg:hidden"
        // Radix restores focus to its own trigger and this sheet has none — the
        // hamburger lives in Header — so on close focus was landing on <body>.
        onCloseAutoFocus={event => {
          event.preventDefault()
          document.querySelector<HTMLElement>('[data-sidebar-trigger]')?.focus()
        }}
      >
        {/* Radix requires a title, and a screen reader announcing an unnamed
            panel is the reason it does. There is no visible heading in this
            design, so it is sr-only rather than absent. */}
        <SheetTitle className="sr-only">Navigation</SheetTitle>

        <div className="h-16 flex items-center px-4 border-b border-sidebar-border shrink-0">
          <p className="text-sidebar-foreground font-semibold text-sm">JobTracker</p>
        </div>

        <Sidebar inDrawer />
      </SheetContent>
    </Sheet>
  )
}
