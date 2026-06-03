"use client"

import { useQuery } from "@tanstack/react-query"
import { useState, useEffect, useMemo, useRef } from "react"

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

export interface SearchResults {
  people: SearchPerson[]
  posts: SearchPost[]
  blocked: boolean
  sanitized_query: string
  suggestions: SearchSuggestion[]
}

async function fetchSearch(query: string): Promise<SearchResults> {
  if (!query || query.length < 2) {
    return { people: [], posts: [], blocked: false, sanitized_query: query, suggestions: [] }
  }

  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
  if (!res.ok) return { people: [], posts: [], blocked: false, sanitized_query: query, suggestions: [] }
  return res.json()
}

export function useGlobalSearch() {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query)
    }, 200)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const { data, isFetching } = useQuery({
    queryKey: ["global-search", debouncedQuery],
    queryFn: () => fetchSearch(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 1000 * 60,
    placeholderData: (prev) => prev,
  })

  const hasResults = useMemo(() => {
    if (!data) return false
    return data.people.length > 0 || data.posts.length > 0
  }, [data])

  const isEmpty = debouncedQuery.length >= 2 && !isFetching && data && !hasResults && !data.blocked
  const isBlocked = data?.blocked ?? false
  const suggestions = data?.suggestions ?? []

  const nameMatches = useMemo(() => data?.people.filter((p) => p.match_type === "name") ?? [], [data])
  const skillMatches = useMemo(() => data?.people.filter((p) => p.match_type === "skill") ?? [], [data])
  const interestMatches = useMemo(() => data?.people.filter((p) => p.match_type === "interest") ?? [], [data])

  return {
    query,
    setQuery,
    debouncedQuery,
    results: data ?? { people: [], posts: [], blocked: false, sanitized_query: query, suggestions: [] },
    isFetching,
    hasResults,
    isEmpty,
    isBlocked,
    suggestions,
    nameMatches,
    skillMatches,
    interestMatches,
  }
}
