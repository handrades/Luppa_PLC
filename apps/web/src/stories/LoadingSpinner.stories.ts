import type { Meta, StoryObj } from '@storybook/react';
import { LoadingSpinner } from '../components/common/Feedback/LoadingSpinner';

/**
 * LoadingSpinner is a versatile loading indicator component for the Industrial Inventory framework.
 * 
 * ## Features
 * - Customizable size and message
 * - Full-screen overlay mode for blocking interactions
 * - Consistent with Material-UI design system
 * - Optimized for industrial environments (touch-friendly)
 * 
 * ## Usage Guidelines
 * - Use standard size (40px) for inline loading states
 * - Use larger sizes (60px+) for full-screen loading
 * - Provide meaningful loading messages for better UX
 * - Use full-screen mode sparingly for critical operations
 */
const meta: Meta<typeof LoadingSpinner> = {
  title: 'Components/Feedback/LoadingSpinner',
  component: LoadingSpinner,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
          A flexible loading spinner component that can be used inline or as a full-screen overlay.
          Built with Material-UI CircularProgress for consistency with the design system.
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    message: {
      control: 'text',
      description: 'Loading message displayed below the spinner',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'Loading...' },
      },
    },
    size: {
      control: { type: 'range', min: 20, max: 100, step: 10 },
      description: 'Size of the spinner in pixels',
      table: {
        type: { summary: 'number' },
        defaultValue: { summary: '40' },
      },
    },
    fullScreen: {
      control: 'boolean',
      description: 'Whether to display as a full-screen overlay',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default loading spinner with standard size and message
 */
export const Default: Story = {
  args: {
    message: 'Loading...',
    size: 40,
    fullScreen: false,
  },
};

/**
 * Small spinner for inline use in compact spaces
 */
export const Small: Story = {
  args: {
    message: 'Loading data...',
    size: 24,
    fullScreen: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Ideal for loading states within tables, cards, or compact UI elements.',
      },
    },
  },
};

/**
 * Large spinner for prominent loading states
 */
export const Large: Story = {
  args: {
    message: 'Initializing PLC inventory...',
    size: 60,
    fullScreen: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Use for main content loading states or when loading takes significant time.',
      },
    },
  },
};

/**
 * Full-screen overlay spinner for blocking operations
 */
export const FullScreen: Story = {
  args: {
    message: 'Updating database...',
    size: 50,
    fullScreen: true,
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Blocks all user interaction while critical operations are in progress. Use sparingly.',
      },
    },
  },
};

/**
 * Spinner without message text
 */
export const NoMessage: Story = {
  args: {
    message: '',
    size: 40,
    fullScreen: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Clean spinner without text, useful when context is clear from surrounding UI.',
      },
    },
  },
};

/**
 * Custom message for specific operations
 */
export const CustomMessage: Story = {
  args: {
    message: 'Connecting to PLC at 192.168.1.100...',
    size: 40,
    fullScreen: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Provide specific, actionable feedback about what is loading.',
      },
    },
  },
};

/**
 * Industrial use case - Equipment sync
 */
export const EquipmentSync: Story = {
  args: {
    message: 'Synchronizing equipment data with PLCs...',
    size: 45,
    fullScreen: true,
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Example of loading state during critical industrial operations.',
      },
    },
  },
};
