import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

export interface SearchPerson {
  id: string
  name: string
  headline: string | null
  avatar_url: string | null
  match_type: "name" | "skill" | "interest"
  matched_tag: string | null
  is_fuzzy: boolean
}

export interface SearchPost {
  id: string
  content: string | null
  created_at: string | null
  author_name: string | null
  author_avatar: string | null
  is_fuzzy: boolean
}

export interface SearchSuggestion {
  suggestion: string
  source_type: string
  similarity_score: number
}

export interface SearchResponse {
  people: SearchPerson[]
  posts: SearchPost[]
  blocked: boolean
  sanitized_query: string
  suggestions: SearchSuggestion[]
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")?.trim()

  if (!query || query.length < 2) {
    return NextResponse.json({
      people: [],
      posts: [],
      blocked: false,
      sanitized_query: query || "",
      suggestions: [],
    })
  }

  if (query.length > 100) {
    return NextResponse.json({
      people: [],
      posts: [],
      blocked: true,
      sanitized_query: query.slice(0, 100),
      suggestions: [],
    })
  }

  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc("search_all", {
      search_query: query,
    })

    if (error) {
      console.error("Search RPC error:", error.message)
      return NextResponse.json({
        people: [],
        posts: [],
        blocked: false,
        sanitized_query: query,
        suggestions: [],
      })
    }

    const result = data as {
      people: SearchPerson[]
      posts: SearchPost[]
      blocked: boolean
      sanitized_query: string
    } | null

    const people = result?.people ?? []
    const posts = result?.posts ?? []
    const blocked = result?.blocked ?? false
    const sanitized = result?.sanitized_query ?? query
    const hasResults = people.length > 0 || posts.length > 0

    let suggestions: SearchSuggestion[] = []

    if (!hasResults && !blocked) {
      const { data: suggestData, error: suggestError } = await supabase.rpc(
        "search_suggest",
        { search_query: sanitized }
      )

      if (!suggestError && suggestData) {
        suggestions = suggestData as SearchSuggestion[]
      }
    }

    return NextResponse.json({
      people,
      posts,
      blocked,
      sanitized_query: sanitized,
      suggestions,
    })
  } catch (error) {
    console.error("Search API error:", error)
    return NextResponse.json(
      {
        people: [],
        posts: [],
        blocked: false,
        sanitized_query: query,
        suggestions: [],
      },
      { status: 500 }
    )
  }
}
