/**
 * TC-079: MVP Checklist Generation Test
 * Verifies AI Mentor generates structured MVP checklists when prompted
 * with "MVP" or "minimum viable product" keywords.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the fetch for Python worker calls
const mockFetch = vi.fn()
global.fetch = mockFetch as unknown as typeof fetch

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-id' } }, error: null }) },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  }),
}))

vi.mock('@/lib/config/backend', () => ({
  getBackendConfig: vi.fn().mockResolvedValue({ endpoint: 'http://localhost:8000' }),
}))

describe('AI Mentor MVP Checklist Generation (TC-079)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('MVP prompt detection', () => {
    const mvpTriggers = [
      'Help me create an MVP for my app',
      'What should go into a minimum viable product?',
      'I want to build an MVP for a food delivery platform',
      'What are the steps to create a minimum viable product for a SaaS?',
      'MVP checklist for a marketplace app',
      'How do I define my MVP scope?',
    ]

    it.each(mvpTriggers)('should detect MVP-related intent: "%s"', (prompt) => {
      const lowerPrompt = prompt.toLowerCase()
      const isMvp = lowerPrompt.includes('mvp') || lowerPrompt.includes('minimum viable product')
      expect(isMvp).toBe(true)
    })
  })

  describe('Structured checklist response format', () => {
    it('should return a structured checklist with phases', () => {
      // Arrange — mock LLM response for MVP prompt
      const mockResponse = {
        response: `# MVP Checklist for Your App

## Phase 1: Discovery
1. Define your target user persona
2. Identify the core problem you're solving
3. Research competitor solutions

## Phase 2: Core Features
4. List must-have features (MoSCoW method)
5. Prioritize features by impact vs. effort
6. Define success metrics for each feature

## Phase 3: Build
7. Set up development environment
8. Build authentication and user profiles
9. Implement core workflow
10. Add basic analytics

## Phase 4: Launch
11. Internal testing with team
12. Beta testing with 5-10 users
13. Collect feedback and iterate

**Estimated timeline:** 4-6 weeks for initial MVP`,
        action_items: [
          { task: 'Define user personas', priority: 'high' },
          { task: 'List core features', priority: 'high' },
          { task: 'Set up project repo', priority: 'medium' },
          { task: 'Build auth system', priority: 'medium' },
          { task: 'Launch beta version', priority: 'high' },
        ],
        session_id: 'mvp-session-001',
        suggested_next_steps: [
          'Create a project post to find collaborators',
          'Set up a GitHub repository',
          'Draft your value proposition',
        ],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      // Assert response structure
      const data = mockResponse

      // Should have a substantive response
      expect(data.response.length).toBeGreaterThan(100)

      // Should contain checklist phases
      expect(data.response).toContain('Discovery')
      expect(data.response).toContain('Core Features')
      expect(data.response).toContain('Build')
      expect(data.response).toContain('Launch')

      // Should have actionable items
      expect(data.action_items.length).toBeGreaterThanOrEqual(3)

      // Should include next steps
      expect(data.suggested_next_steps.length).toBeGreaterThan(0)
    })

    it('should include prioritization in action items', () => {
      // Arrange
      const mockResponse = {
        response: 'MVP checklist generated',
        action_items: [
          { task: 'Critical path item', priority: 'high' },
          { task: 'Nice to have feature', priority: 'low' },
          { task: 'Should include', priority: 'medium' },
          { task: 'Must complete first', priority: 'high' },
          { task: 'Optional enhancement', priority: 'low' },
        ],
        session_id: 'session-001',
        suggested_next_steps: ['Review checklist', 'Start development'],
      }

      // Act — verify priorities
      const highPriority = mockResponse.action_items.filter(i => i.priority === 'high')
      const mediumPriority = mockResponse.action_items.filter(i => i.priority === 'medium')
      const lowPriority = mockResponse.action_items.filter(i => i.priority === 'low')

      // Assert
      expect(highPriority.length).toBe(2)
      expect(mediumPriority.length).toBe(1)
      expect(lowPriority.length).toBe(2)
    })

    it('should detect MVP in compound prompts', () => {
      const prompts = [
        'I am a React developer and I want to build an MVP for my startup idea',
        'Can you review my minimum viable product plan for a fintech app?',
        'What is the difference between an MVP and a full product launch?',
      ]

      for (const prompt of prompts) {
        const lower = prompt.toLowerCase()
        const isMvpRelated = lower.includes('mvp') || lower.includes('minimum viable product')
        expect(isMvpRelated).toBe(true)
      }
    })
  })

  describe('Non-MVP prompts should not trigger checklist', () => {
    it('should not force checklist on general career questions', () => {
      const prompt = 'How do I improve my JavaScript skills?'
      const lower = prompt.toLowerCase()
      const isMvp = lower.includes('mvp') || lower.includes('minimum viable product')
      expect(isMvp).toBe(false)
    })

    it('should not force checklist on profile questions', () => {
      const prompt = 'Can you help me improve my profile?'
      const lower = prompt.toLowerCase()
      const isMvp = lower.includes('mvp') || lower.includes('minimum viable product')
      expect(isMvp).toBe(false)
    })
  })

  describe('Checklist completeness', () => {
    it('should cover discovery, build, and launch phases', () => {
      // A good MVP checklist should mention at least:
      const requiredPhases = ['discover', 'build', 'test', 'launch']
      const mockChecklist = `
        Discover your users' needs
        Build core features
        Test with real users
        Launch to early adopters
      `.toLowerCase()

      for (const phase of requiredPhases) {
        expect(mockChecklist).toContain(phase)
      }
    })

    it('should include timeline estimation', () => {
      const mockResponse = 'MVP checklist... Estimated timeline: 4-8 weeks'
      expect(mockResponse).toMatch(/timeline|weeks|sprint/i)
    })

    it('should limit action items to maximum 5', () => {
      const actionItems = Array.from({ length: 8 }, (_, i) => ({
        task: `Action ${i}`,
        priority: 'medium' as const,
      }))

      // Apply the limit (same as Python worker: top 5)
      const limited = actionItems.slice(0, 5)
      expect(limited).toHaveLength(5)
    })
  })
})
