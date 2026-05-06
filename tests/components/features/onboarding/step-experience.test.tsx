/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StepExperience } from '@/components/features/onboarding/step-experience'
import { FormProvider, useForm } from 'react-hook-form'

// Mock GlassCard
vi.mock('@/components/shared/glass-card', () => ({
  GlassCard: ({ children, className }: any) => (
    <div data-testid="glass-card" className={className}>{children}</div>
  ),
}))

// Mock InlineSearchableCombobox
vi.mock('@/components/ui/inline-searchable-combobox', () => ({
  InlineSearchableCombobox: ({ searchPlaceholder, onChange, onAddCustom }: any) => (
    <div data-testid="inline-combobox">
      <input
        type="text"
        placeholder={searchPlaceholder}
        data-testid="job-title-search"
        onChange={(e) => {
          if (onAddCustom) onAddCustom(e.target.value)
        }}
      />
    </div>
  ),
}))

// Mock job titles database
vi.mock('@/lib/data/job-titles-database', () => ({
  jobTitlesDatabase: [
    { id: '1', title: 'Software Engineer', category: 'Engineering', subcategory: 'Web', keywords: ['software'] },
    { id: '2', title: 'Product Manager', category: 'Product', subcategory: 'Management', keywords: ['product'] },
    { id: '3', title: 'UX Designer', category: 'Design', subcategory: 'UX', keywords: ['design'] },
  ],
}))

// Mock DropdownMenu
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <button data-testid={`dropdown-item`} onClick={onClick}>{children}</button>
  ),
  DropdownMenuTrigger: ({ children }: any) => <div data-testid="dropdown-trigger">{children}</div>,
}))

// Mock glass variants
vi.mock('@/lib/utils/glass-variants', () => ({
  glass: () => '',
}))

const createWrapper = (defaultValues: any = {}) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    const methods = useForm({
      defaultValues: {
        experiences: [],
        links: [],
        ...defaultValues,
      },
    })

    return <FormProvider {...methods}>{children}</FormProvider>
  }

  return Wrapper
}

describe('StepExperience Component (TC-024, TC-025)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render heading and description', () => {
      const Wrapper = createWrapper()

      render(
        <Wrapper>
          <StepExperience />
        </Wrapper>
      )

      expect(screen.getByRole('heading', { name: /experience & projects/i })).toBeInTheDocument()
      expect(screen.getByText(/add your experiences and link/i)).toBeInTheDocument()
    })

    it('should render Experiences section heading', () => {
      const Wrapper = createWrapper()

      render(
        <Wrapper>
          <StepExperience />
        </Wrapper>
      )

      expect(screen.getByText('Experiences (Optional)')).toBeInTheDocument()
    })

    it('should render Portfolio & Links section heading', () => {
      const Wrapper = createWrapper()

      render(
        <Wrapper>
          <StepExperience />
        </Wrapper>
      )

      expect(screen.getByText(/portfolio & links/i)).toBeInTheDocument()
    })

    it('should show empty state when no experiences added', () => {
      const Wrapper = createWrapper()

      render(
        <Wrapper>
          <StepExperience />
        </Wrapper>
      )

      expect(screen.getByText(/no experiences added yet/i)).toBeInTheDocument()
    })

    it('should show empty state when no links added', () => {
      const Wrapper = createWrapper()

      render(
        <Wrapper>
          <StepExperience />
        </Wrapper>
      )

      expect(screen.getByText(/no links added yet/i)).toBeInTheDocument()
    })
  })

  describe('Experience Management (TC-024)', () => {
    it('should show Add Experience button', () => {
      const Wrapper = createWrapper()

      render(
        <Wrapper>
          <StepExperience />
        </Wrapper>
      )

      expect(screen.getByLabelText(/add a new experience/i)).toBeInTheDocument()
    })

    it('should render experience fields when experiences exist', () => {
      const Wrapper = createWrapper({
        experiences: [
          { title: 'Engineer', company: 'TechCorp', description: 'Built stuff' },
        ],
      })

      render(
        <Wrapper>
          <StepExperience />
        </Wrapper>
      )

      // Should show GlassCards for each experience
      expect(screen.getAllByTestId('glass-card').length).toBeGreaterThan(0)
    })

    it('should have Remove button for each experience', () => {
      const Wrapper = createWrapper({
        experiences: [
          { title: 'Engineer', company: 'TechCorp', description: 'Built stuff' },
        ],
      })

      render(
        <Wrapper>
          <StepExperience />
        </Wrapper>
      )

      expect(screen.getByLabelText(/remove experience 1/i)).toBeInTheDocument()
    })

    it('should render company input with placeholder', () => {
      const Wrapper = createWrapper({
        experiences: [
          { title: 'Engineer', company: '', description: '' },
        ],
      })

      render(
        <Wrapper>
          <StepExperience />
        </Wrapper>
      )

      expect(screen.getByPlaceholderText(/e.g. techstart inc./i)).toBeInTheDocument()
    })
  })

  describe('Portfolio Links (TC-025)', () => {
    it('should show Add Link button', () => {
      const Wrapper = createWrapper()

      render(
        <Wrapper>
          <StepExperience />
        </Wrapper>
      )

      expect(screen.getByLabelText(/add a new portfolio link/i)).toBeInTheDocument()
    })

    it('should render link fields when links exist', () => {
      const Wrapper = createWrapper({
        links: [
          { platform: 'github', url: 'https://github.com/test' },
        ],
      })

      render(
        <Wrapper>
          <StepExperience />
        </Wrapper>
      )

      // Should show input with URL
      const urlInput = screen.getByPlaceholderText(/https:\/\/github\.com\/username/i)
      expect(urlInput).toBeInTheDocument()
    })

    it('should have Remove button for each link', () => {
      const Wrapper = createWrapper({
        links: [
          { platform: 'github', url: '' },
        ],
      })

      render(
        <Wrapper>
          <StepExperience />
        </Wrapper>
      )

      expect(screen.getByLabelText(/remove github link/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading IDs', () => {
      const Wrapper = createWrapper()

      render(
        <Wrapper>
          <StepExperience />
        </Wrapper>
      )

      expect(screen.getByText('Experiences (Optional)')).toHaveAttribute('id', 'experiences-heading')
    })

    it('should use aria-hidden on decorative icons', () => {
      const Wrapper = createWrapper()

      render(
        <Wrapper>
          <StepExperience />
        </Wrapper>
      )

      const decorIcons = screen.getAllByText('', { selector: 'svg[aria-hidden="true"]' })
      expect(decorIcons.length).toBeGreaterThan(0)
    })
  })
})
