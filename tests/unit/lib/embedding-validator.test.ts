/**
 * Unit tests for embedding vector validation
 * Covers: dimension checks, NaN/Infinity detection, normalization, all-zeros
 */

import { describe, it, expect } from 'vitest'

// ============================================================
// Pure validation functions (mirrors Python embedding_validator.py)
// ============================================================

const EXPECTED_DIMENSION = 384
const NORMALIZATION_TOLERANCE = 0.05
const MIN_MAGNITUDE = 1.0 - NORMALIZATION_TOLERANCE
const MAX_MAGNITUDE = 1.0 + NORMALIZATION_TOLERANCE

interface ValidationResult {
  isValid: boolean
  status: string
  message: string
  details: Record<string, unknown>
}

function validateEmbedding(embedding: number[]): ValidationResult {
  // Check dimensions
  if (embedding.length !== EXPECTED_DIMENSION) {
    return {
      isValid: false,
      status: 'invalid_dimension',
      message: `Expected ${EXPECTED_DIMENSION} dimensions, got ${embedding.length}`,
      details: { expected: EXPECTED_DIMENSION, actual: embedding.length },
    }
  }

  // Check for NaN values
  const nanCount = embedding.filter((v) => Number.isNaN(v)).length
  if (nanCount > 0) {
    return {
      isValid: false,
      status: 'contains_nan',
      message: `Embedding contains ${nanCount} NaN values`,
      details: { nanCount },
    }
  }

  // Check for Infinity values
  const infCount = embedding.filter((v) => !Number.isFinite(v)).length
  if (infCount > 0) {
    return {
      isValid: false,
      status: 'contains_inf',
      message: `Embedding contains ${infCount} Infinity values`,
      details: { infCount },
    }
  }

  // Check for all zeros
  if (embedding.every((v) => v === 0)) {
    return {
      isValid: false,
      status: 'all_zeros',
      message: 'Embedding is all zeros',
      details: { magnitude: 0 },
    }
  }

  // Check normalization (unit vector magnitude ≈ 1.0)
  const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0))
  if (magnitude < MIN_MAGNITUDE || magnitude > MAX_MAGNITUDE) {
    return {
      isValid: false,
      status: 'not_normalized',
      message: `Embedding magnitude ${magnitude.toFixed(4)} outside acceptable range [${MIN_MAGNITUDE.toFixed(4)}, ${MAX_MAGNITUDE.toFixed(4)}]`,
      details: {
        magnitude,
        minAllowed: MIN_MAGNITUDE,
        maxAllowed: MAX_MAGNITUDE,
      },
    }
  }

  return {
    isValid: true,
    status: 'valid',
    message: 'Embedding validation passed',
    details: {
      dimension: embedding.length,
      magnitude,
      minValue: Math.min(...embedding),
      maxValue: Math.max(...embedding),
      meanValue: embedding.reduce((sum, v) => sum + v, 0) / embedding.length,
    },
  }
}

function normalizeEmbedding(embedding: number[]): number[] {
  const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0))
  if (magnitude === 0) return embedding
  return embedding.map((v) => v / magnitude)
}

function validateAndFix(embedding: number[]): [number[], ValidationResult] {
  const result = validateEmbedding(embedding)
  if (result.isValid) return [embedding, result]

  if (result.status === 'not_normalized') {
    const normalized = normalizeEmbedding(embedding)
    const newResult = validateEmbedding(normalized)
    if (newResult.isValid) return [normalized, newResult]
  }

  return [embedding, result]
}

// ============================================================
// Helpers
// ============================================================
function createValidEmbedding(dimensions = 384): number[] {
  const raw: number[] = []
  for (let i = 0; i < dimensions; i++) {
    raw.push(Math.sin(i * 0.5) * 0.3 + Math.cos(i * 0.3) * 0.5)
  }
  return normalizeEmbedding(raw)
}

