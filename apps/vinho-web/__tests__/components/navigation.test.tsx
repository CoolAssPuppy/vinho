import { render, screen } from '@testing-library/react'
import { Navigation } from '@/components/navigation'

let mockPathname = '/journal'

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}))

// Navigation reads the signed-in user from the UserProvider context.
const mockUser = { email: 'user@example.com' }
const mockUseUser = jest.fn()

jest.mock('@/components/providers/user-provider', () => ({
  useUser: () => mockUseUser(),
}))

describe('Navigation', () => {
  beforeEach(() => {
    mockPathname = '/journal'
    mockUseUser.mockReturnValue({ user: mockUser, profile: null })
  })

  it('renders the brand and navigation links', () => {
    render(<Navigation />)

    expect(screen.getByText('Vinho')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Journal' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Scan' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Map' })).toBeInTheDocument()
  })

  it('renders nothing when there is no signed-in user', () => {
    mockUseUser.mockReturnValue({ user: null, profile: null })

    const { container } = render(<Navigation />)
    expect(container).toBeEmptyDOMElement()
  })

  it('highlights the active route', () => {
    mockPathname = '/scan'
    render(<Navigation />)

    const scanLink = screen.getByRole('link', { name: 'Scan' })
    expect(scanLink).toHaveClass('text-foreground')

    const journalLink = screen.getByRole('link', { name: 'Journal' })
    expect(journalLink).toHaveClass('text-foreground/60')
  })

  it('shows the mobile menu toggle', () => {
    render(<Navigation />)

    const mobileMenuButton = screen.getByRole('button', { name: /toggle menu/i })
    expect(mobileMenuButton).toBeInTheDocument()
  })

  it('displays the user avatar with their initial', () => {
    render(<Navigation />)

    const avatarButtons = screen.getAllByRole('button')
    const avatarButton = avatarButtons.find((button) =>
      button.textContent?.includes('U'),
    )
    expect(avatarButton).toBeInTheDocument()
  })
})
