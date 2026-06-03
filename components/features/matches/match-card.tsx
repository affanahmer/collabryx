"use client"

import React, { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { UserPlus, Sparkles, MapPin, Clock, Lightbulb } from "lucide-react"
import { useRouter } from "next/navigation"
import { WhyMatchModal } from "./why-match-modal"
import { GlassCard } from "@/components/shared/glass-card"
import { MatchScoreCompact } from "@/components/shared/match-score"
import { MatchReasonBadge } from "@/components/ui/match-reason-badge"
import { MatchCardDropdown } from "@/components/shared/glass-dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { glass } from "@/lib/utils/glass-variants"
import { formatInitials } from "@/lib/utils/format-initials"
import { getScoreColorClasses } from "@/lib/services/match-scores"

interface MatchCardProps {
    match: {
        id: string
        profileId: string
        name: string
        role: string
        avatar: string
        compatibility: number
        skills: string[]
        interests: string[]
        bio: string
        location?: string
        timezone?: string
        availability?: "full-time" | "part-time" | "side-project"
        collaborationReadiness?: string
        insights?: {
            type: "complementary" | "shared" | "similar"
            text: string
        }[]
        aiConfidence?: number
        aiExplanation?: string
        reasons?: string[]
    }
    index?: number
}

const availabilityLabels: Record<string, string> = {
    "full-time": "Full-time",
    "part-time": "Part-time",
    "side-project": "Side-project"
}

const collaborationLabels: Record<string, { label: string; className: string }> = {
    available: {
        label: "Available now",
        className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
    },
    open: {
        label: "Open to offers",
        className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
    },
    "not-available": {
        label: "Not available",
        className: "bg-muted/50 text-muted-foreground border-border/40"
    }
}

export const MatchCard = React.memo(function MatchCard({ match, index = 0 }: MatchCardProps) {
    const router = useRouter()
    const [whyModalOpen, setWhyModalOpen] = useState(false)
    const [requestSent, setRequestSent] = useState(false)
    const [isSaved, setIsSaved] = useState(false)

    const isStrongMatch = match.compatibility >= 90
    const isLowMatch = match.compatibility < 80
    const scoreColors = getScoreColorClasses(match.compatibility)
    const collab = collaborationLabels[match.collaborationReadiness || "available"] || collaborationLabels.available
    const hasBio = match.bio && match.bio.trim().length > 0
    const hasLocation = match.location && match.location.trim().length > 0
    const hasSkills = match.skills && match.skills.length > 0
    const hasInterests = match.interests && match.interests.length > 0

    const MAX_SKILLS = 4
    const MAX_INTERESTS = 3

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3), ease: "easeOut" }}
                className="h-full"
            >
                <GlassCard
                    hoverable
                    className={cn(
                        "group relative h-full overflow-hidden transition-all duration-300",
                        "bg-card border-border"
                    )}
                    innerClassName="h-full cursor-pointer flex flex-col justify-between"
                    onClick={() => router.push(`/profile/${match.profileId}`)}
                >
                    <div className="flex flex-col h-full p-4">
                        {/* Top Row: Avatar | Name & Role | Match Score */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="relative shrink-0">
                                <div className="relative rounded-full ring-2 ring-border/60 transition-all duration-300 group-hover:ring-primary/40">
                                    <Avatar className="h-14 w-14">
                                        <AvatarImage src={match.avatar} alt={match.name} className="object-cover" />
                                        <AvatarFallback className="text-base font-bold bg-muted text-foreground">
                                            {formatInitials(match.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                                {isStrongMatch && (
                                    <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 backdrop-blur-sm">
                                        <span className="text-[10px]">🔥</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col justify-center h-14">
                                <h3 className="text-sm font-bold tracking-tight text-foreground truncate">
                                    {match.name}
                                </h3>
                                <p className="text-xs text-foreground/70 truncate font-medium">
                                    {match.role}
                                </p>
                            </div>

                            <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div
                                            className="shrink-0 z-10 flex items-center justify-center p-1 -mr-1 -mt-1 cursor-pointer hover:bg-white/5 rounded-md transition-colors min-h-[44px] min-w-[44px]"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setWhyModalOpen(true)
                                            }}
                                        >
                                            <MatchScoreCompact overall={match.compatibility} />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="left" className={cn("max-w-[220px]", scoreColors.bg, scoreColors.border)}>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Sparkles className={cn("h-4 w-4", scoreColors.text)} />
                                                <span className={cn("text-xs font-bold", scoreColors.text)}>
                                                    {match.compatibility}% Match
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground/80">
                                                Click to see detailed breakdown
                                            </p>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        {/* Location + Collaboration Readiness Pill */}
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                            {hasLocation && (
                                <span className="inline-flex items-center gap-1 text-xs text-foreground/60">
                                    <MapPin className="h-3 w-3" />
                                    {match.location}
                                </span>
                            )}
                            <Badge className={cn("text-[10px] px-2 py-0 border", collab.className)}>
                                {collab.label}
                            </Badge>
                        </div>

                        {/* Bio */}
                        {hasBio && (
                            <p className="text-xs text-foreground/70 line-clamp-3 mb-3 leading-relaxed">
                                {match.bio}
                            </p>
                        )}
                        {!hasBio && (
                            <p className="text-xs text-foreground/40 italic line-clamp-2 mb-3 leading-relaxed">
                                No bio yet
                            </p>
                        )}

                        {/* Insights from match reasons */}
                        {match.reasons && match.reasons.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
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

                        {/* Skills Section */}
                        {hasSkills && (
                            <div className="mb-2">
                                <div className="flex flex-wrap gap-1.5 items-center">
                                    {match.skills.slice(0, MAX_SKILLS).map((skill) => (
                                        <Badge
                                            key={skill}
                                            variant="secondary"
                                            className={cn(
                                                "text-[10px] px-2 py-0.5 font-medium",
                                                glass("badge"),
                                                "hover:bg-primary/10 hover:text-primary transition-colors"
                                            )}
                                        >
                                            {skill}
                                        </Badge>
                                    ))}
                                    {match.skills.length > MAX_SKILLS && (
                                        <TooltipProvider delayDuration={300}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "text-[10px] px-2 py-0.5 font-medium border-dashed cursor-help",
                                                            glass("badge")
                                                        )}
                                                    >
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
                            </div>
                        )}

                        {/* Interests Section */}
                        {hasInterests && (
                            <div className="mb-auto">
                                <div className="flex flex-wrap gap-1 items-center">
                                    {match.interests.slice(0, MAX_INTERESTS).map((interest) => (
                                        <Badge
                                            key={interest}
                                            variant="outline"
                                            className="text-[10px] px-2 py-0.5 font-medium text-muted-foreground border-border/50"
                                        >
                                            {interest}
                                        </Badge>
                                    ))}
                                    {match.interests.length > MAX_INTERESTS && (
                                        <span className="text-[10px] text-muted-foreground/50">+{match.interests.length - MAX_INTERESTS}</span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Bottom Row: Action Buttons */}
                        <div className="flex gap-2 mt-4 pt-3 border-t border-border/40 items-center">
                            {!requestSent ? (
                                <Button
                                    className={cn(
                                        "flex-1 h-9 text-xs font-medium",
                                        glass("buttonPrimary"),
                                        glass("buttonPrimaryGlow")
                                    )}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setRequestSent(true)
                                    }}
                                >
                                    <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                                    Connect
                                </Button>
                            ) : (
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "flex-1 h-9 text-xs font-medium border-emerald-500/20 bg-emerald-500/10 text-emerald-500 transition-colors",
                                        "hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 group/cancel"
                                    )}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setRequestSent(false)
                                    }}
                                >
                                    <span className="group-hover/cancel:hidden flex items-center justify-center w-full">Request Sent</span>
                                    <span className="hidden group-hover/cancel:flex items-center justify-center w-full">Cancel Request</span>
                                </Button>
                            )}

                            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
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

            <WhyMatchModal
                open={whyModalOpen}
                onOpenChange={setWhyModalOpen}
                match={match}
            />
        </>
    )
})
