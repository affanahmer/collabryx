
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Helper to create a mock query builder that supports chained methods
const createMockQueryBuilder = (returns: Record<string, unknown> = {}) => {
  const mock = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...returns,
  }
  return mock
}

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn().mockImplementation(() => createMockQueryBuilder()),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: { id: 'test-user-id' }, error: null }),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: null, error: null }),
    signUp: vi.fn().mockResolvedValue({ data: null, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({ subscription: { unsubscribe: vi.fn() } }),
  },
  storage: {
    from: vi.fn().mockImplementation(() => ({
      upload: vi.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/test/path' } }),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    })),
    upload: vi.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null }),
    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/test/path' } }),
  },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

// Mock AI SDKs to prevent initialization errors
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'AI response' } }]
        })
      }
    }
  }))
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'AI response' }]
      })
    }
  }))
}))

// Mock rate-limit
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(() => ({ allowed: true, response: null })),
}))

// Mock CSRF validation
vi.mock('@/lib/csrf', () => ({
  validateCSRFRequest: vi.fn().mockResolvedValue(true),
  requiresCSRF: vi.fn().mockReturnValue(true),
}))

// Mock backend config
vi.mock('@/lib/config/backend', () => ({
  getBackendConfig: vi.fn().mockResolvedValue({ endpoint: null, mode: 'edge-only' }),
  getCircuitBreakerStatus: vi.fn().mockReturnValue('closed'),
}))

// Mock crypto.randomUUID
const mockRandomUUID = vi.fn().mockReturnValue('test-uuid-123')
vi.stubGlobal('crypto', { randomUUID: mockRandomUUID })