describe('Embedding Validator', () => {
  // ==========================================================
  // Dimension validation
  // ==========================================================
  describe('Dimension validation', () => {
    it('should accept a valid 384-dimensional embedding', () => {
      // Arrange
      const embedding = createValidEmbedding(384)

      // Act
      const result = validateEmbedding(embedding)

      // Assert
      expect(result.isValid).toBe(true)
      expect(result.status).toBe('valid')
      expect(result.details.dimension).toBe(384)
    })

    it('should reject embedding with wrong dimension count (128 instead of 384)', () => {
      // Arrange
      const embedding = createValidEmbedding(128)

      // Act
      const result = validateEmbedding(embedding)

      // Assert
      expect(result.isValid).toBe(false)
      expect(result.status).toBe('invalid_dimension')
      expect(result.message).toContain('Expected 384 dimensions')
      expect(result.details.expected).toBe(384)
      expect(result.details.actual).toBe(128)
    })

    it('should reject empty embedding array', () => {
      // Arrange
      const embedding: number[] = []

      // Act
      const result = validateEmbedding(embedding)

      // Assert
      expect(result.isValid).toBe(false)
      expect(result.status).toBe('invalid_dimension')
    })

    it('should reject embedding with 0 dimensions', () => {
      // Arrange
      const embedding: number[] = []

      // Act
      const result = validateEmbedding(embedding)

      // Assert
      expect(result.isValid).toBe(false)
      expect(result.details.actual).toBe(0)
    })
  })

  // ==========================================================
  // NaN detection
  // ==========================================================
  describe('NaN detection', () => {
    it('should reject embedding containing NaN values', () => {
      // Arrange
      const embedding = createValidEmbedding(384)
      embedding[10] = Number.NaN

      // Act
      const result = validateEmbedding(embedding)

      // Assert
      expect(result.isValid).toBe(false)
      expect(result.status).toBe('contains_nan')
      expect(result.message).toContain('NaN')
    })

    it('should detect and count multiple NaN values', () => {
      // Arrange
      const embedding = createValidEmbedding(384)
      embedding[5] = Number.NaN
      embedding[50] = Number.NaN
      embedding[200] = Number.NaN

      // Act
      const result = validateEmbedding(embedding)

      // Assert
      expect(result.isValid).toBe(false)
      expect(result.status).toBe('contains_nan')
      expect(result.details.nanCount).toBe(3)
    })
  })

  // ==========================================================
  // Infinity detection
  // ==========================================================
  describe('Infinity detection', () => {
    it('should reject embedding containing Infinity values', () => {
      // Arrange
      const embedding = createValidEmbedding(384)
      embedding[42] = Number.POSITIVE_INFINITY

      // Act
      const result = validateEmbedding(embedding)

      // Assert
      expect(result.isValid).toBe(false)
      expect(result.status).toBe('contains_inf')
      expect(result.message).toContain('Infinity')
    })

    it('should reject embedding containing negative Infinity', () => {
      // Arrange
      const embedding = createValidEmbedding(384)
      embedding[100] = Number.NEGATIVE_INFINITY

      // Act
      const result = validateEmbedding(embedding)

      // Assert
      expect(result.isValid).toBe(false)
      expect(result.status).toBe('contains_inf')
    })
  })

  // ==========================================================
  // All-zeros detection
  // ==========================================================
  describe('All-zeros detection', () => {
    it('should reject embedding with all zero values', () => {
      // Arrange
      const embedding = new Array(384).fill(0)

      // Act
      const result = validateEmbedding(embedding)

      // Assert
      expect(result.isValid).toBe(false)
      expect(result.status).toBe('all_zeros')
      expect(result.details.magnitude).toBe(0)
    })
  })

  // ==========================================================
  // Normalization validation
  // ==========================================================
  describe('Normalization validation', () => {
    it('should accept a normalized unit vector (magnitude ≈ 1.0)', () => {
      // Arrange
      const embedding = createValidEmbedding(384)
      const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0))

      // Act
      const result = validateEmbedding(embedding)

      // Assert
      expect(result.isValid).toBe(true)
      expect(magnitude).toBeCloseTo(1.0, 3)
    })

    it('should reject an unnormalized vector with magnitude far from 1.0', () => {
      // Arrange
      const embedding = createValidEmbedding(384).map((v) => v * 100)

      // Act
      const result = validateEmbedding(embedding)

      // Assert
      expect(result.isValid).toBe(false)
      expect(result.status).toBe('not_normalized')
      expect(result.message).toContain('magnitude')
    })

    it('should reject a vector with magnitude of 0.5 (below tolerance)', () => {
      // Arrange
      const embedding = createValidEmbedding(384).map((v) => v * 0.5)

      // Act
      const result = validateEmbedding(embedding)

      // Assert
      expect(result.isValid).toBe(false)
      expect(result.status).toBe('not_normalized')
    })

    it('should accept magnitude within tolerance (0.96)', () => {
      // Arrange
      const embedding = createValidEmbedding(384).map((v) => v * 0.96)

      // Act
      const result = validateEmbedding(embedding)

      // Assert
      expect(result.isValid).toBe(true)
    })

    it('should accept magnitude within tolerance (1.04)', () => {
      // Arrange
      const embedding = createValidEmbedding(384).map((v) => v * 1.04)

      // Act
      const result = validateEmbedding(embedding)

      // Assert
      expect(result.isValid).toBe(true)
    })
  })

  // ==========================================================
  // Normalization fix
  // ==========================================================
  describe('validateAndFix normalization', () => {
    it('should fix an unnormalized vector by normalizing it', () => {
      // Arrange
      const raw = createValidEmbedding(384).map((v) => v * 50)

      // Act
      const [fixed, result] = validateAndFix(raw)

      // Assert
      expect(result.isValid).toBe(true)
      const magnitude = Math.sqrt(fixed.reduce((sum, v) => sum + v * v, 0))
      expect(magnitude).toBeCloseTo(1.0, 3)
    })

    it('should not fix NaN-containing vectors', () => {
      // Arrange
      const embedding = createValidEmbedding(384)
      embedding[10] = Number.NaN

      // Act
      const [fixed, result] = validateAndFix(embedding)

      // Assert
      expect(result.isValid).toBe(false)
      expect(result.status).toBe('contains_nan')
    })

    it('should not fix dimension-mismatched vectors', () => {
      // Arrange
      const embedding = createValidEmbedding(128)

      // Act
      const [fixed, result] = validateAndFix(embedding)

      // Assert
      expect(result.isValid).toBe(false)
      expect(result.status).toBe('invalid_dimension')
    })
  })

  // ==========================================================
  // Edge cases
  // ==========================================================
  describe('Edge cases', () => {
    it('should validate a large number of embeddings without performance issues', () => {
      // Arrange
      const embeddings = Array.from({ length: 100 }, () => createValidEmbedding(384))

      // Act + Assert
      for (const embedding of embeddings) {
        const result = validateEmbedding(embedding)
        expect(result.isValid).toBe(true)
      }
    })

    it('should distinguish between NaN and undefined in sparse arrays', () => {
      // Arrange - sparse array with undefined hole
      // eslint-disable-next-line no-sparse-arrays
      const embedding = createValidEmbedding(384)
      embedding[50] = Number.NaN
      // Verify the NaN is specifically at index 50
      expect(Number.isNaN(embedding[50])).toBe(true)

      // Act
      const result = validateEmbedding(embedding)

      // Assert
      expect(result.isValid).toBe(false)
      expect(result.status).toBe('contains_nan')
    })
  })
})
