"use client"

import type { LucideIcon } from "lucide-react"
import { Briefcase, Clock, PauseCircle } from "lucide-react"
import { cn } from "@/lib/utils"

type CollaborationReadiness = "available" | "open" | "not-available"

interface OptionDef {
  value: CollaborationReadiness
  label: string
  description: string
  icon: LucideIcon
}

interface CollaborationSelectorProps {
  value?: CollaborationReadiness
  onChange: (value: CollaborationReadiness) => void
  disabled?: boolean
  className?: string
}

const OPTIONS: OptionDef[] = [
  {
    value: "available",
    label: "Available for collaboration",
    description: "Actively looking for projects, co-founders, or teammates",
    icon: Briefcase,
  },
  {
    value: "open",
    label: "Open to part-time / mentorship",
    description: "Not actively looking but open to interesting opportunities",
    icon: Clock,
  },
  {
    value: "not-available",
    label: "Not available",
    description: "Currently unavailable for new collaborations",
    icon: PauseCircle,
  },
]

const ACTIVE_COLOR_MAP: Record<CollaborationReadiness, string> = {
  available: "border-green-500 bg-green-500/20 ring-1 ring-green-500/30",
  open: "border-yellow-500 bg-yellow-500/20 ring-1 ring-yellow-500/30",
  "not-available": "border-red-500 bg-red-500/20 ring-1 ring-red-500/30",
}

const DOT_COLOR_MAP: Record<CollaborationReadiness, string> = {
  available: "bg-green-500 shadow-green-500/50",
  open: "bg-yellow-500 shadow-yellow-500/50",
  "not-available": "bg-red-500 shadow-red-500/50",
}

export function CollaborationSelector({
  value = "available",
  onChange,
  disabled = false,
  className,
}: CollaborationSelectorProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-sm font-semibold text-foreground">
        Collaboration Status
      </p>
      <div className="grid gap-2.5">
        {OPTIONS.map((option) => {
          const Icon = option.icon
          const isSelected = value === option.value

          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                "relative flex items-start gap-3.5 p-3.5 rounded-xl border-2 text-left transition-all w-full",
                "hover:shadow-sm focus-visible:outline-2 focus-visible:outline-primary/50 focus-visible:outline-offset-2",
                isSelected
                  ? ACTIVE_COLOR_MAP[option.value]
                  : "border-border/40 bg-transparent hover:border-border/60",
                disabled && "opacity-60 cursor-not-allowed"
              )}
              aria-pressed={isSelected}
            >
              <div className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 mt-0.5",
                isSelected
                  ? "border-current"
                  : "border-muted-foreground/40"
              )}>
                {isSelected && (
                  <span className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    DOT_COLOR_MAP[option.value]
                  )} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Icon className={cn(
                    "h-4 w-4 shrink-0",
                    isSelected ? "" : "text-muted-foreground/60"
                  )} />
                  <span className={cn(
                    "text-sm font-semibold",
                    isSelected ? "" : "text-foreground"
                  )}>
                    {option.label}
                  </span>
                </div>
                <p className={cn(
                  "text-xs mt-1 leading-relaxed",
                  isSelected ? "opacity-80" : "text-muted-foreground"
                )}>
                  {option.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
