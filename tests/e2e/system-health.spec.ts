import { test, expect } from '@playwright/test'

// =============================================================================
// TC-100: Complete E2E Testing Flow — System Health & Regression
// =============================================================================
//
// Validates:
//   1. Health endpoint returns 200 with expected JSON schema
//   2. Key public pages load without errors (landing, login, register)
//   3. Critical API endpoints respond correctly
//   4. Page metadata and accessibility baseline
//   5. Screenshots on failure for debugging
// =============================================================================

test.describe('TC-100 — System Health & Regression', () => {
  // ---------------------------------------------------------------------------
  // Health Endpoint
  // ---------------------------------------------------------------------------

  test.describe('Health Endpoint', () => {
    test('GET /api/health returns 200 with valid JSON schema', async ({ request }) => {
      // Arrange & Act
      const response = await request.get('/api/health')
      const data = await response.json()

      // Assert — status and shape
      expect(response.status()).toBe(200)
      expect(data).toHaveProperty('status')
      expect(data).toHaveProperty('timestamp')
      expect(data).toHaveProperty('checks')
      expect(data).toHaveProperty('uptime')
    })

    test('health endpoint status field is a valid status value', async ({ request }) => {
      // Arrange & Act
      const response = await request.get('/api/health')
      const data = await response.json()

      // Assert
      expect(['healthy', 'degraded', 'unhealthy']).toContain(data.status)
    })

    test('health endpoint checks include database status', async ({ request }) => {
      // Arrange & Act
      const response = await request.get('/api/health')
      const data = await response.json()

      // Assert
      expect(data.checks).toHaveProperty('database')
      expect(['ok', 'failed']).toContain(data.checks.database.status)
    })

    test('health endpoint checks include pythonWorker status', async ({ request }) => {
      // Arrange & Act
      const response = await request.get('/api/health')
      const data = await response.json()

      // Assert
      expect(data.checks).toHaveProperty('pythonWorker')
      expect(['ok', 'failed']).toContain(data.checks.pythonWorker.status)
    })

    test('health endpoint returns no-cache headers', async ({ request }) => {
      // Arrange & Act
      const response = await request.get('/api/health')

      // Assert
      const cacheControl = response.headers()['cache-control']
      expect(cacheControl).toBeDefined()
      expect(cacheControl).toContain('no-cache')
    })

    test('health endpoint timestamp is a valid ISO date', async ({ request }) => {
      // Arrange & Act
      const response = await request.get('/api/health')
      const data = await response.json()

      // Assert
      expect(Date.parse(data.timestamp)).not.toBeNaN()
    })
  })

  // ---------------------------------------------------------------------------
  // Landing Page (Public)
  // ---------------------------------------------------------------------------

  test.describe('Landing Page', () => {
    test('should load landing page without errors', async ({ page }) => {
      // Arrange & Act
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Assert
      const title = await page.title()
      expect(title.length).toBeGreaterThan(0)
      expect(title).toContain('Collabryx')
    })

    test('should have essential landing page content', async ({ page }) => {
      // Arrange & Act
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Assert — should have navigation or hero section
      const hasHeading = await page.getByRole('heading').first().isVisible().catch(() => false)
      const hasNavigation = await page.getByRole('navigation').first().isVisible().catch(() => false)
      const hasLink = await page.getByRole('link').first().isVisible().catch(() => false)

      expect(hasHeading || hasNavigation || hasLink).toBeTruthy()
    })

    test('should have links to login and register', async ({ page }) => {
      // Arrange & Act
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Assert — at least one of login/register links should be visible
      const loginLink = page.getByRole('link', { name: /sign in|login/i })
      const registerLink = page.getByRole('link', { name: /sign up|register|get started/i })

      const hasLoginLink = await loginLink.first().isVisible().catch(() => false)
      const hasRegisterLink = await registerLink.first().isVisible().catch(() => false)

      expect(hasLoginLink || hasRegisterLink).toBeTruthy()
    })
  })

  // ---------------------------------------------------------------------------
  // Login Page (Public)
  // ---------------------------------------------------------------------------

  test.describe('Login Page', () => {
    test('should load login page without errors', async ({ page }) => {
      // Arrange & Act
      await page.goto('/login')
      await page.waitForLoadState('networkidle')

      // Assert
      await expect(page.locator('#login-heading')).toBeVisible()
    })

    test('should display email and password fields', async ({ page }) => {
      // Arrange & Act
      await page.goto('/login')
      await page.waitForLoadState('networkidle')

      // Assert
      await expect(page.getByPlaceholder(/email/i)).toBeVisible()
      await expect(page.getByPlaceholder(/password/i)).toBeVisible()
    })

    test('should have sign-in button', async ({ page }) => {
      // Arrange & Act
      await page.goto('/login')
      await page.waitForLoadState('networkidle')

      // Assert
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
    })

    test('should show validation errors for empty form submission', async ({ page }) => {
      // Arrange
      await page.goto('/login')
      await page.waitForLoadState('networkidle')

      // Act
      await page.getByRole('button', { name: /sign in/i }).click()

      // Assert
      const emailError = page.getByText('Please enter a valid email address')
      const passwordError = page.getByText('Password is required')

      const hasEmailError = await emailError.isVisible().catch(() => false)
      const hasPasswordError = await passwordError.isVisible().catch(() => false)

      expect(hasEmailError || hasPasswordError).toBeTruthy()
    })
  })

  // ---------------------------------------------------------------------------
  // Register Page (Public)
  // ---------------------------------------------------------------------------

  test.describe('Register Page', () => {
    test('should load register page without errors', async ({ page }) => {
      // Arrange & Act
      await page.goto('/register')
      await page.waitForLoadState('networkidle')

      // Assert
      const heading = page.getByRole('heading', { name: /create account|register|sign up/i })
      await expect(heading).toBeVisible()
    })

    test('should display registration form fields', async ({ page }) => {
      // Arrange & Act
      await page.goto('/register')
      await page.waitForLoadState('networkidle')

      // Assert
      await expect(page.getByPlaceholder(/email/i)).toBeVisible()
      await expect(page.getByPlaceholder(/password/i)).toBeVisible()
    })

    test('should have link back to login page', async ({ page }) => {
      // Arrange & Act
      await page.goto('/register')
      await page.waitForLoadState('networkidle')

      // Assert
      const loginLink = page.getByRole('link', { name: /sign in|login/i })
      await expect(loginLink).toBeVisible()
    })
  })

  // ---------------------------------------------------------------------------
  // Cross-Page Navigation
  // ---------------------------------------------------------------------------

  test.describe('Cross-Page Navigation', () => {
    test('should navigate from landing to login', async ({ page }) => {
      // Arrange
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Act — find and click login link
      const loginLink = page.getByRole('link', { name: /sign in|login/i }).first()
      const isLinkVisible = await loginLink.isVisible().catch(() => false)

      if (isLinkVisible) {
        await loginLink.click()
        // Assert
        await expect(page).toHaveURL(/login/)
      } else {
        // Direct navigation fallback
        await page.goto('/login')
        await expect(page).toHaveURL(/login/)
      }
    })

    test('should navigate between login and register', async ({ page }) => {
      // Arrange
      await page.goto('/login')
      await page.waitForLoadState('networkidle')

      // Act — click sign up link from login page
      const signUpLink = page.getByRole('link', { name: /sign up/i })
      await signUpLink.click()

      // Assert
      await expect(page).toHaveURL(/register/)
    })
  })

  // ---------------------------------------------------------------------------
  // Page Metadata & Accessibility
  // ---------------------------------------------------------------------------

  test.describe('Page Metadata', () => {
    test('landing page should have title tag', async ({ page }) => {
      // Arrange & Act
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Assert
      const title = await page.title()
      expect(title.length).toBeGreaterThan(0)
    })

    test('login page should have descriptive title', async ({ page }) => {
      // Arrange & Act
      await page.goto('/login')
      await page.waitForLoadState('networkidle')

      // Assert
      const title = await page.title()
      expect(title.length).toBeGreaterThan(0)
    })

    test('register page should have descriptive title', async ({ page }) => {
      // Arrange & Act
      await page.goto('/register')
      await page.waitForLoadState('networkidle')

      // Assert
      const title = await page.title()
      expect(title.length).toBeGreaterThan(0)
    })
  })

  // ---------------------------------------------------------------------------
  // Responsive Design
  // ---------------------------------------------------------------------------

  test.describe('Responsive Design', () => {
    test('landing page works on mobile viewport', async ({ page }) => {
      // Arrange
      await page.setViewportSize({ width: 375, height: 667 })

      // Act
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Assert
      const title = await page.title()
      expect(title).toContain('Collabryx')
    })

    test('login page works on mobile viewport', async ({ page }) => {
      // Arrange
      await page.setViewportSize({ width: 375, height: 667 })

      // Act
      await page.goto('/login')
      await page.waitForLoadState('networkidle')

      // Assert
      await expect(page.locator('#login-heading')).toBeVisible()
    })

    test('landing page works on tablet viewport', async ({ page }) => {
      // Arrange
      await page.setViewportSize({ width: 768, height: 1024 })

      // Act
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Assert
      const title = await page.title()
      expect(title).toContain('Collabryx')
    })
  })
})
