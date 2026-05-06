/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VerificationBadge } from '@/components/features/profile/verification-badge'

// Mock Badge component
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, variant }: any) => (
    <span data-testid="badge" className={className} data-variant={variant}>
      {children}
    </span>
  ),
}))

// Mock Tooltip components
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <div data-testid="tooltip">{children}</div>,
  TooltipTrigger: ({ children }: any) => (
    <div data-testid="tooltip-trigger">{children}</div>
  ),
  TooltipContent: ({ children, side }: any) => (
    <div data-testid="tooltip-content" data-side={side}>{children}</div>
  ),
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  CheckCircle2: ({ className }: any) => (
    <svg data-testid="check-icon" className={className} />
  ),
}))

describe('VerificationBadge Component (TC-027)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render with student verification type', () => {
      // Arrange
      // Act
      render(
        <VerificationBadge type="student" university="Stanford University" />
      )

      // Assert
      expect(screen.getByText('Verified Student')).toBeInTheDocument()
      expect(screen.getByTestId('check-icon')).toBeInTheDocument()
    })

    it('should render with faculty verification type', () => {
      // Arrange
      // Act
      render(
        <VerificationBadge type="faculty" university="MIT" />
      )

      // Assert
      expect(screen.getByText('Verified Faculty')).toBeInTheDocument()
    })

    it('should render with alumni verification type', () => {
      // Arrange
      // Act
      render(
        <VerificationBadge type="alumni" university="Harvard University" />
      )

      // Assert
      expect(screen.getByText('Verified Alumni')).toBeInTheDocument()
    })
  })

  describe('Badge Styling', () => {
    it('should have blue-themed styling for verified badge', () => {
      // Arrange
      // Act
      render(
        <VerificationBadge type="student" />
      )

      // Assert
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('border-blue-500/30')
      expect(badge).toHaveClass('bg-blue-500/10')
      expect(badge).toHaveClass('text-blue-700')
    })

    it('should accept custom className prop', () => {
      // Arrange
      // Act
      render(
        <VerificationBadge type="student" className="custom-class" />
      )

      // Assert
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('custom-class')
    })
  })

  describe('Tooltip Content', () => {
    it('should show tooltip with university name for student', () => {
      // Arrange
      // Act
      render(
        <VerificationBadge type="student" university="Stanford University" />
      )

      // Assert
      const tooltipContent = screen.getByTestId('tooltip-content')
      expect(tooltipContent).toBeInTheDocument()
      expect(tooltipContent.textContent).toContain('Stanford University')
      expect(tooltipContent.textContent).toContain('current student')
    })

    it('should show tooltip with generic university text when university not provided', () => {
      // Arrange
      // Act
      render(
        <VerificationBadge type="student" />
      )

      // Assert
      const tooltipContent = screen.getByTestId('tooltip-content')
      expect(tooltipContent.textContent).toContain('their university')
    })

    it('should show tooltip for faculty type', () => {
      // Arrange
      // Act
      render(
        <VerificationBadge type="faculty" university="MIT" />
      )

      // Assert
      const tooltipContent = screen.getByTestId('tooltip-content')
      expect(tooltipContent.textContent).toContain('faculty member')
      expect(tooltipContent.textContent).toContain('MIT')
    })

    it('should show tooltip for alumni type', () => {
      // Arrange
      // Act
      render(
        <VerificationBadge type="alumni" university="Harvard University" />
      )

      // Assert
      const tooltipContent = screen.getByTestId('tooltip-content')
      expect(tooltipContent.textContent).toContain('alumnus')
      expect(tooltipContent.textContent).toContain('Harvard University')
    })

    it('should position tooltip at bottom', () => {
      // Arrange
      // Act
      render(
        <VerificationBadge type="student" />
      )

      // Assert
      const tooltipContent = screen.getByTestId('tooltip-content')
      expect(tooltipContent).toHaveAttribute('data-side', 'bottom')
    })
  })

  describe('Accessibility', () => {
    it('should render CheckCircle2 icon with fill styling', () => {
      // Arrange
      // Act
      render(
        <VerificationBadge type="student" />
      )

      // Assert
      const icon = screen.getByTestId('check-icon')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveClass('fill-blue-500')
    })

    it('should have cursor-help class for tooltip indication', () => {
      // Arrange
      // Act
      render(
        <VerificationBadge type="student" />
      )

      // Assert
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('cursor-help')
    })

    it('should render badge text as an accessible element', () => {
      // Arrange
      // Act
      render(
        <VerificationBadge type="student" university="Stanford" />
      )

      // Assert
      expect(screen.getByText('Verified Student')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long university names', () => {
      // Arrange
      const longUni = 'Massachusetts Institute of Technology, Department of Computer Science'

      // Act
      render(
        <VerificationBadge type="student" university={longUni} />
      )

      // Assert
      const tooltipContent = screen.getByTestId('tooltip-content')
      expect(tooltipContent.textContent).toContain(longUni)
    })

    it('should not crash when university is empty string', () => {
      // Arrange
      // Act
      render(
        <VerificationBadge type="student" university="" />
      )

      // Assert
      expect(screen.getByText('Verified Student')).toBeInTheDocument()
    })
  })
})
