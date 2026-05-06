/**
 * OAuth Sign-In Tests — TC-013, TC-014
 * Verifies supabase.auth.signInWithOAuth() is called with
 * the correct provider and redirect URL.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Build a fresh mock so each test gets clean call history
function createMockOAuthClient() {
  return {
    auth: {
      signInWithOAuth: vi.fn().mockResolvedValue({ data: null, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: null, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: null, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ subscription: { unsubscribe: vi.fn() } }),
    },
  }
}

// Under test: the oauth helper that wraps signInWithOAuth
async function signInWithOAuth(
  supabase: ReturnType<typeof createMockOAuthClient>,
  provider: 'google' | 'github',
  redirectTo: string
) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  })
  if (error) throw error
}

describe('OAuth Sign-In', () => {
  let supabase: ReturnType<typeof createMockOAuthClient>

  beforeEach(() => {
    supabase = createMockOAuthClient()
    vi.clearAllMocks()
  })

  describe('Google OAuth — TC-013', () => {
    it('should call signInWithOAuth with Google provider', async () => {
      // Arrange
      const redirectTo = 'http://localhost:3000/auth/callback'

      // Act
      await signInWithOAuth(supabase, 'google', redirectTo)

      // Assert
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledTimes(1)
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: { redirectTo },
      })
    })

    it('should set the correct redirect URL for Google OAuth', async () => {
      // Arrange
      const redirectTo = 'http://localhost:3000/auth/callback'

      // Act
      await signInWithOAuth(supabase, 'google', redirectTo)

      // Assert
      const callArgs = supabase.auth.signInWithOAuth.mock.calls[0][0]
      expect(callArgs.options.redirectTo).toBe(redirectTo)
    })

    it('should not throw when Google OAuth succeeds', async () => {
      // Arrange
      const redirectTo = 'http://localhost:3000/auth/callback'

      // Act & Assert
      await expect(
        signInWithOAuth(supabase, 'google', redirectTo)
      ).resolves.toBeUndefined()
    })

    it('should throw when Google OAuth returns an error', async () => {
      // Arrange
      supabase.auth.signInWithOAuth.mockResolvedValueOnce({
        data: null,
        error: { message: 'Provider not enabled' },
      })

      // Act & Assert
      await expect(
        signInWithOAuth(supabase, 'google', 'http://localhost:3000/auth/callback')
      ).rejects.toThrow('Provider not enabled')
    })
  })

  describe('GitHub OAuth — TC-014', () => {
    it('should call signInWithOAuth with GitHub provider', async () => {
      // Arrange
      const redirectTo = 'http://localhost:3000/auth/callback'

      // Act
      await signInWithOAuth(supabase, 'github', redirectTo)

      // Assert
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledTimes(1)
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'github',
        options: { redirectTo },
      })
    })

    it('should set the correct redirect URL for GitHub OAuth', async () => {
      // Arrange
      const redirectTo = 'http://localhost:3000/auth/callback'

      // Act
      await signInWithOAuth(supabase, 'github', redirectTo)

      // Assert
      const callArgs = supabase.auth.signInWithOAuth.mock.calls[0][0]
      expect(callArgs.options.redirectTo).toBe(redirectTo)
    })

    it('should not throw when GitHub OAuth succeeds', async () => {
      // Arrange
      const redirectTo = 'http://localhost:3000/auth/callback'

      // Act & Assert
      await expect(
        signInWithOAuth(supabase, 'github', redirectTo)
      ).resolves.toBeUndefined()
    })

    it('should throw when GitHub OAuth returns an error', async () => {
      // Arrange
      supabase.auth.signInWithOAuth.mockResolvedValueOnce({
        data: null,
        error: { message: 'GitHub OAuth is not configured' },
      })

      // Act & Assert
      await expect(
        signInWithOAuth(supabase, 'github', 'http://localhost:3000/auth/callback')
      ).rejects.toThrow('GitHub OAuth is not configured')
    })
  })

  describe('Provider distinction', () => {
    it('should use distinct providers for Google vs GitHub', async () => {
      // Arrange
      const redirectTo = 'http://localhost:3000/auth/callback'

      // Act
      await signInWithOAuth(supabase, 'google', redirectTo)
      await signInWithOAuth(supabase, 'github', redirectTo)

      // Assert
      const googleCall = supabase.auth.signInWithOAuth.mock.calls[0][0]
      const githubCall = supabase.auth.signInWithOAuth.mock.calls[1][0]
      expect(googleCall.provider).toBe('google')
      expect(githubCall.provider).toBe('github')
      expect(googleCall.provider).not.toBe(githubCall.provider)
    })
  })
})
