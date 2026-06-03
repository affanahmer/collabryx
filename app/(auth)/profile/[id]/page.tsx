import type { Metadata } from 'next'
import { ProfileHeader } from "@/components/features/profile/profile-header"
import { ProfileTabs } from "@/components/features/profile/profile-tabs"
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ConnectionButton } from '@/components/features/connections/connection-button'
import { MatchScore } from '@/components/shared/match-score'
import type { Profile, UserSkill, UserExperience, UserProject } from '@/types/database.types'

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id: profileId } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, headline, bio, avatar_url')
    .eq('id', profileId)
    .single()

  if (!profile) {
    return {
      title: 'Profile Not Found',
      robots: { index: false, follow: false },
    }
  }

  const title = `${profile.full_name || 'User Profile'} | Collabryx`
  const description = profile.bio || profile.headline || `View ${profile.full_name}'s profile on Collabryx`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: profile.avatar_url ? [{ url: profile.avatar_url, alt: profile.full_name || 'Profile' }] : [],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: profile.avatar_url ? [profile.avatar_url] : [],
    },
  }
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: profileId } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, user_skills(*), user_experiences(*), user_projects(*)')
    .eq('id', profileId)
    .single()

  if (!profile) {
    notFound()
  }

  // Get current user for connection button and match score
  const { data: { user } } = await supabase.auth.getUser()
  const isOwnProfile = user?.id === profileId

  // Map DB snake_case to component camelCase
  const profileSkills: UserSkill[] = (profile as unknown as { user_skills?: UserSkill[] }).user_skills ?? []
  const profileExperiences: UserExperience[] = (profile as unknown as { user_experiences?: UserExperience[] }).user_experiences ?? []
  const profileProjects: UserProject[] = (profile as unknown as { user_projects?: UserProject[] }).user_projects ?? []

  // Skills for ProfileHeader (string[] for badges)
  const headerSkills = profileSkills.map(s => s.skill_name)

  // Skills for ProfileTabs (camelCase)
  const tabSkills = profileSkills.map(s => ({
    skillName: s.skill_name,
    proficiency: s.proficiency ?? null,
    isPrimary: s.is_primary,
  }))

  // Experiences for ProfileTabs (camelCase)
  const tabExperiences = profileExperiences.map(e => ({
    id: e.id,
    title: e.title,
    company: e.company ?? null,
    description: e.description ?? null,
    startDate: e.start_date ?? null,
    endDate: e.end_date ?? null,
    isCurrent: e.is_current,
  }))

  // Projects for ProfileTabs
  const tabProjects = profileProjects.map(p => ({
    id: p.id,
    title: p.title,
    description: p.description ?? null,
    url: p.url ?? null,
    imageUrl: p.image_url ?? null,
    techStack: p.tech_stack,
    isPublic: p.is_public,
  }))

  // Filter to only public projects for non-own profile viewing
  const visibleProjects = tabProjects.filter(p => isOwnProfile || p.isPublic)

  // Calculate simple match score based on shared skills
  let matchScore = 0
  if (user && !isOwnProfile) {
    const { data: currentUserSkills } = await supabase
      .from('user_skills')
      .select('skill_name')
      .eq('user_id', user.id)

    const currentUserSkillSet = new Set(currentUserSkills?.map(s => s.skill_name) || [])
    const sharedSkills = profileSkills.filter(s => currentUserSkillSet.has(s.skill_name))

    matchScore = profileSkills.length > 0
      ? Math.round((sharedSkills.length / profileSkills.length) * 100)
      : 50
  }

  const p = profile as Profile

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-5xl">
      <ProfileHeader
        displayName={p.display_name || p.full_name}
        headline={p.headline}
        avatarUrl={p.avatar_url}
        bannerUrl={p.banner_url}
        location={p.location}
        websiteUrl={p.website_url}
        email={p.email}
        isOwnProfile={isOwnProfile}
        isVerified={p.is_verified}
        verificationType={p.verification_type}
        university={p.university}
        collaborationReadiness={p.collaboration_readiness}
        skills={headerSkills}
        createdAt={p.created_at}
      />

      {/* Connection & Match Actions for other users */}
      {!isOwnProfile && user && (
        <div className="flex flex-row flex-wrap items-center gap-3 mb-6">
          <ConnectionButton userId={profileId} variant="default" size="default" />
          {matchScore > 0 && (
            <MatchScore
              overall={matchScore}
              showBreakdown={false}
              className="w-[200px]"
            />
          )}
        </div>
      )}

      <ProfileTabs
        bio={p.bio}
        lookingFor={p.looking_for}
        isOwnProfile={isOwnProfile}
        skills={tabSkills}
        experiences={tabExperiences}
        projects={visibleProjects}
      />
    </div>
  )
}
