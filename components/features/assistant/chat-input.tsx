/**
 * ============================================================================
 * ChatInput — Unified Message Input with @Mentions
 * ============================================================================
 *
 * Features:
 *  - MentionPopover for @mention autocomplete
 *  - Streaming-aware submit with auto-stop
 *  - Glass-glow themed styling
 *  - File attachments not supported by current AI model (text-only)
 *
 * @see {@link ../../ai-elements/prompt-input.tsx}
 * @see {@link ../../../hooks/use-mentions.ts}
 * ============================================================================
 */
'use client'
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputButton,
  PromptInputSubmit,
} from '@/components/ai-elements/prompt-input'
import { MentionPopover } from '@/components/features/assistant/mention-popover'
import { useMentions } from '@/hooks/use-mentions'
import type { ChatStatus } from 'ai'
import { Sparkles } from 'lucide-react'
import { useCallback, useRef, useEffect, type ClipboardEventHandler } from 'react'
import { cn } from '@/lib/utils'
import { glass } from '@/lib/utils/glass-variants'

interface ChatInputProps {
  isStreaming?: boolean
  onSend: (
    content: string,
    files?: Array<{ url: string; mediaType: string; filename?: string }>,
    mentionedUserIds?: string[]
  ) => void
  status?: 'submitted' | 'streaming' | 'error' | 'awaiting_input' | 'ready'
  onStop?: () => void
}

export function ChatInput({
  isStreaming = false,
  onSend,
  status,
  onStop,
}: ChatInputProps) {
  const {
    mentionState,
    resolvedMentions,
    checkForMention,
    insertMention,
    clearMentions,
    dismissMentions,
  } = useMentions()

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Suppress all file drag-and-drop on the nearest form (current model doesn't support images)
  useEffect(() => {
    const preventFileDrop = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    // Target the form rendered by PromptInput inside this component tree
    const form = document.querySelector('form')
    if (!form) return
    form.addEventListener('dragover', preventFileDrop, true)
    form.addEventListener('drop', preventFileDrop, true)
    return () => {
      form.removeEventListener('dragover', preventFileDrop, true)
      form.removeEventListener('drop', preventFileDrop, true)
    }
  }, [])

  // Quick-fill button handler
  const handleQuickFill = useCallback(() => {
    const textarea = document.querySelector<HTMLTextAreaElement>('textarea[name="message"]')
    if (textarea) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      )?.set
      nativeInputValueSetter?.call(textarea, 'Generate startup ideas based on my profile')
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }, [])

  // Textarea change handler — detect @mentions
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget
    textareaRef.current = textarea
    checkForMention(textarea.value, textarea.selectionStart)
  }, [checkForMention])

  // Textarea keydown handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    textareaRef.current = e.currentTarget
    if (mentionState.active) {
      if (e.key === 'Enter' && !e.shiftKey && mentionState.active && mentionState.users.length > 0) {
        e.preventDefault()
        return
      }
    }
  }, [mentionState])

  // Handle mention selection
  const handleMentionSelect = useCallback((user: { id: string; name: string; headline: string | null; avatar_url: string | null }) => {
    const textarea = textareaRef.current || document.querySelector<HTMLTextAreaElement>('textarea[name="message"]')
    if (!textarea) return

    const { newText, newCursorPos } = insertMention(textarea.value, textarea.selectionStart, user)

    // Update textarea value via native setter to trigger React's controlled input
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    )?.set
    nativeInputValueSetter?.call(textarea, newText)
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
    textarea.selectionStart = newCursorPos
    textarea.selectionEnd = newCursorPos
  }, [insertMention])

  // Block file pastes (Ctrl+V of images) — current model doesn't support multimodal input
  const handlePaste: ClipboardEventHandler<HTMLTextAreaElement> = useCallback((e) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.kind === 'file') {
        e.preventDefault()
        return
      }
    }
  }, [])

  // Submit handler — text only, no file uploads (model doesn't support multimodal)
  const handleSubmit = useCallback(async (
    message: { text: string }
  ) => {
    if (!message.text.trim()) return

    // Get resolved mention user IDs
    const mentionIds = resolvedMentions.map(m => m.id)

    // Send message with mention IDs
    onSend(message.text.trim(), undefined, mentionIds.length > 0 ? mentionIds : undefined)

    // Reset mentions
    clearMentions()
  }, [onSend, resolvedMentions, clearMentions])

  return (
    <div className="relative">
      {/* Mention autocomplete popover — positioned above the form */}
      <MentionPopover
        mentionState={mentionState}
        onSelect={handleMentionSelect}
        onDismiss={dismissMentions}
      />

      <PromptInput
        onSubmit={handleSubmit}
        className={cn(
          'relative rounded-xl overflow-hidden',
          'focus-within:ring-1 focus-within:ring-primary transition-all',
          glass('card'),
        )}
        maxFiles={0}
      >
        {/* Main textarea */}
        <PromptInputTextarea
          placeholder="Ask for startup ideas, @mention connections, or general questions..."
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
        />

        {/* Footer with tools and submit */}
        <PromptInputFooter>
          <PromptInputTools>
            <PromptInputButton
              tooltip="Generate startup ideas"
              onClick={handleQuickFill}
            >
              <Sparkles className="size-4" />
            </PromptInputButton>
          </PromptInputTools>

          <PromptInputSubmit
            status={(status === 'awaiting_input' ? 'ready' : status ?? undefined) as ChatStatus}
            onStop={onStop}
          />
        </PromptInputFooter>
      </PromptInput>
    </div>
  )
}
ChatInput.displayName = 'ChatInput'
