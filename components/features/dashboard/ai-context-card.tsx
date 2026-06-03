"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Settings2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { GlassCard } from "@/components/shared/glass-card"

interface AIContextCardProps {
    contexts?: string[]
    onEditContext?: () => void
    className?: string
}

const DEFAULT_CONTEXTS = [
    "Fintech interest",
    "Python backend skills",
    "MVP-stage availability"
]

export function AIContextCard({
    contexts = DEFAULT_CONTEXTS,
    onEditContext,
    className
}: AIContextCardProps) {
    return (
        <GlassCard className={cn(className)} innerClassName="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-wrap p-4 sm:p-6">
            <span className="text-sm font-medium text-muted-foreground">Matching on</span>
            <div className="flex items-center gap-2 flex-wrap">
                {contexts.map((context, index) => (
                    <Badge
                        key={context?.toLowerCase().replace(/\s+/g, '-') || index}
                        variant="secondary"
                        className="px-2.5 py-1 text-xs font-medium rounded-md"
                    >
                        {context}
                    </Badge>
                ))}
            </div>
            <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-sm text-muted-foreground ml-auto"
                onClick={onEditContext}
            >
                <Settings2 className="h-3 w-3 mr-1.5" />
                Edit
            </Button>
        </GlassCard>
    )
}
