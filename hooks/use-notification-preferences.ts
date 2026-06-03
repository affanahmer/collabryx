"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { NotificationPreference } from "@/types/database.types"

export interface NotificationPreferencesForm {
  notifications_enabled: boolean
  push_new_connections: boolean
  push_connect_accepted: boolean
  push_messages: boolean
  push_post_likes: boolean
  push_comments: boolean
  push_comment_likes: boolean
  push_mentions: boolean
  push_match_alerts: boolean
  push_achievements: boolean
  push_enabled: boolean
  email_new_connections: boolean
  email_messages: boolean
  email_post_likes: boolean
  email_comments: boolean
  email_connect_accepted: boolean
  email_mentions: boolean
  email_achievements: boolean
  email_digest: boolean
  ai_smart_match_alerts: boolean
  in_app_notifications: boolean
  quiet_hours_enabled: boolean
}

export function useNotificationPreferences(userId: string | null) {
    const supabase = createClient()
    const queryClient = useQueryClient()

    const queryKey = ["notification_preferences", userId]

    const { data: preferences, isLoading, error } = useQuery<NotificationPreference | null, Error>({
        queryKey,
        queryFn: async () => {
            if (!userId) {
                return null
            }

            if (process.env.NODE_ENV === "development") {
                console.warn("Using real API in development mode — ensure backend is running")
            }

            const { data, error: fetchError } = await supabase
                .from("notification_preferences")
                .select("*")
                .eq("user_id", userId)
                .single()

            if (fetchError && fetchError.code !== "PGRST116") {
                throw fetchError
            }

            return data
        },
        enabled: !!userId,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 2,
    })

    const updateMutation = useMutation({
        mutationFn: async (updates: NotificationPreferencesForm) => {
            if (!userId) {
                throw new Error("User not authenticated")
            }

            if (process.env.NODE_ENV === "development") {
                console.warn("Using real API in development mode — ensure backend is running")
            }

            const { error: upsertError } = await supabase
                .from("notification_preferences")
                .upsert({
                    user_id: userId,
                    ...updates,
                    updated_at: new Date().toISOString(),
                })

            if (upsertError) throw upsertError

            return { success: true }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey })
            toast.success("Notification preferences updated")
        },
        onError: (error: Error) => {
            console.error("Error updating notification preferences:", error)
            toast.error(`Failed to update preferences: ${error.message}`)
        },
    })

    const updatePreferences = async (updates: NotificationPreferencesForm) => {
        return updateMutation.mutateAsync(updates)
    }

    return {
        preferences,
        isLoading,
        error,
        updatePreferences,
        isUpdating: updateMutation.isPending,
    }
}
