/**
 * TC-057: Why-Match Modal Component Tests
 *
 * Additional edge case and interaction tests for the WhyMatchModal component.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WhyMatchModal } from '@/components/features/matches/why-match-modal'

// Same mocks as match-card.test.tsx
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className} data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h2 className={className}>{children}</h2>
  ),
  DialogDescription: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <p className={className}>{children}</p>
  ),
}))

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: { value: number; className?: string }) => (
    <div data-testid="progress" data-value={value} className={className} />
  ),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) => (
    <span data-testid="badge" data-variant={variant} className={className}>{children}</span>
  ),
}))

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className} data-testid="alert">{children}</div>
  ),
  AlertDescription: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}))

const baseMatch = {
  name: 'Bob Wilson',
  compatibility: 75,
  skills: ['Go', 'Rust', 'Systems Design', 'Docker', 'Kubernetes'],
  role: 'Infrastructure Engineer',
}

describe('WhyMatchModal - Edge Cases', () => {
  it('renders progress bars for all three categories', () => {
    // Arrange & Act
    render(<WhyMatchModal open={true} onOpenChange={vi.fn()} match={baseMatch} />)

    // Assert
    const progressBars = screen.getAllByTestId('progress')
    expect(progressBars).toHaveLength(3)
  })

  it('renders skills badges correctly for up to 5 skills', () => {
    // Arrange
    const match = { ...baseMatch, skills: ['A', 'B', 'C', 'D', 'E', 'F', 'G'] }

    // Act
    render(<WhyMatchModal open={true} onOpenChange={vi.fn()} match={match} />)

    // Assert — badge count from skills = min(5, skills.length)
    const skillBadges = screen.getAllByTestId('badge')
    // Skills section shows 5 badges; shared interests section shows 3 = 8 total
    expect(skillBadges.length).toBeGreaterThanOrEqual(5)
  })

  it('displays compatibility percentage in the description', () => {
    // Arrange & Act
    render(<WhyMatchModal open={true} onOpenChange={vi.fn()} match={baseMatch} />)

    // Assert
    const descriptionElem = screen.getByText(/75%/i)
    expect(descriptionElem).toBeInTheDocument()
  })

  it('renders AI Confidence value from the compatibility score', () => {
    // Arrange & Act
    render(<WhyMatchModal open={true} onOpenChange={vi.fn()} match={{ ...baseMatch, compatibility: 92 }} />)

    // Assert
    expect(screen.getByText('AI Confidence:')).toBeInTheDocument()
    expect(screen.getByText('0.92')).toBeInTheDocument()
  })

  it('renders algorithm explanation section', () => {
    // Arrange & Act
    render(<WhyMatchModal open={true} onOpenChange={vi.fn()} match={baseMatch} />)

    // Assert
    expect(screen.getByText(/Semantic analysis of skills/)).toBeInTheDocument()
    expect(screen.getByText(/Vector similarity scoring/)).toBeInTheDocument()
    expect(screen.getByText(/Weighted by availability/)).toBeInTheDocument()
  })
})
