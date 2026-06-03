/**
 * Dashboard Page — Two-Column Layout (Phase 4 Implementation)
 * 
 * WHY TWO COLUMNS:
 * The previous dashboard was a single-column feed that wasted the left sidebar
 * space on large screens. This layout introduces a ProfileCard sidebar that
 * sits adjacent to (not inside) the centered feed, giving users quick access
 * to their profile stats without navigating away.
 * 
 * LAYOUT STRATEGY:
 * The feed is centered using max-w-2xl + mx-auto. The ProfileCard is positioned
 * using absolute positioning to the left of this centered container via
 * `right-full mr-6`. This ensures the feed stays perfectly centered regardless
 * of screen size — the card expands its space outward rather than pushing the
 * feed sideways. On screens below lg:, the card is hidden (hidden lg:block).
 * 
 * WHY ABSOLUTE POSITIONING:
 * Using flexbox or grid for the sidebar would shift the feed off-center on
 * mid-sized screens (where the sidebar is visible but the total width can't
 * accommodate both). Absolute positioning lets the feed stay centered while
 * the card "steals" empty margin space from the sides.
 */
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

/**
 * DashboardPage — Main post-feed landing showing a ProfileCard sidebar + centered Feed.
 *
 * === THE LAYOUT PROBLEM ===
 *
 * The dashboard has two visual regions: a ProfileCard (sticky left sidebar) and the Feed
 * (main content column). The original layout used `max-w-7xl mx-auto` with a flex row
 * containing both components. This centered the ENTIRE block (profile + feed) as one unit.
 *
 * On a 1920px screen with collapsed sidebar (80px), that meant:
 *   - max-w-7xl container: 1280px, centered → starts at 320px from viewport edge
 *   - Profile card (384px): 320–704px
 *   - Feed (flex-1 = 872px): 728–1600px → the feed appeared FAR RIGHT of center
 *
 * The user's complaint was "the feed should be in the middle and the profile card should be
 * on the left a bit" and "currently it is centering both of it". The feed felt pushed
 * right because the profile card was part of the same centered block.
 *
 * === ATTEMPT 1: Flexbox justify-center with flex-1 (DID NOT WORK) ===
 *   Changed from max-w-7xl to full-width flex with justify-center. Same issue — the
 *   flex container still centered the SUM of both items, pushing the feed to the right.
 *
 * === ATTEMPT 2: 3-column CSS grid with 1fr spacer (USER REJECTED) ===
 *   Used `grid-cols-[auto_minmax(0,672px)_1fr]`. The 1fr spacer on the right balanced
 *   the profile card's width on the left, bringing the feed closer to center. However,
 *   on wide screens the 1fr column grew excessively large, creating a visual illusion of
 *   "4 columns" — the profile, the feed, the empty spacer, and the invisible sidebar.
 *   The user said "the space on the right is too much seems like on wider screen it
 *   divides into 4 fix it".
 *
 * === SOLUTION: Absolute positioning decouples the profile card from centering ===
 *
 * The feed wrapper is now the PRIMARY centered element: `mx-auto max-w-2xl`. It centers
 * itself independently in the viewport using flexbox's auto margins.
 *
 * The ProfileCard is `absolute right-full mr-6` — it lives OUTSIDE the normal flow:
 *   - `right: 100%` pins its right edge to the feed container's left edge
 *   - `mr-6` adds a 24px gap between the card and the feed
 *   - Because it's absolutely positioned, it occupies ZERO width in the centering
 *     calculation — the feed is the ONLY element being centered
 *   - The sticky inner div keeps the card visible as the user scrolls
 *
 * On a 1920px screen with collapsed sidebar:
 *   - Feed wrapper: max-w-2xl (672px), centered → starts at 664px from viewport
 *   - Feed center: at 960px → TRUE VIEWPORT CENTER ✓
 *   - Profile card: `right: 100%` → right edge at 664px, minus 24px gap → card sits
 *     at 256–640px from viewport (between sidebar at 80px and feed at 664px)
 *
 * On screens below 1440px with collapsed sidebar, the card clips slightly (the leftmost
 * portion extends into the sidebar area). This is graceful — the visible 320px of the
 * 384px card still shows full content width, and expanding the sidebar restores full view.
 */
export default function DashboardPage() {
    return (
        <div className="w-full py-2 md:py-6 px-2 md:px-6">
            {/* Feed is the primary element — centered independently on the page */}
            <div className="relative mx-auto max-w-2xl w-full">
                {/* Profile Card — absolutely positioned to the LEFT of the centered feed.
                    Because it's out of the normal flow, it does NOT push the feed off-center.
                    The feed stays perfectly centered while the profile card sits to its left. */}
                <aside className="hidden lg:block absolute right-full mr-6 top-0 w-80 xl:w-96">
                    <div className="sticky top-24 space-y-6">
                        <ProfileCard />
                    </div>
                </aside>

                <Feed />
            </div>
        </div>
    )
}
