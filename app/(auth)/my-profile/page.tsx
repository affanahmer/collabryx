import { ProfileHeader } from "@/components/features/profile/profile-header"
import { ProfileTabs } from "@/components/features/profile/profile-tabs"
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Profile, UserSkill, UserExperience, UserProject } from '@/types/database.types'

export const dynamic = "force-dynamic"

export default async function MyProfilePage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*, user_skills(*), user_experiences(*), user_projects(*)')
        .eq('id', user.id)
        .single()

    if (!profile) {
        redirect('/onboarding')
    }

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
                isOwnProfile={true}
                isVerified={p.is_verified}
                verificationType={p.verification_type}
                university={p.university}
                collaborationReadiness={p.collaboration_readiness}
                skills={headerSkills}
                createdAt={p.created_at}
            />
            <ProfileTabs
                bio={p.bio}
                lookingFor={p.looking_for}
                isOwnProfile={true}
                skills={tabSkills}
                experiences={tabExperiences}
                projects={tabProjects}
            />
        </div>
    )
}
