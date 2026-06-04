/**
 * ProfileVisitTracker
 *
 * Invisible Client Component that fires a profile visit tracking request
 * when mounted. Renders nothing — purely a side-effect hook.
 *
 * Usage (inside a Server Component):
 *   <ProfileVisitTracker viewedId={profileId} />
 *
 * The component sends a single POST to /api/activity/track/view on mount.
 * Failures are silently caught since tracking is non-critical.
 */

"use client"

import { useEffect } from "react"

interface ProfileVisitTrackerProps {
  viewedId: string
}

export function ProfileVisitTracker({ viewedId }: ProfileVisitTrackerProps) {
  useEffect(() => {
    const track = async () => {
      try {
        const res = await fetch("/api/activity/track/view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ viewed_id: viewedId }),
        })

        if (!res.ok && res.status !== 400) {
          // 400 is expected for self-views, other errors are non-critical
          console.warn("Profile visit track returned", res.status)
        }
      } catch {
        // Silently ignore — tracking is best-effort
      }
    }

    track()
  }, [viewedId])

  return null
}
