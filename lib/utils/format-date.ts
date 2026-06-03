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
