export interface AIProviderConfig {
  name: string
  apiKey?: string
  baseURL?: string
  model: string
  maxTokens: number
  temperature: number
  timeout: number
}

export interface AIProviderResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  model: string
  finishReason?: string
}

export interface AIProvider {
  readonly config: AIProviderConfig
  chat(messages: Message[], systemPrompt?: string): Promise<AIProviderResponse>
  stream?(messages: Message[], systemPrompt?: string): AsyncGenerator<string>
  supportsStreaming(): boolean
}

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}