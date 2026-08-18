// src/components/layout/ThemeToggle.tsx
'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/client/theme'
import { Button } from '@/components/ui/button'

// The icon shows the theme you are *in*, not the one you would switch to: a
// moon while dark, a sun while light. Both conventions exist and neither is
// wrong, but the state reading is the one people expect from a moon — and dark
// being the default meant the app opened on a sun, which read as "you are in
// light mode" to anyone using that convention.
//
// aria-label still describes the action, because that is what a button does
// when you press it.
export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="
        rounded-lg
        text-muted-foreground
        hover:text-foreground
        hover:bg-accent
        transition-colors
      "
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Dark theme' : 'Light theme'}
    >
      {isDark ? (
        <Moon className="w-4 h-4" />
      ) : (
        <Sun className="w-4 h-4" />
      )}
    </Button>
  )
}