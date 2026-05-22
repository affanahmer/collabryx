"use client"

import { useState, useEffect } from "react"

/**
 * Hook that returns true when user prefers reduced motion.
 * Uses window.matchMedia and listens for changes.
 * Defaults to false in SSR / non-browser environments.
 */
export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setPrefersReduced(!!e.matches)
    mq.addEventListener("change", handler as EventListener)
    setPrefersReduced(mq.matches)
    return () => mq.removeEventListener("change", handler as EventListener)
  }, [])

  return prefersReduced
}
