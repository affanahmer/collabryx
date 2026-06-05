"use client"

import { useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Bell, Heart, MessageSquare, UserPlus, Lightbulb, AtSign } from "lucide-react"
import { toast } from "sonner"
import { GlassCard } from "@/components/shared/glass-card"
import { glass } from "@/lib/utils/glass-variants"
import {
    useNotifications,
    useMarkNotificationAsRead,
    useMarkAllNotificationsAsRead,
    useRealtimeNotifications,
} from "@/hooks/use-notifications"
import { useConnectionRequests } from "@/hooks/use-connections"
import type { NotificationWithActor } from "@/lib/services/notifications"

interface DisplayNotification {
    id: string
    type: string
    actor: { id: string; name: string; avatar: string }
    content: string
    time: string
    read: boolean
    connectionId?: string
    postTitle?: string
    postContent?: string
}

interface NotificationsClientProps {
    initialNotifications?: DisplayNotification[]
}

export function NotificationsClient({ initialNotifications }: NotificationsClientProps) {
    const router = useRouter()

    // Real notification data from database hooks
    const { data: dbNotifications = [] } = useNotifications({ limit: 50 })
    const { mutate: markAsRead } = useMarkNotificationAsRead()
    const { mutate: markAllAsRead } = useMarkAllNotificationsAsRead()
    const { acceptRequest, declineRequest } = useConnectionRequests()

    // Subscribe to real-time updates
    useRealtimeNotifications()

    // Map database notifications to display format (fallback to initialNotifications)
    const notifications: DisplayNotification[] = useMemo(() => {
        if (dbNotifications.length > 0) {
            return dbNotifications.map((n: NotificationWithActor) => ({
                id: n.id,
                type: n.type,
                actor: {
                    id: n.actor_id || '',
                    name: n.actor_name || 'Unknown',
                    avatar: n.actor_avatar || '',
                },
                content: n.content,
                time: n.time_ago,
                read: n.is_read,
                connectionId: n.type === 'connect' ? n.resource_id : undefined,
                postTitle: n.post?.title,
                postContent: n.post?.content,
            }))
        }
        return (initialNotifications || []) as DisplayNotification[]
    }, [dbNotifications, initialNotifications])

    const handleMarkAllRead = useCallback(() => {
        markAllAsRead(undefined, {
            onSuccess: () => toast.success("All notifications marked as read"),
            onError: () => toast.error("Failed to mark all as read"),
        })
    }, [markAllAsRead])

    const handleAccept = useCallback(async (n: DisplayNotification) => {
        const id = n.connectionId || n.actor.id
        const success = await acceptRequest(id)
        if (success) {
            toast.success('Connection request accepted')
            markAsRead(n.id)
        } else {
            toast.error('Failed to accept connection request')
        }
    }, [acceptRequest, markAsRead])

    const handleIgnore = useCallback(async (n: DisplayNotification) => {
        const id = n.connectionId || n.actor.id
        const success = await declineRequest(id)
        if (success) {
            toast.success('Connection request declined')
            markAsRead(n.id)
        } else {
            toast.error('Failed to decline connection request')
        }
    }, [declineRequest, markAsRead])

    const unreadCount = notifications.filter(n => !n.read).length

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-2xl">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold">Notifications</h1>
                    {unreadCount > 0 && (
                        <span className="px-2.5 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                            {unreadCount} new
                        </span>
                    )}
                </div>
                <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleMarkAllRead}
                    disabled={unreadCount === 0}
                >
                    Mark all as read
                </Button>
            </div>

            <div className="space-y-4">
                {notifications.length === 0 ? (
                    <GlassCard innerClassName="text-center py-12">
                        <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No notifications yet. Get started by connecting with people!</p>
                    </GlassCard>
                ) : (
                    notifications.map((n) => (
                        <GlassCard
                            key={n.id}
                            className={cn(
                                "group transition-all hover:-translate-y-0.5",
                                !n.read ? "border-l-4 border-l-primary" : ""
                            )}
                            innerClassName="flex items-start gap-4 p-5"
                        >
                            <div className={cn(
                                "mt-1 p-2 rounded-full shrink-0 backdrop-blur-sm",
                                n.type === "connect" && glass("badgeInfo"),
                                n.type === "message" && glass("badgeSuccess"),
                                n.type === "like" && glass("badgeError"),
                                n.type === "mention" && glass("badgeWarning"),
                                n.type === "system" && glass("badgeWarning")
                            )}>
                                {n.type === "connect" && <UserPlus className="h-4.5 w-4.5" />}
                                {n.type === "message" && <MessageSquare className="h-4.5 w-4.5" />}
                                {n.type === "like" && <Heart className="h-4.5 w-4.5" />}
                                {n.type === "mention" && <AtSign className="h-4.5 w-4.5" />}
                                {n.type === "system" && <Bell className="h-4.5 w-4.5" />}
                            </div>

                            <div className="flex-1 space-y-1.5 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                    <p className="text-sm leading-relaxed">
                                        <span className="font-semibold text-foreground">{n.actor.name}</span> <span className="text-muted-foreground">{n.content}</span>
                                    </p>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">{n.time}</span>
                                </div>

                                {/* Post preview for comment/like notifications */}
                                {n.postContent && (n.type === "comment" || n.type === "like") && (
                                    <div className="mt-1 pl-3 border-l-2 border-muted-foreground/20">
                                        <p className="text-xs text-muted-foreground/70 line-clamp-2 italic">
                                            {n.postContent.slice(0, 120)}
                                            {n.postContent.length > 120 ? '...' : ''}
                                        </p>
                                    </div>
                                )}

                                {n.type === "connect" && (
                                    <div className="flex flex-col sm:flex-row gap-2 mt-3">
                                        <div className="flex gap-2">
                                            <Button size="sm" className="h-8 px-4" onClick={() => handleAccept(n)}>Accept</Button>
                                            <Button size="sm" variant="outline" className="h-8 px-4" onClick={() => handleIgnore(n)}>Ignore</Button>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className={cn(
                                                "h-8 px-4",
                                                "border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40"
                                            )}
                                            onClick={() => router.push(`/ai-mentor?collaborate=${n.actor.id}`)}
                                        >
                                            <Lightbulb className="mr-1.5 h-3.5 w-3.5" />
                                            See What You Can Build
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </GlassCard>
                    ))
                )}
            </div>
        </div>
    )
}
