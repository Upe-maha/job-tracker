// src/components/layout/SidebarContext.tsx
'use client'

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'

// Shared because the toggle lives in the header and the width it controls lives in
// the sidebar. (dashboard)/layout awaits auth(), so this cannot be layout state.

const STORAGE_KEY = 'sidebar-collapsed'

// The sidebar is a flex item under a full-width header, so the content needs no
// matching offset. The header's logo block reuses these widths to stay aligned.
export const SIDEBAR_WIDTH = 'w-64'
export const SIDEBAR_WIDTH_COLLAPSED = 'w-16'

interface SidebarValue {
  /** Desktop only (≥lg): the permanent column's narrow mode. Persisted. */
  collapsed: boolean
  toggle: () => void
  /** Below lg: the drawer. Deliberately NOT persisted — see below. */
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
}

const SidebarCtx = createContext<SidebarValue>({
  collapsed: false,
  toggle: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
})

// Read through useSyncExternalStore, as @/client/theme reads the stored theme:
// copying an external store into state inside an effect cascades a re-render.
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

function getSnapshot(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

// Expanded on the server — the wider layout is the safer first paint, and it
// matches what a first-time visitor gets.
function getServerSnapshot(): boolean {
  return false
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // Ordinary state, not localStorage, unlike `collapsed`: a drawer that reopened
  // because it was open when you left is a bug wearing a preference's clothes.
  // What is stored is the route it was opened on, so "open" is derived and
  // navigation closes it with no effect to synchronise.
  const pathname = usePathname()
  const [openPath, setOpenPath] = useState<string | null>(null)
  const mobileOpen = openPath === pathname

  const setMobileOpen = useCallback(
    (open: boolean) => setOpenPath(open ? pathname : null),
    [pathname],
  )

  const toggle = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, String(!getSnapshot()))
    emit()
  }, [])

  return (
    <SidebarCtx.Provider value={{ collapsed, toggle, mobileOpen, setMobileOpen }}>
      {children}
    </SidebarCtx.Provider>
  )
}

export function useSidebar() {
  return useContext(SidebarCtx)
}
