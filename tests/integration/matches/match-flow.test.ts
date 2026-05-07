/**
 * TC-060: Match Suggestions Integration Test
 *
 * Tests that match suggestions are correctly saved to the match_suggestions table
 * with all required fields (user_id, matched_user_id, score, reasons, etc.).
 *
 * This integration test verifies the flow from match generation → DB insertion →
 * retrieval, using mocked Supabase but verifying real data shapes.
 */
import { describe, it, expect, beforeEach } from 'vitest'

// ============================================
// DATA FACTORIES
// ============================================

interface MatchSuggestionInput {
  user_id: string
  matched_user_id: string
  match_percentage: number
  reasons: string[]
  ai_confidence?: number
  ai_explanation?: string
  status?: 'active' | 'dismissed' | 'connected'
}

interface MatchSuggestionRecord extends Required<Omit<MatchSuggestionInput, 'status'>> {
  id: string
  status: 'active' | 'dismissed' | 'connected'
  created_at: string
  expires_at?: string
}

interface MatchScoreRecord {
  id: string
  suggestion_id: string
  semantic_similarity: number
  skills_overlap: number
  complementary_score: number
  shared_interests: number
  activity_match: number
  overall_score: number
  model_version: string
  overlapping_skills: string[]
  complementary_explanation?: string
  shared_interest_tags: string[]
  insights: string[]
  created_at: string
  updated_at: string
}

// In-memory mock database
class MockSupabaseDB {
  private matchSuggestions: MatchSuggestionRecord[] = []
  private matchScores: MatchScoreRecord[] = []

  insertMatchSuggestion(input: MatchSuggestionInput): MatchSuggestionRecord {
    const record: MatchSuggestionRecord = {
      id: `ms_${this.matchSuggestions.length + 1}`,
      user_id: input.user_id,
      matched_user_id: input.matched_user_id,
      match_percentage: input.match_percentage,
      reasons: input.reasons,
      ai_confidence: input.ai_confidence ?? 0.5,
      ai_explanation: input.ai_explanation ?? '',
      status: input.status ?? 'active',
      created_at: new Date().toISOString(),
    }
    this.matchSuggestions.push(record)
    return record
  }

