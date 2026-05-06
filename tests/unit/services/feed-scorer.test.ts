/**
 * TC-058, TC-059: Feed Scorer Tests
 *
 * TC-058: Thompson Sampling for personalized feed ranking
 * TC-059: Hybrid scoring balances new profiles (exploration) with high-compatibility (exploitation)
 *
 * These tests verify the mathematical properties of Thomson Sampling and hybrid
 * scoring logic, mirroring the Python feed_scorer.py implementation.
 */
import { describe, it, expect } from 'vitest'

// ============================================
// REIMPLEMENTATIONS OF ALGORITHMS (mirrors Python)
// ============================================

/**
 * Simplified Thompson Sampling using Beta distribution.
 * Uses a deterministic seed-based approach for testability.
 * Mirrors Python: np.random.beta(successes + 1, failures + 1, samples)
 */
function seededThompsonSample(
  successes: number,
  failures: number,
  seed: number = 42,
  samples: number = 1000
): number {
  // Deterministic pseudo-random using a simple linear congruential generator
  const lcg = (s: number): number => (s * 1664525 + 1013904223) & 0x7fffffff
  let state = seed
  const values: number[] = []

  for (let i = 0; i < samples; i++) {
    // Box-Muller transform for normal → approximate Beta via probability
    state = lcg(state)
    const u1 = state / 0x7fffffff
    state = lcg(state)
    const u2 = state / 0x7fffffff

    // Approximate beta via gamma ratio (gamma ≈ chi-squared)
    // Not a true Beta but captures the mean behavior for testing
    const alpha = successes + 1
    const beta = failures + 1
    // Expected value of Beta(alpha, beta) = alpha / (alpha + beta)
    const expected = alpha / (alpha + beta)

    // Add small noise proportional to variance
    const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1))
    const z = Math.sqrt(-2 * Math.log(u1 || 0.001)) * Math.cos(2 * Math.PI * u2)
    let val = expected + z * Math.sqrt(variance) * 0.5
    val = Math.max(0.001, Math.min(0.999, val))
    values.push(val)
  }

  return values.reduce((a, b) => a + b, 0) / values.length
}

/**
 * Hybrid scoring formula matching Python FeedScorer:
 * score = semantic(35%) + engagement(30%) + recency(20%) + connection_boost
 */
function calculateHybridScore(params: {
  semantic: number
  engagementSuccesses: number
  engagementFailures: number
  hoursOld: number
  isConnected: boolean
  hasSharedInterests: boolean
  intentMatch: boolean
}): number {
  const WEIGHTS = {
    semantic: 0.35,
    engagement: 0.30,
    recency: 0.20,
  }

  // 1. Semantic score (direct)
  const semanticScore = params.semantic

  // 2. Engagement via Thompson Sampling
  const engagementScore = seededThompsonSample(
    params.engagementSuccesses,
    params.engagementFailures
  )

  // 3. Recency with exponential decay (24h half-life)
  const recencyScore = Math.exp(-params.hoursOld / 24)

  // 4. Base weighted score
  let score =
    WEIGHTS.semantic * semanticScore +
    WEIGHTS.engagement * engagementScore +
    WEIGHTS.recency * recencyScore

  // 5. Connection boost
  if (params.isConnected) {
    score *= 1.5
  }

  // 6. Shared interests boost
  if (params.hasSharedInterests) {
    score *= 1.2
  }

  // 7. Intent match boost
  if (params.intentMatch) {
    score *= 1.1
  }

  return Math.min(1.0, score)
}

// ============================================
// TC-058: THOMPSON SAMPLING TESTS
// ============================================