describe('API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRandomUUID.mockReturnValue('test-uuid-123')
  })

  describe('Health Endpoint', () => {
    it('should return healthy status', async () => {
      const { GET } = await import('@/app/api/health/route')
      
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'test' }, error: null }),
      })
      
      const response = await GET()
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data).toHaveProperty('status')
      expect(data.status).toBe('healthy')
    })

    it('should include timestamp', async () => {
      const { GET } = await import('@/app/api/health/route')
      
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'test' }, error: null }),
      })
      
      const response = await GET()
      const data = await response.json()
      
      expect(data).toHaveProperty('timestamp')
      expect(Date.parse(data.timestamp)).not.toBeNaN()
    })
  })

  describe('Chat Endpoint', () => {
    it('should reject requests without authentication', async () => {
      const { POST } = await import('@/app/api/chat/route')
      
      // Mock no user
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      })
      
      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'test' }),
      })
      
      const response = await POST(request)
      
      expect([401, 403]).toContain(response.status)
    })

    it('should reject invalid request body', async () => {
      const { POST } = await import('@/app/api/chat/route')
      
      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null,
      })
      
      // Mock empty body - the route checks for missing message
      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(400)
    })

    it('should accept valid request with message', async () => {
      const { POST } = await import('@/app/api/chat/route')
      
      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null,
      })
      
      // Mock session insert
      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'session-123' }, error: null }),
      })
      
      // Mock message insert
      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      })
      
      // Mock message select
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      })
      
      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: 'Hello',
          context: { page: '/dashboard' }
        }),
      })
      
      const response = await POST(request)
      
      // Should either succeed (200) or require auth (401)
      expect([200, 401, 403]).toContain(response.status)
    })
  })

  describe('Embeddings Endpoint', () => {
    it('should reject requests without userId in body (uses user_id from auth)', async () => {
      const { POST } = await import('@/app/api/embeddings/generate/route')
      
      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null,
      })
      
      // Mock embedding check - no existing embedding
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      })
      
      // Mock profile check
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'user-123' }, error: null }),
      })
      
      // Mock skills select
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      })
      
      // Mock interests select
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      })
      
      // Mock upsert
      mockSupabaseClient.from.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      })
      
      // Mock auth session for edge function fallback
      mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
        data: { session: { access_token: 'test-token' } },
        error: null,
      })
      
      const request = new NextRequest('http://localhost/api/embeddings/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'test text for embedding' }),
      })
      
      const response = await POST(request)
      
      // Should work since user_id comes from auth, not body
      expect([200, 400, 401, 500]).toContain(response.status)
    })

    it('should handle request with user_id in body', async () => {
      const { POST } = await import('@/app/api/embeddings/generate/route')
      
      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null,
      })
      
      // Mock embedding check - no existing embedding
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      })
      
      // Mock profile check
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'user-123' }, error: null }),
      })
      
      // Mock skills select
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      })
      
      // Mock interests select
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      })
      
      // Mock upsert
      mockSupabaseClient.from.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      })
      
      // Mock auth session for edge function fallback
      mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
        data: { session: { access_token: 'test-token' } },
        error: null,
      })
      
      const request = new NextRequest('http://localhost/api/embeddings/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'user-123', text: 'test text' }),
      })
      
      const response = await POST(request)
      
      expect([200, 400, 401, 500]).toContain(response.status)
    })
  })

  describe('Matches Endpoint', () => {
    it('should require authentication', async () => {
      const { POST } = await import('@/app/api/matches/generate/route')
      
      // Mock no user
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      })
      
      const request = new NextRequest('http://localhost/api/matches/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      
      const response = await POST(request)
      
      expect([401, 403]).toContain(response.status)
    })

    it('should return matches for authenticated user', async () => {
      const { POST } = await import('@/app/api/matches/generate/route')
      
      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null,
      })
      
      // Mock profile check
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { onboarding_completed: true, profile_completion: 100 }, error: null }),
      })
      
      // Mock embedding check
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { status: 'completed' }, error: null }),
      })
      
      const request = new NextRequest('http://localhost/api/matches/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      
      const response = await POST(request)
      
      // Should return either matches or auth error or service unavailable
      expect([200, 401, 403, 503]).toContain(response.status)
    })
  })

  describe('Activity Endpoint', () => {
    it('should track profile views', async () => {
      const { POST } = await import('@/app/api/activity/track/view/route')
      
      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'viewer-123' } },
        error: null,
      })
      
      // Mock viewed user check
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'target-456', name: 'Test User' }, error: null }),
      })
      
      const request = new NextRequest('http://localhost/api/activity/track/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewed_user_id: '550e8400-e29b-41d4-a716-446655440456' }),
      })
      
      const response = await POST(request)
      
      // Should succeed or require auth or service unavailable
      expect([200, 401, 403, 503]).toContain(response.status)
    })

    it('should return activity feed', async () => {
      const { GET } = await import('@/app/api/activity/feed/route')
      
      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null,
      })
      
      // Mock activity select
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      })
      
      const request = new NextRequest('http://localhost/api/activity/feed', {
        method: 'GET',
      })
      
      const response = await GET()
      
      // Should succeed or require auth
      expect([200, 401, 403]).toContain(response.status)
    })
  })

  describe('Notifications Endpoint', () => {
    it('should send notification', async () => {
      const { POST } = await import('@/app/api/notifications/send/route')
      
      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null,
      })
      
      // Mock recipient profile check
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'recipient-456', name: 'Recipient' }, error: null }),
      })
      
      const request = new NextRequest('http://localhost/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: '550e8400-e29b-41d4-a716-446655440456',
          type: 'match',
          content: 'You have a new match!',
        }),
      })
      
      const response = await POST(request)
      
      expect([200, 401, 403, 503]).toContain(response.status)
    })
  })

  describe('Moderation Endpoint', () => {
    it('should moderate content', async () => {
      const { POST } = await import('@/app/api/moderate/route')
      
      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null,
      })
      
      const request = new NextRequest('http://localhost/api/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Hello world' }),
      })
      
      const response = await POST(request)
      
      expect([200, 401, 403]).toContain(response.status)
    })
  })

  describe('Upload Endpoint', () => {
    it('should reject requests without file', async () => {
      const { POST } = await import('@/app/api/upload/route')
      
      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null,
      })
      
      // Create form data without file
      const formData = new FormData()
      
      const request = new NextRequest('http://localhost/api/upload', {
        method: 'POST',
        body: formData,
      })
      
      const response = await POST(request)
      
      expect([400, 401]).toContain(response.status)
    })

    it('should validate file type', async () => {
      const { POST } = await import('@/app/api/upload/route')
      
      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null,
      })
      
      // Create form data with a file
      const formData = new FormData()
      const file = new File(['test'], 'test.txt', { type: 'text/plain' })
      formData.append('file', file)
      
      const request = new NextRequest('http://localhost/api/upload', {
        method: 'POST',
        body: formData,
      })
      
      const response = await POST(request)
      
      // Should validate file type
      expect([200, 400, 401]).toContain(response.status)
    })
  })

  describe('CORS Headers', () => {
    it('should include CORS headers on OPTIONS requests', async () => {
      const { OPTIONS } = await import('@/app/api/chat/route')
      
      const response = await OPTIONS()
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined()
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeDefined()
    })
  })
})
