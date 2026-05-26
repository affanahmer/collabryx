"use client"

import { useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { QUERY_PRESETS } from "@/lib/query-cache"

export const CHAT_CONVERSATIONS_QUERY_KEY = ["chat", "conversations"] as const

interface Conversation {
    id: string
    participant_1: string
    participant_2: string
    last_message_text?: string
    last_message_at?: string
    unread_count_1: number
    unread_count_2: number
    is_archived: boolean
    created_at: string
    other_user?: {
        display_name?: string
        avatar_url?: string
    }
}

interface UseChatReturn {
    conversations: Conversation[]
    isLoading: boolean
    error: Error | null
    selectedConversation: Conversation | null
    selectConversation: (id: string) => void
    refreshConversations: () => Promise<void>
}

async function fetchChatConversations(): Promise<Conversation[]> {
    const supabase = createClient()
    // SAFE: user.id comes directly from supabase.auth.getUser() which verifies the
    // JWT server-side, so it is not user-controllable input. Safe to interpolate
    // into the `.or()` filter below.
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        throw new Error("Not authenticated")
    }

    const { data, error } = await supabase
        .from("conversations")
        .select(`
            *,
            other_user:profiles!conversations_participant_2_fkey (
                display_name,
                avatar_url
            )
        `)
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .eq("is_archived", false)
        .order("last_message_at", { ascending: false })

    if (error) throw error

    // Runtime type narrowing to ensure data conforms to Conversation
    const rawData: unknown[] = data || []
    return rawData.filter((item): item is Conversation => {
      if (!item || typeof item !== 'object') return false
      const d = item as Record<string, unknown>
      return typeof d.id === 'string' && typeof d.participant_1 === 'string' && typeof d.participant_2 === 'string'
    })
}

export function useChat(): UseChatReturn {
    const queryClient = useQueryClient()
    const router = useRouter()

    const {
        data: conversations = [],
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: CHAT_CONVERSATIONS_QUERY_KEY,
        queryFn: fetchChatConversations,
        staleTime: QUERY_PRESETS.realtime.staleTime,
        gcTime: QUERY_PRESETS.realtime.gcTime,
        retry: 1,
    })

    const selectConversation = useCallback(
        (id: string) => {
            const conv = conversations.find((c) => c.id === id)
            if (conv) {
                router.push(`/messages/${id}`)
            }
        },
        [conversations, router]
    )

    const refreshConversations = useCallback(async () => {
        await refetch()
    }, [refetch])

    useEffect(() => {
        const supabase = createClient()
        const channel = supabase
            .channel("chat-conversations")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "conversations",
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: CHAT_CONVERSATIONS_QUERY_KEY })
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "conversations",
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: CHAT_CONVERSATIONS_QUERY_KEY })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [queryClient])

    return {
        conversations,
        isLoading,
        error: error as Error | null,
        selectedConversation: null,
        selectConversation,
        refreshConversations,
    }
}
