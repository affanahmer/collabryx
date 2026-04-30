import { describe, it, expect } from 'vitest'
import { successResponse, errorResponse } from '@/lib/utils/api-response'

describe('ApiResponse', () => {
  describe('successResponse', () => {
    it('should create success response', async () => {
      const result = successResponse({ id: '123', name: 'Test' })
      const json = await result.json()
      expect(json.success).toBe(true)
      expect(json.data).toEqual({ id: '123', name: 'Test' })
    })

    it('should preserve data types correctly', async () => {
      const result = successResponse({ count: 42, active: true, items: ['a', 'b'] })
      const json = await result.json()
      expect(json.success).toBe(true)
      expect(json.data.count).toBe(42)
      expect(json.data.active).toBe(true)
      expect(json.data.items).toEqual(['a', 'b'])
    })
  })

  describe('errorResponse', () => {
    it('should create error response', async () => {
      const result = errorResponse('NOT_FOUND', 'Not found', 404)
      expect(result.status).toBe(404)
      const json = await result.json()
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('NOT_FOUND')
      expect(json.error.message).toBe('Not found')
    })

    it('should allow optional details', async () => {
      const result = errorResponse('VALIDATION', 'Validation failed', 400, { field: 'email' })
      expect(result.status).toBe(400)
      const json = await result.json()
      expect(json.success).toBe(false)
      expect(json.error.details).toEqual({ field: 'email' })
    })

    it('should handle error without code', async () => {
      const result = errorResponse('INTERNAL_ERROR', 'Something went wrong', 500)
      expect(result.status).toBe(500)
      const json = await result.json()
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('INTERNAL_ERROR')
      expect(json.error.message).toBe('Something went wrong')
    })

    it('should allow null details', async () => {
      const result = errorResponse('ERROR', 'Error', 400, null)
      expect(result.status).toBe(400)
      const json = await result.json()
      expect(json.success).toBe(false)
      expect(json.error.details).toBeNull()
    })
  })
})