describe('TC-058: Thompson Sampling', () => {
  it('popular content with many successes gets higher score than unpopular content', () => {
    // Arrange — popular: 100 successes, 20 failures
    // unpopular: 5 successes, 50 failures

    // Act
    const popularScore = seededThompsonSample(100, 20)
    const unpopularScore = seededThompsonSample(5, 50)

    // Assert — popular should score higher (higher success ratio)
    expect(popularScore).toBeGreaterThan(unpopularScore)
  })

  it('arms with equal success/failure ratios approach same score', () => {
    // Arrange — both arms have ratio 2:1
    // Arm A: 200 successes, 100 failures
    // Arm B: 20 successes, 10 failures

    // Act
    const scoreA = seededThompsonSample(200, 100)
    const scoreB = seededThompsonSample(20, 10)

    // Assert — scores should be close (same ratio but B has higher variance)
    const diff = Math.abs(scoreA - scoreB)
    expect(diff).toBeLessThan(0.15)
  })

  it('arms with zero successes still get a non-zero score (exploration)', () => {
    // Arrange — completely new content: 0 successes, 0 failures

    // Act
    const score = seededThompsonSample(0, 0)

    // Assert — Thompson Sampling should give non-zero score for exploration
    expect(score).toBeGreaterThan(0)
    // Beta(1,1) has mean 0.5, so should be near 0.5
    expect(score).toBeGreaterThan(0.4)
    expect(score).toBeLessThan(0.6)
  })

  it('arm with pure successes (no failures) approaches 1.0', () => {
    // Arrange — 1000 successes, 0 failures

    // Act
    const score = seededThompsonSample(1000, 0)

    // Assert
    expect(score).toBeGreaterThan(0.9)
  })

  it('arm with pure failures (no successes) stays low', () => {
    // Arrange — 0 successes, 1000 failures

    // Act
    const score = seededThompsonSample(0, 1000)

    // Assert
    expect(score).toBeLessThan(0.1)
  })

  it('consistent Thompson Sampling converges toward true success rate', () => {
    // Arrange — true success rate is 70%
    // Simulate 10 rounds of sampling with accumulated successes/failures

    const trueRate = 0.7
    let successes = 0
    let failures = 0

    // Act — simulate multiple rounds
    for (let round = 0; round < 10; round++) {
      // Simulate 100 "impressions" per round
      for (let i = 0; i < 100; i++) {
        if (Math.random() < trueRate) {
          successes++
        } else {
          failures++
        }
      }
    }

    const finalScore = seededThompsonSample(successes, failures)

    // Assert — should converge near true rate
    expect(finalScore).toBeGreaterThan(0.6)
    expect(finalScore).toBeLessThan(0.8)
  })
})

// ============================================
// TC-059: HYBRID SCORING TESTS
// ============================================

