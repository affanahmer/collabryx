/**
 * TC-082: Session Summarization Integration Test
 * Verifies the ai_mentor_processor accurately generates a session summarization
 * from multi-turn conversation history, capturing key points, decisions, and action items.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { AIMessage, SessionSummary } from '@/lib/rag/types'
import { summarizeSessionIfNeeded, setLLMClient, resetLLMClient } from '@/lib/rag/session-summarizer'
import type { LLMClient } from '@/lib/rag/session-summarizer'

type MockLLMClient = {
  chatCompletionsCreate: ReturnType<typeof vi.fn>
}

describe('AI Mentor Session Summarization (TC-082)', () => {
  let mockClient: MockLLMClient

  beforeEach(() => {
    vi.clearAllMocks()
    resetLLMClient()
    mockClient = {
      chatCompletionsCreate: vi.fn(),
    }
    setLLMClient(mockClient as unknown as LLMClient)
  })

  afterEach(() => {
    resetLLMClient()
  })

  describe('Summarization triggers correctly', () => {
    it('should NOT summarize sessions with fewer than 8 messages', async () => {
      const shortConversation: AIMessage[] = createMessages(5)
      const result = await summarizeSessionIfNeeded(shortConversation, 'sess-1')
      expect(result.summary).toBeNull()
      expect(mockClient.chatCompletionsCreate).not.toHaveBeenCalled()
    })

    it('should summarize sessions with 8 or more messages', async () => {
      const conversation: AIMessage[] = createMessages(10)
      mockClient.chatCompletionsCreate.mockResolvedValueOnce(makeLLMResponse(
        'User explored startup ideas and decided on a marketplace platform'
      ))

      const result = await summarizeSessionIfNeeded(conversation, 'sess-2')
      expect(result.summary).not.toBeNull()
      expect(mockClient.chatCompletionsCreate).toHaveBeenCalledTimes(1)
    })
  })

  describe('Summary content quality', () => {
    it('should capture key discussion points in summary', async () => {
      const conversation: AIMessage[] = createMessages(8)
      mockClient.chatCompletionsCreate.mockResolvedValueOnce(makeLLMResponse(
        'User discussed building a mobile app for fitness tracking. Key features identified: workout logging, nutrition tracking, social sharing.'
      ))

      const result = await summarizeSessionIfNeeded(conversation, 'sess-3')

      expect(result.summary).not.toBeNull()
      expect(result.summary?.summary_text).toContain('fitness tracking')
      expect(result.summary?.summary_text.length).toBeGreaterThan(30)
    })

    it('should identify action items from the conversation', async () => {
      const conversation: AIMessage[] = createMessages(9)
      mockClient.chatCompletionsCreate.mockResolvedValueOnce(makeLLMResponse(
        'Discussion about project launch preparation',
        ['Set up CI/CD pipeline', 'Create beta testing group', 'Draft press release'],
        ['DevOps', 'Content Writing']
      ))

      const result = await summarizeSessionIfNeeded(conversation, 'sess-4')

      expect(result.summary?.action_items).toHaveLength(3)
      expect(result.summary?.action_items).toContain('Set up CI/CD pipeline')
      expect(result.summary?.action_items).toContain('Create beta testing group')
    })

    it('should extract skills mentioned during the session', async () => {
      const conversation: AIMessage[] = createMessages(10)
      mockClient.chatCompletionsCreate.mockResolvedValueOnce(makeLLMResponse(
        'Career planning session',
        ['Update LinkedIn profile', 'Apply to 5 jobs'],
        ['React', 'Node.js', 'AWS', 'System Design']
      ))

      const result = await summarizeSessionIfNeeded(conversation, 'sess-5')

      expect(result.summary?.skills_identified).toHaveLength(4)
      expect(result.summary?.skills_identified).toContain('React')
      expect(result.summary?.skills_identified).toContain('AWS')
    })

    it('should record message count in session summary', async () => {
      const conversation: AIMessage[] = createMessages(12)
      mockClient.chatCompletionsCreate.mockResolvedValueOnce(makeLLMResponse('Test summary'))

      const result = await summarizeSessionIfNeeded(conversation, 'sess-6')

      // Should only summarize last 10 (MAX_HISTORY_MESSAGES)
      expect(result.summary?.message_count).toBe(10)
    })
  })

  describe('Error handling in summarization', () => {
    it('should gracefully handle LLM API failure', async () => {
      const conversation: AIMessage[] = createMessages(10)
      mockClient.chatCompletionsCreate.mockRejectedValueOnce(
        new Error('LLM API timeout after 30s')
      )

      const result = await summarizeSessionIfNeeded(conversation, 'sess-7')

      expect(result.summary).toBeNull()
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings[0]).toContain('Summarization failed')
    })

    it('should handle empty LLM response gracefully', async () => {
      const conversation: AIMessage[] = createMessages(8)
      mockClient.chatCompletionsCreate.mockResolvedValueOnce({
        choices: [{ message: { content: '' } }],
      })

      const result = await summarizeSessionIfNeeded(conversation, 'sess-8')

      expect(result.summary).toBeNull()
      expect(result.warnings).toContain('Empty response from summarization LLM')
    })

    it('should handle malformed JSON gracefully', async () => {
      const conversation: AIMessage[] = createMessages(8)
      mockClient.chatCompletionsCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'Not valid JSON at all' } }],
      })

      const result = await summarizeSessionIfNeeded(conversation, 'sess-9')

      expect(result.summary).toBeNull()
      expect(result.warnings).toContain('Failed to parse summarization response')
    })
  })

  describe('Summary prompt construction', () => {
    it('should include conversation content in summarization prompt', async () => {
      const conversation: AIMessage[] = [
        { id: '1', role: 'user', content: 'I want to learn TypeScript', created_at: '2024-01-01T00:00:00Z' },
        { id: '2', role: 'assistant', content: 'TypeScript is great for large projects!', created_at: '2024-01-01T00:00:01Z' },
        { id: '3', role: 'user', content: 'Where should I start?', created_at: '2024-01-01T00:00:02Z' },
        { id: '4', role: 'assistant', content: 'Start with the official handbook...', created_at: '2024-01-01T00:00:03Z' },
        { id: '5', role: 'user', content: 'How long will it take?', created_at: '2024-01-01T00:00:04Z' },
        { id: '6', role: 'assistant', content: 'About 2-3 weeks for basics...', created_at: '2024-01-01T00:00:05Z' },
        { id: '7', role: 'user', content: 'Should I also learn React?', created_at: '2024-01-01T00:00:06Z' },
        { id: '8', role: 'assistant', content: 'Yes, React+TypeScript is a powerful combo...', created_at: '2024-01-01T00:00:07Z' },
      ]

      mockClient.chatCompletionsCreate.mockResolvedValueOnce(makeLLMResponse(
        'User wanted to learn TypeScript and React'
      ))

      await summarizeSessionIfNeeded(conversation, 'sess-10')

      const callArg = mockClient.chatCompletionsCreate.mock.calls[0][0]
      const promptContent = callArg.messages[0].content

      // Prompt should include user messages
      expect(promptContent).toContain('I want to learn TypeScript')
      expect(promptContent).toContain('Where should I start?')

      // Prompt should label roles
      expect(promptContent).toContain('User:')
      expect(promptContent).toContain('Assistant:')
    })

    it('should use low temperature for deterministic summaries', async () => {
      const conversation: AIMessage[] = createMessages(8)
      mockClient.chatCompletionsCreate.mockResolvedValueOnce(makeLLMResponse('Summary'))

      await summarizeSessionIfNeeded(conversation, 'sess-11')

      expect(mockClient.chatCompletionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.3,
        })
      )
    })
  })

  describe('Session closing behavior', () => {
    it('should preserve summary for future context injection', async () => {
      const conversation: AIMessage[] = createMessages(10)
      const summaryText = 'User discussed MVP development and team building strategies'

      mockClient.chatCompletionsCreate.mockResolvedValueOnce(makeLLMResponse(summaryText))

      const result = await summarizeSessionIfNeeded(conversation, 'sess-final')

      const summary = result.summary as SessionSummary
      expect(summary.summary_text).toBe(summaryText)
      expect(summary.action_items).toBeDefined()
      expect(summary.skills_identified).toBeDefined()
      expect(summary.message_count).toBe(10)
    })
  })
})

// Helper to create a mock LLM response
function makeLLMResponse(
  summary: string,
  actionItems: string[] = [],
  skillsIdentified: string[] = []
) {
  return {
    choices: [
      {
        message: {
          content: JSON.stringify({
            summary,
            action_items: actionItems,
            skills_identified: skillsIdentified,
          }),
        },
      },
    ],
  }
}

// Helper to create mock conversation messages
function createMessages(count: number): AIMessage[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `msg-${i}`,
    role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
    content: `Conversation message number ${i}`,
    created_at: new Date(Date.now() + i * 1000).toISOString(),
  }))
}
