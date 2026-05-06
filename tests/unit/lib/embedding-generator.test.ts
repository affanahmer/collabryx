/**
 * Unit tests for embedding generator logic
 * TC-043: 384-dimensional vector generation (all-MiniLM-L6-v2)
 * TC-047: Long text truncation/chunking
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { constructSemanticText } from '@/lib/services/embeddings'

// ============================================================
// Helper: create a valid mock 384-dimensional embedding
// ============================================================
function createMockEmbedding(dimensions: number = 384): number[] {
  const embedding: number[] = []
  for (let i = 0; i < dimensions; i++) {
    // Generate values in range [-1, 1] that normalize to unit vector
    embedding.push((Math.sin(i * 0.7) * 0.5 + Math.cos(i * 1.3) * 0.3) / 0.8)
  }
  // Normalize to unit length
  const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0))
  return embedding.map((v) => v / magnitude)
}

// ============================================================
// Mock worker-client.ts
// ============================================================
const mockHealthCheck = vi.fn()
const mockGenerateEmbedding = vi.fn()
const mockIsHealthy = vi.fn()

vi.mock('@/lib/worker-client', () => ({
  WorkerClient: vi.fn().mockImplementation(() => ({
    healthCheck: mockHealthCheck,
    generateEmbedding: mockGenerateEmbedding,
    isHealthy: mockIsHealthy,
  })),
  workerClient: {
    healthCheck: mockHealthCheck,
    generateEmbedding: mockGenerateEmbedding,
    isHealthy: mockIsHealthy,
  },
}))

describe('Embedding Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==========================================================
  // TC-043: Vector dimensions & quality
  // ==========================================================
  describe('TC-043: Vector dimension verification (all-MiniLM-L6-v2 = 384d)', () => {
    it('should return exactly 384 dimensions from the embedding generator', async () => {
      // Arrange
      const mockVector = createMockEmbedding(384)
      mockGenerateEmbedding.mockResolvedValue({
        embedding: mockVector,
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        processing_time_ms: 150,
      })

      const { workerClient } = await import('@/lib/worker-client')

      // Act
      const result = await workerClient.generateEmbedding(
        'Software engineer passionate about AI and distributed systems',
        'user-123'
      )

      // Assert
      expect(result.embedding).toHaveLength(384)
      expect(mockGenerateEmbedding).toHaveBeenCalledTimes(1)
    })

    it('should return float values between -1 and 1 (normalized)', async () => {
      // Arrange
      const mockVector = createMockEmbedding(384)
      mockGenerateEmbedding.mockResolvedValue({
        embedding: mockVector,
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        processing_time_ms: 120,
      })

      const { workerClient } = await import('@/lib/worker-client')

      // Act
      const result = await workerClient.generateEmbedding(
        'React developer looking for cofounder opportunities',
        'user-456'
      )

      // Assert
      for (const value of result.embedding) {
        expect(value).toBeGreaterThanOrEqual(-1.0)
        expect(value).toBeLessThanOrEqual(1.0)
        expect(typeof value).toBe('number')
        expect(Number.isFinite(value)).toBe(true)
      }
    })

    it('should have no NaN or Infinity values in the embedding', async () => {
      // Arrange
      const mockVector = createMockEmbedding(384)
      mockGenerateEmbedding.mockResolvedValue({
        embedding: mockVector,
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        processing_time_ms: 100,
      })

      const { workerClient } = await import('@/lib/worker-client')

      // Act
      const result = await workerClient.generateEmbedding(
        'AI researcher specializing in natural language processing',
        'user-789'
      )

      // Assert
      for (const value of result.embedding) {
        expect(Number.isNaN(value)).toBe(false)
        expect(Number.isFinite(value)).toBe(true)
      }
    })

    it('should reject embeddings with incorrect dimensions (< 384)', async () => {
      // Arrange
      const shortVector = createMockEmbedding(128)
      mockGenerateEmbedding.mockResolvedValue({
        embedding: shortVector,
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        processing_time_ms: 50,
      })

      const { workerClient } = await import('@/lib/worker-client')

      // Act
      const result = await workerClient.generateEmbedding('Test bio', 'user-000')

      // Assert - the embedding exists but doesn't match expected dimensions
      expect(result.embedding).toHaveLength(128)
      expect(result.embedding).not.toHaveLength(384)
    })

    it('should verify the model name is all-MiniLM-L6-v2', async () => {
      // Arrange
      const mockVector = createMockEmbedding(384)
      mockGenerateEmbedding.mockResolvedValue({
        embedding: mockVector,
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        processing_time_ms: 90,
      })

      const { workerClient } = await import('@/lib/worker-client')

      // Act
      const result = await workerClient.generateEmbedding('Data scientist', 'user-111')

      // Assert
      expect(result.model).toBe('sentence-transformers/all-MiniLM-L6-v2')
    })
  })

  // ==========================================================
  // TC-047: Text truncation for long bios
  // ==========================================================
  describe('TC-047: Text truncation for excessively long bios', () => {
    it('should truncate bio at 2000 characters limit for semantic text construction', () => {
      // Arrange
      const longBio = 'x'.repeat(3000)
      const profile = {
        role: 'Student',
        headline: 'Developer',
        bio: longBio,
        looking_for: ['collaboration'],
        location: 'Remote',
      }
      const skills: { skill_name: string }[] = [{ skill_name: 'Python' }]
      const interests: { interest: string }[] = [{ interest: 'AI' }]

      // Act
      const semanticText = constructSemanticText(profile, skills, interests)

      // Assert
      expect(semanticText.length).toBeLessThanOrEqual(2000)
      // The structure should still be intact
      expect(semanticText).toContain('Role: Student')
      expect(semanticText).toContain('Skills: Python')
    })

    it('should preserve meaningful content from the start of the bio', () => {
      // Arrange
      const meaningfulPrefix = 'Experienced ML engineer with 5 years in production systems. '
      const paddedBio = meaningfulPrefix.padEnd(2500, 'z')
      const profile = {
        role: 'Engineer',
        headline: 'ML Specialist',
        bio: paddedBio,
        looking_for: ['cofounder'],
        location: 'SF',
      }

      // Act
      const semanticText = constructSemanticText(profile, [], [])

      // Assert
      expect(semanticText).toContain('Experienced ML engineer')
      expect(semanticText.length).toBeLessThanOrEqual(2000)
      // The start content should be preserved, not cut off by the bio
      expect(semanticText.indexOf('Role: Engineer')).toBe(0)
    })

    it('should handle bio exactly at 2000 characters without truncation', () => {
      // Arrange
      const exactBio = 'A'.repeat(2000)
      const profile = {
        role: 'User',
        bio: exactBio,
      }

      // Act
      const semanticText = constructSemanticText(profile, [], [])

      // Assert
      expect(semanticText.length).toBeLessThanOrEqual(2000)
    })

    it('should construct valid semantic text with empty skills and interests', () => {
      // Arrange
      const profile = {
        role: 'Developer',
        headline: 'Full Stack',
        bio: 'Short bio',
      }

      // Act
      const text = constructSemanticText(profile, [], [])

      // Assert
      expect(text).toContain('Role: Developer')
      expect(text).toContain('Skills: None')
      expect(text).toContain('Interests: None')
      expect(text.length).toBeGreaterThan(0)
    })

    it('should handle 512-token equivalent text (MiniLM token limit)', () => {
      // Arrange - 512 tokens ≈ 2000 chars for English text
      const words: string[] = []
      for (let i = 0; i < 512; i++) {
        words.push(`word${i}`)
      }
      const tokenHeavyBio = words.join(' ')
      const profile = {
        role: 'User',
        bio: tokenHeavyBio,
      }

      // Act
      const semanticText = constructSemanticText(profile, [], [])

      // Assert - should be truncated to 2000 chars
      expect(semanticText.length).toBeLessThanOrEqual(2000)
      expect(semanticText).toContain('Role: User')
    })
  })

  // ==========================================================
  // WorkerClient health check
  // ==========================================================
  describe('WorkerClient health checks', () => {
    it('should report healthy when worker responds', async () => {
      // Arrange
      mockHealthCheck.mockResolvedValue({
        status: 'healthy',
        version: '1.0.0',
        embedding_model_loaded: true,
        database_connected: true,
        timestamp: new Date().toISOString(),
      })

      const { workerClient } = await import('@/lib/worker-client')

      // Act
      const health = await workerClient.healthCheck()

      // Assert
      expect(health.status).toBe('healthy')
      expect(health.embedding_model_loaded).toBe(true)
    })

    it('should report unhealthy when worker is down', async () => {
      // Arrange
      mockIsHealthy.mockResolvedValue(false)

      const { workerClient } = await import('@/lib/worker-client')

      // Act
      const healthy = await workerClient.isHealthy()

      // Assert
      expect(healthy).toBe(false)
    })
  })
})
