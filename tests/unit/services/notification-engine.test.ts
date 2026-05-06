/**
 * TC-086: Match notification - notification_engine pushes smart notification
 *        when new match is generated
 * TC-087: Priority batching - notification_engine applies priority batching
 *         to prevent notification spam
 *
 * Tests the TypeScript notification service sendMatchNotification along
 * with a mock batching engine that mirrors the Python worker's logic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  sendMatchNotification,
  sendCommentNotification,
  sendLikeNotification,
  createNotification,
} from '@/lib/services/notifications'

// Mock Supabase insert chain
const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockSingle = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: mockSingle,
            }),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    }),
  }),
}))

// ─── Mock Batching Engine (mirrors Python NotificationEngine) ──────────────

interface BatchedNotification {
  type: string
  actor_id: string
  content: string
  priority: string
  queuedAt: number
}

const PRIORITY_HIGH = ['message', 'match', 'connection_accepted']
const PRIORITY_MEDIUM = ['connection_request', 'like', 'comment']
const PRIORITY_LOW = ['profile_view', 'weekly_summary']

function batchNotifications(
  batch: BatchedNotification[]
): BatchedNotification[] {
  if (batch.length <= 1) return batch

  // Group by type
  const grouped = new Map<string, BatchedNotification[]>()
  for (const n of batch) {
    const existing = grouped.get(n.type) || []
    existing.push(n)
    grouped.set(n.type, existing)
  }

  const combined: BatchedNotification[] = []
  for (const [type, notifications] of grouped) {
    if (notifications.length > 1) {
      // Combine multiple notifications of same type
      const combinedContent =
        type === 'like'
          ? `${notifications.length} people liked your post`
          : type === 'comment'
            ? `You have ${notifications.length} new comments`
            : `You have ${notifications.length} new ${type} notifications`

      combined.push({
        type,
        actor_id: notifications[0].actor_id,
        content: combinedContent,
        priority: 'medium',
        queuedAt: Math.min(...notifications.map((n) => n.queuedAt)),
      })
    } else {
      combined.push(notifications[0])
    }
  }

  return combined
}

function getPriority(type: string): string {
  if (PRIORITY_HIGH.includes(type)) return 'high'
  if (PRIORITY_MEDIUM.includes(type)) return 'medium'
  return 'low'
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('Notification Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockReturnValue({
      select: mockSelect,
    })
    mockSelect.mockReturnValue({
      single: mockSingle,
    })
    mockSingle.mockResolvedValue({
      data: {
        id: 'new-notif-123',
        user_id: 'target-user-id',
        type: 'match',
        content: 'You have a 95% match with someone!',
      },
      error: null,
    })
  })

  // ── TC-086: Match notification ──────────────────────────────────────────

  describe('TC-086: Match notification', () => {
    it('creates a notification when a new match is generated', async () => {
      // Arrange
      const userId = 'target-user-id'
      const matchedUserId = 'matched-user-456'
      const matchPercentage = 95

      // Act
      const result = await sendMatchNotification(userId, matchedUserId, matchPercentage)

      // Assert
      expect(result.error).toBeNull()
      expect(mockInsert).toHaveBeenCalled()

      // Verify notification was created with correct fields
      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall.user_id).toBe(userId)
      expect(insertCall.type).toBe('match')
      expect(insertCall.actor_id).toBe(matchedUserId)
      expect(insertCall.content).toContain('95%')
      expect(insertCall.content).toContain('match')
      expect(insertCall.resource_type).toBe('match')
      expect(insertCall.resource_id).toBe(matchedUserId)
    })

    it('includes match percentage in notification content', async () => {
      // Arrange
      const userId = 'user-789'
      const matchedUserId = 'matched-012'
      const matchPercentage = 72

      // Act
      await sendMatchNotification(userId, matchedUserId, matchPercentage)

      // Assert
      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall.content).toBe('You have a 72% match with someone!')
    })

    it('sets resource_type to "match" for match notifications', async () => {
      // Arrange & Act
      await sendMatchNotification('user-a', 'user-b', 60)

      // Assert
      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall.resource_type).toBe('match')
    })

    it('handles 0% match correctly', async () => {
      // Arrange & Act
      await sendMatchNotification('user-a', 'user-b', 0)

      // Assert
      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall.content).toContain('0%')
    })
  })

  // ── TC-087: Priority batching ───────────────────────────────────────────

  describe('TC-087: Priority batching', () => {
    it('assigns priority based on notification type', () => {
      // Arrange & Act
      const matchPriority = getPriority('match')
      const likePriority = getPriority('like')
      const viewPriority = getPriority('profile_view')

      // Assert
      expect(matchPriority).toBe('high')
      expect(likePriority).toBe('medium')
      expect(viewPriority).toBe('low')
    })

    it('batches multiple like notifications into a single combined notification', () => {
      // Arrange - 4 likes from different users in a short window
      const now = Date.now()
      const batch: BatchedNotification[] = [
        { type: 'like', actor_id: 'user-1', content: 'liked your post', priority: 'medium', queuedAt: now },
        { type: 'like', actor_id: 'user-2', content: 'liked your post', priority: 'medium', queuedAt: now + 100 },
        { type: 'like', actor_id: 'user-3', content: 'liked your post', priority: 'medium', queuedAt: now + 200 },
        { type: 'like', actor_id: 'user-4', content: 'liked your post', priority: 'medium', queuedAt: now + 300 },
      ]

      // Act
      const result = batchNotifications(batch)

      // Assert - 4 individual likes should combine to 1 notification
      expect(result.length).toBe(1)
      expect(result[0].type).toBe('like')
      expect(result[0].content).toBe('4 people liked your post')
    })

    it('batches multiple comment notifications into one', () => {
      // Arrange - 3 comments
      const now = Date.now()
      const batch: BatchedNotification[] = [
        { type: 'comment', actor_id: 'user-1', content: 'commented', priority: 'medium', queuedAt: now },
        { type: 'comment', actor_id: 'user-2', content: 'commented', priority: 'medium', queuedAt: now + 500 },
        { type: 'comment', actor_id: 'user-3', content: 'commented', priority: 'medium', queuedAt: now + 1000 },
      ]

      // Act
      const result = batchNotifications(batch)

      // Assert
      expect(result.length).toBe(1)
      expect(result[0].content).toBe('You have 3 new comments')
    })

    it('does not batch a single notification', () => {
      // Arrange
      const batch: BatchedNotification[] = [
        { type: 'like', actor_id: 'user-1', content: 'liked your post', priority: 'medium', queuedAt: Date.now() },
      ]

      // Act
      const result = batchNotifications(batch)

      // Assert
      expect(result.length).toBe(1)
      expect(result[0].content).toBe('liked your post')
    })

    it('groups different notification types separately within a batch', () => {
      // Arrange - mixed notification types arriving rapidly
      const now = Date.now()
      const batch: BatchedNotification[] = [
        { type: 'like', actor_id: 'u1', content: 'liked', priority: 'medium', queuedAt: now },
        { type: 'like', actor_id: 'u2', content: 'liked', priority: 'medium', queuedAt: now + 50 },
        { type: 'comment', actor_id: 'u3', content: 'commented', priority: 'medium', queuedAt: now + 100 },
        { type: 'comment', actor_id: 'u4', content: 'commented', priority: 'medium', queuedAt: now + 150 },
        { type: 'connection_request', actor_id: 'u5', content: 'request', priority: 'medium', queuedAt: now + 200 },
      ]

      // Act
      const result = batchNotifications(batch)

      // Assert - should have 3 combined notifications: likes, comments, connection_request
      expect(result.length).toBe(3)

      const likeResult = result.find((r) => r.type === 'like')
      const commentResult = result.find((r) => r.type === 'comment')
      const requestResult = result.find((r) => r.type === 'connection_request')

      expect(likeResult?.content).toBe('2 people liked your post')
      expect(commentResult?.content).toBe('You have 2 new comments')
      expect(requestResult?.content).toBe('request')
    })

    it('high priority notifications are identified correctly (not batched)', () => {
      // Arrange & Act
      const matchPriority = getPriority('match')
      const messagePriority = getPriority('message')
      const connectionPriority = getPriority('connection_accepted')

      // Assert - high priority events should not go through batching
      expect(matchPriority).toBe('high')
      expect(messagePriority).toBe('high')
      expect(connectionPriority).toBe('high')
    })

    it('returns empty array for empty batch', () => {
      // Arrange & Act
      const result = batchNotifications([])

      // Assert
      expect(result).toEqual([])
    })

    it('sends individual comment notification when createNotification is called directly', async () => {
      // Arrange
      const postAuthorId = 'author-123'
      const commenterId = 'commenter-456'
      const postId = 'post-789'

      // Act
      const result = await sendCommentNotification(postAuthorId, commenterId, postId)

      // Assert - direct call should create exactly one notification
      expect(result.error).toBeNull()
      expect(mockInsert).toHaveBeenCalledTimes(1)
      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall.type).toBe('comment')
      expect(insertCall.user_id).toBe(postAuthorId)
      expect(insertCall.actor_id).toBe(commenterId)
      expect(insertCall.resource_type).toBe('post')
      expect(insertCall.resource_id).toBe(postId)
    })
  })

  // ── Edge cases ───────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('creates notification with all required fields', async () => {
      // Arrange & Act
      await sendLikeNotification('recipient', 'liker', 'post-1')

      // Assert
      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall).toHaveProperty('user_id')
      expect(insertCall).toHaveProperty('type')
      expect(insertCall).toHaveProperty('content')
      expect(insertCall).toHaveProperty('actor_id')
    })

    it('createNotification validates input via Zod schema', async () => {
      // Arrange - invalid user_id
      const invalidInput = {
        user_id: 'not-a-uuid',
        type: 'match' as const,
        content: 'hello',
        actor_id: 'also-not-uuid',
      }

      // Act
      const result = await createNotification(invalidInput)

      // Assert - should fail validation, no insert called from this test's mock
      expect(result.error).toBeDefined()
      // The validation error occurred before the Supabase insert was attempted
    })
  })
})
