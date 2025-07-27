import { fireEvent, render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { AppLayout } from './AppLayout'
import { theme } from '../../../styles/theme'

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  >
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  </BrowserRouter>
)

describe('AppLayout', () => {
  test('renders header and content', () => {
    render(
      <TestWrapper>
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      </TestWrapper>
    )
    
    expect(screen.getByText('Luppa PLC Inventory')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  test('opens sidebar when menu button is clicked', () => {
    render(
      <TestWrapper>
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      </TestWrapper>
    )
    
    const menuButton = screen.getByRole('button', { name: /menu/i })
    fireEvent.click(menuButton)
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Equipment')).toBeInTheDocument()
  })
})
