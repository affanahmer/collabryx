import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { ErrorBoundary } from '@/components/shared/error-boundary'

// Mock window.location.reload
const reloadMock = vi.fn()
Object.defineProperty(window, 'location', {
  value: { reload: reloadMock },
  writable: true,
})

// Mock window.history.back
const backMock = vi.fn()
Object.defineProperty(window, 'history', {
  value: { back: backMock },
  writable: true,
})

// Component that throws on render
const ThrowComponent = ({ message = 'Test error' }: { message?: string }) => {
  throw new Error(message)
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Hello World</div>
      </ErrorBoundary>
    )

    expect(screen.getByTestId('child')).toHaveTextContent('Hello World')
  })

  it('should catch errors and display fallback UI', () => {
    // Suppress console.error from ErrorBoundary
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ThrowComponent message="Something broke" />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Something broke')).toBeInTheDocument()
  })

  it('should display custom fallback when provided', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom Error</div>}>
        <ThrowComponent />
      </ErrorBoundary>
    )

    expect(screen.getByTestId('custom-fallback')).toHaveTextContent('Custom Error')
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('should reset state and reload on "Try Again" button click', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ThrowComponent />
      </ErrorBoundary>
    )

    const tryAgainButton = screen.getByRole('button', { name: /try again/i })
    fireEvent.click(tryAgainButton)

    expect(reloadMock).toHaveBeenCalled()
  })

  it('should navigate back on "Go Back" button click', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ThrowComponent />
      </ErrorBoundary>
    )

    const goBackButton = screen.getByRole('button', { name: /go back/i })
    fireEvent.click(goBackButton)

    expect(backMock).toHaveBeenCalled()
  })

  it('should show AlertCircle icon in default error UI', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ThrowComponent />
      </ErrorBoundary>
    )

    // AlertCircle renders as an SVG element
    const alertIcon = document.querySelector('svg')
    expect(alertIcon).toBeInTheDocument()
  })
})