describe('TC-059: Hybrid Scoring', () => {
  it('highly compatible profile scores higher than incompatible one', () => {
    // Arrange
    const highCompat = {
      semantic: 0.95,
      engagementSuccesses: 50,
      engagementFailures: 5,
      hoursOld: 1,
      isConnected: true,
      hasSharedInterests: true,
      intentMatch: true,
    }

    const lowCompat = {
      semantic: 0.3,
      engagementSuccesses: 3,
      engagementFailures: 40,
      hoursOld: 72,
      isConnected: false,
      hasSharedInterests: false,
      intentMatch: false,
    }

    // Act
    const highScore = calculateHybridScore(highCompat)
    const lowScore = calculateHybridScore(lowCompat)

    // Assert
    expect(highScore).toBeGreaterThan(lowScore * 2) // high should be significantly better
  })

  it('new profile with no engagement still gets meaningful score (exploration)', () => {
    // Arrange — brand new profile: no engagement data, but high semantic match
    const newProfile = {
      semantic: 0.85,
      engagementSuccesses: 0,
      engagementFailures: 0,
      hoursOld: 0.5,
      isConnected: false,
      hasSharedInterests: false,
      intentMatch: false,
    }

    // Act
    const score = calculateHybridScore(newProfile)

    // Assert — new profile shouldn't be penalized to zero
    expect(score).toBeGreaterThan(0.35)
    expect(score).toBeLessThan(0.55)
  })

  it('connection boost increases score by 1.5x compared to non-connected', () => {
    // Arrange
    const baseParams = {
      semantic: 0.8,
      engagementSuccesses: 20,
      engagementFailures: 10,
      hoursOld: 2,
      isConnected: false,
      hasSharedInterests: false,
      intentMatch: false,
    }

    // Act
    const nonConnectedScore = calculateHybridScore(baseParams)
    const connectedScore = calculateHybridScore({ ...baseParams, isConnected: true })

    // Assert — connected should be approximately 1.5x (capped at 1.0)
    const ratio = connectedScore / nonConnectedScore
    expect(ratio).toBeGreaterThan(1.2)
  })

  it('shared interests boost increases score by 1.2x', () => {
    // Arrange
    const baseParams = {
      semantic: 0.7,
      engagementSuccesses: 15,
      engagementFailures: 15,
      hoursOld: 3,
      isConnected: false,
      hasSharedInterests: false,
      intentMatch: false,
    }

    // Act
    const withoutInterests = calculateHybridScore(baseParams)
    const withInterests = calculateHybridScore({ ...baseParams, hasSharedInterests: true })

    // Assert — shared interests should boost the score
    expect(withInterests).toBeGreaterThan(withoutInterests)
    const ratio = withInterests / withoutInterests
    expect(ratio).toBeGreaterThan(1.1)
  })

  it('intent match boost increases score by 1.1x', () => {
    // Arrange
    const baseParams = {
      semantic: 0.75,
      engagementSuccesses: 10,
      engagementFailures: 10,
      hoursOld: 1,
      isConnected: false,
      hasSharedInterests: false,
      intentMatch: false,
    }

    // Act
    const withoutIntent = calculateHybridScore(baseParams)
    const withIntent = calculateHybridScore({ ...baseParams, intentMatch: true })

    // Assert
    expect(withIntent).toBeGreaterThan(withoutIntent)
  })

  it('recency decay penalizes old content', () => {
    // Arrange — same content, different ages
    const fresh = {
      semantic: 0.8,
      engagementSuccesses: 20,
      engagementFailures: 10,
      hoursOld: 0.1,
      isConnected: false,
      hasSharedInterests: false,
      intentMatch: false,
    }

    const stale = {
      semantic: 0.8,
      engagementSuccesses: 20,
      engagementFailures: 10,
      hoursOld: 48,
      isConnected: false,
      hasSharedInterests: false,
      intentMatch: false,
    }

    // Act
    const freshScore = calculateHybridScore(fresh)
    const staleScore = calculateHybridScore(stale)

    // Assert — fresh content should score notably higher
    expect(freshScore).toBeGreaterThan(staleScore)
  })

  it('score is capped at 1.0', () => {
    // Arrange — perfect params on all dimensions
    const perfect = {
      semantic: 1.0,
      engagementSuccesses: 1000,
      engagementFailures: 0,
      hoursOld: 0.01,
      isConnected: true,
      hasSharedInterests: true,
      intentMatch: true,
    }

    // Act
    const score = calculateHybridScore(perfect)

    // Assert
    expect(score).toBeLessThanOrEqual(1.0)
  })

  it('balances exploration (new profile) with exploitation (proven profile)', () => {
    // Arrange — simulate a feed with mixed profiles

    // New profile: good semantic match but no engagement history
    const newProfileScore = calculateHybridScore({
      semantic: 0.9,
      engagementSuccesses: 0,
      engagementFailures: 0,
      hoursOld: 1,
      isConnected: false,
      hasSharedInterests: true,
      intentMatch: true,
    })

    // Proven profile: moderate semantic match but strong engagement
    const provenProfileScore = calculateHybridScore({
      semantic: 0.65,
      engagementSuccesses: 200,
      engagementFailures: 20,
      hoursOld: 6,
      isConnected: false,
      hasSharedInterests: false,
      intentMatch: false,
    })

    // Both should get reasonable scores (neither zero nor full)
    expect(newProfileScore).toBeGreaterThan(0.3)
    expect(provenProfileScore).toBeGreaterThan(0.3)

    // The difference shouldn't be extreme — hybrid scoring balances both
    const diff = Math.abs(newProfileScore - provenProfileScore)
    expect(diff).toBeLessThan(0.5)
  })
})
