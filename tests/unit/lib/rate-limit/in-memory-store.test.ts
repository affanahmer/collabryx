import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { InMemoryRateLimitStore } from '@/lib/rate-limit/in-memory-store'

describe('InMemoryRateLimitStore', () => {
  let store: InMemoryRateLimitStore

  beforeEach(() => {
    vi.useFakeTimers()
    store = new InMemoryRateLimitStore()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('incr', () => {
    it('should return count of 1 on first call', async () => {
      const result = await store.incr('test-key', 60000)
      
      expect(result.count).toBe(1)
      expect(result.resetAt).toBeDefined()
    })

    it('should increment count on subsequent calls', async () => {
      await store.incr('test-key', 60000)
      const result = await store.incr('test-key', 60000)
      
      expect(result.count).toBe(2)
    })

    it('should reset after TTL expires', async () => {
      await store.incr('test-key', 50)
      vi.advanceTimersByTime(60)
      const result = await store.incr('test-key', 50)
      
      expect(result.count).toBe(1)
    })

    it('should handle different keys independently', async () => {
      await store.incr('key1', 60000)
      const result = await store.incr('key2', 60000)
      
      expect(result.count).toBe(1)
    })
  })
})