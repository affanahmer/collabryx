/**
 * SessionHeartbeat
 *
 * Invisible Client Component that fires a periodic heartbeat
 * to track user sessions and update last_active.
 *
 * Renders nothing — purely a side-effect hook.
 *
 * Behavior:
 *   - Fires immediately on mount
 *   - Re-fires every 60 seconds while the component is mounted
 *   - Silently swallows errors (non-critical)
 *   - Automatically cleans up on unmount
 *
 * Usage (inside a layout or page):
 *   <SessionHeartbeat />
 */

"use client"

import { useEffect, useRef } from "react"

const HEARTBEAT_INTERVAL_MS = 60_000 // 60 seconds

export function SessionHeartbeat() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        const res = await fetch("/api/analytics/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })

        if (!res.ok) {
          // 401 is expected when user logs out — stop heartbeats
          if (res.status === 401) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
              intervalRef.current = null
            }
          }
        }
      } catch {
        // Silently ignore — heartbeat is best-effort
      }
    }

    // Fire immediately on mount
    sendHeartbeat()

    // Then every 60 seconds
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [])

  return null
}
