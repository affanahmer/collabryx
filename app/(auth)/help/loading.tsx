import { Skeleton } from "@/components/ui/skeleton"

export default function HelpLoading() {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 md:px-6">
      <div className="mb-8 text-center space-y-3">
        <Skeleton className="h-8 w-64 mx-auto" />
        <Skeleton className="h-4 w-80 mx-auto" />
        <Skeleton className="h-12 max-w-xl mx-auto rounded-lg" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 border rounded-xl bg-card">
            <div className="flex items-start gap-4">
              <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
