// src/components/layout/NavLink.tsx
'use client'

import Link, { useLinkStatus } from 'next/link'
import { Loader2, type LucideIcon } from 'lucide-react'
import { cn } from '@/shared/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

// useLinkStatus reports *this* link's pending navigation from the click, which is
// what makes the button acknowledge it instead of appearing dead.
function PendingDot({ collapsed }: { collapsed: boolean }) {
  const { pending } = useLinkStatus()
  if (!pending) return null
  return (
    <Loader2
      className={cn(
        'w-3.5 h-3.5 shrink-0 animate-spin',
        // Collapsed there is no label to sit beside, so the spinner replaces
        // the icon's trailing space rather than pushing the row wider.
        collapsed ? 'absolute right-1 top-1' : 'ml-auto'
      )}
      aria-hidden
    />
  )
}

export default function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
  collapsed = false,
}: {
  href: string
  label: string
  icon: LucideIcon
  isActive: boolean
  collapsed?: boolean
}) {
  const link = (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      // The label is still announced when collapsed — the visual label is
      // hidden, the accessible name is not.
      aria-label={collapsed ? label : undefined}
      className={cn(
        'relative flex items-center rounded-lg text-sm font-medium',
        'px-3 py-2.5',
        collapsed ? 'justify-center gap-0' : 'gap-3',
        // No transition on the active colours: the highlight must land on the
        // same frame as the click, not fade in over 150ms.
        'transition-colors duration-0',
        isActive
          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
          : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {/* Kept mounted and width-animated rather than unmounted, so the label
          slides away with the sidebar instead of vanishing a frame early. */}
      <span
        className={cn(
          'truncate transition-[opacity,max-width] duration-200 ease-out motion-reduce:transition-none',
          collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-40'
        )}
      >
        {label}
      </span>
      <PendingDot collapsed={collapsed} />
    </Link>
  )

  if (!collapsed) return link

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}
