"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { UserPlus, MapPin } from "lucide-react"
import { motion } from "framer-motion"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { GlassCard } from "@/components/shared/glass-card"
import { MatchScoreCompact } from "@/components/shared/match-score"
import { MatchReasonBadge } from "@/components/ui/match-reason-badge"
import { MatchCardDropdown } from "@/components/shared/glass-dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { formatInitials } from "@/lib/utils/format-initials"
import { cn } from "@/lib/utils"
import { glass } from "@/lib/utils/glass-variants"

interface Insight {
    type: "complementary" | "shared" | "similar"
    text: string
}

interface Match {
    id: string
    profileId: string
    name: string
    role: string
    avatar: string
    compatibility: number
    skills: string[]
    interests: string[]
    bio: string
    insights?: Insight[]
    location?: string
    timezone?: string
    availability?: "full-time" | "part-time" | "side-project"
    collaborationReadiness?: string
    reasons?: string[]
}

const collaborationLabels: Record<string, { label: string; className: string }> = {
    available: {
        label: "Available",
        className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
    },
    open: {
        label: "Open",
        className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
    },
    "not-available": {
        label: "Busy",
        className: "bg-muted/50 text-muted-foreground border-border/40"
    }
}

interface MatchCardListViewProps {
    match: Match
    index: number
}

const MAX_SKILLS = 3
const MAX_INTERESTS = 2

export function MatchCardListView({ match, index }: MatchCardListViewProps) {
    const router = useRouter()
    const [isSaved, setIsSaved] = useState(false)
    const [requestSent, setRequestSent] = useState(false)

    const isStrongMatch = match.compatibility >= 90
    const collab = collaborationLabels[match.collaborationReadiness || "available"] || collaborationLabels.available
    const hasSkills = match.skills && match.skills.length > 0

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
                className="group"
            >
                <GlassCard
                    hoverable
                    className="p-3 sm:p-4 cursor-pointer bg-card border-border"
                    onClick={() => router.push(`/profile/${match.profileId}`)}
                >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                        <div className="relative shrink-0">
                            <Avatar className="h-14 w-14 sm:h-14 sm:w-14 border border-border shrink-0">
                                <AvatarImage src={match.avatar} className="object-cover" />
                                <AvatarFallback className="text-base font-bold bg-muted text-foreground">
                                    {formatInitials(match.name)}
                                </AvatarFallback>
                            </Avatar>
                            {isStrongMatch && (
                                <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 backdrop-blur-sm">
                                    <span className="text-[10px]">🔥</span>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0 w-full">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                                <h3 className="font-bold text-sm sm:text-base truncate text-foreground">{match.name}</h3>
                                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 shrink-0 bg-muted/50 text-foreground/70 border border-border">
                                    {match.role}
                                </Badge>
                            </div>

                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                {match.location && (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-foreground/60">
                                        <MapPin className="h-3 w-3" />
                                        {match.location}
                                    </span>
                                )}
                                <Badge className={cn("text-[10px] px-1.5 py-0 border", collab.className)}>
                                    {collab.label}
                                </Badge>
                            </div>

                            <div className="flex flex-col gap-1.5 mb-1.5">
                                {match.reasons && match.reasons.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        <MatchReasonBadge
                                            type="skill"
                                            label={match.reasons[0]}
                                            className="text-[10px] py-0 px-2"
                                        />
                                        {match.reasons.length > 1 && (
                                            <span className="text-[10px] text-foreground/50 flex items-center">+{match.reasons.length - 1}</span>
                                        )}
                                    </div>
                                )}

                                {hasSkills && (
                                    <div className="flex flex-wrap gap-1 items-center">
                                        {match.skills.slice(0, MAX_SKILLS).map((skill) => (
                                            <Badge
                                                key={skill}
                                                variant="secondary"
                                                className={cn(
                                                    "text-[10px] px-2 py-0.5 font-medium",
                                                    glass("badge")
                                                )}
                                            >
                                                {skill}
                                            </Badge>
                                        ))}
                                        {match.skills.length > MAX_SKILLS && (
                                            <TooltipProvider delayDuration={300}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-medium border-dashed text-foreground/60 cursor-help">
                                                            +{match.skills.length - MAX_SKILLS}
                                                        </Badge>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="max-w-[200px] text-xs">
                                                        <p>{match.skills.slice(MAX_SKILLS).join(", ")}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}
                                    </div>
                                )}

                                {match.interests && match.interests.length > 0 && (
                                    <div className="flex flex-wrap gap-1 items-center">
                                        {match.interests.slice(0, MAX_INTERESTS).map((interest) => (
                                            <Badge
                                                key={interest}
                                                variant="outline"
                                                className="text-[10px] px-2 py-0.5 font-medium text-foreground/70 border-border/50"
                                            >
                                                {interest}
                                            </Badge>
                                        ))}
                                        {match.interests.length > MAX_INTERESTS && (
                                            <span className="text-[10px] text-foreground/50">+{match.interests.length - MAX_INTERESTS}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="shrink-0 hidden sm:block">
                            <MatchScoreCompact overall={match.compatibility} horizontal />
                        </div>

                        <div className="flex items-center gap-2 shrink-0 sm:flex-col lg:flex-row mt-3 sm:mt-0 w-full sm:w-auto overflow-hidden">
                            {!requestSent ? (
                                <Button
                                    size="sm"
                                    className="h-[36px] min-h-[36px] text-xs font-medium w-full sm:w-[110px] flex-1 sm:flex-none"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setRequestSent(true)
                                    }}
                                >
                                    <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                                    Connect
                                </Button>
                            ) : (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-[36px] min-h-[36px] text-xs w-full sm:w-[110px] flex-1 sm:flex-none bg-emerald-500/10 text-emerald-500 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 border-emerald-500/20 group/cancel transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setRequestSent(false)
                                    }}
                                >
                                    <span className="group-hover/cancel:hidden flex items-center justify-center w-full">Request Sent</span>
                                    <span className="hidden group-hover/cancel:flex items-center justify-center w-full">Cancel</span>
                                </Button>
                            )}

                            <div className="shrink-0 flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                                <MatchCardDropdown
                                    isSaved={isSaved}
                                    onSave={() => setIsSaved(!isSaved)}
                                    onViewProfile={() => router.push(`/profile/${match.id}`)}
                                    onReport={() => { }}
                                    onCopyLink={() => navigator.clipboard.writeText(window.location.href)}
                                />
                            </div>
                        </div>
                    </div>
                </GlassCard>
            </motion.div>
        </>
    )
}
