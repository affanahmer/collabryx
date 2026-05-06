import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConnectionRequestItem } from '@/components/features/connections/connection-request-item'
import type { ConnectionWithUser } from '@/lib/services/connections'

// Mock the hooks used by ConnectionRequestItem
vi.mock('@/hooks/use-connections', () => ({
  useAcceptConnectionRequest: vi.fn(),
  useDeclineConnectionRequest: vi.fn(),
}))

// Mock query-cache
vi.mock('@/lib/query-cache', () => ({
  QUERY_PRESETS: {
    realtime: { staleTime: 0, gcTime: 5 * 60 * 1000, retry: 1 },
  },
}))

// Mock glass-variants
vi.mock('@/lib/utils/glass-variants', () => ({
  glass: () => '',
}))

// Mock GlassBubble
vi.mock('@/components/shared/glass-bubble', () => ({
  GlassBubble: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="glass-bubble" className={className}>{children}</div>
  ),
}))

const mockRequest: ConnectionWithUser = {
  id: 'conn-req-001',
  requester_id: 'requester-id',
  receiver_id: 'receiver-id',
  status: 'pending',
  message: 'Let us collaborate!',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  other_user_id: 'requester-id',
  other_user_name: 'John Requester',
  other_user_avatar: '/avatars/john.jpg',
  other_user_headline: 'Full Stack Developer',
  other_user_initials: 'JR',
  created_at_formatted: '5m ago',
}

