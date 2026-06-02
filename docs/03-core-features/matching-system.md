# Matching System

User matching algorithms and implementation in Collabryx.

---

## Table of Contents

- [Overview](#overview)
- [Matching Algorithm](#matching-algorithm)
- [Implementation](#implementation)
- [API Reference](#api-reference)
- [Optimization](#optimization)

---

## Overview

Collabryx uses a **hybrid matching system** combining:

1. **Semantic Matching** - Vector embeddings for profile similarity
2. **Rule-Based Filtering** - User preferences and constraints
3. **Collaborative Filtering** - Based on connection patterns

---

## Matching Algorithm

### Scoring Factors

| Factor | Weight | Description |
|--------|--------|-------------|
| Semantic Similarity | 40% | Vector embedding cosine similarity |
| Shared Skills | 25% | Common skills and expertise |
| Shared Interests | 20% | Common interests and goals |
| Activity Level | 10% | User engagement score |
| Reciprocity | 5% | Mutual interest likelihood |

### Match Score Calculation

```typescript
interface MatchScore {
  semantic: number      // 0-1 from vector similarity
  skills: number        // 0-1 from skill overlap
  interests: number     // 0-1 from interest overlap
  activity: number      // 0-1 from activity score
  reciprocity: number   // 0-1 from pattern analysis
  total: number         // Weighted sum
}
```

---

## Implementation

### Match Service

> **Note**: The actual matching system uses multiple services (`lib/services/matches.ts`, `match-generation.ts`, `match-scores.ts`) with BM25 keyword extraction and feed scoring. This is a simplified illustration.

```typescript
// lib/services/matches.ts
export async function getMatchSuggestions(userId: string, limit = 10) {
  const supabase = createClient()
  
  // 1. Get user's embedding
  const { data: userEmbedding } = await supabase
    .from('profile_embeddings')
    .select('embedding')
    .eq('user_id', userId)
    .single()
  
  // 2. Find similar profiles
  const { data: matches } = await supabase.rpc('get_matches', {
    query_embedding: userEmbedding.embedding,
    match_limit: limit
  })
  
  return matches
}
```

### Database Function

```sql
-- SQL function for match calculation
CREATE OR REPLACE FUNCTION get_matches(
  query_embedding vector(384),
  match_limit int
)
RETURNS TABLE (
  user_id uuid,
  name text,
  headline text,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.headline,
    1 - (pe.embedding <=> query_embedding) AS similarity
  FROM profile_embeddings pe
  JOIN profiles p ON pe.user_id = p.id
  WHERE p.id != auth.uid()
    AND 1 - (pe.embedding <=> query_embedding) > 0.5
  ORDER BY similarity DESC
  LIMIT match_limit;
END;
$$ LANGUAGE plpgsql;
```

---

## API Reference

### POST /api/matches/generate

Generate match suggestions for current user.

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [...]
  }
}
```

### POST /api/matches/generate/batch

Generate matches in batch for all users (admin).

### GET /api/matches/health

Health check for match system.

**Response:**
```json
{
  "status": "healthy",
  "bm25_loaded": true,
  "last_batch_run": "2026-06-01T00:00:00Z"
}
```

---

## Optimization

### Indexes

```sql
-- HNSW index for vector similarity
CREATE INDEX profile_embeddings_embedding_idx 
ON profile_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Index for common queries
CREATE INDEX profiles_active_idx ON profiles (is_active);
CREATE INDEX profiles_created_idx ON profiles (created_at);
```

### Caching

Match results are cached via React Query:

```typescript
// Cached match suggestions (5 min stale time)
const { data: matches } = useMatchesQuery({
  staleTime: 5 * 60 * 1000,
  gcTime: 15 * 60 * 1000,
})
```

---

**Last Updated**: 2026-03-14

[← Back to Docs](../README.md)
