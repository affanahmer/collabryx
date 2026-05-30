/**
 * Match Generator Service Tests
 *
 * Tests for lib/services/match-generator.ts:
 * - cosineSimilarity: Vector math verification
 * - calculateMatchScore: Weighted scoring algorithm
 * - generateMatchesForUser: End-to-end match generation with Supabase
 * - generateBatchMatches: Batch processing with error isolation
 *
 * Pure functions (cosineSimilarity, calculateMatchScore) are tested directly.
 * Async functions mock @supabase/supabase-js to avoid real database calls.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  cosineSimilarity,
  calculateMatchScore,
  generateMatchesForUser,
  generateBatchMatches,
} from "@/lib/services/match-generator";

// ============================================
// MOCK INFRASTRUCTURE (top-level for vi.mock hoisting)
// ============================================

// We use a single shared mock object that gets reset in beforeEach.
// The mock client is both chainable AND thenable (Promise-like).
// For chains ending in .single(), use mockSingle.mockResolvedValueOnce().
// For chains awaited directly (no .single()), use mockResult.mockResolvedValueOnce().

const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
const mockResult = vi.fn().mockResolvedValue({ data: [], error: null });
const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null });

function createMockClient() {
  // Reset defaults after any prior resetAllMocks
  mockSingle.mockResolvedValue({ data: null, error: null });
  mockResult.mockResolvedValue({ data: [], error: null });
  mockUpsert.mockResolvedValue({ data: null, error: null });

  // Each call to createMockClient creates a fresh chainable/thenable object
  const client = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    not: vi.fn(),
    or: vi.fn(),
    in: vi.fn(),
    single: mockSingle,
    upsert: mockUpsert,
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  // All chainable methods return the same client
  client.from.mockReturnValue(client);
  client.select.mockReturnValue(client);
  client.eq.mockReturnValue(client);
  client.not.mockReturnValue(client);
  client.or.mockReturnValue(client);
  client.in.mockReturnValue(client);

  // Make the client thenable — resolves with queued mockResult values
  Object.defineProperty(client, "then", {
    value: (
      resolve: (value: unknown) => void,
      reject: (reason?: unknown) => void,
    ) => mockResult().then(resolve, reject),
  });

  return client;
}

let currentClient: ReturnType<typeof createMockClient>;
let createClientCallCount = 0;
let createClientThrowOnCall: number | null = null;
let createClientErrorMessage = "";

// Top-level vi.mock — hoisted before imports
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => {
    createClientCallCount++;
    if (createClientThrowOnCall !== null && createClientCallCount === createClientThrowOnCall) {
      const msg = createClientErrorMessage || "Simulated error";
      createClientThrowOnCall = null;
      throw new Error(msg);
    }
    return currentClient;
  },
}));

// ============================================
// COSINE SIMILARITY TESTS
// ============================================

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    // Arrange
    const a = [1, 0, 0];
    const b = [1, 0, 0];

    // Act
    const result = cosineSimilarity(a, b);

    // Assert
    expect(result).toBe(1);
  });

  it("returns 0 for orthogonal vectors", () => {
    // Arrange
    const a = [1, 0, 0];
    const b = [0, 1, 0];

    // Act
    const result = cosineSimilarity(a, b);

    // Assert
    expect(result).toBe(0);
  });

  it("returns -1 for opposite vectors", () => {
    // Arrange
    const a = [1, 0, 0];
    const b = [-1, 0, 0];

    // Act
    const result = cosineSimilarity(a, b);

    // Assert
    expect(result).toBe(-1);
  });

  it("handles zero vectors by returning 0", () => {
    // Arrange
    const a = [0, 0, 0];
    const b = [1, 2, 3];

    // Act
    const result = cosineSimilarity(a, b);

    // Assert
    expect(result).toBe(0);
  });

  it("handles both zero vectors by returning 0", () => {
    // Arrange
    const a = [0, 0, 0];
    const b = [0, 0, 0];

    // Act
    const result = cosineSimilarity(a, b);

    // Assert
    expect(result).toBe(0);
  });

  it("handles different length vectors by truncating to min length", () => {
    // Arrange
    const a = [1, 0, 0, 999];
    const b = [1, 0, 0];

    // Act
    const result = cosineSimilarity(a, b);

    // Assert
    expect(result).toBe(1);
  });

  it("handles empty arrays by returning 0", () => {
    // Arrange
    const a: number[] = [];
    const b: number[] = [];

    // Act
    const result = cosineSimilarity(a, b);

    // Assert
    expect(result).toBe(0);
  });

  it("handles one empty and one non-empty array by returning 0", () => {
    // Arrange
    const a: number[] = [];
    const b = [1, 2, 3];

    // Act
    const result = cosineSimilarity(a, b);

    // Assert
    expect(result).toBe(0);
  });

  it("returns value between -1 and 1 for arbitrary vectors", () => {
    // Arrange
    const a = [3, 4, 5, -2, 1];
    const b = [1, -1, 2, 7, 3];

    // Act
    const result = cosineSimilarity(a, b);

    // Assert
    expect(result).toBeGreaterThanOrEqual(-1);
    expect(result).toBeLessThanOrEqual(1);
  });

  it("returns correct value for partially similar vectors", () => {
    // Arrange
    const a = [1, 1, 0];
    const b = [1, 0, 1];
    // dot = 1, magA = sqrt(2), magB = sqrt(2), result = 1/2 = 0.5

    // Act
    const result = cosineSimilarity(a, b);

    // Assert
    expect(result).toBeCloseTo(0.5, 5);
  });

  it("is symmetric: cosineSimilarity(a, b) === cosineSimilarity(b, a)", () => {
    // Arrange
    const a = [1, 2, 3, 4, 5];
    const b = [5, 4, 3, 2, 1];

    // Act
    const resultAB = cosineSimilarity(a, b);
    const resultBA = cosineSimilarity(b, a);

    // Assert
    expect(resultAB).toBe(resultBA);
  });
});

// ============================================
// CALCULATE MATCH SCORE TESTS
// ============================================

describe("calculateMatchScore", () => {
  const defaultEmbedding = [0.5, 0.3, 0.2, 0.1];

  it("returns all breakdown fields", () => {
    // Arrange
    const userSkills = ["React", "TypeScript"];
    const matchedSkills = ["React", "Node.js"];
    const userInterests = ["AI", "Startups"];
    const matchedInterests = ["AI", "Design"];

    // Act
    const result = calculateMatchScore(
      defaultEmbedding,
      defaultEmbedding,
      userSkills,
      matchedSkills,
      userInterests,
      matchedInterests,
      "open",
      "open",
    );

    // Assert
    expect(result).toHaveProperty("semanticSimilarity");
    expect(result).toHaveProperty("skillsOverlap");
    expect(result).toHaveProperty("complementaryScore");
    expect(result).toHaveProperty("sharedInterests");
    expect(result).toHaveProperty("activityMatch");
    expect(result).toHaveProperty("overallScore");
  });

  it("returns 100% semantic similarity for identical embeddings", () => {
    // Arrange
    const embedding = [0.5, 0.3, 0.2];

    // Act
    const result = calculateMatchScore(
      embedding,
      embedding,
      [],
      [],
      [],
      [],
      "",
      "",
    );

    // Assert
    expect(result.semanticSimilarity).toBe(1);
  });

  it("returns 0% semantic similarity for orthogonal embeddings", () => {
    // Arrange
    const a = [1, 0, 0];
    const b = [0, 1, 0];

    // Act
    const result = calculateMatchScore(a, b, [], [], [], [], "", "");

    // Assert
    expect(result.semanticSimilarity).toBe(0);
  });

  it("clamps negative cosine similarity to 0", () => {
    // Arrange
    const a = [1, 0, 0];
    const b = [-1, 0, 0];

    // Act
    const result = calculateMatchScore(a, b, [], [], [], [], "", "");

    // Assert
    expect(result.semanticSimilarity).toBe(0);
  });

  it("calculates skills overlap using Jaccard similarity", () => {
    // Arrange
    // Intersection: {React} = 1, Union: {React, TypeScript, Node.js} = 3
    // Jaccard = 1/3 ≈ 33%
    const userSkills = ["React", "TypeScript"];
    const matchedSkills = ["React", "Node.js"];

    // Act
    const result = calculateMatchScore(
      defaultEmbedding,
      defaultEmbedding,
      userSkills,
      matchedSkills,
      [],
      [],
      "",
      "",
    );

    // Assert
    expect(result.skillsOverlap).toBe(33);
  });

  it("returns 0 skills overlap when no skills match", () => {
    // Arrange
    const userSkills = ["React", "TypeScript"];
    const matchedSkills = ["Python", "Go"];

    // Act
    const result = calculateMatchScore(
      defaultEmbedding,
      defaultEmbedding,
      userSkills,
      matchedSkills,
      [],
      [],
      "",
      "",
    );

    // Assert
    expect(result.skillsOverlap).toBe(0);
  });

  it("returns 100 skills overlap when skills are identical", () => {
    // Arrange
    const skills = ["React", "TypeScript", "Node.js"];

    // Act
    const result = calculateMatchScore(
      defaultEmbedding,
      defaultEmbedding,
      skills,
      skills,
      [],
      [],
      "",
      "",
    );

    // Assert
    expect(result.skillsOverlap).toBe(100);
  });

  it("returns 0 skills overlap when both have empty skills", () => {
    // Arrange & Act
    const result = calculateMatchScore(
      defaultEmbedding,
      defaultEmbedding,
      [],
      [],
      [],
      [],
      "",
      "",
    );

    // Assert
    expect(result.skillsOverlap).toBe(0);
  });

  it("calculates complementary score as inverse of Jaccard similarity", () => {
    // Arrange
    // Jaccard = 1/3, complementary = (1 - 1/3) * 100 = 67
    const userSkills = ["React", "TypeScript"];
    const matchedSkills = ["React", "Node.js"];

    // Act
    const result = calculateMatchScore(
      defaultEmbedding,
      defaultEmbedding,
      userSkills,
      matchedSkills,
      [],
      [],
      "",
      "",
    );

    // Assert
    expect(result.complementaryScore).toBe(67);
  });

  it("returns 100 complementary score when skills are completely different", () => {
    // Arrange
    const userSkills = ["React", "TypeScript"];
    const matchedSkills = ["Python", "Go"];

    // Act
    const result = calculateMatchScore(
      defaultEmbedding,
      defaultEmbedding,
      userSkills,
      matchedSkills,
      [],
      [],
      "",
      "",
    );

    // Assert
    expect(result.complementaryScore).toBe(100);
  });

  it("calculates shared interests using Jaccard similarity", () => {
    // Arrange
    // Intersection: {AI} = 1, Union: {AI, Startups, Design} = 3
    const userInterests = ["AI", "Startups"];
    const matchedInterests = ["AI", "Design"];

    // Act
    const result = calculateMatchScore(
      defaultEmbedding,
      defaultEmbedding,
      [],
      [],
      userInterests,
      matchedInterests,
      "",
      "",
    );

    // Assert
    expect(result.sharedInterests).toBe(33);
  });

  it("returns activityMatch 1 when collaboration readiness matches", () => {
    // Arrange & Act
    const result = calculateMatchScore(
      defaultEmbedding,
      defaultEmbedding,
      [],
      [],
      [],
      [],
      "open",
      "open",
    );

    // Assert
    expect(result.activityMatch).toBe(1);
  });

  it("returns activityMatch 0 when collaboration readiness differs", () => {
    // Arrange & Act
    const result = calculateMatchScore(
      defaultEmbedding,
      defaultEmbedding,
      [],
      [],
      [],
      [],
      "open",
      "available",
    );

    // Assert
    expect(result.activityMatch).toBe(0);
  });

  it("returns activityMatch 1 when both are empty strings", () => {
    // Arrange & Act
    const result = calculateMatchScore(
      defaultEmbedding,
      defaultEmbedding,
      [],
      [],
      [],
      [],
      "",
      "",
    );

    // Assert
    expect(result.activityMatch).toBe(1);
  });

  it("calculates correct weighted overall score", () => {
    // Arrange
    // semantic = 1.0 → 100 * 0.4 = 40
    // skillsOverlap = 33 * 0.2 = 6.6
    // complementary = 67 * 0.15 = 10.05
    // sharedInterests = 33 * 0.15 = 4.95
    // activityMatch = 1 → 100 * 0.1 = 10
    // Total = 40 + 6.6 + 10.05 + 4.95 + 10 = 71.6 → rounded to 72
    const embedding = [1, 0, 0];
    const skillsA = ["A", "B"];
    const skillsB = ["A", "C"]; // Jaccard = 1/3 ≈ 33, complementary = 67
    const interestsA = ["X", "Y"];
    const interestsB = ["X", "Z"]; // Jaccard = 1/3 ≈ 33

    // Act
    const result = calculateMatchScore(
      embedding,
      embedding,
      skillsA,
      skillsB,
      interestsA,
      interestsB,
      "open",
      "open",
    );

    // Assert
    expect(result.overallScore).toBe(72);
  });

  it("clamps overall score to 0-100 range", () => {
    // Arrange & Act — with perfect scores, overall should not exceed 100
    const result = calculateMatchScore(
      [1, 0, 0],
      [1, 0, 0],
      ["A"],
      ["A"],
      ["X"],
      ["X"],
      "open",
      "open",
    );

    // Assert
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
  });

  it("handles case-insensitive skill comparison", () => {
    // Arrange
    const userSkills = ["react", "TypeScript"];
    const matchedSkills = ["REACT", "typescript"];

    // Act
    const result = calculateMatchScore(
      defaultEmbedding,
      defaultEmbedding,
      userSkills,
      matchedSkills,
      [],
      [],
      "",
      "",
    );

    // Assert
    expect(result.skillsOverlap).toBe(100);
  });

  it("handles case-insensitive interest comparison", () => {
    // Arrange
    const userInterests = ["AI", "startups"];
    const matchedInterests = ["ai", "STARTUPS"];

    // Act
    const result = calculateMatchScore(
      defaultEmbedding,
      defaultEmbedding,
      [],
      [],
      userInterests,
      matchedInterests,
      "",
      "",
    );

    // Assert
    expect(result.sharedInterests).toBe(100);
  });
});

// ============================================
// GENERATE MATCHES FOR USER TESTS
// ============================================

describe("generateMatchesForUser", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    createClientCallCount = 0;
    createClientThrowOnCall = null;
    createClientErrorMessage = "";
    currentClient = createMockClient();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  });

  afterEach(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  });

  it("returns empty array when user has no embedding", async () => {
    // Arrange
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "No rows" },
    });

    // Act
    const result = await generateMatchesForUser("user-1");

    // Assert
    expect(result).toEqual([]);
  });

  it("returns empty array when embedding has no embedding array data", async () => {
    // Arrange
    mockSingle.mockResolvedValueOnce({
      data: { user_id: "user-1", embedding: null, status: "completed" },
      error: null,
    });

    // Act
    const result = await generateMatchesForUser("user-1");

    // Assert
    expect(result).toEqual([]);
  });

  it("returns empty array when no candidates exist", async () => {
    // Arrange
    mockSingle.mockResolvedValueOnce({
      data: { user_id: "user-1", embedding: [0.5, 0.3, 0.2], status: "completed" },
      error: null,
    });
    // User skills (direct await)
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    // User interests (direct await)
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    // User profile
    mockSingle.mockResolvedValueOnce({
      data: { id: "user-1", collaboration_readiness: "open" },
      error: null,
    });
    // Match preferences
    mockSingle.mockResolvedValueOnce({
      data: { min_match_percentage: null },
      error: null,
    });
    // Blocked users (direct await)
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    // Candidates query (direct await) — returns empty
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    // Batch skills (still called even with empty candidateIds)
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    // Batch interests
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    // Batch profiles
    mockResult.mockResolvedValueOnce({ data: [], error: null });

    // Act
    const result = await generateMatchesForUser("user-1");

    // Assert
    expect(result).toEqual([]);
  });

  it("returns matches sorted by percentage descending", async () => {
    // Arrange
    // Call order for generateMatchesForUser (NEW batch flow):
    // 1. User embedding (.single)
    // 2. User skills (direct await in Promise.all)
    // 3. User interests (direct await in Promise.all)
    // 4. User profile (.single in Promise.all)
    // 5. Match preferences (.single in Promise.all)
    // 6. Blocked users (direct await)
    // 7. Candidates via .not() (direct await)
    // 8. Batch skills via .in() (direct await)
    // 9. Batch interests via .in() (direct await)
    // 10. Batch profiles via .in() (direct await)
    // 11. Upsert match_suggestions (direct await)
    // 12. persistMatchScores: check existing user-2 (.single)
    // 13. persistMatchScores: upsert score user-2 (direct)
    // 14. persistMatchScores: check existing user-3 (.single)
    // 15. persistMatchScores: upsert score user-3 (direct)

    // .single() calls: 1, 4, 5, 12, 14
    mockSingle.mockResolvedValueOnce({
      data: { user_id: "user-1", embedding: [1, 0, 0], status: "completed" },
      error: null,
    });
    mockSingle.mockResolvedValueOnce({
      data: { id: "user-1", collaboration_readiness: "open" },
      error: null,
    });
    mockSingle.mockResolvedValueOnce({
      data: { min_match_percentage: null },
      error: null,
    });
    mockSingle.mockResolvedValueOnce({ data: null, error: null });
    mockSingle.mockResolvedValueOnce({ data: null, error: null });

    // Direct await calls: 2, 3, 6, 7, 8, 9, 10, 11, 13, 15
    mockResult.mockResolvedValueOnce({ data: [], error: null }); // 2: user skills
    mockResult.mockResolvedValueOnce({ data: [], error: null }); // 3: user interests
    mockResult.mockResolvedValueOnce({ data: [], error: null }); // 6: blocked users
    mockResult.mockResolvedValueOnce({ data: [], error: null }); // 6b: blocked connections
    mockResult.mockResolvedValueOnce({
      data: [
        { user_id: "user-2", embedding: [1, 0, 0], status: "completed" },
        { user_id: "user-3", embedding: [0.5, 0.5, 0], status: "completed" },
      ],
      error: null,
    }); // 7: candidates
    // Batch calls replace per-candidate queries
    mockResult.mockResolvedValueOnce({ data: [], error: null }); // 8: batch skills
    mockResult.mockResolvedValueOnce({ data: [], error: null }); // 9: batch interests
    mockResult.mockResolvedValueOnce({
      data: [
        { id: "user-2", collaboration_readiness: "open" },
        { id: "user-3", collaboration_readiness: "open" },
      ],
      error: null,
    }); // 10: batch profiles
    mockResult.mockResolvedValueOnce({ data: null, error: null }); // 11: upsert suggestions
    mockResult.mockResolvedValueOnce({ data: null, error: null }); // 13: upsert score user-2
    mockResult.mockResolvedValueOnce({ data: null, error: null }); // 15: upsert score user-3

    // Act
    const result = await generateMatchesForUser("user-1");

    // Assert
    expect(result.length).toBeGreaterThan(0);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].matchPercentage).toBeGreaterThanOrEqual(
        result[i].matchPercentage,
      );
    }
  });

  it("respects minScore filter by excluding low-scoring matches", async () => {
    // Arrange
    mockSingle.mockResolvedValueOnce({
      data: { user_id: "user-1", embedding: [1, 0, 0], status: "completed" },
      error: null,
    });
    // User skills / interests (direct await)
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    mockSingle.mockResolvedValueOnce({
      data: { id: "user-1", collaboration_readiness: "open" },
      error: null,
    });
    mockSingle.mockResolvedValueOnce({
      data: { min_match_percentage: 90 },
      error: null,
    });
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    // Candidate with lower similarity (orthogonal → 0% score)
    mockResult.mockResolvedValueOnce({
      data: [
        { user_id: "user-2", embedding: [0, 1, 0], status: "completed" },
      ],
      error: null,
    });
    // Batch calls (skills, interests, profiles)
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    mockResult.mockResolvedValueOnce({
      data: [{ id: "user-2", collaboration_readiness: "open" }],
      error: null,
    });

    // Act
    const result = await generateMatchesForUser("user-1", { minScore: 90 });

    // Assert
    expect(result).toEqual([]);
  });

  it("respects limit parameter by returning only top N matches", async () => {
    // Arrange
    mockSingle.mockResolvedValueOnce({
      data: { user_id: "user-1", embedding: [1, 0, 0], status: "completed" },
      error: null,
    });
    // User skills / interests (direct await)
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    mockSingle.mockResolvedValueOnce({
      data: { id: "user-1", collaboration_readiness: "open" },
      error: null,
    });
    mockSingle.mockResolvedValueOnce({
      data: { min_match_percentage: null },
      error: null,
    });
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    // 3 candidates
    mockResult.mockResolvedValueOnce({
      data: [
        { user_id: "user-2", embedding: [1, 0, 0], status: "completed" },
        { user_id: "user-3", embedding: [1, 0, 0], status: "completed" },
        { user_id: "user-4", embedding: [1, 0, 0], status: "completed" },
      ],
      error: null,
    });
    // Batch calls replace per-candidate queries
    mockResult.mockResolvedValueOnce({ data: [], error: null }); // batch skills
    mockResult.mockResolvedValueOnce({ data: [], error: null }); // batch interests
    mockResult.mockResolvedValueOnce({
      data: [
        { id: "user-2", collaboration_readiness: "open" },
        { id: "user-3", collaboration_readiness: "open" },
        { id: "user-4", collaboration_readiness: "open" },
      ],
      error: null,
    }); // batch profiles
    // Upsert
    mockResult.mockResolvedValueOnce({ data: null, error: null });
    // persistMatchScores checks (only top 2 of 3 candidates)
    mockSingle.mockResolvedValueOnce({ data: null, error: null });
    mockResult.mockResolvedValueOnce({ data: null, error: null });
    mockSingle.mockResolvedValueOnce({ data: null, error: null });
    mockResult.mockResolvedValueOnce({ data: null, error: null });

    // Act
    const result = await generateMatchesForUser("user-1", { limit: 2 });

    // Assert
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it("excludes specified userIds from candidates", async () => {
    // Arrange
    mockSingle.mockResolvedValueOnce({
      data: { user_id: "user-1", embedding: [1, 0, 0], status: "completed" },
      error: null,
    });
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    mockSingle.mockResolvedValueOnce({
      data: { id: "user-1", collaboration_readiness: "open" },
      error: null,
    });
    mockSingle.mockResolvedValueOnce({
      data: { min_match_percentage: null },
      error: null,
    });
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    mockResult.mockResolvedValueOnce({
      data: [
        { user_id: "user-3", embedding: [1, 0, 0], status: "completed" },
      ],
      error: null,
    });
    // Batch calls
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    mockResult.mockResolvedValueOnce({
      data: [{ id: "user-3", collaboration_readiness: "open" }],
      error: null,
    });
    mockResult.mockResolvedValueOnce({ data: null, error: null });
    mockSingle.mockResolvedValueOnce({ data: null, error: null });
    mockResult.mockResolvedValueOnce({ data: null, error: null });

    // Act
    const result = await generateMatchesForUser("user-1", {
      excludeUserIds: ["user-2"],
    });

    // Assert
    const matchedIds = result.map((r) => r.matchedUserId);
    expect(matchedIds).not.toContain("user-1");
    expect(matchedIds).not.toContain("user-2");
  });

  it("excludes blocked users from candidates", async () => {
    // Arrange
    mockSingle.mockResolvedValueOnce({
      data: { user_id: "user-1", embedding: [1, 0, 0], status: "completed" },
      error: null,
    });
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    mockSingle.mockResolvedValueOnce({
      data: { id: "user-1", collaboration_readiness: "open" },
      error: null,
    });
    mockSingle.mockResolvedValueOnce({
      data: { min_match_percentage: null },
      error: null,
    });
    // Blocked users: user-1 blocked user-2
    mockResult.mockResolvedValueOnce({
      data: [{ blocker_id: "user-1", blocked_id: "user-2" }],
      error: null,
    });
    mockResult.mockResolvedValueOnce({
      data: [
        { user_id: "user-3", embedding: [1, 0, 0], status: "completed" },
      ],
      error: null,
    });
    // Batch calls
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    mockResult.mockResolvedValueOnce({
      data: [{ id: "user-3", collaboration_readiness: "open" }],
      error: null,
    });
    mockResult.mockResolvedValueOnce({ data: null, error: null });
    mockSingle.mockResolvedValueOnce({ data: null, error: null });
    mockResult.mockResolvedValueOnce({ data: null, error: null });

    // Act
    const result = await generateMatchesForUser("user-1");

    // Assert
    const matchedIds = result.map((r) => r.matchedUserId);
    expect(matchedIds).not.toContain("user-2");
  });

  it("writes to match_suggestions table when matches are found", async () => {
    // Arrange
    // .single() calls: embedding, profile, prefs, check existing
    mockSingle.mockResolvedValueOnce({
      data: { user_id: "user-1", embedding: [1, 0, 0], status: "completed" },
      error: null,
    });
    mockSingle.mockResolvedValueOnce({
      data: { id: "user-1", collaboration_readiness: "open" },
      error: null,
    });
    mockSingle.mockResolvedValueOnce({
      data: { min_match_percentage: null },
      error: null,
    });
    mockSingle.mockResolvedValueOnce({ data: null, error: null });

    // Direct await calls: skills, interests, blocked, blocked connections, candidates, batch skills, batch interests, batch profiles, upsert, upsert score
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    mockResult.mockResolvedValueOnce({ data: [], error: null }); // blocked connections
    mockResult.mockResolvedValueOnce({
      data: [
        { user_id: "user-2", embedding: [1, 0, 0], status: "completed" },
      ],
      error: null,
    });
    // Batch calls replace per-candidate queries
    mockResult.mockResolvedValueOnce({ data: [], error: null }); // batch skills
    mockResult.mockResolvedValueOnce({ data: [], error: null }); // batch interests
    mockResult.mockResolvedValueOnce({
      data: [{ id: "user-2", collaboration_readiness: "open" }],
      error: null,
    }); // batch profiles
    mockResult.mockResolvedValueOnce({ data: null, error: null }); // upsert
    mockResult.mockResolvedValueOnce({ data: null, error: null }); // upsert score

    // Act
    await generateMatchesForUser("user-1");

    // Assert
    const upsertCalls = mockUpsert.mock.calls;
    const matchSuggestionsCall = upsertCalls.find(
      (call: unknown[]) =>
        Array.isArray(call[0]) &&
        call[0].length > 0 &&
        "user_id" in call[0][0],
    );
    expect(matchSuggestionsCall).toBeDefined();
  });

  it("handles Supabase errors gracefully by returning empty array", async () => {
    // Arrange
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: "500", message: "Internal server error" },
    });

    // Act
    const result = await generateMatchesForUser("user-1");

    // Assert
    expect(result).toEqual([]);
  });

  it("handles candidate fetch errors gracefully", async () => {
    // Arrange
    mockSingle.mockResolvedValueOnce({
      data: { user_id: "user-1", embedding: [1, 0, 0], status: "completed" },
      error: null,
    });
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    mockSingle.mockResolvedValueOnce({
      data: { id: "user-1", collaboration_readiness: "open" },
      error: null,
    });
    mockSingle.mockResolvedValueOnce({
      data: { min_match_percentage: null },
      error: null,
    });
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    // Candidate fetch error
    mockResult.mockResolvedValueOnce({
      data: null,
      error: { code: "500", message: "Database error" },
    });

    // Act
    const result = await generateMatchesForUser("user-1");

    // Assert
    expect(result).toEqual([]);
  });

  it("skips candidates without embeddings", async () => {
    // Arrange
    mockSingle.mockResolvedValueOnce({
      data: { user_id: "user-1", embedding: [1, 0, 0], status: "completed" },
      error: null,
    });
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    mockSingle.mockResolvedValueOnce({
      data: { id: "user-1", collaboration_readiness: "open" },
      error: null,
    });
    mockSingle.mockResolvedValueOnce({
      data: { min_match_percentage: null },
      error: null,
    });
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    // Candidate without embedding
    mockResult.mockResolvedValueOnce({
      data: [
        { user_id: "user-2", embedding: null, status: "completed" },
      ],
      error: null,
    });
    // Batch calls (still executed with empty candidateIds after filtering)
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    mockResult.mockResolvedValueOnce({ data: [], error: null });

    // Act
    const result = await generateMatchesForUser("user-1");

    // Assert
    expect(result).toEqual([]);
  });

  it("includes scoreBreakdown in each match suggestion", async () => {
    // Arrange
    // .single() calls: embedding, profile, prefs, check existing
    mockSingle.mockResolvedValueOnce({
      data: { user_id: "user-1", embedding: [1, 0, 0], status: "completed" },
      error: null,
    });
    mockSingle.mockResolvedValueOnce({
      data: { id: "user-1", collaboration_readiness: "open" },
      error: null,
    });
    mockSingle.mockResolvedValueOnce({
      data: { min_match_percentage: null },
      error: null,
    });
    mockSingle.mockResolvedValueOnce({ data: null, error: null });

    // Direct await calls: skills, interests, blocked, blocked connections, candidates, batch skills, batch interests, batch profiles, upsert, upsert score
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    mockResult.mockResolvedValueOnce({ data: [], error: null }); // blocked connections
    mockResult.mockResolvedValueOnce({
      data: [
        { user_id: "user-2", embedding: [1, 0, 0], status: "completed" },
      ],
      error: null,
    });
    // Batch calls replace per-candidate queries
    mockResult.mockResolvedValueOnce({ data: [], error: null }); // batch skills
    mockResult.mockResolvedValueOnce({ data: [], error: null }); // batch interests
    mockResult.mockResolvedValueOnce({
      data: [{ id: "user-2", collaboration_readiness: "open" }],
      error: null,
    }); // batch profiles
    mockResult.mockResolvedValueOnce({ data: null, error: null }); // upsert
    mockResult.mockResolvedValueOnce({ data: null, error: null }); // upsert score

    // Act
    const result = await generateMatchesForUser("user-1");

    // Assert
    expect(result.length).toBeGreaterThan(0);
    const firstMatch = result[0];
    expect(firstMatch.scoreBreakdown).toBeDefined();
    expect(firstMatch.scoreBreakdown.semanticSimilarity).toBeDefined();
    expect(firstMatch.scoreBreakdown.skillsOverlap).toBeDefined();
    expect(firstMatch.scoreBreakdown.complementaryScore).toBeDefined();
    expect(firstMatch.scoreBreakdown.sharedInterests).toBeDefined();
    expect(firstMatch.scoreBreakdown.activityMatch).toBeDefined();
    expect(firstMatch.scoreBreakdown.overallScore).toBeDefined();
  });

  it("includes reasons array in each match suggestion", async () => {
    // Arrange
    // .single() calls: embedding, profile, prefs, check existing
    mockSingle.mockResolvedValueOnce({
      data: { user_id: "user-1", embedding: [1, 0, 0], status: "completed" },
      error: null,
    });
    mockSingle.mockResolvedValueOnce({
      data: { id: "user-1", collaboration_readiness: "open" },
      error: null,
    });
    mockSingle.mockResolvedValueOnce({
      data: { min_match_percentage: null },
      error: null,
    });
    mockSingle.mockResolvedValueOnce({ data: null, error: null });

    // Direct await calls: skills, interests, blocked, blocked connections, candidates, batch skills, batch interests, batch profiles, upsert, upsert score
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    mockResult.mockResolvedValueOnce({ data: [], error: null });
    mockResult.mockResolvedValueOnce({ data: [], error: null }); // blocked connections
    mockResult.mockResolvedValueOnce({
      data: [
        { user_id: "user-2", embedding: [1, 0, 0], status: "completed" },
      ],
      error: null,
    });
    // Batch calls replace per-candidate queries
    mockResult.mockResolvedValueOnce({ data: [], error: null }); // batch skills
    mockResult.mockResolvedValueOnce({ data: [], error: null }); // batch interests
    mockResult.mockResolvedValueOnce({
      data: [{ id: "user-2", collaboration_readiness: "open" }],
      error: null,
    }); // batch profiles
    mockResult.mockResolvedValueOnce({ data: null, error: null }); // upsert
    mockResult.mockResolvedValueOnce({ data: null, error: null }); // upsert score

    // Act
    const result = await generateMatchesForUser("user-1");

    // Assert
    expect(result.length).toBeGreaterThan(0);
    expect(Array.isArray(result[0].reasons)).toBe(true);
    expect(result[0].reasons.length).toBeGreaterThan(0);
  });
});

// ============================================
// GENERATE BATCH MATCHES TESTS
// ============================================

describe("generateBatchMatches", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    currentClient = createMockClient();
    createClientCallCount = 0;
    createClientThrowOnCall = null;
    createClientErrorMessage = "";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  });

  afterEach(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  });

  it("processes all users in the list", async () => {
    // Arrange
    const userIds = ["user-1", "user-2", "user-3"];
    // Each user: no embedding → empty results
    for (let i = 0; i < userIds.length; i++) {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "No rows" },
      });
    }

    // Act
    const results = await generateBatchMatches(userIds);

    // Assert
    expect(results.length).toBe(3);
    const processedIds = results.map((r) => r.userId);
    expect(processedIds).toContain("user-1");
    expect(processedIds).toContain("user-2");
    expect(processedIds).toContain("user-3");
  });

  it("returns success status for each processed user", async () => {
    // Arrange
    const userIds = ["user-1", "user-2"];
    for (let i = 0; i < userIds.length; i++) {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "No rows" },
      });
    }

    // Act
    const results = await generateBatchMatches(userIds);

    // Assert
    results.forEach((result) => {
      expect(result.status).toBe("success");
    });
  });

  it("isolates errors so one failure does not stop the batch", async () => {
    // Arrange
    const userIds = ["user-1", "user-2", "user-3"];
    createClientCallCount = 0;
    createClientThrowOnCall = 2;
    createClientErrorMessage = "Network error: connection refused";

    // user-1: succeeds (no embedding)
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "No rows" },
    });
    // user-3: succeeds (no embedding)
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "No rows" },
    });

    // Act
    const results = await generateBatchMatches(userIds);

    // Assert
    expect(results.length).toBe(3);
    expect(results[0].status).toBe("success");
    expect(results[1].status).toBe("failed");
    expect(results[1].error).toContain("Network error");
    expect(results[2].status).toBe("success");
  });

  it("returns correct matchesGenerated count for each user", async () => {
    // Arrange
    const userIds = ["user-1"];
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "No rows" },
    });

    // Act
    const results = await generateBatchMatches(userIds);

    // Assert
    expect(results[0].matchesGenerated).toBe(0);
  });

  it("handles empty user list by returning empty results", async () => {
    // Arrange
    const userIds: string[] = [];

    // Act
    const results = await generateBatchMatches(userIds);

    // Assert
    expect(results).toEqual([]);
  });

  it("includes error message when a user fails", async () => {
    // Arrange
    const userIds = ["user-1"];
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Act
    const results = await generateBatchMatches(userIds);

    // Assert
    expect(results[0].status).toBe("failed");
    expect(results[0].error).toBeDefined();
    expect(typeof results[0].error).toBe("string");
    expect(results[0].error!.length).toBeGreaterThan(0);
  });

  it("passes options through to generateMatchesForUser", async () => {
    // Arrange
    const userIds = ["user-1"];
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "No rows" },
    });

    // Act
    const results = await generateBatchMatches(userIds, {
      limit: 5,
      minScore: 70,
    });

    // Assert
    expect(results.length).toBe(1);
    expect(results[0].status).toBe("success");
  });
});
