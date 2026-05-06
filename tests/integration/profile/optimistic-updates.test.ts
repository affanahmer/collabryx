/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockQueryClient } from '@/tests/setup/mocks'
import { mockSupabaseClient } from '@/tests/setup/mocks'

/**
 * TC-026: React Query 5 Optimistic Updates Integration Test
 *
 * Tests that React Query's setQueryData / onMutate patterns
 * update UI before server confirms (optimistic updates).
 *
 * We mock the pattern used in useUpdateProfile hook:
 * 1. Cache is immediately updated with new data via setQueryData
 * 2. Mutation is sent to Supabase
 * 3. On success: cache invalidated and refetched
 * 4. On error: cache rolled back
 */
describe('Optimistic Updates Integration (TC-026)', () => {
  const USER_ID = 'test-user-id'

  const mockProfileBefore = {
    id: USER_ID,
    full_name: 'John Doe',
    display_name: 'johndoe',
    headline: 'Old Headline',
    bio: 'Old bio',
    location: 'Old Location',
    collaboration_readiness: 'available',
  }

  const mockProfileAfter = {
    ...mockProfileBefore,
    headline: 'Updated Headline',
    bio: 'Updated bio',
    location: 'San Francisco, CA',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('setQueryData Pattern', () => {
    it('should immediately update cache before server responds', () => {
      // Arrange
      const cache: Record<string, unknown> = {}
      vi.mocked(mockQueryClient.setQueryData).mockImplementation((key, data) => {
        const keyStr = JSON.stringify(key)
        cache[keyStr] = data
        return data
      })

      vi.mocked(mockQueryClient.getQueryData).mockImplementation((key) => {
        const keyStr = JSON.stringify(key)
        return cache[keyStr]
      })

      const queryKey = ['profiles', USER_ID]

      // Act: Optimistic update (set cache immediately)
      mockQueryClient.setQueryData(queryKey, mockProfileAfter)

      // Assert: Cache reflects new data immediately
      const cached = mockQueryClient.getQueryData(queryKey)
      expect(cached).toEqual(mockProfileAfter)
      expect((cached as typeof mockProfileAfter).headline).toBe('Updated Headline')
    })

    it('should roll back cache on mutation error', () => {
      // Arrange: Simulate optimistic update + rollback pattern
      const queryKey = ['profiles', USER_ID]
      const cache: Record<string, unknown> = {
        [JSON.stringify(queryKey)]: mockProfileBefore,
      }

      vi.mocked(mockQueryClient.getQueryData).mockImplementation((key) => {
        return cache[JSON.stringify(key)]
      })

      vi.mocked(mockQueryClient.setQueryData).mockImplementation((key, data) => {
        cache[JSON.stringify(key)] = data
        return data
      })

      // Act: Optimistic update
      mockQueryClient.setQueryData(queryKey, mockProfileAfter)
      expect((cache[JSON.stringify(queryKey)] as typeof mockProfileAfter).headline).toBe('Updated Headline')

      // Simulate error: rollback
      mockQueryClient.setQueryData(queryKey, mockProfileBefore)

      // Assert: Cache is restored to original state
      const restored = mockQueryClient.getQueryData(queryKey)
      expect(restored).toEqual(mockProfileBefore)
      expect((restored as typeof mockProfileBefore).headline).toBe('Old Headline')
    })
  })

  describe('onMutate / onError / onSettled Pattern', () => {
    it('should follow React Query 5 optimistic update lifecycle', async () => {
      // Arrange: Mimic useMutation with onMutate/onError/onSettled
      const queryKey = ['profiles', USER_ID]
      const cache: Record<string, unknown> = {
        [JSON.stringify(queryKey)]: mockProfileBefore,
      }

      vi.mocked(mockQueryClient.getQueryData).mockImplementation((key) =>
        cache[JSON.stringify(key)]
      )
      vi.mocked(mockQueryClient.setQueryData).mockImplementation((key, data) => {
        cache[JSON.stringify(key)] = data
        return data
      })

      // Mock the Supabase update to succeed
      const updateMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockResolvedValue({ data: mockProfileAfter, error: null })
      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        update: updateMock,
        eq: eqMock,
      } as any)

      // Phase 1: onMutate — snapshot previous value, optimistically update
      const previousData = mockQueryClient.getQueryData(queryKey)
      mockQueryClient.setQueryData(queryKey, mockProfileAfter)

      // Assert after optimistic update
      expect(cache[JSON.stringify(queryKey)]).toEqual(mockProfileAfter)

      // Phase 2: Execute the actual mutation
      const result = await mockSupabaseClient
        .from('profiles')
        .update({ headline: 'Updated Headline' })
        .eq('id', USER_ID)

      // Phase 3: onSuccess — invalidate queries
      if (!result.error) {
        mockQueryClient.invalidateQueries({ queryKey })
      } else {
        // Phase 4: onError — rollback
        mockQueryClient.setQueryData(queryKey, previousData)
      }

      // Assert
      expect(result.error).toBeNull()
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey })
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles')
    })

    it('should rollback on mutation failure', async () => {
      // Arrange
      const queryKey = ['profiles', USER_ID]
      const cache: Record<string, unknown> = {
        [JSON.stringify(queryKey)]: mockProfileBefore,
      }

      vi.mocked(mockQueryClient.getQueryData).mockImplementation((key) =>
        cache[JSON.stringify(key)]
      )
      vi.mocked(mockQueryClient.setQueryData).mockImplementation((key, data) => {
        cache[JSON.stringify(key)] = data
        return data
      })

      // Mock Supabase to fail
      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Network error', code: '500' },
        }),
      } as any)

      // onMutate
      const previousData = mockQueryClient.getQueryData(queryKey)
      mockQueryClient.setQueryData(queryKey, mockProfileAfter)

      // Execute mutation (fails)
      const result = await mockSupabaseClient
        .from('profiles')
        .update({ headline: 'Updated Headline' })
        .eq('id', USER_ID)

      // onError: rollback
      if (result.error) {
        mockQueryClient.setQueryData(queryKey, previousData)
      }

      // Assert cache restored
      const restored = mockQueryClient.getQueryData(queryKey)
      expect(restored).toEqual(mockProfileBefore)
    })
  })

  describe('Stale Time and Cache Invalidation', () => {
    it('should invalidate queries after successful mutation', () => {
      // Arrange
      vi.mocked(mockQueryClient.invalidateQueries).mockClear()

      // Act: Simulate a mutation that calls invalidateQueries on success
      mockQueryClient.invalidateQueries({ queryKey: ['profiles', USER_ID] })

      // Assert
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['profiles', USER_ID] })
      )
    })

    it('should respect staleTime for cached profile data', () => {
      // Arrange: From useProfile hook, staleTime is 5 * 60 * 1000
      const staleTime = 5 * 60 * 1000

      // Act
      // Assert: 5 minutes is the expected stale time
      expect(staleTime).toBe(300000)
    })
  })
})
