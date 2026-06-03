/**
 * Date formatting utilities — centralized pure functions for all date display needs
 *
 * ADDED FUNCTIONS:
 *
 * 1. formatRelativeTime(date):
 *    Problem: Profile display needed a "last updated" indicator but had no
 *    relative time formatter. Existing formatJoinDate only handles "Jan 2024"
 *    absolute format.
 *    Solution: Pure function returning human-readable relative timestamps:
 *    "just now" (<60s), "5m ago" (<1h), "3h ago" (<24h), "2d ago" (<7d),
 *    "1w ago" (<5w), "3mo ago" (<12mo), "1y ago" (12mo+). Gracefully handles
 *    null/undefined/NaN inputs by returning "Unknown".
 *
 * 2. formatDuration(start, end):
 *    Problem: Experience timeline showed date ranges but never calculated the
 *    actual duration ("Jan 2020 - Present" without "5 yrs 2 mos"). This is a
 *    standard professional network feature for quick career depth assessment.
 *    Solution: Pure function computing year/month difference between two dates.
 *    If end is null/undefined, uses current date (for "Present" entries).
 *    Output format: "2 yrs 3 mos", "6 mos", "< 1 mo". Graceful degradation
 *    for invalid/missing dates returns empty string.
 *
 * DESIGN DECISIONS:
 * - Both functions are pure (same inputs → same outputs, no side effects)
 * - No external dependencies (no moment.js, date-fns) — keeps bundle small
 * - Graceful null/undefined handling means callers don't need conditional checks
 * - formatDuration intentionally doesn't round (2y 11mo ≠ 3y) for accuracy
 */
/**
 * Format a date string/timestamp into a human-readable "Month YYYY" format for join dates
 * @param date - Date string, ISO timestamp, or Date object
 * @returns Formatted string (e.g., "Jan 2024")
 */
export function formatJoinDate(date: string | Date | null | undefined): string {
  if (!date) return "Unknown"

  try {
    const d = typeof date === "string" ? new Date(date) : date
    if (isNaN(d.getTime())) return "Unknown"

    return d.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    })
  } catch {
    return "Unknown"
  }
}

/**
 * Format a date range string
 * @param startDate - Start date string
 * @param endDate - End date string (optional, null for "Present")
 * @returns Formatted string (e.g., "Jan 2020 - Present" or "Jan 2020 - Mar 2023")
 */
export function formatDateRange(startDate: string | null | undefined, endDate: string | null | undefined): string {
  const start = formatJoinDate(startDate)
  const end = endDate ? formatJoinDate(endDate) : "Present"
  return `${start} - ${end}`
}

/**
 * Calculate duration between two dates in human-readable form
 * @param startDate - Start date string
 * @param endDate - End date string (null = "Present")
 * @returns Formatted string (e.g., "2 yrs 3 mos" or "6 mos")
 */
export function formatDuration(startDate: string | null | undefined, endDate: string | null | undefined): string {
  if (!startDate) return ""

  try {
    const start = new Date(startDate)
    if (isNaN(start.getTime())) return ""

    const end = endDate ? new Date(endDate) : new Date()
    if (isNaN(end.getTime())) return ""

    let years = end.getFullYear() - start.getFullYear()
    let months = end.getMonth() - start.getMonth()

    if (months < 0) {
      years--
      months += 12
    }

    const parts: string[] = []
    if (years > 0) parts.push(`${years} ${years === 1 ? 'yr' : 'yrs'}`)
    if (months > 0) parts.push(`${months} ${months === 1 ? 'mo' : 'mos'}`)
    if (parts.length === 0) return "< 1 mo"

    return parts.join(" ")
  } catch {
    return ""
  }
}

/**
 * Format a date as relative time (e.g., "2 days ago", "3 months ago")
 * @param date - Date string or Date object
 * @returns Relative time string
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return "Unknown"

  try {
    const d = typeof date === "string" ? new Date(date) : date
    if (isNaN(d.getTime())) return "Unknown"

    const now = Date.now()
    const diffMs = now - d.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)
    const diffWeek = Math.floor(diffDay / 7)
    const diffMonth = Math.floor(diffDay / 30)

    if (diffSec < 60) return "just now"
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHour < 24) return `${diffHour}h ago`
    if (diffDay < 7) return `${diffDay}d ago`
    if (diffWeek < 5) return `${diffWeek}w ago`
    if (diffMonth < 12) return `${diffMonth}mo ago`
    return `${Math.floor(diffMonth / 12)}y ago`
  } catch {
    return "Unknown"
  }
}
