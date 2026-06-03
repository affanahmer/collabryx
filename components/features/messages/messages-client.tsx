"use client"

import { ChatSidebar } from "./chat-sidebar"
import { ChatWindow } from "./chat-window"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { glass } from "@/lib/utils/glass-variants"

interface MessagesClientProps {
    initialChatId?: string | null
}

export function MessagesClient({ initialChatId = null }: MessagesClientProps) {
    const [selectedChatId, setSelectedChatId] = useState<string | null>(initialChatId)
    const [prevInitialChatId, setPrevInitialChatId] = useState<string | null>(initialChatId)
    const [showSidebar, setShowSidebar] = useState(true)
    const [isConnected, setIsConnected] = useState<boolean | null>(null)

    useEffect(() => {
        const checkConnection = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            
            if (user && selectedChatId) {
                // Get conversation participants first
                const { data: conv } = await supabase
                    .from("conversations")
                    .select("participant_1, participant_2")
                    .eq("id", selectedChatId)
                    .single()

                if (conv) {
                    const otherUserId = conv.participant_1 === user.id 
                        ? conv.participant_2 
                        : conv.participant_1
                    
                    const { data: connection } = await supabase
                        .from("connections")
                        .select("status")
                        .or(`and(requester_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
                        .eq("status", "accepted")
                        .single()
                    
                    setIsConnected(!!connection)
                } else {
                    setIsConnected(null)
                }
            }
        }
        
        checkConnection()
    }, [selectedChatId])

    if (initialChatId !== prevInitialChatId) {
        setPrevInitialChatId(initialChatId)
        if (initialChatId) {
            setSelectedChatId(initialChatId)
            setShowSidebar(false)
        }
    }

    const handleSelectChat = (chatId: string) => {
        setSelectedChatId(chatId)
        setShowSidebar(false)
        // Optionally sync URL without refresh
        window.history.pushState(null, '', `/messages/${chatId}`)
    }

    const handleBackToList = () => {
        setShowSidebar(true)
        window.history.pushState(null, '', `/messages`)
    }

    return (
        <div className={cn("flex h-[calc(100vh-2rem)] md:h-[calc(100vh-4rem)] rounded-lg overflow-hidden", glass("subtle"))}>
            <div className={`${showSidebar ? 'flex' : 'hidden'} md:flex w-full sm:w-80 md:w-96 flex-col`}>
                <ChatSidebar selectedId={selectedChatId || undefined} onSelectChat={handleSelectChat} />
            </div>

            <div className={`${!showSidebar ? 'flex' : 'hidden'} md:flex flex-1 flex-col`}>
                <ChatWindow chatId={selectedChatId || undefined} onBackToList={handleBackToList} isConnected={isConnected} />
            </div>
        </div>
    )
}
