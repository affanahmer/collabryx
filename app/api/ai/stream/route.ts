import { NextRequest, NextResponse } from 'next/server'
import { assembleAndBuildPrompt } from '@/lib/rag/context-assembler'
import { getProviderRegistry } from '@/lib/ai/providers/registry'
import { createMessageStream } from '@/lib/ai/streaming'
import type { Message } from '@/lib/ai/providers/base'
import type { StartupContext } from '@/lib/rag/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, sessionId, messages, query, preferredProvider, otherUserIds, startupContext } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    const { systemPrompt, warnings } = await assembleAndBuildPrompt({
      userId,
      query: query || '',
      sessionId,
      messages: messages || [],
      otherUserIds: otherUserIds as string[] | undefined,
      startupContext: startupContext as StartupContext | null | undefined,
    })

    const registry = getProviderRegistry()
    const provider = registry.getProvider(preferredProvider)

    const conversationMessages: Message[] = (messages || []).map(
      (msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      })
    )

    const response = await createMessageStream(conversationMessages, provider, systemPrompt)

    // Include warnings in response headers for debugging
    if (warnings.length > 0) {
      response.headers.set('X-RAG-Warnings', JSON.stringify(warnings))
    }

    return response
  } catch (error) {
    console.error('AI stream error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}