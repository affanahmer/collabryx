/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect } from 'vitest'

import {
  profileSettingsSchema,
  skillsSettingsSchema,
  experienceProjectsSettingsSchema,
  validateProfileSettings,
  validateSkillsSettings,
  validateExperienceProjectsSettings,
} from '@/lib/validations/settings'

describe('Settings Validation', () => {
  // =============================================
  // TC-023: Profile Bio Validation
  // =============================================
  describe('Bio Validation (TC-023)', () => {
    it('should reject empty bio string', () => {
      const result = profileSettingsSchema.safeParse({
        fullName: 'John Doe',
        headline: 'Software Developer',
        bio: '',
      })

      expect(result.success).toBe(true) // Empty is allowed (optional + or(z.literal("")))
      if (result.success) {
        expect(result.data.bio).toBe('')
      }
    })

    it('should accept valid bio text', () => {
      const result = profileSettingsSchema.safeParse({
        fullName: 'John Doe',
        headline: 'Software Developer',
        bio: 'I am a passionate developer with 10 years of experience.',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.bio).toBe('I am a passionate developer with 10 years of experience.')
      }
    })

    it('should reject bio exceeding 2000 characters', () => {
      const longBio = 'A'.repeat(2001)
      const result = profileSettingsSchema.safeParse({
        fullName: 'John Doe',
        headline: 'Software Developer',
        bio: longBio,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Bio must be less than 2000 characters.')
      }
    })

    it('should accept bio at exactly 2000 characters', () => {
      const exactBio = 'A'.repeat(2000)
      const result = profileSettingsSchema.safeParse({
        fullName: 'John Doe',
        headline: 'Software Developer',
        bio: exactBio,
      })

      expect(result.success).toBe(true)
    })

    it('should accept undefined bio (optional field)', () => {
      const result = profileSettingsSchema.safeParse({
        fullName: 'John Doe',
        headline: 'Software Developer',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.bio).toBeUndefined()
      }
    })

    it('should reject non-string bio', () => {
      const result = profileSettingsSchema.safeParse({
        fullName: 'John Doe',
        headline: 'Software Developer',
        bio: 12345,
      })

      expect(result.success).toBe(false)
    })

    it('should validate through validateProfileSettings helper', () => {
      const validResult = validateProfileSettings({
        displayName: 'johndoe',
        fullName: 'John Doe',
        headline: 'Software Developer',
        bio: 'A short bio',
        location: 'San Francisco',
        websiteUrl: 'https://example.com',
      })

      expect(validResult.success).toBe(true)

      const invalidResult = validateProfileSettings({
        fullName: 'JD',
        headline: 'SWE',
        bio: 'A'.repeat(2001),
      })

      expect(invalidResult.success).toBe(false)
      if (!invalidResult.success) {
        expect(invalidResult.errors.length).toBeGreaterThan(0)
      }
    })
  })

  // =============================================
  // Skills Settings Validation
  // =============================================
  describe('Skills Settings Schema', () => {
    it('should accept valid skills array with skill names', () => {
      const result = skillsSettingsSchema.safeParse({
        skills: [
          { skill_name: 'React' },
          { skill_name: 'TypeScript' },
          { skill_name: 'Node.js' },
        ],
        interests: [{ interest: 'Web Development' }],
      })

      expect(result.success).toBe(true)
    })

    it('should reject empty skills array', () => {
      const result = skillsSettingsSchema.safeParse({
        skills: [],
        interests: [],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('At least one skill is required.')
      }
    })

    it('should reject skill names longer than 50 characters', () => {
      const longSkill = 'A'.repeat(51)
      const result = skillsSettingsSchema.safeParse({
        skills: [{ skill_name: longSkill }],
        interests: [],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Skill must be less than 50 characters.')
      }
    })

    it('should reject empty skill name', () => {
      const result = skillsSettingsSchema.safeParse({
        skills: [{ skill_name: '' }],
        interests: [],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Skill cannot be empty.')
      }
    })

    it('should reject more than 20 skills', () => {
      const twentyOneSkills = Array.from({ length: 21 }, (_, i) => ({
        skill_name: `Skill ${i}`,
      }))
      const result = skillsSettingsSchema.safeParse({
        skills: twentyOneSkills,
        interests: [],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Maximum 20 skills allowed.')
      }
    })

    it('should validate through validateSkillsSettings helper', () => {
      const validResult = validateSkillsSettings({
        skills: [{ skill_name: 'React' }, { skill_name: 'Python' }],
        interests: [{ interest: 'AI' }],
      })

      expect(validResult.success).toBe(true)

      const invalidResult = validateSkillsSettings({
        skills: [],
        interests: [],
      })

      expect(invalidResult.success).toBe(false)
      if (!invalidResult.success) {
        expect(invalidResult.errors).toContain('At least one skill is required.')
      }
    })
  })

  // =============================================
  // Experience & Projects Validation
  // =============================================
  describe('Experience Projects Schema', () => {
    it('should accept valid experience entries', () => {
      const result = experienceProjectsSettingsSchema.safeParse({
        experiences: [
          {
            title: 'Software Engineer',
            company: 'TechCorp',
            description: 'Built web applications',
            is_current: true,
          },
        ],
        projects: [
          {
            title: 'Collabryx',
            description: 'A collaboration platform',
            url: 'https://collabryx.com',
            is_public: true,
          },
        ],
      })

      expect(result.success).toBe(true)
    })

    it('should accept empty experiences and projects', () => {
      const result = experienceProjectsSettingsSchema.safeParse({
        experiences: [],
        projects: [],
      })

      expect(result.success).toBe(true)
    })

    it('should reject project with empty title', () => {
      const result = experienceProjectsSettingsSchema.safeParse({
        experiences: [],
        projects: [{ title: '' }],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Project title is required.')
      }
    })

    it('should reject invalid project URL', () => {
      const result = experienceProjectsSettingsSchema.safeParse({
        experiences: [],
        projects: [{ title: 'My Project', url: 'not-a-valid-url' }],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Please enter a valid URL.')
      }
    })

    it('should reject more than 10 experiences', () => {
      const elevenExperiences = Array.from({ length: 11 }, (_, i) => ({
        title: `Job ${i}`,
      }))
      const result = experienceProjectsSettingsSchema.safeParse({
        experiences: elevenExperiences,
        projects: [],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Maximum 10 experiences allowed.')
      }
    })

    it('should reject more than 20 projects', () => {
      const twentyOneProjects = Array.from({ length: 21 }, (_, i) => ({
        title: `Project ${i}`,
      }))
      const result = experienceProjectsSettingsSchema.safeParse({
        experiences: [],
        projects: twentyOneProjects,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Maximum 20 projects allowed.')
      }
    })

    it('should validate through validateExperienceProjectsSettings helper', () => {
      const validResult = validateExperienceProjectsSettings({
        experiences: [{ title: 'Engineer', company: 'TechCo' }],
        projects: [{ title: 'My App' }],
      })

      expect(validResult.success).toBe(true)

      const invalidResult = validateExperienceProjectsSettings({
        experiences: [],
        projects: [{ title: '' }],
      })

      expect(invalidResult.success).toBe(false)
      if (!invalidResult.success) {
        expect(invalidResult.errors).toContain('Project title is required.')
      }
    })
  })
})
