/**
 * Construct semantic text from profile data
 * Used for embedding generation
 */
export function constructSemanticText(
  profile: {
    role?: string;
    headline?: string;
    bio?: string;
    looking_for?: string[];
    location?: string;
  },
  skills: { skill_name: string; proficiency?: string }[],
  interests: { interest: string }[]
): string {
  const MAX_SEMANTIC_TEXT_LENGTH = 2000;

  const skillsText = skills.length > 0
    ? skills.map(s => s.skill_name).join(', ')
    : 'None';

  const interestsText = interests.length > 0
    ? interests.map(i => i.interest).join(', ')
    : 'None';

  const goalsText = profile.looking_for && profile.looking_for.length > 0
    ? profile.looking_for.join(', ')
    : 'None';

  const baseText = `Role: ${profile.role || 'User'}.
Headline: ${profile.headline || ''}.
Bio: ${profile.bio || ''}.
Skills: ${skillsText}.
Interests: ${interestsText}.
Goals: ${goalsText}.
Location: ${profile.location || ''}.`.trim();

  // Truncate to MAX_SEMANTIC_TEXT_LENGTH while preserving structure
  if (baseText.length <= MAX_SEMANTIC_TEXT_LENGTH) {
    return baseText;
  }

  // First truncate the full text, then extract header from original
  const truncatedText = baseText.slice(0, MAX_SEMANTIC_TEXT_LENGTH);

  // Find header end from ORIGINAL baseText (before truncation)
  // This is critical because after truncation, ". Bio:" may no longer be present
  const bioMarkerIndex = baseText.indexOf('. Bio:');
  if (bioMarkerIndex === -1) {
    // No bio marker found, just truncate
    return truncatedText;
  }

  const headerEnd = bioMarkerIndex + 6; // +6 to include ". Bio: "

  // If header itself exceeds limit, just return truncated text
  if (headerEnd >= MAX_SEMANTIC_TEXT_LENGTH) {
    return truncatedText;
  }

  // Reconstruct: header from original + truncated bio portion
  const header = baseText.slice(0, headerEnd);
  const maxBioLength = MAX_SEMANTIC_TEXT_LENGTH - headerEnd;

  if (maxBioLength > 0) {
    const truncatedBio = (profile.bio || '').slice(0, maxBioLength);
    return `${header}${truncatedBio}`;
  }

  // Fallback
  return truncatedText;
}
