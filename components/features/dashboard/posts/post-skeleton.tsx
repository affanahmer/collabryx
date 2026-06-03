import { Skeleton } from "@/components/ui/skeleton"
import { PostCard } from "./post-card"

interface PostSkeletonProps {
    variant?: "withMedia" | "withoutMedia" | "withLink"
}

// Base skeleton structure shared across variants
function PostSkeletonBase({ children }: { children: React.ReactNode }) {
    return (
        <PostCard>
            {/* Header */}
            <div className="flex items-center gap-4 mb-4">
                <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                <div className="space-y-2 flex-1 min-w-0">
                    <Skeleton className="h-4 w-32 max-w-full" />
                    <Skeleton className="h-3 w-24 max-w-full" />
                </div>
            </div>
            
            {/* Content */}
            {children}
            
            {/* Actions */}
            <div className="flex gap-2 pt-4 mt-4 border-t border-border/40">
                <Skeleton className="h-10 w-24 rounded-lg" />
                <Skeleton className="h-10 w-24 rounded-lg" />
                <Skeleton className="h-10 w-24 rounded-lg" />
            </div>
        </PostCard>
    )
}

export function PostSkeleton({ variant = "withMedia" }: PostSkeletonProps) {
    if (variant === "withoutMedia") {
        return (
            <PostSkeletonBase>
                <div className="space-y-2 min-h-[72px]">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[90%]" />
                    <Skeleton className="h-4 w-[75%]" />
                </div>
            </PostSkeletonBase>
        )
    }

    if (variant === "withLink") {
        return (
            <PostSkeletonBase>
                <div className="space-y-2 mb-4 min-h-[40px]">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[90%]" />
                </div>
                {/* Link Preview */}
                <div className="rounded-xl border border-border/40 overflow-hidden min-h-[200px]">
                    <Skeleton className="h-32 w-full !rounded-none" />
                    <div className="p-3 sm:p-4 space-y-2">
                        <Skeleton className="h-4 w-[80%]" />
                        <Skeleton className="h-3 w-[60%]" />
                    </div>
                </div>
            </PostSkeletonBase>
        )
    }

    // Default: withMedia variant
    return (
        <PostSkeletonBase>
            <div className="space-y-2 mb-4 min-h-[40px]">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[90%]" />
            </div>
            {/* Media Placeholder */}
            <Skeleton className="h-48 sm:h-56 w-full rounded-xl" />
        </PostSkeletonBase>
    )
}

// Renders multiple skeletons with varied types for realistic loading
interface PostSkeletonListProps {
    count?: number
}

export function PostSkeletonList({ count = 5 }: PostSkeletonListProps) {
    const variants: PostSkeletonProps["variant"][] = [
        "withMedia",
        "withoutMedia",
        "withLink",
        "withMedia",
        "withoutMedia",
    ]

    return (
        <div className="space-y-4 md:space-y-6" role="status" aria-label="Posts loading">
            {Array.from({ length: count }).map((_, i) => (
                <PostSkeleton 
                    key={i} 
                    variant={variants[i % variants.length]} 
                />
            ))}
        </div>
    )
}
