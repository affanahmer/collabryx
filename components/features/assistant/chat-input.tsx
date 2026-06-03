/**
 * ============================================================================
 * ChatInput — Unified Message Input for AI Mentor & Assistant
 * ============================================================================
 *
 * PROBLEM (Bug #4 from analysis — Dual Architecture Contradiction):
 * The original ChatInput imported `sendMessage` directly from
 * `@/lib/actions/ai-mentor` (a Next.js Server Action) and called it with the
 * client-side crypto.randomUUID() sessionId. This server action:
 *  1. Checked `SELECT FROM ai_mentor_sessions WHERE id = <randomUUID>`
 *  2. Since the UUID was never in the DB, it returned "Session not found"
 *  3. The error was displayed as a toast, and the user's message vanished
 *
 * Meanwhile, the parent AIMentorContent used a COMPLETELY DIFFERENT path:
 * the useAIStream hook that fetched /api/ai/stream. So suggestion-chip clicks
 * went through streaming (sometimes worked) but typed messages went through
 * the broken server action (always failed). Users got inconsistent behavior
 * depending on HOW they sent their message.
 *
 * SOLUTION:
 * ChatInput no longer knows about server actions, sessions, or persistence.
 * It accepts two simple props:
 *  - `onSend: (content: string) => void` — called when the user submits
 *  - `isStreaming: boolean` — disables input during AI response generation
 *
 * The parent (AIMentorContent or AssistantContent) owns the streaming hook
 * and passes down the sendMessage function from useAIStream as onSend. This
 * eliminates the dual-path problem entirely. All messages — whether typed,
 * chip-clicked, or idea-actioned — go through the SAME streaming pipeline.
 *
 * Additionally:
 *  - The Sparkles quick-fill button now sets input text without auto-sending
 *  - The placeholder text was updated to reflect broader capabilities
 *  - Form submission and PromptInput's internal submit both call the same
 *    handler (no double-send)
 *
 * @see {@link ../hooks/use-ai-stream.ts} — the streaming hook that provides onSend
 * ============================================================================
 */
'use client'
import { Button } from '@/components/ui/button'
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from '@/components/ui/prompt-input'
import { Sparkles, SendHorizontal, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { glass } from '@/lib/utils/glass-variants'

interface ChatInputProps {
  /** Disable input while streaming */
  isStreaming?: boolean
  /** Called when user submits a message (connected to streaming hook) */
  onSend: (content: string) => void
}

export function ChatInput({ isStreaming = false, onSend }: ChatInputProps) {
  const [input, setInput] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isStreaming) return
    onSend(input.trim())
    setInput('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Chat input form"
      className={cn(
        'relative rounded-xl overflow-hidden shadow-sm',
        'focus-within:ring-1 focus-within:ring-primary transition-all',
        glass('input'),
        'border',
      )}
    >
      <PromptInput
        value={input}
        onValueChange={setInput}
        isLoading={isStreaming}
        maxHeight={128}
      >
        <PromptInputTextarea
          placeholder="Ask for startup ideas, mention connections, or general questions..."
        />
        <PromptInputActions className="absolute right-2 bottom-2 gap-1">
          <PromptInputAction tooltip="Generate startup ideas" side="top">
            <Button
              type="button"
              size="icon"
              variant="outline"
              className={cn('h-8 w-8 rounded-lg', glass('buttonGhost'))}
              onClick={() =>
                setInput('Generate startup ideas based on my profile')
              }
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </PromptInputAction>
          <PromptInputAction tooltip="Send message" side="top">
            <Button
              type="submit"
              size="icon"
              className={cn('h-8 w-8 rounded-lg', glass('buttonPrimary'))}
              disabled={!input.trim() || isStreaming}
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SendHorizontal className="h-4 w-4" />
              )}
            </Button>
          </PromptInputAction>
        </PromptInputActions>
      </PromptInput>
    </form>
  )
}
ChatInput.displayName = 'ChatInput'
