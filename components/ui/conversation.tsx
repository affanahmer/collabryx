'use client'

import { Button } from '@/components/ui/button'
import { ArrowDownIcon } from 'lucide-react'
import type { ComponentProps } from 'react'
import { useCallback } from 'react'
import { StickToBottom, useStickToBottomContext } from 'use-stick-to-bottom'
import { cn } from '@/lib/utils'

export function Conversation({ className, ...props }: ComponentProps<typeof StickToBottom>) {
  return (
    <StickToBottom
      className={cn('flex flex-col', className)}
      initial='smooth'
      resize='smooth'
      {...props}
    />
  )
}
Conversation.displayName = 'Conversation'

export function ConversationContent({ className, children, ...props }: ComponentProps<typeof StickToBottom.Content>) {
  return (
    <StickToBottom.Content
      className={cn('flex flex-col overflow-y-auto p-3 md:p-4', className)}
      {...props}
    >
      {children}
    </StickToBottom.Content>
  )
}
ConversationContent.displayName = 'ConversationContent'

export function ConversationScrollButton({ className, ...props }: ComponentProps<typeof Button>) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext()
  const cb = useCallback(() => { scrollToBottom() }, [scrollToBottom])
  if (isAtBottom) return null
  return (
    <Button
      className={cn('absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full', className)}
      onClick={cb}
      size='icon' type='button' variant='outline'
      {...props}
    >
      <ArrowDownIcon className='size-4' />
    </Button>
  )
}
ConversationScrollButton.displayName = 'ConversationScrollButton'
