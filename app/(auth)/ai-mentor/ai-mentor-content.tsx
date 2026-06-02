'use client'

import { useState, useMemo, useCallback } from 'react'
import { useAIStream } from '@/hooks/use-ai-stream'
import { useAuth } from '@/hooks/use-auth'
import { ChatList } from '@/components/features/assistant/chat-list'
import { ChatInput } from '@/components/features/assistant/chat-input'
import { cn } from '@/lib/utils'
import { glass } from '@/lib/utils/glass-variants'
import { Lightbulb } from 'lucide-react'
import type { AIStructuredResponse, StartupIdeaAction } from '@/types/ai-responses'
import { isAIStructuredResponse } from '@/types/ai-responses'

export default function AIMentorContent() {
  const { user } = useAuth()
  const [sessionId] = useState(() => crypto.randomUUID())
  const [, setRefreshKey] = useState(0)
  const { messages, isStreaming, sendMessage, error } = useAIStream({
    userId: user?.id ?? '',
    sessionId,
  })
  const externalMessages = useMemo(() => {
    return messages.map((msg) => {
      let structured: AIStructuredResponse | undefined
      if (msg.role === 'assistant') {
        try {
          const parsed = JSON.parse(msg.content)
          if (isAIStructuredResponse(parsed)) structured = parsed
        } catch { /* not JSON */ }
      }
      return { role: msg.role as 'user' | 'assistant', content: msg.content, structured }
    })
  }, [messages])
  const handleSuggestionClick = useCallback((s: string) => sendMessage(s), [sendMessage])
  const handleIdeaAction = useCallback((ideaId: number, action: StartupIdeaAction) => {
    const m: Record<StartupIdeaAction, string> = {
      validate: `Tell me more about validating idea #${ideaId}`,
      find_cofounder: `Help me find a co-founder for idea #${ideaId}`,
      market_research: `Do market research for idea #${ideaId}`,
      build_mvp: `How do I build an MVP for idea #${ideaId}?`,
      competitor_analysis: `Analyze competitors for idea #${ideaId}`,
      fundraising: `How do I raise funds for idea #${ideaId}?`,
      team_building: `What team do I need for idea #${ideaId}?`,
      customer_interviews: `Help me plan customer interviews for idea #${ideaId}`,
    }
    sendMessage(m[action])
  }, [sendMessage])
  const handleMessageSent = useCallback(() => setRefreshKey((k) => k + 1), [])

  if (!user) {
    return (
      <div className='flex items-center justify-center min-h-[60vh]'>
        <div className='h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent' />
      </div>
    )
  }

  return (
    <div className='flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto'>
      <div className={cn('px-4 md:px-6 py-3 md:py-4 border-b', glass('header'))}>
        <div className='flex items-center gap-2'>
          <div className='rounded-full bg-primary/10 p-1.5'>
            <Lightbulb className='h-4 w-4 text-primary' />
          </div>
          <h1 className='text-lg font-semibold'>AI Mentor</h1>
        </div>
        <p className='text-xs md:text-sm text-muted-foreground mt-0.5'>
          Get personalized startup ideas based on your skills and interests
        </p>
      </div>
      {error && (
        <div className='mx-4 mt-2 bg-destructive/10 text-destructive p-2.5 rounded-md text-xs md:text-sm'>
          {error?.message || 'An unexpected error occurred. Please try again.'}
        </div>
      )}
      <ChatList
        sessionId={sessionId}
        externalMessages={externalMessages}
        isLoadingExternal={isStreaming}
        onSuggestionClick={handleSuggestionClick}
        onIdeaAction={handleIdeaAction}
        onRefresh={handleMessageSent}
      />
      <div className={cn('border-t p-3 md:p-4 bg-background', glass('footer'))}>
        <ChatInput sessionId={sessionId} onMessageSent={handleMessageSent} />
      </div>
    </div>
  )
}
