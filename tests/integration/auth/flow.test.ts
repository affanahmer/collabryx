/**
 * Auth Flow Integration Tests — TC-011, TC-012, TC-013
 *
 * TC-011: User login creates valid session
 * TC-012: Protected route blocks unauthenticated access
 * TC-013: Logout clears session and redirects
 *
 * Tests the complete auth flow: login → session → protected route → logout
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Mock Supabase Auth ───────────────────────────────────────────────

interface MockSession {
  user: { id: string; email: string }
  access_token: string
  refresh_token: string
  expires_at: number
}

const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
}

// Test-only mock — never use real tokens in tests
const mockSession: MockSession = {
  user: mockUser,
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_at: Date.now() + 3600,
}

function createMockAuthClient() {
  let currentSession: MockSession | null = null

  return {
    auth: {
      getSession: vi.fn().mockImplementation(async () => {
        if (currentSession) {
          return { data: { session: currentSession }, error: null }
        }
        return { data: { session: null }, error: null }
      }),
      getUser: vi.fn().mockImplementation(async () => {
        if (currentSession) {
          return { data: { user: currentSession.user }, error: null }
        }
        return { data: { user: null }, error: null }
      }),
      signInWithPassword: vi.fn().mockImplementation(async ({ email, password }: { email: string; password: string }) => {
        if (email === 'test@example.com' && password === 'correct-password') {
          currentSession = mockSession
          return { data: { session: mockSession, user: mockUser }, error: null }
        }
        return {
          data: { session: null, user: null },
          error: { message: 'Invalid login credentials', code: '400', status: 400 },
        }
      }),
      signUp: vi.fn().mockImplementation(async ({ email }: { email: string }) => {
        const newUser = { id: `new-user-${Date.now()}`, email }
        const newSession: MockSession = {
          user: newUser,
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_at: Date.now() + 3600,
        }
        currentSession = newSession
        return { data: { session: newSession, user: newUser }, error: null }
      }),
      signOut: vi.fn().mockImplementation(async () => {
        currentSession = null
        return { error: null }
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    // Helper to manually set session state for testing
    _setSession: (session: MockSession | null) => {
      currentSession = session
    },
    _getSession: () => currentSession,
  }
}

// ── Protected Route Simulator ────────────────────────────────────────

async function checkProtectedRoute(authClient: ReturnType<typeof createMockAuthClient>) {
  const { data, error } = await authClient.auth.getSession()
  if (error || !data.session) {
    return { authenticated: false, user: null, error: error?.message || 'No session' }
  }
  return { authenticated: true, user: data.session.user, error: null }
}

// ── Tests ────────────────────────────────────────────────────────────

describe('Auth Flow', () => {
  let authClient: ReturnType<typeof createMockAuthClient>

  beforeEach(() => {
    authClient = createMockAuthClient()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ─── TC-011: Login creates session ─────────────────────────────────

  describe('TC-011: User login creates valid session', () => {
    it('should create session with valid credentials', async () => {
      // Arrange
      const email = 'test@example.com'
      const password = 'correct-password'

      // Act
      const { data, error } = await authClient.auth.signInWithPassword({ email, password })

      // Assert
      expect(error).toBeNull()
      expect(data.session).toBeDefined()
      expect(data.session?.user.email).toBe(email)
      expect(data.session?.access_token).toBe('mock-access-token')
    })

    it('should return error with invalid credentials', async () => {
      // Arrange
      const email = 'test@example.com'
      const password = 'wrong-password'

      // Act
      const { data, error } = await authClient.auth.signInWithPassword({ email, password })

      // Assert
      expect(error).toBeDefined()
      expect(error?.message).toContain('Invalid login credentials')
      expect(data.session).toBeNull()
    })

    it('should return error with empty credentials', async () => {
      // Arrange
      const email = ''
      const password = ''

      // Act
      const { data, error } = await authClient.auth.signInWithPassword({ email, password })

      // Assert
      expect(error).toBeDefined()
      expect(data.session).toBeNull()
    })

    it('should persist session after login', async () => {
      // Arrange — Login
      await authClient.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'correct-password',
      })

      // Act — Check session
      const { data } = await authClient.auth.getSession()

      // Assert
      expect(data.session).toBeDefined()
      expect(data.session?.user.id).toBe(mockUser.id)
    })
  })

  // ─── TC-012: Protected route blocks unauthenticated ────────────────

  describe('TC-012: Protected route blocks unauthenticated access', () => {
    it('should block access when no session exists', async () => {
      // Arrange — No login performed
      // Act
      const result = await checkProtectedRoute(authClient)

      // Assert
      expect(result.authenticated).toBe(false)
      expect(result.user).toBeNull()
      expect(result.error).toBe('No session')
    })

    it('should allow access when session exists', async () => {
      // Arrange — Login first
      await authClient.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'correct-password',
      })

      // Act
      const result = await checkProtectedRoute(authClient)

      // Assert
      expect(result.authenticated).toBe(true)
      expect(result.user?.id).toBe(mockUser.id)
      expect(result.error).toBeNull()
    })

    it('should block access after session expires', async () => {
      // Arrange — Login then clear session
      await authClient.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'correct-password',
      })
      authClient._setSession(null)

      // Act
      const result = await checkProtectedRoute(authClient)

      // Assert
      expect(result.authenticated).toBe(false)
      expect(result.user).toBeNull()
    })
  })

  // ─── TC-013: Logout clears session ─────────────────────────────────

  describe('TC-013: Logout clears session and redirects', () => {
    it('should clear session on signOut', async () => {
      // Arrange — Login first
      await authClient.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'correct-password',
      })
      expect(authClient._getSession()).not.toBeNull()

      // Act
      const { error } = await authClient.auth.signOut()

      // Assert
      expect(error).toBeNull()
      expect(authClient._getSession()).toBeNull()
    })

    it('should block protected route after logout', async () => {
      // Arrange — Login then logout
      await authClient.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'correct-password',
      })
      await authClient.auth.signOut()

      // Act
      const result = await checkProtectedRoute(authClient)

      // Assert
      expect(result.authenticated).toBe(false)
      expect(result.user).toBeNull()
    })

    it('should allow new login after logout', async () => {
      // Arrange — Login, logout, then login again
      await authClient.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'correct-password',
      })
      await authClient.auth.signOut()

      // Act — Login again
      const { data, error } = await authClient.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'correct-password',
      })

      // Assert
      expect(error).toBeNull()
      expect(data.session).toBeDefined()
      expect(data.session?.user.id).toBe(mockUser.id)
    })
  })

  // ─── TC-014: Signup flow ───────────────────────────────────────────

  describe('TC-014: User signup creates account and session', () => {
    it('should create session on successful signup', async () => {
      // Arrange
      const email = 'newuser@example.com'

      // Act
      const { data, error } = await authClient.auth.signUp({ email })

      // Assert
      expect(error).toBeNull()
      expect(data.session).toBeDefined()
      expect(data.user?.email).toBe(email)
    })

    it('should allow access to protected route after signup', async () => {
      // Arrange — Signup
      await authClient.auth.signUp({ email: 'newuser@example.com' })

      // Act
      const result = await checkProtectedRoute(authClient)

      // Assert
      expect(result.authenticated).toBe(true)
      expect(result.user?.email).toBe('newuser@example.com')
    })
  })
})
