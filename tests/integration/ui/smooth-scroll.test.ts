/**
 * TC-040: Lenis library provides smooth scrolling on long public pages
 *
 * Tests that the SmoothScrollProvider instantiates Lenis with the correct
 * configuration options and cleans up on unmount.  Since the actual Lenis
 * library interacts with the DOM scroll, we mock it entirely and verify:
 *   1. Lenis constructor is called with correct config
 *   2. Lenis.raf is called via requestAnimationFrame
 *   3. Lenis instance is exposed on window.lenis
 *   4. Lenis.destroy() is called on cleanup
 *   5. window.lenis is deleted on cleanup
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import React from 'react'

// ---------------------------------------------------------------------------
// Mock Lenis
// ---------------------------------------------------------------------------
const mockLenisRaf = vi.fn()
const mockLenisDestroy = vi.fn()

const MockLenis = vi.fn(function (this: Record<string, unknown>, config: Record<string, unknown>) {
  this.raf = mockLenisRaf
  this.destroy = mockLenisDestroy
  this.config = config
  return this
}) as unknown as typeof import('lenis').default

vi.mock('lenis', () => ({
  default: MockLenis,
}))

// ---------------------------------------------------------------------------
// Mock requestAnimationFrame (global)
// ---------------------------------------------------------------------------
let rafCallbacks: Array<(time: number) => void> = []
const originalRAF = global.requestAnimationFrame

beforeEach(() => {
  rafCallbacks = []
  global.requestAnimationFrame = vi.fn((cb: (time: number) => void) => {
    const id = rafCallbacks.length + 1
    rafCallbacks.push(cb)
    return id
  })
})

afterEach(() => {
  global.requestAnimationFrame = originalRAF
})

// ---------------------------------------------------------------------------
// Unit under test
// ---------------------------------------------------------------------------
import { SmoothScrollProvider } from '@/components/providers/smooth-scroll-provider'

describe('Lenis Smooth Scroll (TC-040)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rafCallbacks = []

    // Clean window.lenis
    delete (window as Window & { lenis?: unknown }).lenis
  })

  afterEach(() => {
    cleanup()
  })

  // -----------------------------------------------------------------------
  // Lenis instantiation
  // -----------------------------------------------------------------------
  it('should instantiate Lenis with correct config on mount', () => {
    // Arrange
    // Act
    render(
      <SmoothScrollProvider>
        <div>Content</div>
      </SmoothScrollProvider>
    )

    // Assert
    expect(MockLenis).toHaveBeenCalledTimes(1)
    const config = MockLenis.mock.calls[0][0] as Record<string, unknown>
    expect(config).toMatchObject({
      duration: 0.8,
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    })
    expect(config.easing).toBeInstanceOf(Function)
  })

  it('should call lenis.raf via requestAnimationFrame loop', () => {
    // Arrange
    render(
      <SmoothScrollProvider>
        <div>Content</div>
      </SmoothScrollProvider>
    )

    // Act – simulate RAF callback
    // The useEffect starts a rAF loop; we trigger the first callback
    rafCallbacks.forEach((cb) => cb(16.67))

    // Assert – raf was called on the Lenis instance
    expect(mockLenisRaf).toHaveBeenCalled()
    expect(mockLenisRaf).toHaveBeenCalledWith(expect.any(Number))
  })

  it('should expose Lenis instance on window.lenis', () => {
    // Arrange
    // Act
    render(
      <SmoothScrollProvider>
        <div>Content</div>
      </SmoothScrollProvider>
    )

    // Assert
    const windowLenis = (window as Window & { lenis?: unknown }).lenis
    expect(windowLenis).toBeDefined()
    expect(windowLenis).toHaveProperty('raf')
    expect(windowLenis).toHaveProperty('destroy')
  })

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------
  it('should destroy Lenis instance on unmount', () => {
    // Arrange
    const { unmount } = render(
      <SmoothScrollProvider>
        <div>Content</div>
      </SmoothScrollProvider>
    )

    // Act
    unmount()

    // Assert
    expect(mockLenisDestroy).toHaveBeenCalledTimes(1)
  })

  it('should delete window.lenis on unmount', () => {
    // Arrange
    const { unmount } = render(
      <SmoothScrollProvider>
        <div>Content</div>
      </SmoothScrollProvider>
    )

    // Assert before unmount – window.lenis exists
    expect((window as Window & { lenis?: unknown }).lenis).toBeDefined()

    // Act
    unmount()

    // Assert after unmount
    expect((window as Window & { lenis?: unknown }).lenis).toBeUndefined()
  })

  // -----------------------------------------------------------------------
  // Easing function
  // -----------------------------------------------------------------------
  it('should use an easing function that returns values between 0 and 1', () => {
    // Arrange
    render(
      <SmoothScrollProvider>
        <div>Content</div>
      </SmoothScrollProvider>
    )

    // Act – get the easing function from the Lenis config
    const config = MockLenis.mock.calls[0][0] as Record<string, unknown>
    const easing = config.easing as (t: number) => number

    // Assert – easing maps 0→0, 1→1, and produces values in [0,1]
    expect(easing(0)).toBe(0)
    expect(easing(1)).toBe(1)
    expect(easing(0.5)).toBeGreaterThanOrEqual(0)
    expect(easing(0.5)).toBeLessThanOrEqual(1)
  })

  // -----------------------------------------------------------------------
  // Children rendering
  // -----------------------------------------------------------------------
  it('should render children correctly', () => {
    // Arrange
    // Act
    const { getByText } = render(
      <SmoothScrollProvider>
        <div>Test Children Content</div>
      </SmoothScrollProvider>
    )

    // Assert
    expect(getByText('Test Children Content')).toBeDefined()
  })

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------
  it('should handle multiple mounts/unmounts without errors', () => {
    // Arrange
    const { unmount, rerender } = render(
      <SmoothScrollProvider>
        <div>Content</div>
      </SmoothScrollProvider>
    )

    // Act – unmount
    unmount()
    expect(mockLenisDestroy).toHaveBeenCalledTimes(1)

    // Re-render shouldn't throw
    expect(() => {
      render(
        <SmoothScrollProvider>
          <div>New Content</div>
        </SmoothScrollProvider>
      )
    }).not.toThrow()
  })

  it('should call Lenis constructor only once per mount', () => {
    // Arrange
    // Act
    render(
      <SmoothScrollProvider>
        <div>Content</div>
      </SmoothScrollProvider>
    )

    // Assert – Lenis constructor called exactly once
    expect(MockLenis).toHaveBeenCalledTimes(1)
  })

  it('should handle rapid scroll via raf without throwing', () => {
    // Arrange
    render(
      <SmoothScrollProvider>
        <div>Content</div>
      </SmoothScrollProvider>
    )

    // Act – simulate multiple RAF frames rapidly
    for (let i = 0; i < 60; i++) {
      rafCallbacks.forEach((cb) => cb(i * 16.67))
    }

    // Assert – no throw, raf called multiple times
    expect(mockLenisRaf).toHaveBeenCalledTimes(60)
  })
})
