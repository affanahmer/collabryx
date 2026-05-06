import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'

// The source module under test
import { validateEnv, validateEnvRuntime } from '@/lib/validate-env'

describe('validateEnv', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Reset process.env before each test to avoid cross-test pollution
    process.env = { ...originalEnv, NODE_ENV: 'test' }
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  // ---------------------------------------------------------------------------
  // TC-005: Verify app displays config error if .env.local missing
  //          NEXT_PUBLIC_SUPABASE_URL
  // ---------------------------------------------------------------------------

  // -- Happy Path -------------------------------------------------------------

  test('validateEnv succeeds when all required env vars are present', () => {
    // Arrange
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.test'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXNlcnZpY2UifQ.test'

    // Act
    const result = validateEnv()

    // Assert
    expect(result).toBeDefined()
    expect(result.NEXT_PUBLIC_SUPABASE_URL).toBe('https://test-project.supabase.co')
  })

  test('validateEnv succeeds with optional vars set', () => {
    // Arrange
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.test'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXNlcnZpY2UifQ.test'
    process.env.NEXT_PUBLIC_APP_URL = 'https://collabryx.com'
    process.env.PYTHON_WORKER_URL = 'http://localhost:8000'

    // Act & Assert
    expect(() => validateEnv()).not.toThrow()
  })

  // -- Missing Required Variables ---------------------------------------------

  test('throws when NEXT_PUBLIC_SUPABASE_URL is missing', () => {
    // Arrange
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.test'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXNlcnZpY2UifQ.test'
    // Deliberately omit NEXT_PUBLIC_SUPABASE_URL

    // Act & Assert
    expect(() => validateEnv()).toThrow('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL')
  })

  test('throws when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing', () => {
    // Arrange
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXNlcnZpY2UifQ.test'
    // Deliberately omit NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Act & Assert
    expect(() => validateEnv()).toThrow('Missing required environment variables: NEXT_PUBLIC_SUPABASE_ANON_KEY')
  })

  test('throws when SUPABASE_SERVICE_ROLE_KEY is missing', () => {
    // Arrange
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.test'
    // Deliberately omit SUPABASE_SERVICE_ROLE_KEY

    // Act & Assert
    expect(() => validateEnv()).toThrow('Missing required environment variables: SUPABASE_SERVICE_ROLE_KEY')
  })

  test('throws listing multiple missing vars when several are absent', () => {
    // Arrange — no Supabase vars set at all

    // Act & Assert
    expect(() => validateEnv()).toThrow(/Missing required environment variables/)
    expect(() => validateEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
    expect(() => validateEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/)
    expect(() => validateEnv()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/)
  })

  // -- Invalid URL Format ----------------------------------------------------

  test('throws when NEXT_PUBLIC_SUPABASE_URL does not start with https://', () => {
    // Arrange
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test-project.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.test'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXNlcnZpY2UifQ.test'

    // Act & Assert
    expect(() => validateEnv()).toThrow('Invalid Supabase URL format')
  })

  test('throws when NEXT_PUBLIC_SUPABASE_URL is a bare hostname without protocol', () => {
    // Arrange — bare hostname is not a valid URL, Zod schema catches this
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'test-project.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.test'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXNlcnZpY2UifQ.test'

    // Act & Assert — Zod schema validation rejects non-URL values
    expect(() => validateEnv()).toThrow('Invalid environment configuration')
  })

  // -- Edge Cases ------------------------------------------------------------

  test('accepts NEXT_PUBLIC_SUPABASE_URL with query params', () => {
    // Arrange
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co?apikey=test'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.test'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXNlcnZpY2UifQ.test'

    // Act & Assert
    expect(() => validateEnv()).not.toThrow()
  })

  test('accepts NEXT_PUBLIC_SUPABASE_URL with trailing slash', () => {
    // Arrange
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co/'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.test'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXNlcnZpY2UifQ.test'

    // Act & Assert
    expect(() => validateEnv()).not.toThrow()
  })

  test('throws when NEXT_PUBLIC_SUPABASE_URL is empty string', () => {
    // Arrange — empty string is not a valid URL, Zod schema rejects it
    process.env.NEXT_PUBLIC_SUPABASE_URL = ''
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.test'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXNlcnZpY2UifQ.test'

    // Act & Assert — empty string fails Zod URL validation before reaching missing-var check
    expect(() => validateEnv()).toThrow()
  })
})

// ---------------------------------------------------------------------------
// validateEnvRuntime
// ---------------------------------------------------------------------------

describe('validateEnvRuntime', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: 'test' }
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  test('does not throw in non-production environment', async () => {
    // Arrange
    process.env.NODE_ENV = 'development'

    // Act & Assert
    await expect(validateEnvRuntime()).resolves.toBeUndefined()
  })

  test('does not throw in test environment', async () => {
    // Arrange
    process.env.NODE_ENV = 'test'

    // Act & Assert
    await expect(validateEnvRuntime()).resolves.toBeUndefined()
  })

  test('throws in production when required vars are missing', async () => {
    // Arrange
    process.env.NODE_ENV = 'production'
    // No Supabase vars set

    // Act & Assert
    await expect(validateEnvRuntime()).rejects.toThrow(/Missing required environment variables/)
  })

  test('resolves in production when all required vars are present', async () => {
    // Arrange
    process.env.NODE_ENV = 'production'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.test'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXNlcnZpY2UifQ.test'

    // Act & Assert
    await expect(validateEnvRuntime()).resolves.not.toThrow()
  })
})
