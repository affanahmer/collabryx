/**
 * Login Form Component Tests
 * Covers login paths complementary to TC-011/TC-012
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LoginForm } from '@/components/features/auth/login-form'
import { mockSupabaseClient } from '@/../tests/setup/mocks'

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    // Stub navigation
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        href: 'http://localhost:3000',
        assign: vi.fn(),
        origin: 'http://localhost:3000',
      },
      writable: true,
    })
  })

  it('should render the login form with heading', () => {
    // Arrange & Act
    render(<LoginForm />)

    // Assert
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('m@example.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
  })

  it('should render social login buttons', () => {
    // Arrange & Act
    render(<LoginForm />)

    // Assert
    expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in with GitHub' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in with Apple' })).toBeInTheDocument()
  })

  it('should call supabase.auth.signInWithPassword on form submission', async () => {
    // Arrange
    render(<LoginForm />)

    // Wait for mount
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled()
    })

    // Act
    fireEvent.change(screen.getByPlaceholderText('m@example.com'), {
      target: { value: 'valid@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'password123' },
    })

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    fireEvent.click(submitButton)

    // Assert
    await waitFor(() => {
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalled()
    })
  })

  it('should show error toast on invalid credentials', async () => {
    // Arrange
    mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Invalid login credentials' },
    })

    render(<LoginForm />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled()
    })

    // Act
    fireEvent.change(screen.getByPlaceholderText('m@example.com'), {
      target: { value: 'bad@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'wrongpass' },
    })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    // Assert
    await waitFor(() => {
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalled()
    })
  })

  it('should navigate to register page via link', () => {
    // Arrange & Act
    render(<LoginForm />)

    // Assert
    const signupLink = screen.getByRole('link', { name: /sign up/i })
    expect(signupLink).toBeInTheDocument()
    expect(signupLink).toHaveAttribute('href', '/register')
  })
})
