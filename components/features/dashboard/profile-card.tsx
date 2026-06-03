"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { MapPin, Link as LinkIcon, Eye, Users, Loader2 } from "lucide-react"
import Link from "next/link"
import { GlassCard } from "@/components/shared/glass-card"
import { useProfile } from "@/hooks/use-profile"
import { useUserAnalytics } from "@/hooks/use-analytics"
import { formatInitials } from "@/lib/utils/format-initials"

function ProfileCardSkeleton() {
    return (
        <GlassCard>
            <div className="h-16 sm:h-20 bg-gradient-to-r from-primary/40 to-primary/20 rounded-t-xl md:rounded-t-2xl animate-pulse" />
            <div className="relative px-3 sm:px-4 md:px-6 pb-2 pt-0">
                <div className="relative -top-8 sm:-top-10 mb-[-2rem] sm:mb-[-2.5rem]">
                    <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-muted animate-pulse border-4 border-background" />
                </div>
                <div className="pt-10 sm:pt-12 space-y-3">
                    <div className="h-5 w-32 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-48 bg-muted rounded animate-pulse" />
                </div>
            </div>
            <div className="px-3 sm:px-4 md:px-6 pb-4 space-y-3">
                <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                <div className="h-3 w-36 bg-muted rounded animate-pulse" />
                <Separator className="bg-white/[0.06]" />
                <div className="space-y-2">
                    <div className="h-4 w-full bg-muted rounded animate-pulse" />
                    <div className="h-4 w-full bg-muted rounded animate-pulse" />
                </div>
            </div>
        </GlassCard>
    )
}

export function ProfileCard() {
    const { data: profile, isLoading: profileLoading, isError: profileError } = useProfile()
    const { data: analytics, isLoading: analyticsLoading } = useUserAnalytics()

    if (profileLoading || analyticsLoading) return <ProfileCardSkeleton />

    if (profileError || !profile) {
        return (
            <GlassCard>
                <div className="h-16 sm:h-20 bg-gradient-to-r from-primary/40 to-primary/20 rounded-t-xl md:rounded-t-2xl" />
                <div className="px-3 sm:px-4 md:px-6 py-6 text-center">
                    <p className="text-sm text-muted-foreground">Unable to load profile.</p>
                </div>
            </GlassCard>
        )
    }

    const displayName = profile.display_name || profile.full_name || "User"
    const initials = formatInitials(displayName)
    const avatarUrl = profile.avatar_url
    const headline = profile.headline
    const location = profile.location

    // Real social link: prefer github, then linkedin, then website
    const websiteUrl = profile.github_url || profile.linkedin_url || profile.website_url

    // REAL analytics data from user_analytics table
    const profileViews = analytics?.profile_views_count ?? 0
    const connectionsCount = analytics?.connections_count ?? 0

    return (
        <GlassCard>
            {/* Banner — real if user uploaded one */}
            {profile.banner_url ? (
                <div
                    className="h-16 sm:h-20 rounded-t-xl md:rounded-t-2xl bg-cover bg-center"
                    style={{ backgroundImage: `url(${profile.banner_url})` }}
                />
            ) : (
                <div className="h-16 sm:h-20 bg-gradient-to-r from-primary to-primary/60 rounded-t-xl md:rounded-t-2xl" />
            )}

            <div className="relative px-3 sm:px-4 md:px-6 pb-2 pt-0">
                {/* Avatar — real photo or initials fallback */}
                <div className="relative -top-8 sm:-top-10 mb-[-2rem] sm:mb-[-2.5rem] w-fit">
                    <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-4 border-background shadow-sm">
                        {avatarUrl ? (
                            <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" />
                        ) : null}
                        <AvatarFallback className="bg-primary/10 text-primary text-lg sm:text-xl font-bold">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                </div>

                {/* Name + Headline */}
                <div className="pt-10 sm:pt-12">
                    <Link href={`/profile/${profile.id}`} className="hover:underline">
                        <h3 className="font-bold text-base sm:text-lg leading-tight text-foreground">{displayName}</h3>
                    </Link>
                    {headline && (
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">{headline}</p>
                    )}
                </div>
            </div>

            <div className="space-y-3 sm:space-y-4 pt-2 px-3 sm:px-4 md:px-6 pb-4">
                {/* Location + Social Link — real data */}
                {(location || websiteUrl) && (
                    <div className="flex flex-col gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                        {location && (
                            <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                                <span className="truncate">{location}</span>
                            </div>
                        )}
                        {websiteUrl && (
                            <div className="flex items-center gap-2 min-w-0">
                                <LinkIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                                <Link
                                    href={websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="hover:underline hover:text-primary transition-colors truncate"
                                >
                                    {websiteUrl.replace(/^https?:\/\//, "")}
                                </Link>
                            </div>
                        )}
                    </div>
                )}

                <Separator className="bg-white/[0.06]" />

                {/* Stats — REAL data from user_analytics table */}
                <div className="space-y-1.5 sm:space-y-2">
                    <Link
                        href={`/profile/${profile.id}`}
                        className="flex justify-between text-xs sm:text-sm group cursor-pointer hover:bg-white/[0.04] p-1 -mx-1 rounded-md transition-colors no-underline"
                    >
                        <span className="text-muted-foreground flex items-center gap-1.5 sm:gap-2">
                            <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Profile Views
                        </span>
                        <span className="font-medium text-primary">{profileViews.toLocaleString()}</span>
                    </Link>
                    <Link
                        href="/connections"
                        className="flex justify-between text-xs sm:text-sm group cursor-pointer hover:bg-white/[0.04] p-1 -mx-1 rounded-md transition-colors no-underline"
                    >
                        <span className="text-muted-foreground flex items-center gap-1.5 sm:gap-2">
                            <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Connections
                        </span>
                        <span className="font-medium text-primary">{connectionsCount.toLocaleString()}</span>
                    </Link>
                </div>
            </div>
        </GlassCard>
    )
}
