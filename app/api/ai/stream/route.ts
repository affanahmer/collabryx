/**
 * ============================================================================
 * AI STREAMING ENDPOINT — PERSISTENT SESSIONS + REAL-TIME TOKENS
 * ============================================================================
 *
 * PROBLEM (Bug #1 & #3 from analysis):
 * The original streaming endpoint was purely ephemeral — it streamed AI tokens
 * to the client but NEVER saved messages or sessions to the database. The AI
 * Mentor page generated random client-side UUIDs via crypto.randomUUID() as
 * session IDs, so no DB record ever matched. When the user refreshed, all
 * conversation history was permanently lost. Additionally, the ChatInput
 * component used a completely separate server-action path (lib/actions/ai-mentor.ts)
 * that checked session existence against the DB — since the client UUID didn't
 * exist, it always returned "Session not found". This dual-architecture split
 * meant: (a) streaming responses were visible but never persisted, and
 * (b) typed messages via ChatInput always failed with session errors.
 *
 * SOLUTION:
 * This rewrite turns the streaming endpoint into the SINGLE source of truth
 * for AI mentor interactions. Every request now:
 *  1. Authenticates via Supabase (same-origin CSRF + JWT check)
 *  2. Calls getOrCreateSession() to get/reuse a REAL DB-backed session UUID
 *  3. Saves the user's message to ai_mentor_messages BEFORE calling the LLM
 *  4. Loads full conversation history from DB for RAG context assembly
 *  5. Auto-generates a session title from the first user message (truncated
 *     to 60 chars) so the sidebar shows meaningful names
 *  6. Streams AI tokens to the client via Server-Sent Events (SSE)
 *  7. On stream completion, saves the COMPLETE AI response to the database
 *  8. On stream error, saves whatever partial response was captured
 *  9. Sends the real session_id as the FIRST SSE event so the client hook
 *     can update its state and ChatList can load DB history
 *
 * KEY DESIGN DECISIONS:
 * - Session creation/deactivation happens server-side only — the client never
 *   generates UUIDs or manages session lifecycle
 * - Messages are saved BEFORE and AFTER streaming, never during, to avoid
 *   partial writes in the DB that could confuse the RAG context assembly
 * - The first SSE event includes session_id but NO content, letting the client
 *   distinguish session-sync events from content tokens
 * - revalidatePath() is called after streaming completes so the sidebar's
 *   getUserSessions() query sees the updated session
 *
 * DEPENDENCIES:
 * - @/lib/supabase/server — for all DB operations
 * - @/lib/rag/context-assembler — for RAG-enhanced prompt building
 * - @/lib/ai/providers/registry — for provider-agnostic LLM calls
 *
 * @see {@link https://github.com/collabryx/docs/architecture/ai-mentor.md}
 * ============================================================================
 */
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { assembleAndBuildPrompt } from '@/lib/rag/context-assembler'
import { getProviderRegistry } from '@/lib/ai/providers/registry'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Message } from '@/lib/ai/providers/base'
import type { StartupContext } from '@/lib/rag/types'

/**
 * Get or create a persistent AI mentor session for the authenticated user.
 */
async function getOrCreateSession(userId: string): Promise<{ id: string; title: string }> {
  const supabase = await createClient()

  // Try to get existing active session
  const { data: existing } = await supabase
    .from('ai_mentor_sessions')
    .select('id, title')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (existing) return existing

  // Create new session
  const { data: created, error } = await supabase
    .from('ai_mentor_sessions')
    .insert({
      user_id: userId,
      title: `Session ${new Date().toLocaleDateString()}`,
      status: 'active',
    })
    .select('id, title')
    .single()

  if (error || !created) {
    throw new Error(`Failed to create session: ${error?.message || 'Unknown error'}`)
  }

  return created
}

/**
 * Save a message to the database and return the record.
 */
