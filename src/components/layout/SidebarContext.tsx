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

// The collapsed state has to be shared: the toggle lives in the header, the
// width it controls lives in the sidebar, and the header's logo block matches
// that width. (dashboard)/layout is a server component — it awaits auth() —
// so this cannot be local state lifted into the layout.

const STORAGE_KEY = 'sidebar-collapsed'

// The sidebar is a flex item under a full-width header, so the content needs
// no matching offset — it simply takes the remaining space. The header's logo
// block reuses these same widths to stay aligned with the column below it.
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

// Read through useSyncExternalStore, matching how @/lib/theme reads the
// stored theme: localStorage is an external store, and copying it into state
// inside an effect causes a cascading re-render on every mount.
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

  // Ordinary state, not localStorage, and that asymmetry with `collapsed` is
  // the point: `collapsed` is a preference worth remembering, while a drawer
  // that reopened on next load because it happened to be open when you left
  // would be a bug wearing a preference's clothes.
  //
  // What is stored is the route the drawer was opened *on*, not a boolean, and
  // "open" is derived from it. That is what closes the drawer on navigation:
  // the pathname changes, the comparison stops matching, and it closes — with
  // no effect to synchronise. The obvious version, an effect calling
  // setMobileOpen(false) on every pathname change, is a synchronous setState
  // inside an effect, which cascades a second render and is what the
  // react-hooks lint rule flags. Same reason theme.tsx reads localStorage
  // through useSyncExternalStore instead of copying it into state.
  //
  // One rule covers link clicks and the browser's back button alike.
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
