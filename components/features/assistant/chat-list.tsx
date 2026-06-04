/**
 * ============================================================================
 * ChatList — Production Message History with Streaming Deduplication
 * ============================================================================
 *
 * Enhanced with:
 *  - Proper deduplication of DB + streaming messages
 *  - Browser-native scrolling with auto-scroll-to-bottom
 *  - Scroll-to-bottom button when scrolled up
 *
 * @see {@link ../../lib/actions/ai-mentor.ts} — getSessionHistory
 * @see {@link ../../app/(auth)/ai-mentor/ai-mentor-content.tsx} — externalMessages provider
 * ============================================================================
 */
'use client'

import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { Loader2, Bot, Sparkles, Lightbulb, Target, ArrowDown } from 'lucide-react'
import { MessageBubble } from '@/components/features/assistant/message-bubble'
import { Suggestions, Suggestion } from '@/components/ai-elements/suggestion'
import { GlassCard } from '@/components/shared/glass-card'
import { cn } from '@/lib/utils'
import type { AIStructuredResponse, StartupIdeaAction } from '@/types/ai-responses'
import { getSessionHistory } from '@/lib/actions/ai-mentor'
import type { AIMessage } from '@/lib/actions/ai-mentor'

interface ChatListProps {
  sessionId: string | null
  externalMessages?: Array<{
    role: 'user' | 'assistant'
    content: string
    structured?: AIStructuredResponse
  }>
  isLoadingExternal?: boolean
  onSuggestionClick?: (suggestion: string) => void
  onIdeaAction?: (ideaId: number, action: StartupIdeaAction) => void
  onRefresh?: () => void
  /** Increment to force a DB history reload */
  refreshKey?: number
  /** Show toggle for starter cards when messages exist */
  hasStarters?: boolean
  /** Called when user toggles starter cards visibility */
  onToggleStarters?: () => void
}

const SUGGESTIONS = [
  "Give me startup ideas based on my profile",
  "Help me find a co-founder",
  "Review my profile for improvements",
]

export function ChatList({
  sessionId,
  externalMessages = [],
  isLoadingExternal = false,
  onSuggestionClick,
  onIdeaAction,
  onRefresh,
  refreshKey = 0,
  hasStarters,
  onToggleStarters,
}: ChatListProps) {
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastStreamingContentRef = useRef<string>('')

  const lastExtIndex = externalMessages.length - 1
  const isStreamingLast = isLoadingExternal && lastExtIndex >= 0 && externalMessages[lastExtIndex].role === 'assistant'

  // Load history from DB when session ID is available or refresh is triggered
  useEffect(() => {
    if (!sessionId) { setMessages([]); return }
    const load = async () => {
      setIsLoading(true)
      try {
        const r = await getSessionHistory(sessionId)
        if (!r.error) { setMessages(r.data || []); onRefresh?.() }
      } catch { /* fail silently */ } finally { setIsLoading(false) }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, refreshKey])

  // Deduplicated merge of DB history + streaming messages
  // Strategy: DB messages are the source of truth. External messages that
  // go BEYOND the DB count are appended as streaming/transient messages.
  // This avoids content-based dedup which breaks during streaming (content changes).
  const combinedMessages = useMemo(() => {
    const loaded = messages.map((m) => ({
      key: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      structured: undefined as AIStructuredResponse | undefined,
      isStreaming: false,
    }))

    // Only append external messages that exceed what's already in DB
    const ext = externalMessages
      .filter((_, i) => i >= loaded.length)
      .map((m, i) => {
        const extIndex = loaded.length + i
        const isStreaming = isStreamingLast && extIndex === externalMessages.length - 1
        return { key: `ext-${extIndex}`, ...m, isStreaming }
      })

    return [...loaded, ...ext]
  }, [messages, externalMessages, isStreamingLast])

  const hasMessages = combinedMessages.length > 0

  // Auto-scroll to bottom when streaming content updates.
  // Uses ref-based comparison (no deps array) because the dependency would
  // be a changing object value that React forbids in deps arrays.
  // The ref short-circuit prevents redundant scrolls on unrelated re-renders.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isAtBottom || !scrollRef.current) return
    const lastMsg = combinedMessages[combinedMessages.length - 1]
    const currentContent = lastMsg?.content ?? ''
    if (currentContent === lastStreamingContentRef.current && !lastMsg?.isStreaming) return
    lastStreamingContentRef.current = currentContent
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  })

  // Initial scroll to bottom when DB history loads
  useEffect(() => {
    if (hasMessages && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [hasMessages])

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    setIsAtBottom(scrollHeight - scrollTop - clientHeight < 100)
  }, [])

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [])

  return (
    <div className="relative flex flex-col flex-1 min-h-0">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0"
      >
        {/* Loading state */}
        {isLoading && !hasMessages && (
          <div className="flex items-center justify-center h-full p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty state — welcome card */}
        {!sessionId && !isLoadingExternal && !isLoading && !hasMessages && (
          <div className="flex items-center justify-center h-full p-6">
            <GlassCard glow className="max-w-md w-full p-6 md:p-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-lg font-semibold">Welcome to AI Mentor</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                    Ask for startup ideas, career advice, or collaboration suggestions. Your AI-powered mentorship starts here.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 w-full pt-2">
                  <div className="flex items-center gap-2.5 rounded-lg bg-muted/30 px-3.5 py-2.5 text-left text-xs md:text-sm">
                    <Target className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-muted-foreground">"Find a co-founder for my startup"</span>
                  </div>
                  <div className="flex items-center gap-2.5 rounded-lg bg-muted/30 px-3.5 py-2.5 text-left text-xs md:text-sm">
                    <Lightbulb className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-muted-foreground">"Give me startup ideas based on my skills"</span>
                  </div>
                  <div className="flex items-center gap-2.5 rounded-lg bg-muted/30 px-3.5 py-2.5 text-left text-xs md:text-sm">
                    <Sparkles className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-muted-foreground">"Review my profile for improvements"</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Streaming in progress with no messages yet */}
        {isLoadingExternal && !isLoading && !hasMessages && (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Message list */}
        {hasMessages && (
          <div className="flex flex-col gap-2 md:gap-3 max-w-3xl mx-auto w-full px-4 md:px-6 py-4 pb-8">
            {combinedMessages.map((msg) => (
              <MessageBubble
                key={msg.key}
                message={{ role: msg.role, content: msg.content, structured: msg.structured }}
                isStreaming={msg.isStreaming}
                onSuggestionClick={onSuggestionClick}
                onIdeaAction={onIdeaAction}
                sessionId={sessionId || undefined}
              />
            ))}

            {/* Suggestion chips after messages (when not streaming) */}
            {!isLoadingExternal && onSuggestionClick && (
              <div className="pt-4">
                <Suggestions>
                  {SUGGESTIONS.map((s) => (
                    <Suggestion
                      key={s}
                      suggestion={s}
                      onClick={onSuggestionClick}
                    />
                  ))}
                </Suggestions>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      {!isAtBottom && hasMessages && (
        <button
          type="button"
          onClick={scrollToBottom}
          className={cn(
            'absolute bottom-4 left-1/2 -translate-x-1/2 z-10',
            'flex items-center justify-center h-10 w-10 rounded-full shadow-lg',
            'bg-background border border-border/50 hover:bg-accent transition-all',
          )}
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}
ChatList.displayName = 'ChatList'
