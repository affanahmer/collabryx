import type { SessionSummary, AIMessage } from './types'
import OpenAI from 'openai'
import type { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions/completions'

const MAX_HISTORY_MESSAGES = 10
const SUMMARY_TRIGGER_MESSAGES = 8  // Minimum messages before summarisation runs (avoids unnecessary LLM calls)
const MIN_MESSAGES_FOR_SUMMARY = 4  // Hard lower bound — summarization skipped below this threshold
const MAX_SUMMARY_TOKENS = 300

export interface SummarizerResult {
  summary: SessionSummary | null
  warnings: string[]
}

export interface LLMClient {
  chatCompletionsCreate(params: {
    model: string
    messages: { role: string; content: string }[]
    max_tokens: number
    temperature: number
  }): Promise<{ choices: { message: { content: string | null } }[] }>
}

/**
 * WHY THIS CHANGE (OpenRouter Hardening — Phase 4):
 * The original createDefaultLLMClient() hardcoded process.env.OPENAI_API_KEY,
 * which meant the session summarizer (called during RAG context assembly)
 * would fail in any deployment using only OpenRouter credentials. Since the
 * summarizer is called on EVERY message after the 8th in a session, this
 * was a silent failure path that degraded RAG quality over time.
 *
 * The fix mirrors the same approach used in vector-retriever.ts:
 *   1. Prefer OPENROUTER_API_KEY with OPENROUTER_BASE_URL
 *   2. Fall back to OPENAI_API_KEY
 *   3. If neither is configured, the original error will surface naturally
 *
 * The SUMMARIZER_MODEL env var is preserved for cost control (defaults to
 * gpt-3.5-turbo) since OpenRouter supports specifying models directly.
 */
function createDefaultLLMClient(): LLMClient {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY
  const baseURL = process.env.OPENROUTER_API_KEY
    ? (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1')
    : undefined
  const openai = new OpenAI({ apiKey, baseURL })
  return {
    chatCompletionsCreate: (params: {
      model: string
      messages: { role: string; content: string }[]
      max_tokens: number
      temperature: number
    }) => openai.chat.completions.create(params as ChatCompletionCreateParamsNonStreaming) as unknown as Promise<{ choices: { message: { content: string | null } }[] }>
  }
}

let llmClient: LLMClient | null = null

export function setLLMClient(client: LLMClient): void {
  llmClient = client
}

export function resetLLMClient(): void {
  llmClient = null
}

function getLLMClient(): LLMClient {
  if (llmClient) {
    return llmClient
  }
  return createDefaultLLMClient()
}

export async function summarizeSessionIfNeeded(
  messages: AIMessage[],
  sessionId: string,
  client?: LLMClient
): Promise<SummarizerResult> {
  // Enforce a hard minimum to avoid unnecessary LLM calls for near-empty sessions
  if (messages.length < MIN_MESSAGES_FOR_SUMMARY) {
    return { summary: null, warnings: [] }
  }

  if (messages.length < SUMMARY_TRIGGER_MESSAGES) {
    return { summary: null, warnings: [] }
  }

  const messagesToSummarize = messages.slice(-MAX_HISTORY_MESSAGES)
  const prompt = buildSummaryPrompt(messagesToSummarize)
  const llm = client || getLLMClient()

  try {
    const response = await llm.chatCompletionsCreate({
      // Model is configurable via env var to control cost; defaults to gpt-3.5-turbo
      model: process.env.SUMMARIZER_MODEL || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: MAX_SUMMARY_TOKENS,
      temperature: 0.3
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return {
        summary: null,
        warnings: ['Empty response from summarization LLM']
      }
    }

    const parsed = parseSummaryResponse(content)
    if (!parsed) {
      return {
        summary: null,
        warnings: ['Failed to parse summarization response']
      }
    }

    return {
      summary: {
        ...parsed,
        message_count: messagesToSummarize.length
      },
      warnings: []
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      summary: null,
      warnings: [`Summarization failed: ${errorMessage}`]
    }
  }
}

function buildSummaryPrompt(messages: AIMessage[]): string {
  const conversationText = messages
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n')

  return `Summarize this conversation concisely for context injection.
Focus on:
- Key topics discussed
- Action items identified
- Skills or interests mentioned
- User's goals or challenges

Conversation:
${conversationText}

Return JSON: { "summary": "...", "action_items": ["..."], "skills_identified": ["..."] }`
}

function parseSummaryResponse(content: string): SessionSummary | null {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return null
    }

    const parsed = JSON.parse(jsonMatch[0])

    if (typeof parsed.summary !== 'string' || !Array.isArray(parsed.action_items) || !Array.isArray(parsed.skills_identified)) {
      return null
    }

    return {
      summary_text: parsed.summary,
      action_items: parsed.action_items.filter((item: unknown) => typeof item === 'string'),
      skills_identified: parsed.skills_identified.filter((item: unknown) => typeof item === 'string'),
      message_count: 0
    }
  } catch {
    return null
  }
}