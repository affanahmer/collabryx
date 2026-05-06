/**
 * TC-094: Users can interact with community posts via "Like" and "Comment" features
 * TC-095: Comments safely stored in comments table
 *
 * Tests the CommentSection component for:
 * - Loading state (skeletons)
 * - Empty state
 * - Error state
 * - Comment input and submission
 * - Reply functionality
 * */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// ─── Mock hooks ────────────────────────────────────────────────────────────

const mockComments = [
  {
    id: 'comment-1',
    post_id: 'post-123',
    author_id: 'author-1',
    author_name: 'Alice',
    author_avatar: '/avatar1.png',
    content: 'Great post! Really helpful.',
    parent_id: null,
    like_count: 3,
    user_has_liked: false,
    time_ago: '5m ago',
    replies: [
      {
        id: 'reply-1',
        author_name: 'Bob',
        author_avatar: '/avatar2.png',
        content: 'Thanks Alice!',
        like_count: 1,
        time_ago: '2m ago',
      },
    ],
  },
  {
    id: 'comment-2',
    post_id: 'post-123',
    author_id: 'author-2',
    author_name: 'Bob',
    author_avatar: '/avatar2.png',
    content: 'I agree with this!',
    parent_id: null,
    like_count: 1,
    user_has_liked: true,
    time_ago: '3m ago',
    replies: [],
  },
]

const mockUseComments = vi.fn()
const mockUseCreateComment = vi.fn()
const mockUseToggleLikeComment = vi.fn()

vi.mock('@/hooks/use-comments', () => ({
  useComments: (...args: unknown[]) => mockUseComments(...args),
  useCreateComment: (...args: unknown[]) => mockUseCreateComment(...args),
  useToggleLikeComment: (...args: unknown[]) => mockUseToggleLikeComment(...args),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    app: {
      error: vi.fn(),
      info: vi.fn(),
    },
  },
}))

vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' '),
}))

vi.mock('@/components/shared/glass-bubble', () => ({
  GlassBubble: ({ children, className }: { children: React.ReactNode; className?: string; variant?: string }) => (
    <div className={className}>{children}</div>
  ),
  GlassBubbleBadge: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/lib/utils/glass-variants', () => ({
  glass: () => '',
}))

vi.mock('@/components/features/dashboard/posts/rich-text-display', () => ({
  RichTextDisplay: ({ content }: { content: string; className?: string; truncate?: boolean; maxWords?: number }) => (
    <span>{content}</span>
  ),
}))

// ─── Tests ─────────────────────────────────────────────────────────────────

import { CommentSection } from '@/components/features/dashboard/comments/comment-section'

