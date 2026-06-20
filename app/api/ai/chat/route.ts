import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { assembleAndBuildPrompt } from '@/lib/rag/context-assembler'
import { getProviderRegistry } from '@/lib/ai/providers/registry'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'
import type { AssemblerOptions } from '@/lib/rag/context-assembler'
import type { StartupContext } from '@/lib/rag/types'

export async function POST(request: NextRequest) {
  // CSRF protection (#33) — validate same-origin
  const headersList = await headers()
  const origin = headersList.get('origin')
  const host = headersList.get('host')
  if (origin && host && !origin.endsWith(host)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  // Rate limiting (#35)
  const rateLimitResult = rateLimit(request, 'api')
  if (!rateLimitResult.allowed && rateLimitResult.response) {
    return rateLimitResult.response
  }

  try {
    const body = await request.json()

    const ChatSchema = z.object({
      userId: z.string().min(1, "userId is required"),
      sessionId: z.string().optional(),
      messages: z.array(z.any()).optional().default([]),
      query: z.string().optional(),
      preferredProvider: z.string().optional(),
      otherUserIds: z.array(z.string()).optional(),
      startupContext: z.any().optional(),
      limit: z.number().int().min(1).max(100).optional().default(10),
    })

    const parsed = ChatSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }

    const { userId, sessionId, messages, query, preferredProvider, otherUserIds, startupContext, limit = 10 } = parsed.data

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
      limit,
    } as AssemblerOptions & { limit?: number })

    const registry = getProviderRegistry()

    let result
    if (preferredProvider) {
      // Wrap getProvider in try/catch to handle unknown provider (#34)
      let provider
      try {
        provider = registry.getProvider(preferredProvider)
      } catch {
        console.warn(`Unknown provider "${preferredProvider}", falling back to default`)
        provider = registry.getProvider()
      }
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
