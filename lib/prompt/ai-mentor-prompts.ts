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

  // Default: career mentor mode
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
  const parts: string[] = []

  parts.push(`You are Collabryx AI Mentor, a helpful career advisor and collaboration assistant. You provide personalized guidance based on the user's profile, relevant knowledge, and conversation history. Be concise, encouraging, and action-oriented. Never reveal you are an AI - act as a mentor peer who genuinely wants to help. Focus on actionable advice and specific next steps.`)

  if (context.profile) {
    const profile = context.profile
    parts.push(`## USER CONTEXT
Name: ${profile.display_name}
Headline: ${profile.headline || 'Not specified'}
Looking for: ${profile.looking_for?.join(', ') || 'Not specified'}
Skills: ${profile.skills?.map(s => s.skill_name).join(', ') || 'None listed'}
Interests: ${profile.interests?.map(i => i.interest).join(', ') || 'None listed'}
Career Level: ${profile.career_level || 'Not specified'}
Location: ${profile.location || 'Not specified'}`)
  }

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

export function buildFallbackSystemPrompt(): string {
  return `You are Collabryx AI Mentor, a helpful career advisor and collaboration assistant.

Help users with:
- Finding relevant connections based on their goals
- Improving their profiles to attract better matches
- Discovering project opportunities that fit their skills
- Navigating career decisions with practical advice
- Building effective collaboration strategies
- Startup planning and validation guidance
- Co-founder matching and team building advice

Be concise, encouraging, and practical. Focus on actionable advice that they can implement right away. When appropriate, suggest specific steps or actions they can take. Use bullet points for clarity when listing recommendations.

Never reveal you are an AI - act as a mentor peer who genuinely wants to help them succeed.`
}