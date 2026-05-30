import { vi } from 'vitest'

// Mock Supabase client with proper chainable methods.
// Pattern: chainable methods return `this` (the client) for further chaining.
// Terminal operations (single, maybeSingle) return Promises.
// The `then` property makes the client thenable for direct-await chains.
export const createMockSupabaseClient = () => {
  const client = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue({ data: [], error: null }),
    // Make the client thenable — resolves when a chain is directly awaited
    then: vi.fn().mockImplementation((resolve) => resolve({ data: [], error: null })),
    channel: vi.fn().mockReturnThis(),
    removeChannel: vi.fn().mockResolvedValue(null),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: null, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: null, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ subscription: { unsubscribe: vi.fn() } }),
    },
  }
  // Re-bind chainable methods to ensure they return the client (not vitest's default `this`)
  client.from.mockReturnThis()
  client.select.mockReturnThis()
  client.insert.mockReturnThis()
  client.update.mockReturnThis()
  client.upsert.mockReturnThis()
  client.delete.mockReturnThis()
  client.eq.mockReturnThis()
  client.in.mockReturnThis()
  client.not.mockReturnThis()
  client.or.mockReturnThis()
  client.order.mockReturnThis()
  client.limit.mockReturnThis()
  client.range.mockReturnThis()
  return client
}

export const mockSupabaseClient = createMockSupabaseClient()

// Mock @supabase/ssr directly to prevent environment variable errors
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => mockSupabaseClient,
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabaseClient,
}))

// Mock toast notifications
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}))

// Mock React Query
export const mockQueryClient = {
  query: vi.fn(),
  mutate: vi.fn(),
  fetchQuery: vi.fn(),
  prefetchQuery: vi.fn(),
  invalidateQueries: vi.fn(),
  refetchQueries: vi.fn(),
  resetQueries: vi.fn(),
  setQueryData: vi.fn(),
  getQueryData: vi.fn(),
}
