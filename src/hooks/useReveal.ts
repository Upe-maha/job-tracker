// src/hooks/useReveal.ts
'use client'

import { useCallback, useRef, useState } from 'react'

// Reveals an element the first time it scrolls into view, then unobserves — a live
// observer re-animates on every scroll back up. A callback ref rather than an effect,
// so it observes at attach time; the hidden state lives in CSS, which is what lets
// prefers-reduced-motion force the revealed state instead of stranding content.
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
