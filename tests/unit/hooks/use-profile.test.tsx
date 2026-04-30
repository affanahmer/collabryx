import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useProfile } from '@/hooks/use-profile'

// Mock supabase client
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockAuthGetUser = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
    auth: {
      getUser: mockAuthGetUser,
    },
  }),
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe('useProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({
      select: mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          single: mockSingle.mockResolvedValue({
            data: {
              id: 'test-user-id',
              full_name: 'Test User',
              headline: 'Test Developer',
              bio: 'Test bio',
            },
            error: null,
          }),
        }),
      }),
    })
  })

  it('should be defined', async () => {
    const { result } = renderHook(() => useProfile('test-user-id'), { wrapper: createWrapper() })
    expect(result.current).toBeDefined()
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('should return data and loading state', async () => {
    const { result } = renderHook(() => useProfile('test-user-id'), { wrapper: createWrapper() })
    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    })
    expect(typeof result.current.isLoading).toBe('boolean')
  })
})
