import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TypingIndicator } from '@/components/features/messages/typing-indicator'

describe('TypingIndicator Component (TC-069)', () => {
  describe('TC-069: typing indicator UI', () => {
    it('renders nothing when isTyping is false', () => {
      // Act
      const { container } = render(<TypingIndicator isTyping={false} />)

      // Assert
      expect(container.innerHTML).toBe('')
    })

    it('renders three bouncing dots when isTyping is true', () => {
      // Act
      render(<TypingIndicator isTyping={true} />)

      // Assert: Three animated dots with bounce animation
      const dots = document.querySelectorAll('.animate-bounce')
      expect(dots.length).toBe(3)
    })

    it('applies custom className when provided', () => {
      // Act
      render(<TypingIndicator isTyping={true} className="custom-class" />)

      // Assert
      const container = document.querySelector('.custom-class')
      expect(container).not.toBeNull()
    })

    it('each dot has correct animation delay', () => {
      // Act
      render(<TypingIndicator isTyping={true} />)

      const dots = document.querySelectorAll('.animate-bounce')

      // Assert: Dots should have staggered animation delays
      expect(dots[0]).toBeTruthy()
      expect(dots[1]).toBeTruthy()
      expect(dots[2]).toBeTruthy()

      // Check animation delays
      const delays = Array.from(dots).map(
        (dot) => (dot as HTMLElement).style.animationDelay
      )
      expect(delays[0]).toBe('0ms')
      expect(delays[1]).toBe('150ms')
      expect(delays[2]).toBe('300ms')
    })

    it('renders with the correct container styling', () => {
      // Act
      render(<TypingIndicator isTyping={true} />)

      // Assert: Container should have rounded corners and background styling
      const container = document.querySelector('.rounded-2xl')
      expect(container).not.toBeNull()
    })
  })
})
