import { NextRequest, NextResponse } from 'next/server'
import { assembleAndBuildPrompt } from '@/lib/rag/context-assembler'
import { getProviderRegistry } from '@/lib/ai/providers/registry'
import { createClient } from '@/lib/supabase/server'
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

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    if (user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { context, systemPrompt, warnings } = await assembleAndBuildPrompt({
      userId,
      query: query || '',
      sessionId,
      messages: messages || [],
      otherUserIds: otherUserIds as string[] | undefined,
      startupContext: startupContext as StartupContext | null | undefined,
    })

    const registry = getProviderRegistry()

    let result
    if (preferredProvider) {
      const provider = registry.getProvider(preferredProvider)
      result = await provider.chat(messages, systemPrompt)
    } else {
      result = await registry.chatWithFallback(messages, { systemPrompt, timeout: 60000 })
    }

    return NextResponse.json({
      content: result.content,
      provider: result.provider || 'unknown',
      model: result.model,
      usage: result.usage,
      warnings,
      context_used: {
        profile_used: !!context.profile,
        startup_used: !!context.startup,
        multi_user_used: !!context.multiUser,
        contexts_retrieved: context.retrieved_contexts?.length || 0,
        session_summarized: !!context.session_summary
      }
    })
  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
