/**
 * ============================================================================
 * SessionSidebar — Past AI Mentor Session Browser with Archive Support
 * ============================================================================
 *
 * PROBLEM (Missing Feature from analysis):
 * The AI Mentor had NO way to browse past conversations. The getUserSessions()
 * server action existed in the codebase but was never called from any frontend
 * component. The only way to see a session was to be in it — and sessions were
 * identified by random client UUIDs that didn't persist, so there was nothing
 * to browse. Users could not:
 *  - See a list of their past mentoring sessions
 *  - Resume a previous conversation
 *  - Archive old sessions they were done with
 *  - Start a fresh session without losing access to the current one
 *
 * Additionally, the original getUserSessions() only returned 'active' sessions,
 * so even if we built a UI for it, archived sessions would be invisible.
 *
 * SOLUTION:
 * This is a NEW component that provides a full session management UI:
 *  - Fetches all sessions via getUserSessions() on mount and re-fetches
 *    whenever the activeSessionId changes (new messages change session state)
 *  - Auto-polls every 5 seconds to pick up sessions created by other tabs
 *  - Shows each session's title, relative timestamp, and status indicator
 *  - Highlights the currently active session with an accent background
 *  - Archive button (hover-reveal) on each session moves it to archived status
 *    via archiveSession() server action
 *  - "New Session" button at the top clears the active session so the next
 *    user message creates a fresh DB session
 *  - Loading spinner during fetch, empty state when no sessions exist
 *
 * ACCOMPANYING CHANGE:
 * The getUserSessions() server action in lib/actions/ai-mentor.ts was updated
 * to return BOTH 'active' AND 'archived' sessions, ordered by updated_at DESC
 * with a limit of 50. Previously it only returned 'active' sessions.
 *
 * @see {@link ../../../lib/actions/ai-mentor.ts} — getUserSessions, archiveSession
 * @see {@link ../../../app/(auth)/ai-mentor/ai-mentor-content.tsx} — parent orchestrator
 * ============================================================================
 */
'use client'

import { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { glass } from '@/lib/utils/glass-variants'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, MessageSquare, Archive, Loader2 } from 'lucide-react'
import { getUserSessions, archiveSession } from '@/lib/actions/ai-mentor'
import { toast } from 'sonner'

interface Session {
  id: string
  title: string
  status: string
  created_at: string
  updated_at: string
}

interface SessionSidebarProps {
  activeSessionId: string | null
  onSessionSelect: (sessionId: string) => void
  onNewSession: () => void
  onClose: () => void
}

export function SessionSidebar({
  activeSessionId,
  onSessionSelect,
  onNewSession,
  onClose,
}: SessionSidebarProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [archivingId, setArchivingId] = useState<string | null>(null)

  const loadSessions = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getUserSessions()
      if (!result.error && result.data) {
        setSessions(result.data)
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSessions()
  }, [loadSessions, activeSessionId])

  // Refresh when active session changes (new message may have been added)
  useEffect(() => {
    const interval = setInterval(loadSessions, 5000)
    return () => clearInterval(interval)
  }, [loadSessions])

  const handleArchive = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    setArchivingId(sessionId)
    try {
      const result = await archiveSession(sessionId)
      if (result.success) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId))
        toast.success('Session archived')
        if (activeSessionId === sessionId) {
          onNewSession()
        }
      } else {
        toast.error('Failed to archive session')
      }
    } catch {
      toast.error('Failed to archive session')
    } finally {
      setArchivingId(null)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString()
  }

  return (
    <div
      className={cn(
        'w-72 md:w-80 border-r flex flex-col shrink-0 bg-background/95 backdrop-blur-xl',
      )}
    >
      {/* Header */}
      <div className={cn('px-3 py-3 border-b flex items-center justify-between', glass('header'))}>
        <h2 className='text-sm font-semibold'>Sessions</h2>
        <div className='flex items-center gap-1'>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => {
              onNewSession()
              onClose()
            }}
          >
            <Plus className='h-3.5 w-3.5 mr-1' />
            New
          </Button>
        </div>
      </div>

      {/* Session list */}
      <ScrollArea className='flex-1'>
        {isLoading ? (
          <div className='flex items-center justify-center py-8'>
            <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
          </div>
        ) : sessions.length === 0 ? (
          <div className='text-center text-muted-foreground text-xs py-8 px-4'>
            No past sessions yet.<br />
            Start a new conversation!
          </div>
        ) : (
          <div className='p-2 space-y-1'>
            {sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => onSessionSelect(session.id)}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors',
                  'hover:bg-accent/50 group flex items-start gap-2',
                  activeSessionId === session.id
                    ? 'bg-accent/70 border border-border/60'
                    : 'border border-transparent',
                )}
              >
                <MessageSquare className='h-4 w-4 mt-0.5 shrink-0 text-muted-foreground' />
                <div className='flex-1 min-w-0'>
                  <div className='font-medium truncate'>
                    {session.title || 'Untitled Session'}
                  </div>
                  <div className='text-[10px] text-muted-foreground mt-0.5'>
                    {formatDate(session.updated_at || session.created_at)}
                    {session.status === 'archived' && ' • Archived'}
                  </div>
                </div>
                {session.status !== 'archived' && (
                  <button
                    type="button"
                    onClick={(e) => handleArchive(e, session.id)}
                    disabled={archivingId === session.id}
                    className={cn(
                      'opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded',
                      'hover:bg-muted text-muted-foreground hover:text-foreground',
                      'shrink-0 mt-0.5',
                    )}
                    aria-label={`Archive session ${session.title}`}
                  >
                    {archivingId === session.id ? (
                      <Loader2 className='h-3.5 w-3.5 animate-spin' />
                    ) : (
                      <Archive className='h-3.5 w-3.5' />
                    )}
                  </button>
                )}
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
