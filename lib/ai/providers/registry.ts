import type { AIProvider, Message, AIProviderResponse } from './base'
import { AllProvidersFailedError } from '@/lib/ai/errors'
import { OpenAICompatibleProvider } from './openai-compatible'
import { AnthropicNativeProvider } from './anthropic-native'
import { MiniMaxProvider } from './minimax'

export interface ProviderConfig {
  name: string
  provider: AIProvider
  priority: number
  capabilities: string[]
}

export class ProviderRegistry {
  private providers: Map<string, ProviderConfig> = new Map()
  private defaultProvider: string | null = null

  registerProvider(config: ProviderConfig): void {
    this.providers.set(config.name, config)
    if (!this.defaultProvider || config.priority < this.providers.get(this.defaultProvider)!.priority) {
      this.defaultProvider = config.name
    }
  }

  getProvider(name?: string): AIProvider {
    if (name) {
      const provider = this.providers.get(name)
      if (!provider) throw new Error(`Provider ${name} not found`)
      return provider.provider
    }
    if (!this.defaultProvider) throw new Error('No providers registered')
    return this.providers.get(this.defaultProvider)!.provider
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  async chatWithFallback(
    messages: Message[],
    options?: { preferredProvider?: string; timeout?: number; systemPrompt?: string }
  ): Promise<AIProviderResponse> {
    const errors: Array<{ provider: string; error: Error }> = []
    const triedProviders: string[] = []

    if (options?.preferredProvider && this.providers.has(options.preferredProvider)) {
      const preferred = this.providers.get(options.preferredProvider)!
      triedProviders.push(preferred.name)
      try {
        return await this.executeWithTimeout(
          preferred.provider.chat.bind(preferred.provider),
          messages,
          options.systemPrompt,
          options.timeout
        )
      } catch (error) {
        errors.push({ provider: preferred.name, error: error as Error })
      }
    }

    const sortedProviders = Array.from(this.providers.values())
      .filter(p => !triedProviders.includes(p.name))
      .sort((a, b) => a.priority - b.priority)

    for (const providerConfig of sortedProviders) {
      triedProviders.push(providerConfig.name)
      try {
        return await this.executeWithTimeout(
          providerConfig.provider.chat.bind(providerConfig.provider),
          messages,
          options?.systemPrompt,
          options?.timeout
        )
      } catch (error) {
        errors.push({ provider: providerConfig.name, error: error as Error })
      }
    }

    const errorDetails = errors
      .map(e => `${e.provider}: ${e.error.message}`)
      .join('; ')
    const finalError = new AllProvidersFailedError()
    finalError.message = `All AI providers failed. Errors: ${errorDetails}`
    throw finalError
  }

  private async executeWithTimeout(
    chatFn: (messages: Message[], systemPrompt?: string) => Promise<AIProviderResponse>,
    messages: Message[],
    systemPrompt?: string,
    timeoutMs?: number
  ): Promise<AIProviderResponse> {
    if (timeoutMs) {
      const controller = new AbortController()
      const timeoutPromise = new Promise<AIProviderResponse>((_, reject) =>
        setTimeout(() => {
          controller.abort()
          reject(new Error('Provider timeout'))
        }, timeoutMs)
      )
      return Promise.race([
        systemPrompt ? chatFn(messages, systemPrompt) : chatFn(messages),
        timeoutPromise,
      ])
    }
    return systemPrompt ? chatFn(messages, systemPrompt) : chatFn(messages)
  }
}

/**
 * Auto-register providers from environment variables.
 * Supports pattern: AI_PROVIDER_N_NAME, AI_PROVIDER_N_API_KEY, etc.
 */
export function autoRegisterProviders(registry: ProviderRegistry): void {
  let index = 1

  while (true) {
    const name = process.env[`AI_PROVIDER_${index}_NAME`]
    if (!name) break

    const apiKey = process.env[`AI_PROVIDER_${index}_API_KEY`]
    const baseURL = process.env[`AI_PROVIDER_${index}_BASE_URL`]
    const model = process.env[`AI_PROVIDER_${index}_MODEL`]
    const maxTokens = parseInt(process.env[`AI_PROVIDER_${index}_MAX_TOKENS`] || '4096', 10)
    const temperature = parseFloat(process.env[`AI_PROVIDER_${index}_TEMPERATURE`] || '0.7')
    const timeout = parseInt(process.env[`AI_PROVIDER_${index}_TIMEOUT`] || '60000', 10)
    const priority = parseInt(process.env[`AI_PROVIDER_${index}_PRIORITY`] || String(index), 10)

    if (!apiKey) {
      console.warn(`⚠️ AI_PROVIDER_${index}_API_KEY not set, skipping provider ${name}`)
      index++
      continue
    }

    if (!baseURL) {
      console.warn(`⚠️ AI_PROVIDER_${index}_BASE_URL not set, skipping provider ${name}`)
      index++
      continue
    }

    try {
      // Anthropic native API uses different endpoint pattern
      if (baseURL.includes('anthropic.com')) {
        const provider = new AnthropicNativeProvider({
          apiKey,
          model,
          maxTokens,
          temperature,
          timeout,
        })

        registry.registerProvider({
          name,
          provider,
          priority,
          capabilities: ['chat', 'streaming'],
        })
      } else {
        // Auto-detect OpenRouter and inject identity headers for leaderboard rankings
        const extraHeaders: Record<string, string> = {}
        if (baseURL.includes('openrouter.ai')) {
          extraHeaders['HTTP-Referer'] = process.env['OPENROUTER_REFERER'] || process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000'
          extraHeaders['X-OpenRouter-Title'] = process.env['OPENROUTER_TITLE'] || 'Collabryx'
        }

        // All other providers use OpenAI-compatible format
        const provider = new OpenAICompatibleProvider({
          name,
          apiKey,
          baseURL,
          model: model || 'gpt-4o-mini',
          maxTokens,
          temperature,
          timeout,
          extraHeaders: Object.keys(extraHeaders).length > 0 ? extraHeaders : undefined,
        })

        registry.registerProvider({
          name,
          provider,
          priority,
          capabilities: ['chat', 'streaming'],
        })
      }

      console.log(`✅ Registered AI provider: ${name} (priority: ${priority})`)
    } catch (error) {
      console.warn(`⚠️ Failed to register provider ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    index++
  }
}

let globalRegistry: ProviderRegistry | null = null

function registerLegacyProviders(registry: ProviderRegistry): void {
  // OpenRouter — primary provider (highest priority, tried first)
  if (process.env.OPENROUTER_API_KEY && !registry.getAvailableProviders().includes('openrouter')) {
    const openRouterHeaders: Record<string, string> = {
      'HTTP-Referer': process.env['OPENROUTER_REFERER'] || process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000',
      'X-OpenRouter-Title': process.env['OPENROUTER_TITLE'] || 'Collabryx',
    }

    registry.registerProvider({
      name: 'openrouter',
      provider: new OpenAICompatibleProvider({
        name: 'openrouter',
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
        model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-v4-flash',
        maxTokens: parseInt(process.env.OPENROUTER_MAX_TOKENS || '8192', 10),
        temperature: parseFloat(process.env.OPENROUTER_TEMPERATURE || '0.7'),
        timeout: parseInt(process.env.OPENROUTER_TIMEOUT || '120000', 10),
        extraHeaders: openRouterHeaders,
      }),
      priority: 5,
      capabilities: ['chat', 'streaming'],
    })

    console.log(`✅ Registered legacy provider: openrouter (priority: 5)`)
  }

  if (process.env.MINIMAX_API_KEY && !registry.getAvailableProviders().includes('minimax')) {
    registry.registerProvider({
      name: 'minimax',
      provider: new MiniMaxProvider({
        apiKey: process.env.MINIMAX_API_KEY,
        baseURL: process.env.MINIMAX_BASE_URL,
        model: process.env.MINIMAX_MODEL || 'MiniMax-M2.7'
      }),
      priority: 10,
      capabilities: ['chat', 'streaming']
    })
    console.log(`✅ Registered legacy provider: minimax (priority: 10)`)
  }

  if (process.env.OPENAI_API_KEY && !registry.getAvailableProviders().includes('openai')) {
    registry.registerProvider({
      name: 'openai',
      provider: new OpenAICompatibleProvider({
        name: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: 'https://api.openai.com/v1',
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        maxTokens: 4096,
        temperature: 0.7,
        timeout: 60000,
      }),
      priority: 20,
      capabilities: ['chat', 'streaming']
    })
    console.log(`✅ Registered legacy provider: openai (priority: 20)`)
  }

  if (process.env.ANTHROPIC_API_KEY && !registry.getAvailableProviders().includes('anthropic')) {
    const provider = new AnthropicNativeProvider({
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      maxTokens: 4096,
      temperature: 0.7,
      timeout: 60000,
    })

    registry.registerProvider({
      name: 'anthropic',
      provider,
      priority: 30,
      capabilities: ['chat', 'streaming'],
    })
    console.log(`✅ Registered legacy provider: anthropic (priority: 30)`)
  }
}

export function getProviderRegistry(): ProviderRegistry {
  if (!globalRegistry) {
    globalRegistry = new ProviderRegistry()
    autoRegisterProviders(globalRegistry)
    registerLegacyProviders(globalRegistry)
  }
  return globalRegistry
}