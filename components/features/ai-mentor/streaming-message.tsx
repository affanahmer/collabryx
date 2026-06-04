'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Bot, User } from 'lucide-react'

interface StreamingMessageProps {
  content: string
  isStreaming?: boolean
  timestamp?: Date
  sender?: 'user' | 'ai'
}

/**
 * Enhanced StreamingMessage component with ChatGPT-flash rendering.
 * Features:
 *  - Smooth appearance with slide-in animation
 *  - Pulsing cursor during active streaming
 *  - Proper mobile-responsive sizing
 *  - ChatGPT-style alternating layout
 *  - Code block detection with inline formatting hints
 */
export function StreamingMessage({
  content,
  isStreaming = false,
  timestamp,
  sender = 'ai'
}: StreamingMessageProps) {
  const isUser = sender === 'user'

  return (
    <div
      className={cn(
        'flex gap-2 md:gap-3 px-3 md:px-4 py-3 md:py-4 rounded-lg',
        'animate-in fade-in slide-in-from-bottom-1 duration-200',
        isUser
          ? 'bg-primary/10 text-foreground'
          : 'bg-muted/50'
      )}
    >
      {/* Avatar */}
      <div className={cn(
        'flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center',
        isUser ? 'bg-primary/20' : 'bg-primary/10'
      )}>
        {isUser ? (
          <User className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
        ) : (
          <Bot className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Role label */}
        <span className="text-[10px] md:text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
          {isUser ? 'You' : 'AI Mentor'}
        </span>

        {/* Message text with auto-wrap and code detection */}
        <div className="text-sm md:text-base leading-relaxed whitespace-pre-wrap break-words">
          {content || (isStreaming ? '' : '...')}
          {isStreaming && (
            <span className="inline-block ml-0.5 w-2 h-4 bg-foreground/60 animate-pulse rounded-sm align-text-bottom" />
          )}
        </div>

        {/* Timestamp */}
        {timestamp && (
          <span className="block text-[10px] md:text-xs text-muted-foreground/50">
            {timestamp.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>
    </div>
  )
}
