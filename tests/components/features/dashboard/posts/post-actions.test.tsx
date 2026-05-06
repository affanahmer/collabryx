/**
 * TC-094: Users can interact with community posts via "Like" and "Comment" features
 *
 * Tests the PostActions component for:
 * - Like button click triggers onLike callback with postId
 * - Reaction picker opens on hover
 * - Comment button click triggers onCommentClick with postId
 * - Share button click triggers onShareClick with postId
 * - Reaction selection triggers onReaction callback
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock the ReactionPicker imported by PostActions
vi.mock('@/components/features/dashboard/comments/reaction-picker', () => ({
  ReactionPicker: ({ onSelect, isOpen }: { onSelect: (reaction: string) => void; isOpen: boolean }) => {
    if (!isOpen) return null
    const reactions = ['like', 'love', 'haha', 'wow', 'sad', 'angry']
    return (
      <div data-testid="reaction-picker">
        {reactions.map((r) => (
          <button
            key={r}
            aria-label={`React with ${r.charAt(0).toUpperCase() + r.slice(1)}`}
            onClick={(e) => {
              e.stopPropagation()
              onSelect(r)
            }}
          >
            {r}
          </button>
        ))}
      </div>
    )
  },
}))

import { PostActions } from '@/components/features/dashboard/posts/post-actions'

describe('PostActions (TC-094: Like & Comment)', () => {
  const mockOnLike = vi.fn()
  const mockOnReaction = vi.fn()
  const mockOnCommentClick = vi.fn()
  const mockOnShareClick = vi.fn()

  const defaultProps = {
    postId: 'test-post-123',
    onLike: mockOnLike,
    onReaction: mockOnReaction,
    onCommentClick: mockOnCommentClick,
    onShareClick: mockOnShareClick,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Like button', () => {
    it('renders a Like button', () => {
      // Arrange & Act
      render(<PostActions {...defaultProps} />)

      // Assert
      const likeButton = screen.getByRole('button', { name: /like/i })
      expect(likeButton).toBeDefined()
    })

    it('calls onLike with postId when like button is clicked', () => {
      // Arrange
      render(<PostActions {...defaultProps} />)

      // Act
      const likeButton = screen.getByRole('button', { name: /like this post/i })
      fireEvent.click(likeButton)

      // Assert
      expect(mockOnLike).toHaveBeenCalledTimes(1)
      expect(mockOnLike).toHaveBeenCalledWith('test-post-123')
    })

    it('shows "Like" text when no reaction is set', () => {
      // Arrange & Act
      render(<PostActions {...defaultProps} />)

      // Assert
      expect(screen.getByText('Like')).toBeDefined()
    })

    it('shows reaction-specific label when a reaction is set', () => {
      // Arrange
      render(<PostActions {...defaultProps} myReaction="love" />)

      // Assert - should show "Love" instead of "Like"
      expect(screen.getByText('Love')).toBeDefined()
    })

    it('shows correct aria-label when a reaction is set', () => {
      // Arrange
      render(<PostActions {...defaultProps} myReaction="like" />)

      // Assert
      const likeButton = screen.getByRole('button', { name: /remove like reaction/i })
      expect(likeButton).toBeDefined()
    })
  })

  describe('Comment button', () => {
    it('renders a Comment button', () => {
      // Arrange & Act
      render(<PostActions {...defaultProps} />)

      // Assert
      const commentButton = screen.getByRole('button', { name: /comment on this post/i })
      expect(commentButton).toBeDefined()
    })

    it('calls onCommentClick with postId when comment button is clicked', () => {
      // Arrange
      render(<PostActions {...defaultProps} />)

      // Act
      const commentButton = screen.getByRole('button', { name: /comment on this post/i })
      fireEvent.click(commentButton)

      // Assert
      expect(mockOnCommentClick).toHaveBeenCalledTimes(1)
      expect(mockOnCommentClick).toHaveBeenCalledWith('test-post-123')
    })
  })

  describe('Share button', () => {
    it('renders a Share button', () => {
      // Arrange & Act
      render(<PostActions {...defaultProps} />)

      // Assert
      const shareButton = screen.getByRole('button', { name: /share this post/i })
      expect(shareButton).toBeDefined()
    })

    it('calls onShareClick with postId when share button is clicked', () => {
      // Arrange
      render(<PostActions {...defaultProps} />)

      // Act
      const shareButton = screen.getByRole('button', { name: /share this post/i })
      fireEvent.click(shareButton)

      // Assert
      expect(mockOnShareClick).toHaveBeenCalledTimes(1)
      expect(mockOnShareClick).toHaveBeenCalledWith('test-post-123')
    })
  })

  describe('Reaction picker', () => {
    it('opens reaction picker on mouse enter of like button', () => {
      // Arrange
      render(<PostActions {...defaultProps} />)
      const likeButton = screen.getByRole('button', { name: /like this post/i })

      // Act
      fireEvent.mouseEnter(likeButton)

      // Assert - reaction picker should be visible
      const reactionButtons = screen.getAllByRole('button', { name: /react with/i })
      expect(reactionButtons.length).toBe(6)
    })

    it('calls onReaction with correct reaction when a reaction is selected', () => {
      // Arrange
      render(<PostActions {...defaultProps} />)
      const likeButton = screen.getByRole('button', { name: /like this post/i })
      fireEvent.mouseEnter(likeButton)

      // Act
      const loveButton = screen.getByRole('button', { name: /react with love/i })
      fireEvent.click(loveButton)

      // Assert
      expect(mockOnReaction).toHaveBeenCalledTimes(1)
      expect(mockOnReaction).toHaveBeenCalledWith('test-post-123', 'love')
    })

    it('offers all 6 reaction options', () => {
      // Arrange
      render(<PostActions {...defaultProps} />)
      const likeButton = screen.getByRole('button', { name: /like this post/i })
      fireEvent.mouseEnter(likeButton)

      // Assert
      const reactions = ['Like', 'Love', 'Haha', 'Wow', 'Sad', 'Angry']
      for (const reaction of reactions) {
        expect(screen.getByRole('button', { name: new RegExp(`react with ${reaction}`, 'i') })).toBeDefined()
      }
    })
  })

  describe('Component renders all buttons', () => {
    it('renders three action buttons', () => {
      // Arrange & Act
      render(<PostActions {...defaultProps} />)

      // Assert - Like, Comment, Share
      const buttons = screen.getAllByRole('button')
      // Like button appears once, Comment once, Share once = 3 visible buttons
      const visibleButtons = buttons.filter((btn) => {
        const label = btn.getAttribute('aria-label') || ''
        return (
          label.includes('Like') ||
          label.includes('Comment') ||
          label.includes('Share')
        )
      })
      expect(visibleButtons.length).toBe(3)
    })
  })
})
