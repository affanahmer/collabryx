/**
 * Native Anthropic Provider
 * =========================
 * Uses Anthropic's native Messages API (/v1/messages) with proper SSE streaming.
 * Supports Claude Sonnet, Opus, and Haiku models.
 */

import type { AIProvider, AIProviderConfig, AIProviderResponse, Message } from './base'
import { AIProviderError, RateLimitError, ProviderTimeoutError, StreamingError } from '@/lib/ai/errors'

export interface AnthropicConfig {
  apiKey?: string
  model?: string
  maxTokens?: number
  temperature?: number
  timeout?: number
  /** Anthropic API version (default: 2023-06-01) */
  apiVersion?: string
}

export class AnthropicNativeProvider implements AIProvider {
  readonly config: AIProviderConfig
  private apiVersion: string
  private readonly baseURL = 'https://api.anthropic.com/v1'

  constructor(config: AnthropicConfig = {}) {
    const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured')
    }

    this.apiVersion = config.apiVersion || '2023-06-01'

    this.config = {
      name: 'anthropic',
      apiKey,
      model: config.model || 'claude-sonnet-4-20250514',
      maxTokens: config.maxTokens || 4096,
      temperature: config.temperature ?? 0.7,
      timeout: config.timeout || 60000,
    }
  }

  supportsStreaming(): boolean {
    return true
  }

  async chat(messages: Message[], systemPrompt?: string): Promise<AIProviderResponse> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const body = this.buildRequestBody(messages, systemPrompt, false)

      const response = await fetch(`${this.baseURL}/messages`, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw this.buildError(response.status, errorBody)
      }

      const data = await response.json() as {
        content: Array<{ type: string; text: string }>
        model: string
        stop_reason: string | null
        usage: { input_tokens: number; output_tokens: number }
      }

      const responseText = data.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n')

      return {
        content: responseText,
        usage: {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        },
        model: data.model || this.config.model,
        finishReason: data.stop_reason || undefined,
      }
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ProviderTimeoutError(
          `Request timed out after ${this.config.timeout}ms`,
          this.config.name,
          this.config.timeout
        )
      }
      throw error
    }
  }

  async *stream(messages: Message[], systemPrompt?: string): AsyncGenerator<string> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const body = this.buildRequestBody(messages, systemPrompt, true)

      const response = await fetch(`${this.baseURL}/messages`, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw this.buildError(response.status, errorBody)
      }

      if (!response.body) {
        throw new StreamingError('Response body is null', this.config.name)
      }

      yield* this.parseSSEStream(response.body)
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ProviderTimeoutError(
          `Request timed out after ${this.config.timeout}ms`,
          this.config.name,
          this.config.timeout
        )
      }
      throw error
    }
  }

  // --- Private helpers ---

  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.config.apiKey || '',
      'anthropic-version': this.apiVersion,
      'anthropic-beta': 'message-batches-2024-09-24',
    }
  }

  private buildRequestBody(
    messages: Message[],
    systemPrompt: string | undefined,
    streaming: boolean
  ): Record<string, unknown> {
    // Anthropic uses 'system' as a top-level field, not in messages
    const anthropicMessages = this.convertMessages(messages)

    const body: Record<string, unknown> = {
      model: this.config.model,
      messages: anthropicMessages,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
    }

    if (systemPrompt) {
      body.system = systemPrompt
    }

    if (streaming) {
      body.stream = true
    }

    return body
  }

  private convertMessages(messages: Message[]): Array<{ role: string; content: string }> {
    // Anthropic only supports 'user' and 'assistant' roles in messages array
    // System messages go in the top-level 'system' field
    return messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role === 'system' ? 'user' : msg.role,
        content: msg.content,
      }))
  }

  private async *parseSSEStream(body: ReadableStream): AsyncGenerator<string> {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          // Anthropic SSE format: "event: message_start" or "event: content_block_delta"
          if (trimmed.startsWith('event: ')) {
            const eventType = trimmed.slice(7)

            // Read the next line for data
            const nextLine = buffer.split('\n')[0]
            if (nextLine && nextLine.startsWith('data: ')) {
              buffer = buffer.split('\n').slice(1).join('\n')
              const data = nextLine.slice(6)

              if (eventType === 'content_block_delta') {
                try {
                  const parsed = JSON.parse(data) as {
                    delta?: { type: string; text: string }
                  }
                  if (parsed.delta?.type === 'text_delta' && parsed.delta.text) {
                    yield parsed.delta.text
                  }
                } catch {
                  // Skip malformed JSON
                }
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  private buildError(status: number, errorBody: Record<string, unknown>): Error {
    const error = errorBody.error as { type?: string; message?: string } | undefined
    const message = error?.message || `Anthropic API error: ${status}`

    if (status === 429) {
      return new RateLimitError(message, this.config.name)
    }

    return new AIProviderError(message, this.config.name, status)
  }
}
