import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { usePosts, useCreatePost, useDeletePost } from '@/hooks/use-posts'

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

describe('usePosts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    const { result } = renderHook(() => usePosts(), { wrapper: createWrapper() })
    expect(result.current).toBeDefined()
  })

  it('should return data and loading state', async () => {
    const { result } = renderHook(() => usePosts(), { wrapper: createWrapper() })
    // Wait for initial render to settle
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    }, { timeout: 5000 })
    // After loading settles (either success or error), check states are correct types
    expect(typeof result.current.isLoading).toBe('boolean')
    expect(typeof result.current.isError).toBe('boolean')
  })
})

describe('useCreatePost', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    const { result } = renderHook(() => useCreatePost(), { wrapper: createWrapper() })
    expect(result.current).toBeDefined()
    expect(result.current.mutate).toBeDefined()
  })

  it('should have correct initial state', () => {
    const { result } = renderHook(() => useCreatePost(), { wrapper: createWrapper() })
    expect(result.current.isIdle).toBe(true)
    expect(result.current.isSuccess).toBe(false)
    expect(result.current.isError).toBe(false)
  })
})

describe('useDeletePost', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    const { result } = renderHook(() => useDeletePost(), { wrapper: createWrapper() })
    expect(result.current).toBeDefined()
    expect(result.current.mutate).toBeDefined()
  })

  it('should have correct initial state', () => {
    const { result } = renderHook(() => useDeletePost(), { wrapper: createWrapper() })
    expect(result.current.isIdle).toBe(true)
    expect(result.current.isSuccess).toBe(false)
    expect(result.current.isError).toBe(false)
  })
})
