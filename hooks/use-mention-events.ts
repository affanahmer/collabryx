/**
 * useMentionEvents
 *
 * Event-driven hook that listens for @mention notifications via Supabase Realtime.
 * Replaces polling-based mention detection with push-based architecture.
 *
 * Behavior:
 *   - Subscribes to Supabase Realtime for INSERT on notifications table
 *   - Filters for 'mention' type notifications targeted at the current user
 *   - Calls onMention callback when a new mention is detected
 *   - Falls back to polling if WebSocket is unavailable
 *   - Automatically cleans up on unmount
 *
 * @example
 * ```tsx
 * useMentionEvents(userId, (notification) => {
 *   // Play a sound, show a toast, etc.
 * })
 * ```
 */

"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Notification } from "@/types/database.types"

export type MentionEventPayload = Pick<Notification, "id" | "actor_id" | "content" | "resource_type" | "resource_id" | "created_at">

interface UseMentionEventsOptions {
  enabled?: boolean
}

const POLL_INTERVAL_MS = 30_000 // 30 seconds polling fallback

/**
 * Subscribe to real-time @mention events.
 * Falls back to polling when WebSocket is unavailable.
 */
export function useMentionEvents(
  userId: string | undefined,
  onMention: (payload: MentionEventPayload) => void,
  options: UseMentionEventsOptions = {}
) {
  const onMentionRef = useRef(onMention)
  onMentionRef.current = onMention

  useEffect(() => {
    if (!userId || options.enabled === false) return

    let isMounted = true
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let pollInterval: ReturnType<typeof setInterval> | null = null

    /** Polling fallback: fetch recent mentions */
    const checkForMentions = async () => {
      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("id, actor_id, content, resource_type, resource_id, created_at")
          .eq("user_id", userId)
          .eq("type", "mention")
          .eq("is_read", false)
          .order("created_at", { ascending: false })
          .limit(5)

        if (error) throw error
        if (data && data.length > 0 && isMounted) {
          onMentionRef.current(data[0] as MentionEventPayload)
        }
      } catch {
        // Silent — polling is best-effort fallback
      }
    }

    /** Start polling fallback */
    const startPolling = () => {
      if (pollInterval) return
      checkForMentions() // Fire immediately
      pollInterval = setInterval(checkForMentions, POLL_INTERVAL_MS)
    }

    /** Stop polling */
    const stopPolling = () => {
      if (pollInterval) {
        clearInterval(pollInterval)
        pollInterval = null
      }
    }

    // Check WebSocket availability
    if (typeof window !== "undefined" && !window.WebSocket) {
      console.warn("[useMentionEvents] WebSocket not available — falling back to polling")
      startPolling()
      return
    }

    // Subscribe to real-time mention notifications
    channel = supabase
      .channel("mention_events")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (!isMounted) return
          const newNotif = payload.new as Record<string, unknown>
          if (newNotif?.type === "mention") {
            onMentionRef.current(newNotif as unknown as MentionEventPayload)
          }
        }
      )
      .subscribe((status) => {
        if (!isMounted) return
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(`[useMentionEvents] Realtime ${status} — falling back to polling`)
          startPolling()
        }
      })

    return () => {
      isMounted = false
      stopPolling()
      if (channel) {
        supabase.removeChannel(channel)
        channel = null
      }
    }
  }, [userId, options.enabled])
}
