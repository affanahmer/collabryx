/**
 * Format a name into initials (first 2 characters, uppercase)
 * @param name - Full name string (e.g., "John Doe" → "JD")
 * @returns Formatted initials (max 2 characters)
 */
export function formatInitials(name: string): string {
  if (!name || name.trim() === "") {
    return ""
  }
  
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0][0].toUpperCase()
  }
  
  // For multiple names: first letter of first and last name
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Format initials from name, with fallback handling
 * @param name - Name string (can be null/undefined)
 * @param fallback - Fallback initials (default: "U")
 * @returns Formatted initials
 */
export function getInitials(name: string | null | undefined, fallback = "U"): string {
  if (!name || name.trim() === "") {
    return fallback
  }
  
  return formatInitials(name)
}
