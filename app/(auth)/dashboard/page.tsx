import nextDynamic from 'next/dynamic'
import { GlassCard } from "@/components/shared/glass-card"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
// lucide-react imports used by child components
import type { Metadata } from "next"
import Link from "next/link"

// Code-split heavy components with dynamic imports
// These load on-demand to reduce initial bundle size
const Feed = nextDynamic(
  () => import("@/components/features/dashboard/feed").then(mod => ({ default: mod.Feed })),
  { 
    loading: () => <FeedSkeleton />,
    ssr: true 
  }
)

const SuggestionsSidebar = nextDynamic(
  () => import("@/components/features/dashboard/suggestions-sidebar").then(mod => ({ default: mod.SuggestionsSidebar })),
  { 
    loading: () => <SuggestionsSkeleton />,
    ssr: true 
  }
)

const ActivityFeed = nextDynamic(
  () => import("@/components/features/activity/activity-feed").then(mod => ({ default: mod.ActivityFeed })),
  { 
    loading: () => <ActivitySkeleton />,
    ssr: true 
  }
)

// Skeleton loaders for better UX during code-split loading
function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-card border border-border rounded-xl p-6 animate-pulse">
          <div className="h-4 bg-white/10 rounded w-3/4 mb-4" />
          <div className="h-3 bg-white/10 rounded w-full mb-2" />
          <div className="h-3 bg-white/10 rounded w-2/3" />
        </div>
      ))}
    </div>
  )
}

function SuggestionsSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 animate-pulse">
      <div className="h-5 bg-white/10 rounded w-1/2 mb-4" />
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-white/10" />
          <div className="flex-1">
            <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
            <div className="h-3 bg-white/10 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ActivitySkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3 animate-pulse">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-white/10" />
          <div className="flex-1">
            <div className="h-3 bg-white/10 rounded w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

export const revalidate = 60

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Dashboard | Collabryx",
  description: "Your personalized collaboration dashboard. Discover posts, opportunities, and connect with your network.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function DashboardPage() {
    return (
        <div className="container max-w-7xl mx-auto py-2 md:py-6 px-2 md:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
                {/* Main Feed */}
                <div className="lg:col-span-8 max-w-2xl mx-auto lg:mx-0 lg:max-w-none w-full">
                    <Feed />
                </div>
                
                {/* Sidebar */}
                <div className="hidden lg:block lg:col-span-4 sticky top-6 space-y-6">
                    <SuggestionsSidebar />
                    
                    {/* Recent Activity Section */}
                    <GlassCard>
                        <div className="p-4 md:p-6 flex flex-row items-center justify-between space-y-0 border-b border-border">
                            <h3 className="text-base font-semibold flex items-center gap-2 text-foreground">
                                Recent Activity
                            </h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-3 text-sm text-muted-foreground hover:text-primary font-medium transition-colors"
                                asChild
                            >
                                <Link href="/activity">
                                    View All
                                    <ArrowRight className="h-3 w-3 ml-1" />
                                </Link>
                            </Button>
                        </div>
                        <div className="p-4 md:p-6 pt-3 md:pt-4">
                            <ActivityFeed 
                                initialLimit={5} 
                                showViewAll={false}
                            />
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    )
}
