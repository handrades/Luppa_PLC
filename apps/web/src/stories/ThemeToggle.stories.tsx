import type { Meta, StoryObj } from '@storybook/react';
import { ThemeToggle } from '../components/common/Layout/ThemeToggle';
import { ThemeProvider } from '../contexts/ThemeContext';

const meta = {
  title: 'Components/Layout/ThemeToggle',
  component: ThemeToggle,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    Story => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const InHeader: Story = {
  decorators: [
    Story => (
      <div
        style={{
          backgroundColor: '#1976d2',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px',
        }}
      >
        <Story />
      </div>
    ),
  ],
};
