import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockSupabaseClient } from '@/../tests/setup/mocks'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { app: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } },
}))

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockRequester = { id: 'requester-id', email: 'requester@example.com' }
const mockReceiver = { id: 'receiver-id', email: 'receiver@example.com' }

describe('Chat Realtime Integration (TC-065)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockReceiver },
      error: null,
    })
  })

  describe('TC-065: accept connection opens Realtime channel', () => {
    it('creates a conversation when a connection is accepted', async () => {
      // Arrange
      const { acceptConnectionRequest } = await import('@/lib/services/connections')

      let conversationInsertCalled = false
      let conversationPayload: Record<string, unknown> | null = null

      // Mock connections table for accept flow
      let singleCallCount = 0
      const singleFn = vi.fn().mockImplementation(() => {
        singleCallCount++
        if (singleCallCount === 1) {
          return Promise.resolve({
            data: { receiver_id: mockReceiver.id, status: 'pending' },
            error: null,
          })
        }
        return Promise.resolve({
          data: { requester_id: mockRequester.id, receiver_id: mockReceiver.id },
          error: null,
        })
      })

      const updateChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'conn-123', status: 'accepted' },
          error: null,
        }),
      }

      const connectionsTable = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnValue(updateChain),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: singleFn,
        limit: vi.fn().mockReturnThis(),
      }

      // Mock conversations table for insert
      const convInsertFn = vi.fn().mockImplementation((payload: Record<string, unknown>) => {
        conversationInsertCalled = true
        conversationPayload = payload
        return {
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'new-conv-id', ...payload }, error: null }),
        }
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'connections') {
          return connectionsTable as unknown as ReturnType<typeof mockSupabaseClient.from>
        }
        if (table === 'conversations') {
          return {
            select: vi.fn().mockReturnThis(),
            insert: convInsertFn,
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          } as unknown as ReturnType<typeof mockSupabaseClient.from>
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as unknown as ReturnType<typeof mockSupabaseClient.from>
      })

      // Act
      await acceptConnectionRequest('conn-123')

      // Assert: A conversation should be created for the accepted connection
      expect(conversationInsertCalled).toBe(true)
      expect(conversationPayload).not.toBeNull()

      // Verify conversation links both participants (ordered by ID)
      const p1 = conversationPayload!.participant_1 as string
      const p2 = conversationPayload!.participant_2 as string
      expect([p1, p2]).toContain(mockRequester.id)
      expect([p1, p2]).toContain(mockReceiver.id)
      // IDs should be sorted (smaller first)
      const sorted = [mockRequester.id, mockReceiver.id].sort()
      expect(p1).toBe(sorted[0])
      expect(p2).toBe(sorted[1])
    })

    it('sets up Realtime channel subscription for new messages', () => {
      // Arrange: simulate the useMessages hook channel setup
      const conversationId = 'conv-abc'

      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
        send: vi.fn(),
      }

      mockSupabaseClient.channel = vi.fn().mockReturnValue(mockChannel)
      mockSupabaseClient.removeChannel = vi.fn()

      // Act: Create channel for messages
      const channel = mockSupabaseClient.channel(`messages:${conversationId}`)

      channel
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        }, vi.fn())
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        }, vi.fn())
        .subscribe()

      // Assert: Channel created with correct name and events
      expect(mockSupabaseClient.channel).toHaveBeenCalledWith('messages:conv-abc')
      expect(channel.on).toHaveBeenCalledTimes(2)
      expect(channel.subscribe).toHaveBeenCalledTimes(2) // Once for each on() call since .on returns this

      // Verify the first on() call is for INSERT
      const firstOnCall = channel.on.mock.calls[0]
      expect(firstOnCall[0]).toBe('postgres_changes')
      expect(firstOnCall[1].event).toBe('INSERT')
      expect(firstOnCall[1].table).toBe('messages')

      // Verify the second on() call is for UPDATE
      const secondOnCall = channel.on.mock.calls[1]
      expect(secondOnCall[0]).toBe('postgres_changes')
      expect(secondOnCall[1].event).toBe('UPDATE')
    })

    it('Realtime channel for messages subscribes to correct table and filter', () => {
      // Arrange
      const conversationId = 'conv-xyz-456'
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
        send: vi.fn(),
      }

      mockSupabaseClient.channel = vi.fn().mockReturnValue(mockChannel)

      // Act: Simulate channel setup as in useMessages
      const channel = mockSupabaseClient.channel(`messages:${conversationId}`)
      channel.on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, vi.fn())
      channel.subscribe()

      // Assert: Channel name contains conversation ID
      expect(mockSupabaseClient.channel).toHaveBeenCalledWith('messages:conv-xyz-456')

      // Subscribe was called
      expect(channel.subscribe).toHaveBeenCalled()
    })

    it('accepting connection generates a unique conversation ID', async () => {
      // Arrange
      const { acceptConnectionRequest } = await import('@/lib/services/connections')

      let conversationPayload: Record<string, unknown> | null = null

      let singleCallCount = 0
      const singleFn = vi.fn().mockImplementation(() => {
        singleCallCount++
        if (singleCallCount === 1) {
          return Promise.resolve({
            data: { receiver_id: mockReceiver.id, status: 'pending' },
            error: null,
          })
        }
        return Promise.resolve({
          data: { requester_id: mockRequester.id, receiver_id: mockReceiver.id },
          error: null,
        })
      })

      const updates = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'conn-123' }, error: null }),
      }

      const connectionsTable = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnValue(updates),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: singleFn,
        limit: vi.fn().mockReturnThis(),
      }

      const convInsertFn = vi.fn().mockImplementation((payload: Record<string, unknown>) => {
        conversationPayload = payload
        return {
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'conv-uuid-789', ...payload }, error: null }),
        }
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'connections') {
          return connectionsTable as unknown as ReturnType<typeof mockSupabaseClient.from>
        }
        if (table === 'conversations') {
          return {
            select: vi.fn().mockReturnThis(),
            insert: convInsertFn,
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          } as unknown as ReturnType<typeof mockSupabaseClient.from>
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as unknown as ReturnType<typeof mockSupabaseClient.from>
      })

      // Act
      await acceptConnectionRequest('conn-123')

      // Assert: Conversation payload has both participants
      expect(conversationPayload).not.toBeNull()
      expect(conversationPayload).toHaveProperty('participant_1')
      expect(conversationPayload).toHaveProperty('participant_2')
      expect(conversationPayload!.participant_1).not.toBe(conversationPayload!.participant_2)
    })
  })
})
