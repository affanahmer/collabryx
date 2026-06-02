'use client'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

type Ctx = {
  isLoading: boolean
  value: string
  setValue: (v: string) => void
  maxHeight: number
  onSubmit?: () => void
  disabled?: boolean
}
const PromptInputContext = createContext<Ctx>({
  isLoading: false, value: '', setValue: () => {},
  maxHeight: 240, onSubmit: undefined, disabled: false,
})
function usePromptInput() {
  const ctx = useContext(PromptInputContext)
  if (!ctx) throw new Error('usePromptInput must be used within PromptInput')
  return ctx
}
function PromptInput({
  className, isLoading = false, maxHeight = 240,
  value: controlledValue, onValueChange, onSubmit, children,
}: {
  isLoading?: boolean
  value?: string
  onValueChange?: (v: string) => void
  maxHeight?: number
  onSubmit?: () => void
  children: React.ReactNode
  className?: string
}) {
  const [internalValue, setInternalValue] = useState('')
  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : internalValue
  const setValue = useCallback(
    (newValue: string) => {
      if (!isControlled) setInternalValue(newValue)
      onValueChange?.(newValue)
    },
    [isControlled, onValueChange],
  )
  return (
    <PromptInputContext.Provider value={{ isLoading, value, setValue, maxHeight, onSubmit }}>
      <TooltipProvider>
        <div className={cn('relative flex flex-col', className)}>{children}</div>
      </TooltipProvider>
    </PromptInputContext.Provider>
  )
}
PromptInput.displayName = 'PromptInput'
function PromptInputTextarea({
  className, disableAutosize = false, ...props
}: {
  disableAutosize?: boolean
} & React.ComponentProps<typeof Textarea>) {
  const { value, setValue, isLoading, maxHeight, disabled, onSubmit } = usePromptInput()
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (!ref.current || disableAutosize) return
    ref.current.style.height = 'auto'
    ref.current.style.height = `${Math.min(ref.current.scrollHeight, maxHeight)}px`
  }, [value, maxHeight, disableAutosize])
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit?.()
    }
    props.onKeyDown?.(e)
  }
  return (
    <Textarea
      ref={ref}
      className={cn(
        'min-h-[3.5rem] resize-none border-0 focus-visible:ring-0 p-3 pr-12 text-sm bg-transparent',
        className,
      )}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={onKeyDown}
      disabled={isLoading || disabled}
      {...props}
    />
  )
}
PromptInputTextarea.displayName = 'PromptInputTextarea'
function PromptInputActions({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center gap-1', className)} {...props} />
}
PromptInputActions.displayName = 'PromptInputActions'
function PromptInputAction({
  tooltip, children, className, side = 'top', ...props
}: {
  tooltip: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn(className)} {...props}>{children}</div>
      </TooltipTrigger>
      <TooltipContent side={side}>{tooltip}</TooltipContent>
    </Tooltip>
  )
}
PromptInputAction.displayName = 'PromptInputAction'
export { PromptInput, PromptInputTextarea, PromptInputActions, PromptInputAction, usePromptInput }
