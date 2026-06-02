'use client'

import { useMemo, memo } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { glass } from '@/lib/utils/glass-variants'
import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

interface SuggestionChipsProps {
  /** Array of suggestion texts to display as clickable pills */
  suggestions: string[]
  /** Callback fired when a suggestion chip is clicked */
  onSelect: (suggestion: string) => void
  /** Maximum number of chips to display (default: 5) */
  max?: number
  /** Additional CSS classes to apply to the container */
  className?: string
}

export const SuggestionChips = memo(function SuggestionChips({
  suggestions,
  onSelect,
  max = 5,
  className,
}: SuggestionChipsProps) {
  const clampedMax = Math.max(1, max)
  const visibleSuggestions = useMemo(
    () => suggestions.slice(0, clampedMax),
    [suggestions, clampedMax],
  )

  if (visibleSuggestions.length === 0) return null

  return (
    <ScrollArea
      aria-label="Suggestion chips"
      className={cn('w-full', className)}
    >
      <div className="flex flex-nowrap gap-2">
        {visibleSuggestions.map((suggestion, index) => (
          <motion.div
            key={`${index}-${suggestion}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                'rounded-full px-4 py-1.5 text-sm text-muted-foreground',
                'hover:bg-accent hover:text-accent-foreground',
                'hover:-translate-y-px active:scale-[0.97]',
                'transition-transform',
                glass('bubble'),
              )}
              onClick={() => onSelect(suggestion)}
            >
              {suggestion}
            </Button>
          </motion.div>
        ))}
      </div>
      <ScrollBar className="hidden" />
    </ScrollArea>
  )
})

SuggestionChips.displayName = 'SuggestionChips'
