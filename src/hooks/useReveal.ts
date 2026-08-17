// src/hooks/useReveal.ts
'use client'

import { useCallback, useRef, useState } from 'react'

// Reveals an element the first time it scrolls into view, then stops watching
// it. The unobserve is the point: an observer left attached re-fires on every
// scroll past, and a section that re-animates each time the user scrolls back
// up reads as a glitch rather than as polish.
//
// A callback ref rather than useEffect, for two reasons. It observes the node
// at the moment it attaches — no second render to wait through — and it keeps
// the "no IntersectionObserver" fallback out of an effect, where setting state
// synchronously is what the react-hooks lint rule warns about (cascading
// renders). React 19 runs the returned cleanup when the ref detaches.
//
// The hidden state itself lives in CSS (.reveal / .reveal-visible in
// globals.css), which is what lets prefers-reduced-motion force the revealed
// state: a reveal waiting on a transition that never runs would hide the
// content permanently.
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const [isVisible, setIsVisible] = useState(false)
  // Once revealed, stay revealed — a re-attach (Fast Refresh, a re-key) must
  // not drop the element back to hidden and replay the animation.
  const revealed = useRef(false)

  const ref = useCallback((node: T | null) => {
    if (!node || revealed.current) return

    // Missing support (an ancient browser, or a non-DOM test environment) must
    // still leave the content readable, so fail to *visible*, never to hidden.
    if (typeof IntersectionObserver === 'undefined') {
      revealed.current = true
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          revealed.current = true
          setIsVisible(true)
          observer.unobserve(entry.target)
        }
      },
      // A little bottom inset so a section starts revealing as it rises into
      // view rather than only once its top edge is fully inside the viewport.
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return { ref, isVisible }
}
