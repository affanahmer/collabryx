import nextDynamic from 'next/dynamic'
import type { Metadata } from "next"
import { ProfileCard } from "@/components/features/dashboard/profile-card"

const Feed = nextDynamic(
  () => import("@/components/features/dashboard/feed").then(mod => ({ default: mod.Feed })),
  {
    ssr: true
  }
)

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
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Left Column - Profile Card (sidebar) */}
                <aside className="w-full lg:w-80 xl:w-96 shrink-0">
                    <div className="lg:sticky lg:top-24 space-y-6">
                        <ProfileCard />
                    </div>
                </aside>

                {/* Right Column - Feed (centered in remaining space) */}
                <div className="flex-1 min-w-0 flex justify-center">
                    <div className="w-full max-w-2xl">
                        <Feed />
                    </div>
                </div>
            </div>
        </div>
    )
}
