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
import { toast } from 'sonner'
import { sendMessage } from '@/lib/actions/ai-mentor'
interface ChatInputProps {
  sessionId: string | null
  onMessageSent: () => void
}
export function ChatInput({ sessionId, onMessageSent }: ChatInputProps) {
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const send = async () => {
    if (!input.trim() || !sessionId) return
    setIsSending(true)
    try {
      const result = await sendMessage(sessionId, input.trim())
      if (result.error) {
        toast.error(result.error.message || 'Failed to send message')
        return
      }
      setInput('')
      onMessageSent()
      toast.success('Message sent')
    } catch {
      toast.error('Failed to send message. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    send()
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
        isLoading={isSending}
        maxHeight={128}
        onSubmit={send}
      >
        <PromptInputTextarea
          placeholder="Ask for startup ideas based on your skills..."
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
              disabled={!input.trim() || isSending || !sessionId}
            >
              {isSending ? (
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
