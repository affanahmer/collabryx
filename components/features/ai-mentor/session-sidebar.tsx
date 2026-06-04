/**
 * ============================================================================
 * SessionSidebar — Past AI Mentor Session Browser with Archive Support
 * ============================================================================
 *
 * Glass-glow themed sidebar for browsing, resuming, and managing AI mentor
 * sessions. Features:
 *  - Real-time polling for new sessions
 *  - Active session highlighting with glass-glow-hover
 *  - Archive/unarchive support
 *  - Relative timestamps
 *  - Empty state with prompt to start chatting
 *
 * @see {@link ../../../lib/actions/ai-mentor.ts}
 * ============================================================================
 */
'use client'

import { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { glass } from '@/lib/utils/glass-variants'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, MessageSquare, Archive, Loader2, History } from 'lucide-react'
import { getUserSessions, archiveSession } from '@/lib/actions/ai-mentor'
import { toast } from 'sonner'
import { Shimmer } from '@/components/ai-elements/shimmer'

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

  // Poll for new sessions
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
    <div className='w-72 md:w-80 border-r border-border/40 flex flex-col shrink-0 bg-background z-10 min-w-0'>
      {/* Header */}
      <div className="px-3 py-3 border-b border-border/40 flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <Shimmer>Chat History</Shimmer>
        </h2>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={cn("h-7 px-2 text-xs", glass("buttonGhost"))}
          onClick={() => {
            onNewSession()
            onClose()
          }}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          New
        </Button>
      </div>

      {/* Session list */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-xs">
              No past sessions yet.
            </p>
            <p className="text-muted-foreground/60 text-[10px] mt-1">
              Start a new conversation to begin!
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                role="button"
                tabIndex={0}
                onClick={() => onSessionSelect(session.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSessionSelect(session.id); } }}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 cursor-pointer',
                  'group flex items-start gap-2',
                  activeSessionId === session.id
                    ? cn('glass-glow-strong', 'bg-accent/50')
                    : cn('hover:bg-accent/30 border border-transparent', 'glass-glow-hover'),
                )}
              >
                <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate text-foreground/90">
                    {session.title || 'Untitled Session'}
                  </div>
                  <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {formatDate(session.updated_at || session.created_at)}
                    {session.status === 'archived' && ' • Archived'}
                  </div>
                </div>
                {session.status !== 'archived' && (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); handleArchive(e, session.id); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); handleArchive(e as unknown as React.MouseEvent, session.id); } }}
                    className={cn(
                      'opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded cursor-pointer',
                      'hover:bg-muted text-muted-foreground hover:text-foreground',
                      'shrink-0 mt-0.5',
                      archivingId === session.id && 'opacity-100',
                    )}
                    aria-label={`Archive session ${session.title}`}
                  >
                    {archivingId === session.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Archive className="h-3.5 w-3.5" />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