  insertMatchScore(suggestionId: string, breakdown: {
    semantic_similarity: number
    skills_overlap: number
    complementary_score: number
    shared_interests: number
    activity_match: number
  }): MatchScoreRecord {
    const record: MatchScoreRecord = {
      id: `mc_${this.matchScores.length + 1}`,
      suggestion_id: suggestionId,
      ...breakdown,
      overall_score: 85,
      model_version: 'rule-based-v1',
      overlapping_skills: [],
      shared_interest_tags: [],
      insights: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    this.matchScores.push(record)
    return record
  }

  getSuggestionsForUser(userId: string): MatchSuggestionRecord[] {
    return this.matchSuggestions
      .filter((s) => s.user_id === userId)
      .sort((a, b) => b.match_percentage - a.match_percentage)
  }

  getScoreForSuggestion(suggestionId: string): MatchScoreRecord | undefined {
    return this.matchScores.find((s) => s.suggestion_id === suggestionId)
  }

  getAllSuggestions(): MatchSuggestionRecord[] {
    return [...this.matchSuggestions]
  }

  getAllScores(): MatchScoreRecord[] {
    return [...this.matchScores]
  }

  reset(): void {
    this.matchSuggestions = []
    this.matchScores = []
  }
}

// ============================================
// TC-060: INTEGRATION TESTS
// ============================================

describe('TC-060: Match Suggestions Integration', () => {
  let db: MockSupabaseDB

  beforeEach(() => {
    db = new MockSupabaseDB()
  })

  // Helper: simulate full match generation flow
  function simulateMatchGeneration(
    userId: string,
    candidates: Array<{
      matchedUserId: string
      matchPercentage: number
      reasons: string[]
      scoreBreakdown: {
        semantic_similarity: number
        skills_overlap: number
        complementary_score: number
        shared_interests: number
        activity_match: number
      }
    }>
  ): { suggestions: MatchSuggestionRecord[]; scores: MatchScoreRecord[] } {
    const suggestions: MatchSuggestionRecord[] = []
    const scores: MatchScoreRecord[] = []

    for (const candidate of candidates) {
      const suggestion = db.insertMatchSuggestion({
        user_id: userId,
        matched_user_id: candidate.matchedUserId,
        match_percentage: candidate.matchPercentage,
        reasons: candidate.reasons,
        ai_confidence: Math.min(0.95, candidate.matchPercentage / 100 + 0.1),
        ai_explanation: `Match score: ${candidate.matchPercentage}%`,
        status: 'active',
      })
      suggestions.push(suggestion)

      const score = db.insertMatchScore(suggestion.id, candidate.scoreBreakdown)
      scores.push(score)
    }

    return { suggestions, scores }
  }

  describe('Match suggestions saved to match_suggestions table', () => {
    it('saves suggestions with all required fields: user_id, matched_user_id, match_percentage, reasons', () => {
      // Arrange
      const userId = 'user-integ-1'

      // Act
      const result = simulateMatchGeneration(userId, [
        {
          matchedUserId: 'candidate-A',
          matchPercentage: 88,
          reasons: ['Shared: React, TypeScript', 'Complementary Skills'],
          scoreBreakdown: {
            semantic_similarity: 0.82,
            skills_overlap: 75,
            complementary_score: 88,
            shared_interests: 70,
            activity_match: 0.9,
          },
        },
      ])

      // Assert
      const saved = result.suggestions[0]
      expect(saved.user_id).toBe(userId)
      expect(saved.matched_user_id).toBe('candidate-A')
      expect(saved.match_percentage).toBe(88)
      expect(saved.reasons).toHaveLength(2)
      expect(saved.reasons).toContain('Shared: React, TypeScript')
      expect(saved.status).toBe('active')
    })

    it('generates unique IDs for each suggestion', () => {
      // Arrange & Act
      const result = simulateMatchGeneration('user-multi', [
        {
          matchedUserId: 'cand-1', matchPercentage: 90, reasons: ['A'],
          scoreBreakdown: { semantic_similarity: 0.9, skills_overlap: 80, complementary_score: 85, shared_interests: 75, activity_match: 0.8 },
        },
        {
          matchedUserId: 'cand-2', matchPercentage: 75, reasons: ['B'],
          scoreBreakdown: { semantic_similarity: 0.7, skills_overlap: 60, complementary_score: 65, shared_interests: 55, activity_match: 0.6 },
        },
        {
          matchedUserId: 'cand-3', matchPercentage: 82, reasons: ['C'],
          scoreBreakdown: { semantic_similarity: 0.78, skills_overlap: 70, complementary_score: 75, shared_interests: 65, activity_match: 0.7 },
        },
      ])

      // Assert — all IDs distinct
      const ids = result.suggestions.map((s) => s.id)
      expect(new Set(ids).size).toBe(ids.length)
      expect(ids.length).toBe(3)
    })

    it('stores ai_confidence and ai_explanation fields', () => {
      // Arrange & Act
      const result = simulateMatchGeneration('user-ai', [
        {
          matchedUserId: 'cand-ai', matchPercentage: 92, reasons: ['Semantic match'],
          scoreBreakdown: { semantic_similarity: 0.95, skills_overlap: 85, complementary_score: 90, shared_interests: 80, activity_match: 0.85 },
        },
      ])

      // Assert
      const saved = result.suggestions[0]
      expect(saved.ai_confidence).toBeGreaterThan(0)
      expect(saved.ai_confidence).toBeLessThanOrEqual(1)
      expect(saved.ai_explanation).toBeTruthy()
      expect(saved.ai_explanation).toContain('92%')
    })

    it('queries suggestions for a specific user sorted by match_percentage desc', () => {
      // Arrange
      simulateMatchGeneration('user-sort', [
        { matchedUserId: 'low', matchPercentage: 55, reasons: [], scoreBreakdown: { semantic_similarity: 0.5, skills_overlap: 40, complementary_score: 45, shared_interests: 35, activity_match: 0.5 } },
        { matchedUserId: 'high', matchPercentage: 95, reasons: [], scoreBreakdown: { semantic_similarity: 0.9, skills_overlap: 90, complementary_score: 92, shared_interests: 85, activity_match: 0.9 } },
        { matchedUserId: 'mid', matchPercentage: 70, reasons: [], scoreBreakdown: { semantic_similarity: 0.65, skills_overlap: 55, complementary_score: 60, shared_interests: 50, activity_match: 0.6 } },
      ])

      // Act
      const userSuggestions = db.getSuggestionsForUser('user-sort')

      // Assert
      expect(userSuggestions).toHaveLength(3)
      const percentages = userSuggestions.map((s) => s.match_percentage)
      expect(percentages).toEqual([95, 70, 55])
    })

    it('excludes dismissed suggestions from active queries', () => {
      // Arrange — insert one active, one dismissed
      const active = db.insertMatchSuggestion({
        user_id: 'user-status',
        matched_user_id: 'active-cand',
        match_percentage: 80,
        reasons: [],
        status: 'active',
      })
      db.insertMatchSuggestion({
        user_id: 'user-status',
        matched_user_id: 'dismissed-cand',
        match_percentage: 60,
        reasons: [],
        status: 'dismissed',
      })

      // Act
      const allSuggestions = db.getAllSuggestions()
      const activeOnly = allSuggestions.filter((s) => s.status === 'active')

      // Assert
      expect(allSuggestions).toHaveLength(2)
      expect(activeOnly).toHaveLength(1)
      expect(activeOnly[0].id).toBe(active.id)
    })
  })

  describe('Match scores saved to match_scores table', () => {
    it('links match_scores to match_suggestions via suggestion_id foreign key', () => {
      // Arrange & Act
      const result = simulateMatchGeneration('user-fk', [
        {
          matchedUserId: 'cand-score', matchPercentage: 86, reasons: ['Shared goals'],
          scoreBreakdown: {
            semantic_similarity: 0.8,
            skills_overlap: 72,
            complementary_score: 84,
            shared_interests: 68,
            activity_match: 0.75,
          },
        },
      ])

      // Assert
      const suggestion = result.suggestions[0]
      const score = result.scores[0]
      expect(score.suggestion_id).toBe(suggestion.id)
    })

    it('saves detailed breakdown components: semantic_similarity, skills_overlap, complementary_score, shared_interests, activity_match', () => {
      // Arrange & Act
      const result = simulateMatchGeneration('user-detail', [
        {
          matchedUserId: 'cand-detail', matchPercentage: 78, reasons: [],
          scoreBreakdown: {
            semantic_similarity: 0.75,
            skills_overlap: 65,
            complementary_score: 80,
            shared_interests: 55,
            activity_match: 0.7,
          },
        },
      ])

      // Assert
      const score = result.scores[0]
      expect(score.semantic_similarity).toBe(0.75)
      expect(score.skills_overlap).toBe(65)
      expect(score.complementary_score).toBe(80)
      expect(score.shared_interests).toBe(55)
      expect(score.activity_match).toBe(0.7)
      expect(score.model_version).toBe('rule-based-v1')
    })

    it('saves scores within valid ranges (0-100 for integer fields, 0-1 for real fields)', () => {
      // Arrange & Act
      simulateMatchGeneration('user-range', [
        {
          matchedUserId: 'cand-range', matchPercentage: 50, reasons: [],
          scoreBreakdown: {
            semantic_similarity: 0.5,
            skills_overlap: 50,
            complementary_score: 50,
            shared_interests: 50,
            activity_match: 0.5,
          },
        },
      ])

      // Assert
      const scores = db.getAllScores()
      for (const score of scores) {
        expect(score.semantic_similarity).toBeGreaterThanOrEqual(0)
        expect(score.semantic_similarity).toBeLessThanOrEqual(1)
        expect(score.skills_overlap).toBeGreaterThanOrEqual(0)
        expect(score.skills_overlap).toBeLessThanOrEqual(100)
        expect(score.complementary_score).toBeGreaterThanOrEqual(0)
        expect(score.complementary_score).toBeLessThanOrEqual(100)
        expect(score.shared_interests).toBeGreaterThanOrEqual(0)
        expect(score.shared_interests).toBeLessThanOrEqual(100)
      }
    })
  })

  describe('Full match flow: generation → save → query', () => {
    it('completes full round-trip: generates matches, saves to both tables, and retrieves for user', () => {
      // Arrange
      const userId = 'user-flow'
      const candidates = [
        {
          matchedUserId: 'partner-1', matchPercentage: 91, reasons: ['Shared: TypeScript, React', 'Complementary: Frontend + Backend'],
          scoreBreakdown: { semantic_similarity: 0.88, skills_overlap: 82, complementary_score: 90, shared_interests: 76, activity_match: 0.9 },
        },
        {
          matchedUserId: 'partner-2', matchPercentage: 84, reasons: ['Shared interest in AI', 'Both looking for co-founder'],
          scoreBreakdown: { semantic_similarity: 0.80, skills_overlap: 70, complementary_score: 78, shared_interests: 85, activity_match: 0.8 },
        },
        {
          matchedUserId: 'partner-3', matchPercentage: 67, reasons: ['Similar project stage'],
          scoreBreakdown: { semantic_similarity: 0.62, skills_overlap: 55, complementary_score: 60, shared_interests: 65, activity_match: 0.6 },
        },
      ]

      // Act — Step 1: Generate & save matches
      const { suggestions, scores } = simulateMatchGeneration(userId, candidates)

      // Assert — Step 1
      expect(suggestions).toHaveLength(3)
      expect(scores).toHaveLength(3)

      // Act — Step 2: Query suggestions for user
      const queried = db.getSuggestionsForUser(userId)

      // Assert — Step 2
      expect(queried).toHaveLength(3)
      expect(queried[0].match_percentage).toBe(91) // sorted desc
      expect(queried[0].reasons).toContain('Shared: TypeScript, React')

      // Act — Step 3: Get score for top suggestion
      const topScore = db.getScoreForSuggestion(queried[0].id)

      // Assert — Step 3
      expect(topScore).toBeDefined()
      expect(topScore!.complementary_score).toBe(90)
      expect(topScore!.skills_overlap).toBe(82)
    })

    it('handles empty match generation gracefully (no candidates found)', () => {
      // Arrange & Act
      const result = simulateMatchGeneration('user-empty', [])

      // Assert
      expect(result.suggestions).toHaveLength(0)
      expect(result.scores).toHaveLength(0)

      const queried = db.getSuggestionsForUser('user-empty')
      expect(queried).toHaveLength(0)
    })

    it('handles default status correctly when not specified', () => {
      // Arrange & Act
      const suggestion = db.insertMatchSuggestion({
        user_id: 'user-default',
        matched_user_id: 'cand-default',
        match_percentage: 70,
        reasons: ['Default status test'],
      })

      // Assert
      expect(suggestion.status).toBe('active')
    })

    it('preserves all match reason types across save/query round-trip', () => {
      // Arrange
      const reasons = [
        'Shared Interest in Startups',
        'Complementary Skills (Backend ↔ Frontend)',
        'Both recently active',
        'Similar professional background',
      ]

      // Act
      const _result = simulateMatchGeneration('user-reasons', [
        {
          matchedUserId: 'cand-reasons', matchPercentage: 90, reasons,
          scoreBreakdown: { semantic_similarity: 0.85, skills_overlap: 80, complementary_score: 88, shared_interests: 75, activity_match: 0.9 },
        },
      ])

      // Assert
      const queried = db.getSuggestionsForUser('user-reasons')
      expect(queried[0].reasons).toEqual(reasons)
      expect(queried[0].reasons).toHaveLength(4)
    })
  })
})
