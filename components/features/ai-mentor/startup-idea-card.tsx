'use client'

import { memo } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { glass } from '@/lib/utils/glass-variants'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Target, Lightbulb, Users, Sparkles } from 'lucide-react'
import type { StartupIdea, StartupIdeaAction } from '@/types/ai-responses'

const ACTION_LABELS: Record<StartupIdeaAction, string> = {
  validate: 'Validate Idea',
  find_cofounder: 'Find Co-founder',
  market_research: 'Market Research',
  build_mvp: 'Build MVP',
  competitor_analysis: 'Competitor Analysis',
  fundraising: 'Fundraising',
  team_building: 'Team Building',
  customer_interviews: 'Customer Interviews',
}

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: 'bg-green-500/10 text-green-600 border-green-500/20',
  moderate: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  hard: 'bg-red-500/10 text-red-600 border-red-500/20',
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Easy',
  moderate: 'Moderate',
  hard: 'Hard',
}

const SECTIONS = [

  { icon: Target, label: 'Problem', key: 'problem' },
  { icon: Lightbulb, label: 'Solution', key: 'solution' },
  { icon: Users, label: 'Target Market', key: 'target_market' },
  { icon: Sparkles, label: 'Why You', key: 'why_you' },
]

interface StartupIdeaCardProps {
  idea: StartupIdea
  index: number
  onAction?: (ideaId: number, action: StartupIdeaAction) => void
}

export const StartupIdeaCard = memo(function StartupIdeaCard({
  idea,
  index,
  onAction,
}: StartupIdeaCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      className={cn(
        glass('card'),
        'rounded-xl overflow-hidden transition-all duration-200',
        'hover:shadow-md hover:-translate-y-0.5',
      )}
    >
      <Card className="border-0 shadow-none bg-transparent">
        <CardContent className="p-5">
          {/* Top bar */}
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant="outline"
              className={cn(
                DIFFICULTY_STYLES[idea.difficulty],
                'ml-auto',
              )}
            >
              {DIFFICULTY_LABELS[idea.difficulty]}
            </Badge>
            <span className="text-xs text-muted-foreground tabular-nums">
              #{index + 1}
            </span>
          </div>

          {/* Title & Tagline */}
          <h3 className="text-lg font-semibold">{idea.title}</h3>
          <p className="text-sm text-muted-foreground mb-3">{idea.tagline}</p>

          {/* Sections */}
          {SECTIONS.map(({ icon: Icon, label, key }) => (
            <div key={key} className="mb-2.5">
              <h4
                className={cn(
                  'text-xs font-semibold uppercase tracking-wider',
                  'text-muted-foreground flex items-center gap-1.5',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </h4>
              <p className="text-sm ml-6">
                {idea[key as keyof StartupIdea] as string}
              </p>
            </div>
          ))}

          {/* Action buttons */}
          {onAction && idea.actions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {idea.actions.map((action: StartupIdeaAction) => (
                <Button
                  key={`${idea.id}-${action}`}
                  type="button"
                  size="sm"
                  variant="outline"
                  className={glass('buttonGhost')}
                  aria-label={`Start ${ACTION_LABELS[action]}`}
                  onClick={() => onAction(idea.id, action)}
                >
                  {ACTION_LABELS[action]}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
})

StartupIdeaCard.displayName = 'StartupIdeaCard'
