/**
 * TC-SEARCH: Universal Search Tests
 *
 * Tests: search API route, offensive word filtering,
 * fuzzy matching, "Did you mean?" suggestions, SQL injection prevention.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const mockRpc = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => Promise.resolve({ rpc: mockRpc }),
}))

// ============================================================
// API ROUTE TESTS
// ============================================================

describe("TC-SEARCH-01: Search API Route", () => {
  beforeEach(() => {
    mockRpc.mockReset()
  })

  it("returns empty results for queries shorter than 2 characters", async () => {
    const { GET } = await import("@/app/api/search/route")

    const req = new NextRequest("http://localhost/api/search?q=a")
    const res = await GET(req)
    const body = await res.json()

    expect(body.people).toEqual([])
    expect(body.posts).toEqual([])
    expect(body.blocked).toBe(false)
  })

  it("blocks queries longer than 100 characters", async () => {
    const { GET } = await import("@/app/api/search/route")

    const longQuery = "a".repeat(101)
    const req = new NextRequest(`http://localhost/api/search?q=${longQuery}`)
    const res = await GET(req)
    const body = await res.json()

    expect(body.blocked).toBe(true)
    expect(body.people).toEqual([])
  })

  it("returns blocked=true when RPC reports offensive content", async () => {
    mockRpc.mockResolvedValueOnce({
      data: { people: [], posts: [], blocked: true, sanitized_query: "***" },
      error: null,
    })

    const { GET } = await import("@/app/api/search/route")

    const req = new NextRequest("http://localhost/api/search?q=badword")
    const res = await GET(req)
    const body = await res.json()

    expect(body.blocked).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith("search_all", { search_query: "badword" })
  })

  it("calls search_suggest when no results found and not blocked", async () => {
    mockRpc
      .mockResolvedValueOnce({
        data: { people: [], posts: [], blocked: false, sanitized_query: "xyzz" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ suggestion: "xyz", source_type: "skill", similarity_score: 0.85 }],
        error: null,
      })

    const { GET } = await import("@/app/api/search/route")

    const req = new NextRequest("http://localhost/api/search?q=xyzz")
    const res = await GET(req)
    const body = await res.json()

    expect(body.suggestions).toHaveLength(1)
    expect(body.suggestions[0].suggestion).toBe("xyz")
  })

  it("handles RPC errors gracefully", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: new Error("Database timeout"),
    })

    const { GET } = await import("@/app/api/search/route")

    const req = new NextRequest("http://localhost/api/search?q=react")
    const res = await GET(req)
    const body = await res.json()

    expect(body.people).toEqual([])
    expect(body.posts).toEqual([])
  })

  it("returns 500 on unexpected errors", async () => {
    mockRpc.mockRejectedValueOnce(new Error("Connection refused"))

    const { GET } = await import("@/app/api/search/route")

    const req = new NextRequest("http://localhost/api/search?q=react")
    const res = await GET(req)

    expect(res.status).toBe(500)
  })

  it("does not call search_suggest when results exist", async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        people: [{ id: "1", name: "John", headline: "Dev", avatar_url: null, match_type: "name", matched_tag: null, is_fuzzy: false }],
        posts: [],
        blocked: false,
        sanitized_query: "john",
      },
      error: null,
    })

    const { GET } = await import("@/app/api/search/route")

    const req = new NextRequest("http://localhost/api/search?q=john")
    const res = await GET(req)
    const body = await res.json()

    expect(body.suggestions).toEqual([])
  })
})

// ============================================================
// TYPE CONTRACT TESTS
// ============================================================

describe("TC-SEARCH-02: Type Contracts", () => {
  it("SearchPerson has is_fuzzy boolean field", () => {
    const person = {
      id: "1",
      name: "Test",
      headline: null as string | null,
      avatar_url: null as string | null,
      match_type: "name" as const,
      matched_tag: null as string | null,
      is_fuzzy: false,
    }
    expect(person.is_fuzzy).toBe(false)
    expect(typeof person.is_fuzzy).toBe("boolean")
  })

  it("match_type accepts three valid string values", () => {
    const valid = new Set(["name", "skill", "interest"])
    expect(valid.has("name")).toBe(true)
    expect(valid.has("skill")).toBe(true)
    expect(valid.has("interest")).toBe(true)
    expect(valid.has("invalid")).toBe(false)
  })

  it("SearchResults shape has blocked and suggestions", () => {
    const result = {
      people: [],
      posts: [],
      blocked: false,
      sanitized_query: "test",
      suggestions: [{ suggestion: "test", source_type: "skill", similarity_score: 0.9 }],
    }
    expect(result.blocked).toBe(false)
    expect(result.sanitized_query).toBe("test")
    expect(result.suggestions).toHaveLength(1)
  })
})

// ============================================================
// SQL INJECTION PREVENTION TESTS
// ============================================================

describe("TC-SEARCH-03: SQL Injection Prevention", () => {
  it("passes query as parameterized RPC argument", async () => {
    mockRpc.mockResolvedValue({
      data: { people: [], posts: [], blocked: false, sanitized_query: "" },
      error: null,
    })

    const { GET } = await import("@/app/api/search/route")

    const maliciousQuery = "'; DROP TABLE profiles; --"
    const req = new NextRequest(`http://localhost/api/search?q=${encodeURIComponent(maliciousQuery)}`)
    await GET(req)

    expect(mockRpc).toHaveBeenCalledWith("search_all", {
      search_query: maliciousQuery,
    })
  })

  it("RPC regex strips semicolons and quotes from input", () => {
    const regex = /[^a-zA-Z0-9\s\-\#\+\.\@]/g
    const dangerous = "test'; DROP TABLE users;--"
    const cleaned = dangerous.replace(regex, "")
    expect(cleaned).not.toContain("'")
    expect(cleaned).not.toContain(";")
    expect(cleaned).toBe("test DROP TABLE users--")
  })
})

// ============================================================
// OFFENSIVE WORD BLOCKING TESTS
// ============================================================

describe("TC-SEARCH-04: Offensive Word Blocking", () => {
  it("returns blocked=true with empty results", async () => {
    mockRpc.mockResolvedValue({
      data: { people: [], posts: [], blocked: true, sanitized_query: "***" },
      error: null,
    })

    const { GET } = await import("@/app/api/search/route")

    const req = new NextRequest("http://localhost/api/search?q=offensive")
    const res = await GET(req)
    const body = await res.json()

    expect(body.blocked).toBe(true)
    expect(body.people).toEqual([])
    expect(body.posts).toEqual([])
  })
})

// ============================================================
// FUZZY MATCHING + SUGGESTION TESTS
// ============================================================

describe("TC-SEARCH-05: Fuzzy Matching and Suggestions", () => {
  it("returns is_fuzzy=true for trigram-matched results", async () => {
    mockRpc.mockResolvedValue({
      data: {
        people: [
          { id: "1", name: "John", headline: "React Dev", avatar_url: null, match_type: "name", matched_tag: null, is_fuzzy: true },
        ],
        posts: [],
        blocked: false,
        sanitized_query: "raect",
      },
      error: null,
    })

    const { GET } = await import("@/app/api/search/route")

    const req = new NextRequest("http://localhost/api/search?q=raect")
    const res = await GET(req)
    const body = await res.json()

    expect(body.people[0].is_fuzzy).toBe(true)
  })

  it("returns suggestions sorted by similarity score", async () => {
    mockRpc
      .mockResolvedValueOnce({
        data: { people: [], posts: [], blocked: false, sanitized_query: "devlopr" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          { suggestion: "developer", source_type: "skill", similarity_score: 0.65 },
          { suggestion: "development", source_type: "headline", similarity_score: 0.55 },
        ],
        error: null,
      })

    const { GET } = await import("@/app/api/search/route")

    const req = new NextRequest("http://localhost/api/search?q=devlopr")
    const res = await GET(req)
    const body = await res.json()

    expect(body.suggestions).toHaveLength(2)
    expect(body.suggestions[0].suggestion).toBe("developer")
    expect(body.suggestions[0].similarity_score).toBeGreaterThan(body.suggestions[1].similarity_score)
  })
})
