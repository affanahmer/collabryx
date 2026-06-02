import type { ExtendedRAGContext, AIMessage } from '@/lib/rag/types'
import { generateStartupSystemPrompt, generateCollaborationSystemPrompt } from '@/lib/rag/startup-prompts'

export function buildEnhancedSystemPrompt(
  context: ExtendedRAGContext,
  userMessage: string
): string {
  // Check if this is a startup planning scenario
  if (context.startup) {
    const startupPrompt = generateStartupSystemPrompt(context.profile, context.startup)
    return appendCommonContext(startupPrompt, context, userMessage)
  }

  // Check if this is a collaboration scenario
  if (context.multiUser && context.multiUser.otherUsers.length > 0) {
    const collabPrompt = generateCollaborationSystemPrompt(
      context.multiUser.currentUser,
      context.multiUser.otherUsers
    )
    return appendCommonContext(collabPrompt, context, userMessage)
  }

  // Default: startup idea generator mode
  return buildDefaultMentorPrompt(context, userMessage)
}

function appendCommonContext(basePrompt: string, context: ExtendedRAGContext, userMessage: string): string {
  const parts: string[] = [basePrompt]

  if (context.retrieved_contexts && context.retrieved_contexts.length > 0) {
    parts.push(`## RELEVANT KNOWLEDGE
${context.retrieved_contexts
  .map((c, i) => `${i + 1}. ${c.content} (relevance: ${(c.score * 100).toFixed(0)}%)`)
  .join('\n')}`)
  }

  if (context.session_summary) {
    parts.push(`## SESSION SUMMARY
${context.session_summary.summary_text}
Previous action items: ${context.session_summary.action_items?.join(', ') || 'None'}`)
  }

  if (context.conversation_history && context.conversation_history.length > 0) {
    const historyPreview = context.conversation_history
      .slice(-6)
      .map((m: AIMessage) => {
        const truncated = m.content.length > 200 ? m.content.substring(0, 200) + '...' : m.content
        return `${m.role}: ${truncated}`
      })
      .join('\n')
    parts.push(`## CONVERSATION HISTORY\n${historyPreview}`)
  }

  parts.push(`## CURRENT MESSAGE
User: ${userMessage}`)

  return parts.join('\n\n')
}

function buildDefaultMentorPrompt(context: ExtendedRAGContext, userMessage: string): string {
  const outputSchema = `{"message":"Intro text explaining the ideas","ideas":[{"id":1,"title":"Startup name","tagline":"Value proposition","problem":"Problem it solves","solution":"How it solves it","target_market":"Who it serves","why_you":"Why this matches their skills","difficulty":"easy","actions":["validate","market_research","build_mvp"]}],"suggestions":["Follow-up 1","Follow-up 2","Follow-up 3"],"profile_match":{"skills_used":["skill1","skill2"],"interests_addressed":["interest1","interest2"],"match_score":85}}`

  const parts: string[] = []

  parts.push(`You are Collabryx Startup Idea Generator, an expert at generating personalized startup ideas based on a user's skills, interests, and career profile. Your ONLY task is to analyze the user below and return innovative, specific, and actionable startup ideas tailored to their unique combination of skills and interests.

RULES:
- Generate 2-3 startup ideas per response
- Each idea must reference specific skills from the user's profile
- Ideas must be realistic and actionable (not sci-fi or moonshots)
- Cover different categories or industries when possible
- Assign appropriate difficulty levels (easy, moderate, or hard)
- Include exactly 3-5 suggestion chips for follow-up
- Return ONLY valid JSON — no markdown, no code fences, no explanatory text outside the JSON
- If the user asks a follow-up question, generate NEW ideas building on the conversation context
- If the user says "more" or "another", generate a fresh set
- Keep "why_you" specific to their profile — not generic`)

  if (context.profile) {
    const profile = context.profile
    parts.push(`## USER PROFILE
Name: ${profile.display_name}
Headline: ${profile.headline || 'Not specified'}
Looking for: ${profile.looking_for?.join(', ') || 'Not specified'}
Skills: ${profile.skills?.map(s => s.skill_name).join(', ') || 'None listed'}
Interests: ${profile.interests?.map(i => i.interest).join(', ') || 'None listed'}
Career Level: ${profile.career_level || 'Not specified'}
Location: ${profile.location || 'Not specified'}`)
  }

  if (context.retrieved_contexts && context.retrieved_contexts.length > 0) {
    parts.push(`## RELEVANT CONTEXT
${context.retrieved_contexts
  .map((c, i) => `${i + 1}. ${c.content} (relevance: ${(c.score * 100).toFixed(0)}%)`)
  .join('\n')}`)
  }

  if (context.session_summary) {
    parts.push(`## SESSION HISTORY
${context.session_summary.summary_text}
Previous action items: ${context.session_summary.action_items?.join(', ') || 'None'}`)
  }

  parts.push(`## OUTPUT FORMAT
You MUST respond with ONLY a valid JSON object using this exact schema. No markdown, no code fences, no text outside the JSON:

${outputSchema}

IMPORTANT: The "actions" array for each idea must only include values from this list: validate, find_cofounder, market_research, build_mvp, competitor_analysis, fundraising, team_building, customer_interviews. Pick 2-4 most relevant actions per idea. The "difficulty" field must be exactly "easy", "moderate", or "hard". The "match_score" must be a number between 0 and 100.`)

  if (context.conversation_history && context.conversation_history.length > 0) {
    const historyPreview = context.conversation_history
      .slice(-6)
      .map((m: AIMessage) => {
        const truncated = m.content.length > 200 ? m.content.substring(0, 200) + '...' : m.content
        return `${m.role}: ${truncated}`
      })
      .join('\n')
    parts.push(`## CONVERSATION HISTORY\n${historyPreview}`)
  }

  parts.push(`## USER REQUEST\n${userMessage}`)

  return parts.join('\n\n')
}

export function buildFallbackSystemPrompt(): string {
  return `You are Collabryx Startup Idea Generator. Analyze the user's question and generate startup ideas.

IMPORTANT: Return ONLY a valid JSON object with this structure (no markdown, no code fences):
{
  "message": "Your response text here",
  "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
}

If you cannot access user profile data, ask them about their skills and interests to generate personalized ideas.`
}