async function saveMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<{ id: string; created_at: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ai_mentor_messages')
    .insert({ session_id: sessionId, role, content })
    .select('id, created_at')
    .single()

  if (error) {
    throw new Error(`Failed to save message: ${error.message}`)
  }
  return data
}

export async function POST(request: NextRequest) {
  // CSRF protection — validate same-origin
  const headersList = await headers()
  const origin = headersList.get('origin')
  const host = headersList.get('host')
  if (origin && host && !origin.endsWith(host)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { userId, sessionId: clientSessionId, messages, query, preferredProvider, otherUserIds, startupContext } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Authenticate
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user || user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // === SESSION MANAGEMENT ===
    // Get or create a real DB-backed session (ignore client-side random UUID)
    const dbSession = await getOrCreateSession(userId)

      // Save the user message to DB
    const userContent = query || messages?.[messages.length - 1]?.content || ''
    const savedUserMsg = await saveMessage(dbSession.id, 'user', userContent)

    // Auto-title from first user message (truncated to 60 chars)
    const { count: msgCount } = await supabase
      .from('ai_mentor_messages')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', dbSession.id)
      .eq('role', 'user')

    if (msgCount && msgCount === 1) {
      const title = userContent.length > 60
        ? userContent.substring(0, 57) + '...'
        : userContent
      await supabase
        .from('ai_mentor_sessions')
        .update({ title })
        .eq('id', dbSession.id)
    }

    // Load conversation history from DB (last 20)
    const { data: dbMessages } = await supabase
      .from('ai_mentor_messages')
      .select('role, content')
      .eq('session_id', dbSession.id)
      .order('created_at', { ascending: true })
      .limit(20)

    const ragMessages = (dbMessages || []).map((m, i) => ({
      id: `msg-${i}`,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      created_at: new Date().toISOString(),
    }))

    // === RAG CONTEXT ASSEMBLY ===
    const { systemPrompt, warnings } = await assembleAndBuildPrompt({
      userId,
      query: query || '',
      sessionId: dbSession.id,
      messages: ragMessages,
      otherUserIds: otherUserIds as string[] | undefined,
      startupContext: startupContext as StartupContext | null | undefined,
    })

    // === AI PROVIDER ===
    const registry = getProviderRegistry()
    const provider = registry.getProvider(preferredProvider)

    const conversationMessages: Message[] = (ragMessages).map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }))

    // === STREAM WITH PERSISTENCE ===
    // We create a ReadableStream that:
    // 1. Streams tokens to the client in real-time
    // 2. Buffers the full response
    // 3. Saves the complete response to DB when done
    let fullResponse = ''
    const encoder = new TextEncoder()

    const stream = provider.stream
      ? provider.stream(conversationMessages, systemPrompt)
      : null

    if (!stream) {
      return NextResponse.json(
        { error: 'AI provider does not support streaming' },
        { status: 500 }
      )
    }

    const sseStream = new ReadableStream({
      async start(controller) {
        try {
          // Send session_id as first event so client syncs
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ session_id: dbSession.id, user_msg_id: savedUserMsg.id })}\n\n`)
          )

          for await (const token of stream) {
            fullResponse += token
            const data = JSON.stringify({ content: token })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          }

          // Save the complete AI response to DB
          if (fullResponse.trim()) {
            await saveMessage(dbSession.id, 'assistant', fullResponse)
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
          revalidatePath('/(auth)/ai-mentor')
        } catch (error) {
          // Save whatever we got on error
          if (fullResponse.trim()) {
            await saveMessage(dbSession.id, 'assistant', fullResponse).catch(() => {})
          }
          const errorData = JSON.stringify({
            error: error instanceof Error ? error.message : 'Stream error',
            partial: fullResponse,
          })
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        }
      },
    })

    return new Response(sseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        ...(warnings.length > 0 ? { 'X-RAG-Warnings': JSON.stringify(warnings) } : {}),
      },
    })
  } catch (error) {
    console.error('AI stream error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