describe('CommentSection (TC-094 & TC-095)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading state', () => {
    it('shows skeleton loaders while comments are loading', () => {
      // Arrange
      mockUseComments.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      })
      mockUseCreateComment.mockReturnValue({ mutate: vi.fn() })
      mockUseToggleLikeComment.mockReturnValue({ mutate: vi.fn() })

      // Act
      const { container } = render(<CommentSection postId="post-123" />)

      // Assert - skeletons should have the animate-pulse class
      const skeletons = container.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('Error state', () => {
    it('shows error message and retry button on error', () => {
      // Arrange
      mockUseComments.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to load'),
      })
      mockUseCreateComment.mockReturnValue({ mutate: vi.fn() })
      mockUseToggleLikeComment.mockReturnValue({ mutate: vi.fn() })

      // Act
      render(<CommentSection postId="post-123" />)

      // Assert
      expect(screen.getByText(/failed to load comments/i)).toBeDefined()
      expect(screen.getByText(/retry/i)).toBeDefined()
    })
  })

  describe('Empty state', () => {
    it('shows empty message when no comments exist', () => {
      // Arrange
      mockUseComments.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      })
      mockUseCreateComment.mockReturnValue({ mutate: vi.fn() })
      mockUseToggleLikeComment.mockReturnValue({ mutate: vi.fn() })

      // Act
      render(<CommentSection postId="post-123" />)

      // Assert
      expect(screen.getByText(/no comments yet/i)).toBeDefined()
      expect(screen.getByText(/be the first to comment/i)).toBeDefined()
    })
  })

  describe('Rendering comments', () => {
    it('renders comments with author names and content', () => {
      // Arrange
      mockUseComments.mockReturnValue({
        data: mockComments,
        isLoading: false,
        error: null,
      })
      mockUseCreateComment.mockReturnValue({ mutate: vi.fn() })
      mockUseToggleLikeComment.mockReturnValue({ mutate: vi.fn() })

      // Act
      render(<CommentSection postId="post-123" />)

      // Assert
      expect(screen.getByText('Alice')).toBeDefined()
      expect(screen.getByText('Great post! Really helpful.')).toBeDefined()
      expect(screen.getByText('Bob')).toBeDefined()
      expect(screen.getByText('I agree with this!')).toBeDefined()
    })

    it('shows like count on comments that have likes', () => {
      // Arrange
      mockUseComments.mockReturnValue({
        data: mockComments,
        isLoading: false,
        error: null,
      })
      mockUseCreateComment.mockReturnValue({ mutate: vi.fn() })
      mockUseToggleLikeComment.mockReturnValue({ mutate: vi.fn() })

      // Act
      render(<CommentSection postId="post-123" />)

      // Assert - Alice's comment has 3 likes
      expect(screen.getByText('3')).toBeDefined()
    })

    it('shows relative timestamps', () => {
      // Arrange
      mockUseComments.mockReturnValue({
        data: mockComments,
        isLoading: false,
        error: null,
      })
      mockUseCreateComment.mockReturnValue({ mutate: vi.fn() })
      mockUseToggleLikeComment.mockReturnValue({ mutate: vi.fn() })

      // Act
      render(<CommentSection postId="post-123" />)

      // Assert
      expect(screen.getByText('5m ago')).toBeDefined()
      expect(screen.getByText('3m ago')).toBeDefined()
    })
  })

  describe('Comment input', () => {
    it('renders a comment input field', () => {
      // Arrange
      mockUseComments.mockReturnValue({
        data: mockComments,
        isLoading: false,
        error: null,
      })
      mockUseCreateComment.mockReturnValue({ mutate: vi.fn() })
      mockUseToggleLikeComment.mockReturnValue({ mutate: vi.fn() })

      // Act
      render(<CommentSection postId="post-123" />)

      // Assert
      const input = screen.getByPlaceholderText(/write a comment/i)
      expect(input).toBeDefined()
    })

    it('calls createComment.mutate on form submit', async () => {
      // Arrange
      const mutateFn = vi.fn()
      mockUseComments.mockReturnValue({
        data: mockComments,
        isLoading: false,
        error: null,
      })
      mockUseCreateComment.mockReturnValue({ mutate: mutateFn })
      mockUseToggleLikeComment.mockReturnValue({ mutate: vi.fn() })

      render(<CommentSection postId="post-123" />)

      // Act
      const input = screen.getByPlaceholderText(/write a comment/i)
      fireEvent.change(input, { target: { value: 'My new comment' } })
      // Submit the form
      const sendButton = screen.getByRole('button', { name: /send comment/i })
      fireEvent.click(sendButton)

      // Assert
      await waitFor(() => {
        expect(mutateFn).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Reply functionality', () => {
    it('shows reply button on comments', () => {
      // Arrange
      mockUseComments.mockReturnValue({
        data: mockComments,
        isLoading: false,
        error: null,
      })
      mockUseCreateComment.mockReturnValue({ mutate: vi.fn() })
      mockUseToggleLikeComment.mockReturnValue({ mutate: vi.fn() })

      // Act
      render(<CommentSection postId="post-123" />)

      // Assert - "Reply" buttons should be visible
      const replyButtons = screen.getAllByText('Reply')
      expect(replyButtons.length).toBeGreaterThan(0)
    })

    it('shows nested replies when available', () => {
      // Arrange
      mockUseComments.mockReturnValue({
        data: mockComments,
        isLoading: false,
        error: null,
      })
      mockUseCreateComment.mockReturnValue({ mutate: vi.fn() })
      mockUseToggleLikeComment.mockReturnValue({ mutate: vi.fn() })

      // Act
      render(<CommentSection postId="post-123" />)

      // Assert - Alice's comment has a reply from Bob
      expect(screen.getByText(/view 1 reply/i)).toBeDefined()
    })
  })
})
