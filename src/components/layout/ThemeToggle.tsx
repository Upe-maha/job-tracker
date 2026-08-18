// src/components/layout/ThemeToggle.tsx
'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/client/theme'
import { Button } from '@/components/ui/button'

// The icon shows the theme you are *in* — moon while dark, sun while light — so
// dark-by-default no longer opens on a sun. aria-label describes the action.
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