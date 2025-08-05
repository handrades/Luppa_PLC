import type { Meta, StoryObj } from '@storybook/react-vite';
import { ErrorBoundary } from '../components/common/Feedback/ErrorBoundary';
import { Button, Typography } from '@mui/material';
import { useState } from 'react';

/**
 * Component that throws an error on demand for testing ErrorBoundary
 */
const ErrorThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('This is a simulated error for Storybook demonstration');
  }
  return (
    <Typography variant='body1' color='success.main'>
      ✅ Component is working normally. Click the button below to trigger an error.
    </Typography>
  );
};

/**
 * Wrapper component for testing ErrorBoundary behavior
 */
const ErrorBoundaryDemo = () => {
  const [shouldThrow, setShouldThrow] = useState(false);

  return (
    <ErrorBoundary>
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <Typography variant='h6' gutterBottom>
          Error Boundary Test Component
        </Typography>
        <ErrorThrowingComponent shouldThrow={shouldThrow} />
        <Button
          variant='contained'
          color='error'
          onClick={() => setShouldThrow(true)}
          disabled={shouldThrow}
          style={{ marginTop: '1rem' }}
        >
          Trigger Error
        </Button>
      </div>
    </ErrorBoundary>
  );
};

/**
 * ErrorBoundary provides graceful error handling for the Industrial Inventory application.
 *
 * ## Features
 * - Catches JavaScript errors anywhere in the child component tree
 * - Displays user-friendly error message instead of blank screen
 * - Shows technical details in development mode for debugging
 * - Provides recovery actions (refresh page, return to dashboard)
 * - Designed for industrial environments with clear, actionable messaging
 *
 * ## Usage Guidelines
 * - Wrap entire application or major sections
 * - Don't overuse - one boundary per major feature area is sufficient
 * - Ensure error messages are clear and non-technical for end users
 * - Always provide recovery actions
 * - Monitor errors in production for continuous improvement
 */
const meta: Meta<typeof ErrorBoundary> = {
  title: 'Components/Feedback/ErrorBoundary',
  component: ErrorBoundary,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
          A React error boundary component that catches JavaScript errors in child components 
          and displays a fallback UI instead of crashing the entire application. Essential for 
          production applications in industrial environments where stability is critical.
        `,
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Normal operation - ErrorBoundary wrapping healthy components
 */
export const Default: Story = {
  render: () => (
    <ErrorBoundary>
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <Typography variant='h5' gutterBottom color='success.main'>
          ✅ Application Running Normally
        </Typography>
        <Typography variant='body1' color='text.secondary'>
          When no errors occur, the ErrorBoundary is invisible and children render normally.
        </Typography>
      </div>
    </ErrorBoundary>
  ),
  parameters: {
    docs: {
      description: {
        story: 'ErrorBoundary in normal operation - children render without interference.',
      },
    },
  },
};

/**
 * Interactive demo showing error boundary in action
 */
export const InteractiveDemo: Story = {
  render: () => <ErrorBoundaryDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Click the button to trigger an error and see how ErrorBoundary handles it.',
      },
    },
  },
};

/**
 * Simulated error state showing the error UI
 */
export const ErrorState: Story = {
  render: () => (
    <ErrorBoundary>
      <ErrorThrowingComponent shouldThrow={true} />
    </ErrorBoundary>
  ),
  parameters: {
    docs: {
      description: {
        story: 'What users see when an error occurs - clean, actionable error interface.',
      },
    },
  },
};

/**
 * Error boundary wrapping complex industrial UI
 */
export const IndustrialContext: Story = {
  render: () => (
    <ErrorBoundary>
      <div style={{ padding: '2rem' }}>
        <Typography variant='h4' gutterBottom>
          PLC Inventory Dashboard
        </Typography>
        <Typography variant='body1' paragraph>
          This represents a complex industrial application with multiple components. The
          ErrorBoundary ensures that if any component fails, users get helpful recovery options
          instead of a blank screen.
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          In a real application, this would contain tables, forms, charts, and other interactive
          elements that could potentially throw errors.
        </Typography>
      </div>
    </ErrorBoundary>
  ),
  parameters: {
    docs: {
      description: {
        story: 'ErrorBoundary protecting complex industrial UI components.',
      },
    },
  },
};

/**
 * Development mode showing error details
 */
export const DevelopmentMode: Story = {
  render: () => (
    <ErrorBoundary showDetails={true}>
      <ErrorThrowingComponent shouldThrow={true} />
    </ErrorBoundary>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'When showDetails is true, technical error details are shown to help with debugging.',
      },
    },
  },
};
