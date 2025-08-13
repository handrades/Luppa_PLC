import type { Meta, StoryObj } from '@storybook/react-vite';
import { Header } from '../components/common/Layout/Header';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { theme } from '../styles/theme';

/**
 * Header is the main navigation bar for the Industrial Inventory application.
 *
 * ## Features
 * - Fixed position header with consistent branding
 * - Menu toggle for sidebar navigation
 * - User profile dropdown with account actions
 * - Material-UI design system integration
 * - Touch-friendly controls for industrial environments
 * - Responsive design for tablets and desktop
 *
 * ## Usage Guidelines
 * - Use as the primary navigation header across all pages
 * - Ensure menu callback properly toggles sidebar
 * - Customize profile menu items based on user permissions
 * - Maintain consistent branding and colors
 * - Test accessibility with keyboard navigation
 */
const meta: Meta<typeof Header> = {
  title: 'Components/Layout/Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
          The main application header providing navigation, branding, and user account access.
          Designed for industrial environments with large, touch-friendly controls.
        `,
      },
    },
  },
  decorators: [
    Story => (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Story />
      </ThemeProvider>
    ),
  ],
  tags: ['autodocs'],
  argTypes: {
    onMenuClick: {
      description: 'Callback function triggered when menu button is clicked',
      table: {
        type: { summary: '() => void' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default header with standard functionality
 */
export const Default: Story = {
  args: {
    onMenuClick: () => console.log('menu-clicked'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Standard header configuration with menu toggle and user profile.',
      },
    },
  },
};

/**
 * Header with interactive demo showing menu functionality
 */
export const Interactive: Story = {
  args: {
    onMenuClick: () => console.log('menu-clicked'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Click the menu button or profile avatar to see interactive behavior.',
      },
    },
  },
};

/**
 * Header in tablet/mobile context
 */
export const TabletView: Story = {
  args: {
    onMenuClick: () => console.log('menu-clicked'),
  },
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
    docs: {
      description: {
        story: 'Header optimized for tablet use in industrial environments.',
      },
    },
  },
};

/**
 * Header with focus on accessibility
 */
export const AccessibilityFocused: Story = {
  args: {
    onMenuClick: () => console.log('menu-clicked'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates proper ARIA labels and keyboard navigation support.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    // This would typically include accessibility testing
    const menuButton = canvasElement.querySelector('[aria-label="menu"]');
    if (menuButton) {
      // Focus the menu button to show accessibility features
      (menuButton as HTMLElement).focus();
    }
  },
};

/**
 * Industrial context showing header in use
 */
export const IndustrialContext: Story = {
  render: args => (
    <div style={{ minHeight: '400px', backgroundColor: '#f5f5f5' }}>
      <Header {...args} />
      <div
        style={{
          marginTop: '64px',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div
          style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <h2 style={{ margin: 0, marginBottom: '1rem', color: '#1976d2' }}>
            PLC Inventory Dashboard
          </h2>
          <p style={{ margin: 0, color: '#666' }}>
            This shows how the header appears in context with application content. The header
            maintains its position and provides consistent navigation.
          </p>
        </div>
        <div
          style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <h3 style={{ margin: 0, marginBottom: '1rem', color: '#1976d2' }}>Equipment Overview</h3>
          <p style={{ margin: 0, color: '#666' }}>
            Sample content area showing industrial application layout with the header. Users can
            access menu and profile options from any page.
          </p>
        </div>
      </div>
    </div>
  ),
  args: {
    onMenuClick: () => console.log('menu-clicked'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Header in context with typical industrial application content.',
      },
    },
  },
};
