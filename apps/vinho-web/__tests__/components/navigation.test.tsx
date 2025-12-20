import { render, screen } from '@testing-library/react'
import { Navigation } from '@/components/navigation'

const mockPathname = '/'

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}))

describe('Navigation', () => {
  it('renders all navigation links', () => {
    render(<Navigation />)

    expect(screen.getByText('Vinho')).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Scan')).toBeInTheDocument()
    expect(screen.getByText('Map')).toBeInTheDocument()
    expect(screen.getByText('Journal')).toBeInTheDocument()
    expect(screen.getByText('Discover')).toBeInTheDocument()
    expect(screen.getByText('Wine Lists')).toBeInTheDocument()
  })

  it('highlights active route', () => {
    render(<Navigation />)

    const homeLink = screen.getByRole('link', { name: 'Home' })
    expect(homeLink).toHaveClass('text-foreground')

    const scanLink = screen.getByRole('link', { name: 'Scan' })
    expect(scanLink).toHaveClass('text-foreground/60')
  })

  it('shows mobile menu on small screens', () => {
    render(<Navigation />)

    const mobileMenuButton = screen.getByRole('button', { name: /toggle menu/i })
    expect(mobileMenuButton).toBeInTheDocument()
  })

  it('displays user avatar dropdown', () => {
    render(<Navigation />)

    const avatarButtons = screen.getAllByRole('button')
    const avatarButton = avatarButtons.find(button => button.textContent?.includes('U'))
    expect(avatarButton).toBeInTheDocument()
  })
})