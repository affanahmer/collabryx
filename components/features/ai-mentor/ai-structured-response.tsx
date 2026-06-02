'use client'

import type {
  AIStructuredResponse as AIResponseData,
  StartupIdeaAction,
} from '@/types/ai-responses'

import { memo } from 'react'
import { motion } from 'motion/react'
import { FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { glass } from '@/lib/utils/glass-variants'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { StartupIdeaCard } from '@/components/features/ai-mentor/startup-idea-card'
import { SuggestionChips } from '@/components/features/ai-mentor/suggestion-chips'

interface AIStructuredResponseProps {
  data: AIResponseData
  onSuggestionClick?: (suggestion: string) => void
  onIdeaAction?: (ideaId: number, action: StartupIdeaAction) => void
  className?: string
}

const scoreColor = (score: number) =>
  score >= 80 ? 'text-green-500' : score >= 50 ? 'text-yellow-500' : 'text-red-500'

const scoreBg = (score: number) =>
  score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500'

function AIStructuredResponseComponent({
  data,
  onSuggestionClick,
  onIdeaAction,
  className,
}: AIStructuredResponseProps) {
  return (
    <motion.div
      className={cn('space-y-3', className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Message */}
      <div className='relative'>
        <div
          className={cn(
            'px-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90',
            data.message.length > 300 && 'max-h-96 overflow-y-auto',
          )}
        >
          {data.message}
        </div>
        {data.profile_match && (
          <span
            className={cn(
              'absolute top-1 right-1 text-xs font-bold',
              scoreColor(data.profile_match.match_score),
            )}
          >
            {data.profile_match.match_score}%
          </span>
        )}
      </div>

      {/* Collections (take priority over flat ideas) */}
      {data.collections && data.collections.length > 0 && (
        <div className='space-y-4'>
          {data.collections.map((collection, ci) => (
            <div key={collection.category}>
              {ci > 0 && <Separator className='my-4' />}
              <h3 className='text-base font-semibold flex items-center gap-2 mb-3 mt-2'>
                <FlaskConical className='size-4 text-primary' />
                {collection.category}
              </h3>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
                {collection.ideas.map((idea, ii) => (
                  <StartupIdeaCard
                    key={idea.id}
                    idea={idea}
                    index={ii}
                    onAction={onIdeaAction}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Flat ideas (only when no collections) */}
      {(!data.collections || data.collections.length === 0) &&
        data.ideas &&
        data.ideas.length > 0 && (
          <div
            className={cn(
              'grid gap-3',
              data.ideas.length === 1
                ? 'grid-cols-1'
                : 'grid-cols-1 md:grid-cols-2',
            )}
          >
            {data.ideas.map((idea, i) => (
              <StartupIdeaCard
                key={idea.id}
                idea={idea}
                index={i}
                onAction={onIdeaAction}
              />
            ))}
          </div>
        )}

      {/* Profile match */}
      {data.profile_match && (
        <div className={cn(glass('bubble'), 'p-3 rounded-lg mt-3 space-y-2')}>
          <div className='flex items-center justify-between'>
            <span className='text-sm font-medium'>Match Score</span>
            <span
              className={cn(
                'text-sm font-bold',
                scoreColor(data.profile_match.match_score),
              )}
            >
              {data.profile_match.match_score}%
            </span>
          </div>
          <div className='h-1.5 rounded-full bg-muted overflow-hidden'>
            <div
              className={cn(
                'h-full rounded-full transition-all',
                scoreBg(data.profile_match.match_score),
              )}
              style={{ width: `${data.profile_match.match_score}%` }}
            />
          </div>
          {data.profile_match.skills_used.length > 0 && (
            <div className='flex flex-wrap gap-1.5'>
              {data.profile_match.skills_used.map((skill) => (
                <Badge key={skill} variant='secondary' className='text-xs'>
                  {skill}
                </Badge>
              ))}
            </div>
          )}
          {data.profile_match.interests_addressed.length > 0 && (
            <div className='flex flex-wrap gap-1.5'>
              {data.profile_match.interests_addressed.map((interest) => (
                <Badge key={interest} variant='outline' className='text-xs'>
                  {interest}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Suggestions */}
      {data.suggestions && data.suggestions.length > 0 && (
        <div className='mt-4 pt-2'>
          <SuggestionChips
            suggestions={data.suggestions}
            onSelect={onSuggestionClick ?? (() => {})}
          />
        </div>
      )}
    </motion.div>
  )
}

AIStructuredResponseComponent.displayName = 'AIStructuredResponse'

export const AIStructuredResponse = memo(AIStructuredResponseComponent)
