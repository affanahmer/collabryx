import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MessageInput } from '@/components/features/messages/message-input'
import { validateMessage } from '@/lib/validations/chat'

// Mock useMessages hook
vi.mock('@/hooks/use-messages', () => ({
  useMessages: vi.fn(() => ({
    sendMessage: vi.fn().mockResolvedValue(true),
    messages: [],
    isLoading: false,
    error: null,
    markAsRead: vi.fn(),
  })),
  MESSAGE_QUERY_KEYS: {
    all: ['messages'],
    conversation: () => ['messages', 'conversation', 'all'],
  },
}))

// Mock glass-variants
vi.mock('@/lib/utils/glass-variants', () => ({
  glass: () => '',
}))

describe('MessageInput (TC-070, TC-071)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('TC-070: message length limits', () => {
    it('validates that messages under 2000 characters pass validation', () => {
      // Arrange
      const validMessage = 'Hello, this is a normal message'

      // Act
      const result = validateMessage({ text: validMessage })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.text).toBe(validMessage)
      }
    })

    it('rejects messages over 2000 characters via Zod validation', () => {
      // Arrange: Message exactly at max
      const exactMaxMessage = 'x'.repeat(2000)

      // Act
      const exactResult = validateMessage({ text: exactMaxMessage })

      // Assert: Exact max should pass
      expect(exactResult.success).toBe(true)

      // Arrange: Message over max
      const overMaxMessage = 'x'.repeat(2001)

      // Act
      const overResult = validateMessage({ text: overMaxMessage })

      // Assert: Over max should fail
      expect(overResult.success).toBe(false)
      if (!overResult.success) {
        expect(overResult.errors.some((e: string) => e.includes('2000'))).toBe(true)
      }
    })

    it('rejects empty messages via Zod validation', () => {
      // Act
      const result = validateMessage({ text: '' })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors.some((e: string) => e.includes('empty'))).toBe(true)
      }
    })

    it('rejects whitespace-only messages via Zod validation', () => {
      // Act
      const result = validateMessage({ text: '   ' })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors.some((e: string) => e.includes('empty'))).toBe(true)
      }
    })

    it('renders textarea and send button', () => {
      // Act
      render(<MessageInput conversationId="conv-123" />)

      // Assert
      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument()
      expect(screen.getByLabelText('Send message')).toBeInTheDocument()
    })

    it('disables send button when input is empty', () => {
      // Act
      render(<MessageInput conversationId="conv-123" />)

      // Assert
      const sendButton = screen.getByLabelText('Send message')
      expect(sendButton).toBeDisabled()
    })

    it('enables send button when text is entered', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<MessageInput conversationId="conv-123" />)

      // Act
      const textarea = screen.getByPlaceholderText('Type a message...')
      await user.type(textarea, 'Hello!')

      // Assert
      const sendButton = screen.getByLabelText('Send message')
      expect(sendButton).not.toBeDisabled()
    })
  })

  describe('TC-071: emoji and special character handling', () => {
    it('preserves emoji characters in message text', () => {
      // Arrange
      const emojiMessage = 'Hello 👋 world 🌍! How are you? 😊'

      // Act
      const result = validateMessage({ text: emojiMessage })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.text).toBe(emojiMessage)
      }
    })

    it('handles multi-byte emoji characters correctly', () => {
      // Arrange
      const complexEmoji = '🎉🎊✨🚀💪🔥❤️👍'

      // Act
      const result = validateMessage({ text: complexEmoji })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.text).toBe(complexEmoji)
        // Multi-byte chars count as single characters in JS length, but
        // Zod's .max() counts string length, which may differ
        expect(result.data.text.length).toBe(complexEmoji.length)
      }
    })

    it('handles Unicode special characters', () => {
      // Arrange
      const unicodeMsg = 'Café résumé naïve — «quotes» ñ © ® ™'

      // Act
      const result = validateMessage({ text: unicodeMsg })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.text).toBe(unicodeMsg)
      }
    })

    it('handles mixed emoji, text, and special characters', () => {
      // Arrange
      const mixedMsg = 'Check this out! 🚀 Here are some special chars: ©2024 — 100% awesome! 🎉'

      // Act
      const result = validateMessage({ text: mixedMsg })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.text).toBe(mixedMsg)
        expect(result.data.text).toContain('🚀')
        expect(result.data.text).toContain('🎉')
        expect(result.data.text).toContain('©')
        expect(result.data.text).toContain('—')
      }
    })

    it('handles newlines and tabs in messages', () => {
      // Arrange
      const multilineMsg = 'Line 1\nLine 2\n\tIndented line'

      // Act
      const result = validateMessage({ text: multilineMsg })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.text).toContain('\n')
        expect(result.data.text).toContain('\t')
      }
    })

    it('handles messages with HTML-like content as plain text', () => {
      // Arrange: Users might type HTML-like strings
      const htmlLikeMsg = 'Check <div> and <script>alert("xss")</script>'

      // Act
      const result = validateMessage({ text: htmlLikeMsg })

      // Assert: Should pass validation (it is just text at this level)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.text).toBe(htmlLikeMsg)
      }
    })

    it('handles empty string with just emoji variations', () => {
      // Arrange
      // Variation selectors and ZWJ sequences
      const zwjEmoji = '👨‍💻👩‍🔬👨‍👩‍👧‍👦'

      // Act
      const result = validateMessage({ text: zwjEmoji })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.text).toBe(zwjEmoji)
      }
    })
  })

  describe('TC-070 + TC-071 combined: edge cases', () => {
    it('accepts message exactly at 2000 characters with emojis', () => {
      // Arrange: Build a 2000-char message with emojis mixed in
      const base = 'Hello 👋 '
      const repeat = Math.floor(2000 / base.length)
      const remainder = 2000 - (base.length * repeat)
      const message = base.repeat(repeat) + 'x'.repeat(remainder)

      expect(message.length).toBe(2000)

      // Act
      const result = validateMessage({ text: message })

      // Assert
      expect(result.success).toBe(true)
    })

    it('rejects message of empty string', () => {
      // Act
      const result = validateMessage({ text: '' })

      // Assert
      expect(result.success).toBe(false)
    })

    it('accepts message with only emojis', () => {
      // Arrange
      const onlyEmojis = '😀😃😄😁😅😂🤣'

      // Act
      const result = validateMessage({ text: onlyEmojis })

      // Assert
      expect(result.success).toBe(true)
    })

    it('accepts message with zero-width characters', () => {
      // Arrange
      const zeroWidthMsg = 'hello\u200Bworld\u200Ctest'

      // Act
      const result = validateMessage({ text: zeroWidthMsg })

      // Assert
      expect(result.success).toBe(true)
    })
  })
})