describe('ConnectionRequestItem (TC-062, TC-063, TC-064)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('TC-062: viewing incoming requests', () => {
    it('renders requester name and headline', async () => {
      // Arrange
      const useConnectionsModule = await import('@/hooks/use-connections')
      vi.mocked(useConnectionsModule.useAcceptConnectionRequest).mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn().mockResolvedValue({}),
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useConnectionsModule.useAcceptConnectionRequest>)

      vi.mocked(useConnectionsModule.useDeclineConnectionRequest).mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn().mockResolvedValue({}),
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useConnectionsModule.useDeclineConnectionRequest>)

      // Act
      render(<ConnectionRequestItem request={mockRequest} />)

      // Assert
      expect(screen.getByText('John Requester')).toBeInTheDocument()
      expect(screen.getByText('Full Stack Developer')).toBeInTheDocument()
      expect(screen.getByText('5m ago')).toBeInTheDocument()
    })

    it('renders requester initials in avatar fallback', async () => {
      // Arrange
      const useConnectionsModule = await import('@/hooks/use-connections')
      vi.mocked(useConnectionsModule.useAcceptConnectionRequest).mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn().mockResolvedValue({}),
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useConnectionsModule.useAcceptConnectionRequest>)

      vi.mocked(useConnectionsModule.useDeclineConnectionRequest).mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn().mockResolvedValue({}),
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useConnectionsModule.useDeclineConnectionRequest>)

      // Act
      render(<ConnectionRequestItem request={mockRequest} />)

      // Assert
      expect(screen.getByText('JR')).toBeInTheDocument()
    })

    it('renders accept and decline action buttons', async () => {
      // Arrange
      const useConnectionsModule = await import('@/hooks/use-connections')
      vi.mocked(useConnectionsModule.useAcceptConnectionRequest).mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn().mockResolvedValue({}),
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useConnectionsModule.useAcceptConnectionRequest>)

      vi.mocked(useConnectionsModule.useDeclineConnectionRequest).mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn().mockResolvedValue({}),
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useConnectionsModule.useDeclineConnectionRequest>)

      // Act
      render(<ConnectionRequestItem request={mockRequest} />)

      // Assert
      expect(screen.getByLabelText('Accept connection request')).toBeInTheDocument()
      expect(screen.getByLabelText('Decline connection request')).toBeInTheDocument()
    })

    it('renders in a GlassBubble wrapper', async () => {
      // Arrange
      const useConnectionsModule = await import('@/hooks/use-connections')
      vi.mocked(useConnectionsModule.useAcceptConnectionRequest).mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn().mockResolvedValue({}),
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useConnectionsModule.useAcceptConnectionRequest>)

      vi.mocked(useConnectionsModule.useDeclineConnectionRequest).mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn().mockResolvedValue({}),
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useConnectionsModule.useDeclineConnectionRequest>)

      // Act
      render(<ConnectionRequestItem request={mockRequest} />)

      // Assert
      expect(screen.getByTestId('glass-bubble')).toBeInTheDocument()
    })
  })

  describe('TC-063: accepting connection request', () => {
    it('calls acceptRequest.mutateAsync when accept button is clicked', async () => {
      // Arrange
      const user = userEvent.setup()
      const acceptMutateAsyncMock = vi.fn().mockResolvedValue({})

      const useConnectionsModule = await import('@/hooks/use-connections')
      vi.mocked(useConnectionsModule.useAcceptConnectionRequest).mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: acceptMutateAsyncMock,
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useConnectionsModule.useAcceptConnectionRequest>)

      vi.mocked(useConnectionsModule.useDeclineConnectionRequest).mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn().mockResolvedValue({}),
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useConnectionsModule.useDeclineConnectionRequest>)

      render(<ConnectionRequestItem request={mockRequest} />)

      // Act
      const acceptButton = screen.getByLabelText('Accept connection request')
      await user.click(acceptButton)

      // Assert
      expect(acceptMutateAsyncMock).toHaveBeenCalledWith('conn-req-001')
    })

    it('disables buttons while accept is pending', async () => {
      // Arrange
      const user = userEvent.setup()

      const useConnectionsModule = await import('@/hooks/use-connections')
      vi.mocked(useConnectionsModule.useAcceptConnectionRequest).mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
        isLoading: false, // Component manages its own isPending state
        error: null,
      } as unknown as ReturnType<typeof useConnectionsModule.useAcceptConnectionRequest>)

      vi.mocked(useConnectionsModule.useDeclineConnectionRequest).mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useConnectionsModule.useDeclineConnectionRequest>)

      render(<ConnectionRequestItem request={mockRequest} />)

      // Act
      const acceptButton = screen.getByLabelText('Accept connection request')
      await user.click(acceptButton)

      // After click, buttons are disabled via isPending state
      expect(acceptButton).toBeDisabled()
    })
  })

  describe('TC-064: declining/rejecting connection request', () => {
    it('calls declineRequest.mutateAsync when decline button is clicked', async () => {
      // Arrange
      const user = userEvent.setup()
      const declineMutateAsyncMock = vi.fn().mockResolvedValue({})

      const useConnectionsModule = await import('@/hooks/use-connections')
      vi.mocked(useConnectionsModule.useAcceptConnectionRequest).mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn().mockResolvedValue({}),
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useConnectionsModule.useAcceptConnectionRequest>)

      vi.mocked(useConnectionsModule.useDeclineConnectionRequest).mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: declineMutateAsyncMock,
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useConnectionsModule.useDeclineConnectionRequest>)

      render(<ConnectionRequestItem request={mockRequest} />)

      // Act
      const declineButton = screen.getByLabelText('Decline connection request')
      await user.click(declineButton)

      // Assert
      expect(declineMutateAsyncMock).toHaveBeenCalledWith('conn-req-001')
    })

    it('disables both buttons while decline is pending', async () => {
      // Arrange
      const user = userEvent.setup()

      const useConnectionsModule = await import('@/hooks/use-connections')
      vi.mocked(useConnectionsModule.useAcceptConnectionRequest).mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useConnectionsModule.useAcceptConnectionRequest>)

      vi.mocked(useConnectionsModule.useDeclineConnectionRequest).mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn().mockImplementation(() => new Promise(() => {})),
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useConnectionsModule.useDeclineConnectionRequest>)

      render(<ConnectionRequestItem request={mockRequest} />)

      // Act
      const declineButton = screen.getByLabelText('Decline connection request')
      await user.click(declineButton)

      // Assert
      expect(screen.getByLabelText('Accept connection request')).toBeDisabled()
      expect(declineButton).toBeDisabled()
    })
  })

  describe('edge cases', () => {
    it('renders without headline when not provided', async () => {
      // Arrange
      const requestWithoutHeadline: ConnectionWithUser = {
        ...mockRequest,
        other_user_headline: undefined,
      }

      const useConnectionsModule = await import('@/hooks/use-connections')
      vi.mocked(useConnectionsModule.useAcceptConnectionRequest).mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useConnectionsModule.useAcceptConnectionRequest>)

      vi.mocked(useConnectionsModule.useDeclineConnectionRequest).mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useConnectionsModule.useDeclineConnectionRequest>)

      // Act
      render(<ConnectionRequestItem request={requestWithoutHeadline} />)

      // Assert
      expect(screen.getByText('John Requester')).toBeInTheDocument()
      expect(screen.queryByText('Full Stack Developer')).not.toBeInTheDocument()
    })
  })
})
