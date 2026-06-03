/**
 * Analytics Chart Component
 * 
 * Displays activity over time with bar chart visualization
 */

"use client"

import { useState } from "react"
import { GlassCard } from "@/components/shared/glass-card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { AnalyticsActivityData } from "@/types/database.types"

interface AnalyticsChartProps {
  activity?: AnalyticsActivityData[]
  isLoading?: boolean
  timeRange?: 7 | 30 | 90
  onTimeRangeChange?: (days: 7 | 30 | 90) => void
}

interface BarChartProps {
  data: AnalyticsActivityData[]
  metric: "profile_views" | "matches" | "connections" | "posts"
}

function BarChart({ data, metric }: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d[metric]), 1)
  
  const getBarColor = (value: number, index: number) => {
    const colors = [
      "bg-primary",
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
    ]
    return colors[index % colors.length]
  }

  const getMetricLabel = (m: string) => {
    switch (m) {
      case "profile_views":
        return "Profile Views"
      case "matches":
        return "Matches"
      case "connections":
        return "Connections"
      case "posts":
        return "Posts"
      default:
        return m
    }
  }

  return (
    <div className="w-full">
      <div className="flex items-end justify-between gap-1 h-48 mt-4">
        {data.map((day, index) => {
          const value = day[metric]
          const height = (value / maxValue) * 100
          const date = new Date(day.date)
          const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "short" })
          const dayOfMonth = date.getDate()

          return (
            <div
              key={day.date}
              className="flex flex-col items-center gap-1 flex-1 group"
            >
              <div className="relative w-full flex justify-center">
                {value > 0 && (
                  <div
                    className={`w-full max-w-[24px] rounded-t-md transition-all duration-300 ${getBarColor(value, index)} hover:opacity-80`}
                    style={{ height: `${Math.max(height, 4)}%` }}
                  >
                    {value > 0 && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        {value}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground text-center">
                <div className="hidden sm:block">{dayOfWeek}</div>
                <div className="sm:hidden">{dayOfMonth}</div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-4 text-center text-sm text-muted-foreground">
        {getMetricLabel(metric)} over time
      </div>
    </div>
  )
}

export function AnalyticsChart({
  activity,
  isLoading,
  timeRange = 30,
  onTimeRangeChange,
}: AnalyticsChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<"profile_views" | "matches" | "connections" | "posts">(
    "profile_views"
  )

  if (isLoading) {
    return (
      <GlassCard>
        <div className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48 mt-2" />
            </div>
            <Skeleton className="h-9 w-32" />
          </div>
          <Skeleton className="h-48 w-full" />
        </div>
      </GlassCard>
    )
  }

  if (!activity || activity.length === 0) {
    return (
      <GlassCard>
        <div className="p-6 space-y-2">
          <h3 className="text-lg font-semibold">Activity Chart</h3>
          <p className="text-sm text-muted-foreground">No activity data available yet</p>
        </div>
      </GlassCard>
    )
  }

  return (
    <GlassCard>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-lg font-semibold">Activity Over Time</h3>
            <p className="text-sm text-muted-foreground">
              Track your engagement across the platform
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tabs
              value={timeRange.toString()}
              onValueChange={(value) => onTimeRangeChange?.(Number(value) as 7 | 30 | 90)}
            >
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="7">7D</TabsTrigger>
                <TabsTrigger value="30">30D</TabsTrigger>
                <TabsTrigger value="90">90D</TabsTrigger>
              </TabsList>
            </Tabs>
            <Select
              value={selectedMetric}
              onValueChange={(value: "profile_views" | "matches" | "connections" | "posts") =>
                setSelectedMetric(value)
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="profile_views">Profile Views</SelectItem>
                <SelectItem value="matches">Matches</SelectItem>
                <SelectItem value="connections">Connections</SelectItem>
                <SelectItem value="posts">Posts</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <BarChart data={activity} metric={selectedMetric} />
      </div>
    </GlassCard>
  )
}
