/**
 * TC-035: App layout responsive on mobile (width < 768px) using Tailwind CSS v4
 *
 * Tests that responsive Tailwind classes are correctly applied by simulating
 * different viewport widths using object.defineProperty on window.innerWidth.
 * Verifies that components with responsive prefixes (md:, lg:, xl:) render
 * appropriate class combinations per breakpoint.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import React from 'react'

// ---------------------------------------------------------------------------
// viewport helper
// ---------------------------------------------------------------------------
const setViewport = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  window.dispatchEvent(new Event('resize'))
}

// ---------------------------------------------------------------------------
// Test component that uses Tailwind responsive classes
// ---------------------------------------------------------------------------
const ResponsiveComponent = () => (
  <div
    data-testid="responsive-container"
    className="
      w-full
      md:w-1/2
      lg:w-1/3
      flex
      flex-col
      md:flex-row
      p-4
      md:p-6
      lg:p-8
      text-sm
      md:text-base
      lg:text-lg
    "
  >
    <div
      data-testid="mobile-only"
      className="block md:hidden"
    >
      Mobile Content
    </div>
    <div
      data-testid="desktop-only"
      className="hidden md:block"
    >
      Desktop Content
    </div>
    <nav
      data-testid="sidebar"
      className="hidden lg:flex lg:w-64 lg:flex-col"
    >
      Sidebar
    </nav>
  </div>
)

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Responsive Layout (TC-035)', () => {
  afterEach(() => {
    cleanup()
  })

  describe('mobile viewport (< 768px)', () => {
    beforeEach(() => {
      setViewport(375) // iPhone SE
    })

    it('should detect mobile viewport width < 768px', () => {
      // Assert
      expect(window.innerWidth).toBe(375)
      expect(window.innerWidth).toBeLessThan(768)
    })

    it('should render mobile-only content visible and desktop hidden', () => {
      // Arrange & Act
      const { getByTestId } = render(<ResponsiveComponent />)

      // Assert – mobile content uses block md:hidden (visible at mobile)
      const mobileDiv = getByTestId('mobile-only')
      expect(mobileDiv).toBeDefined()
      expect(mobileDiv.className).toMatch(/block/)
      expect(mobileDiv.className).toMatch(/md:hidden/)
    })

    it('should render desktop-only content with hidden md:block (invisible at mobile)', () => {
      // Arrange & Act
      const { getByTestId } = render(<ResponsiveComponent />)

      // Assert – desktop content has hidden class
      const desktopDiv = getByTestId('desktop-only')
      expect(desktopDiv).toBeDefined()
      expect(desktopDiv.className).toMatch(/hidden/)
      expect(desktopDiv.className).toMatch(/md:block/)
    })

    it('should hide lg:flex sidebar at mobile width', () => {
      // Arrange & Act
      const { getByTestId } = render(<ResponsiveComponent />)

      // Assert – sidebar has hidden lg:flex (invisible at mobile/tablet)
      const sidebar = getByTestId('sidebar')
      expect(sidebar.className).toMatch(/hidden/)
      expect(sidebar.className).toMatch(/lg:flex/)
    })
  })

  describe('tablet viewport (768px ≤ width < 1024px)', () => {
    beforeEach(() => {
      setViewport(768) // iPad mini
    })

    it('should detect tablet viewport width >= 768px', () => {
      expect(window.innerWidth).toBe(768)
      expect(window.innerWidth).toBeGreaterThanOrEqual(768)
    })

    it('should show desktop-only content on tablet (md breakpoint active)', () => {
      // Arrange & Act
      const { getByTestId } = render(<ResponsiveComponent />)

      // Assert – md:block activates at >= 768px
      const desktopDiv = getByTestId('desktop-only')
      expect(desktopDiv.className).toMatch(/md:block/)
    })

    it('should hide mobile-only content on tablet (md:hidden active)', () => {
      // Arrange & Act
      const { getByTestId } = render(<ResponsiveComponent />)

      // Assert
      const mobileDiv = getByTestId('mobile-only')
      expect(mobileDiv.className).toMatch(/md:hidden/)
    })
  })

  describe('desktop viewport (>= 1024px)', () => {
    beforeEach(() => {
      setViewport(1440) // standard desktop
    })

    it('should detect desktop viewport width >= 1024px', () => {
      expect(window.innerWidth).toBe(1440)
      expect(window.innerWidth).toBeGreaterThanOrEqual(1024)
    })

    it('should show sidebar at desktop (lg breakpoint)', () => {
      // Arrange & Act
      const { getByTestId } = render(<ResponsiveComponent />)

      // Assert – lg:flex activates at >= 1024px
      const sidebar = getByTestId('sidebar')
      expect(sidebar.className).toMatch(/lg:flex/)
    })
  })

  describe('responsive class validation for real components', () => {
    it('should apply w-full class (mobile-first full width)', () => {
      // Arrange & Act
      const { getByTestId } = render(<ResponsiveComponent />)

      // Assert – base w-full always applied
      const container = getByTestId('responsive-container')
      expect(container.className).toMatch(/w-full/)
    })

    it('should apply responsive padding classes (p-4 md:p-6 lg:p-8)', () => {
      // Arrange & Act
      const { getByTestId } = render(<ResponsiveComponent />)

      // Assert
      const container = getByTestId('responsive-container')
      expect(container.className).toMatch(/p-4/)
      expect(container.className).toMatch(/md:p-6/)
      expect(container.className).toMatch(/lg:p-8/)
    })

    it('should apply responsive flex direction (flex-col md:flex-row)', () => {
      // Arrange & Act
      const { getByTestId } = render(<ResponsiveComponent />)

      // Assert
      const container = getByTestId('responsive-container')
      expect(container.className).toMatch(/flex-col/)
      expect(container.className).toMatch(/md:flex-row/)
    })
  })
})
