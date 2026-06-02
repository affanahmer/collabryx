export interface UserProfileContext {
  user_id: string
  display_name: string
  headline: string | null
  bio: string | null
  looking_for: string[]
  skills: { skill_name: string; proficiency?: string }[]
  interests: { interest: string }[]
  career_level?: 'student' | 'early-career' | 'mid-career' | 'senior' | 'executive'
  location?: string
}

export interface RetrievedContext {
  content: string
  score: number
  source: 'vector' | 'keyword' | 'hybrid'
  metadata?: Record<string, unknown>
}

export interface SessionSummary {
  summary_text: string
  action_items: string[]
  skills_identified: string[]
  message_count: number
}

export interface RAGContext {
  profile: UserProfileContext | null
  retrieved_contexts: RetrievedContext[]
  session_summary: SessionSummary | null
  conversation_history: AIMessage[]
  assembled_at: string
}

export interface FallbackContext {
  has_profile: boolean
  has_vector_context: boolean
  has_summary: boolean
  warnings: string[]
}

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

/**
 * Startup planning context for AI mentor guidance.
 * Captures the user's startup idea, stage, and needs.
 */
export interface StartupContext {
  idea: string | null
  stage: 'idea' | 'validation' | 'mvp' | 'growth' | 'scaling' | null
  industry: string | null
  target_users: string | null
  technical_needs: string[]
  non_technical_needs: string[]
  current_team_size: number
  looking_for: string[] // e.g., ['cofounder', 'developer', 'designer']
}

/**
 * Multi-user context for collaboration scenarios.
 * Used when the AI mentor advises on partnerships or team dynamics.
 */
export interface MultiUserContext {
  currentUser: UserProfileContext
  otherUsers: UserProfileContext[]
  relationship?: 'potential_match' | 'existing_connection' | 'team_member'
}

/**
 * Extended RAG context that includes startup and multi-user data.
 */
export interface ExtendedRAGContext {
  profile: UserProfileContext | null
  startup: StartupContext | null
  multiUser: MultiUserContext | null
  retrieved_contexts: RetrievedContext[]
  session_summary: SessionSummary | null
  conversation_history: AIMessage[]
  assembled_at: string
}