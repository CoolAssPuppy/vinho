import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '@/app/auth/login/page'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'

jest.mock('@/lib/supabase')
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}))

const mockPush = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => new URLSearchParams(),
}))

describe('LoginPage', () => {
  const mockSupabase = {
    auth: {
      signInWithPassword: jest.fn(),
      signInWithOAuth: jest.fn(),
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  it('renders login form correctly', () => {
    render(<LoginPage />)

    expect(screen.getByText('Welcome back.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument()
  })

  it('validates email format', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    const emailInput = screen.getByLabelText('Email')

    await user.type(emailInput, 'invalid-email')

    expect(emailInput).toBeInvalid()
  })

  it('handles successful login', async () => {
    const user = userEvent.setup()
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ error: null })

    render(<LoginPage />)

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Sign in' })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          password: 'password123',
        }),
      )
    })

    // safeNext(null) falls back to "/journal" when no ?next param is present.
    expect(mockPush).toHaveBeenCalledWith('/journal')
    expect(toast.success).toHaveBeenCalledWith('Welcome back!')
  })

  it('handles login error', async () => {
    const user = userEvent.setup()
    const error = new Error('Invalid credentials')
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ error })

    render(<LoginPage />)

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Sign in' })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalled()
    })
    expect(toast.error).toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('handles Google OAuth login', async () => {
    const user = userEvent.setup()
    mockSupabase.auth.signInWithOAuth.mockResolvedValue({ error: null })

    render(<LoginPage />)

    const googleButton = screen.getByRole('button', {
      name: /sign in with google/i,
    })
    await user.click(googleButton)

    await waitFor(() => {
      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'google',
          options: expect.objectContaining({
            redirectTo: expect.stringContaining('/auth/callback'),
          }),
        }),
      )
    })
  })

  it('disables form during submission', async () => {
    const user = userEvent.setup()
    mockSupabase.auth.signInWithPassword.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100)),
    )

    render(<LoginPage />)

    const submitButton = screen.getByRole('button', { name: 'Sign in' })
    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    expect(submitButton).toBeDisabled()
    expect(submitButton).toHaveTextContent('Signing in...')
  })
})
