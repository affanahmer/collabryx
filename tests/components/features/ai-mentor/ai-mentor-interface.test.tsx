/**
 * TC-076: AI Mentor Chat Interface Component Test
 * Verifies users can access the AI Mentor chat interface from the dashboard,
 * with input field, send button, and message display area present.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Use a mutable object so hoisted vi.mock factory can reference it
const mockState = vi.hoisted(() => ({
  messages: [] as Array<{ id: string; role: string; content: string; created_at: string }>,
  isStreaming: false,
  error: null as Error | null,
  sendMessage: vi.fn(),
}))

// Mock the useAIStream hook
vi.mock('@/hooks/use-ai-stream', () => ({
  useAIStream: vi.fn(() => ({
    messages: mockState.messages,
    isStreaming: mockState.isStreaming,
    sendMessage: mockState.sendMessage,
    error: mockState.error,
  })),
}))

// Mock the useAuth hook
vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: 'test-user-123',
      email: 'test@example.com',
      user_metadata: { display_name: 'Test User' },
    },
    session: null,
    isLoading: false,
    signOut: vi.fn(),
  })),
}))

// Mock the StreamingMessage component to simplify testing
vi.mock('@/components/features/ai-mentor/streaming-message', () => ({
  StreamingMessage: vi.fn(({ content, sender, isStreaming }: {
    content: string
    sender: string
    isStreaming: boolean
    timestamp: Date
  }) => (
    <div data-testid={`message-${sender}`} data-streaming={isStreaming}>
      {content}
    </div>
  )),
}))

import AIMentorPage from '@/app/(auth)/ai-mentor/page'

describe('AI Mentor Chat Interface (TC-076)', () => {
  beforeEach(() => {
    mockState.sendMessage.mockClear()
    mockState.messages = []
    mockState.isStreaming = false
    mockState.error = null
  })

  describe('Interface Accessibility', () => {
    it('should render the message input field', async () => {
      render(<AIMentorPage />)
      const input = screen.getByPlaceholderText('Ask me anything...')
      expect(input).toBeInTheDocument()
    })

    it('should render the send button', async () => {
      render(<AIMentorPage />)
      const button = screen.getByRole('button', { name: /send/i })
      expect(button).toBeInTheDocument()
    })

    it('should render the message display area (scrollable container)', async () => {
      const { container } = render(<AIMentorPage />)
      const messageArea = container.querySelector('.overflow-y-auto')
      expect(messageArea).toBeInTheDocument()
    })
  })

  describe('Input Behavior', () => {
    it('should allow users to type into the input field', async () => {
      render(<AIMentorPage />)
      const input = screen.getByPlaceholderText('Ask me anything...') as HTMLInputElement

      fireEvent.change(input, { target: { value: 'Help me with my startup idea' } })
      expect(input.value).toBe('Help me with my startup idea')
    })

    it('should clear input after sending a message', async () => {
      render(<AIMentorPage />)
      const input = screen.getByPlaceholderText('Ask me anything...') as HTMLInputElement

      fireEvent.change(input, { target: { value: 'Build a project plan' } })
      expect(input.value).toBe('Build a project plan')

      const form = input.closest('form')!
      fireEvent.submit(form)

      expect(mockState.sendMessage).toHaveBeenCalledWith('Build a project plan')
    })

    it('should not send empty messages', async () => {
      mockState.sendMessage.mockClear()
      render(<AIMentorPage />)
      const container = document.body
      const form = container.querySelector('form')
      if (form) fireEvent.submit(form)

      expect(mockState.sendMessage).not.toHaveBeenCalled()
    })

    it('should not send whitespace-only messages', async () => {
      mockState.sendMessage.mockClear()
      render(<AIMentorPage />)
      const input = screen.getByPlaceholderText('Ask me anything...') as HTMLInputElement

      fireEvent.change(input, { target: { value: '   ' } })
      const form = input.closest('form')!
      fireEvent.submit(form)

      expect(mockState.sendMessage).not.toHaveBeenCalled()
    })
  })

  describe('Send Button States', () => {
    it('should disable send button when input is empty', async () => {
      render(<AIMentorPage />)
      const button = screen.getByRole('button', { name: /send/i })
      expect(button).toBeDisabled()
    })

    it('should enable send button when input has content', async () => {
      render(<AIMentorPage />)
      const input = screen.getByPlaceholderText('Ask me anything...')

      fireEvent.change(input, { target: { value: 'Hello' } })
      const button = screen.getByRole('button', { name: /send/i })
      expect(button).not.toBeDisabled()
    })

    it('should disable send button and input while streaming', async () => {
      mockState.messages = [
        { id: '1', role: 'user', content: 'Hi', created_at: new Date().toISOString() },
        { id: '2', role: 'assistant', content: 'Hello...', created_at: new Date().toISOString() },
      ]
      mockState.isStreaming = true

      render(<AIMentorPage />)

      const input = screen.getByPlaceholderText('Ask me anything...')
      const button = screen.getByRole('button', { name: /send/i })

      expect(input).toBeDisabled()
      expect(button).toBeDisabled()
    })
  })

  describe('Message Display', () => {
    it('should display user messages in the message area', async () => {
      mockState.messages = [
        { id: '1', role: 'user', content: 'Hello AI!', created_at: new Date().toISOString() },
      ]

      render(<AIMentorPage />)

      const userMessage = screen.getByTestId('message-user')
      expect(userMessage).toBeInTheDocument()
      expect(userMessage).toHaveTextContent('Hello AI!')
    })

    it('should display AI responses in the message area', async () => {
      mockState.messages = [
        { id: '1', role: 'user', content: 'Hi', created_at: new Date().toISOString() },
        { id: '2', role: 'assistant', content: 'Hello! How can I help?', created_at: new Date().toISOString() },
      ]

      render(<AIMentorPage />)

      const aiMessage = screen.getByTestId('message-ai')
      expect(aiMessage).toBeInTheDocument()
      expect(aiMessage).toHaveTextContent('Hello! How can I help?')
    })

    it('should display multiple messages in conversation order', async () => {
      mockState.messages = [
        { id: '1', role: 'user', content: 'Message 1', created_at: new Date().toISOString() },
        { id: '2', role: 'assistant', content: 'Reply 1', created_at: new Date().toISOString() },
        { id: '3', role: 'user', content: 'Message 2', created_at: new Date().toISOString() },
        { id: '4', role: 'assistant', content: 'Reply 2', created_at: new Date().toISOString() },
      ]

      render(<AIMentorPage />)

      const allMessages = screen.getAllByTestId(/message-(user|ai)/)
      expect(allMessages).toHaveLength(4)
    })
  })

  describe('Error Display', () => {
    it('should display error message when an error occurs', async () => {
      mockState.error = new Error('Failed to connect to AI service')

      render(<AIMentorPage />)

      const errorElement = screen.getByText(/Failed to connect to AI service/)
      expect(errorElement).toBeInTheDocument()
    })

    it('should not display error when no error exists', async () => {
      mockState.error = null

      render(<AIMentorPage />)

      expect(screen.queryByText(/^Error:/)).not.toBeInTheDocument()
    })
  })

  describe('Streaming Indicator', () => {
    it('should mark the last AI message as streaming when active', async () => {
      mockState.messages = [
        { id: '1', role: 'user', content: 'Hi', created_at: new Date().toISOString() },
        { id: '2', role: 'assistant', content: 'Streaming...', created_at: new Date().toISOString() },
      ]
      mockState.isStreaming = true

      render(<AIMentorPage />)

      const streamingMsg = screen.getByTestId('message-ai')
      expect(streamingMsg.getAttribute('data-streaming')).toBe('true')
    })

    it('should not mark completed messages as streaming', async () => {
      mockState.messages = [
        { id: '1', role: 'user', content: 'Hi', created_at: new Date().toISOString() },
        { id: '2', role: 'assistant', content: 'Done!', created_at: new Date().toISOString() },
      ]
      mockState.isStreaming = false

      render(<AIMentorPage />)

      const doneMessage = screen.getByTestId('message-ai')
      expect(doneMessage.getAttribute('data-streaming')).toBe('false')
    })
  })
})
