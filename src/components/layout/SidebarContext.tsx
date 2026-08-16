// src/components/layout/SidebarContext.tsx
'use client'

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

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
  collapsed: boolean
  toggle: () => void
}

const SidebarCtx = createContext<SidebarValue>({ collapsed: false, toggle: () => {} })

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

  const toggle = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, String(!getSnapshot()))
    emit()
  }, [])

  return <SidebarCtx.Provider value={{ collapsed, toggle }}>{children}</SidebarCtx.Provider>
}

export function useSidebar() {
  return useContext(SidebarCtx)
}
