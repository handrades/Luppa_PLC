import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FormStep, MultiStepForm } from './MultiStepForm';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';

const theme = createTheme();

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>{component}</ThemeProvider>
    </BrowserRouter>
  );
};

const mockSteps: FormStep[] = [
  {
    id: 'step1',
    label: 'Step 1',
    component: <div>Step 1 Content</div>,
  },
  {
    id: 'step2',
    label: 'Step 2',
    component: <div>Step 2 Content</div>,
    optional: true,
  },
  {
    id: 'step3',
    label: 'Step 3',
    component: <div>Step 3 Content</div>,
  },
];

describe('MultiStepForm', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders first step initially', () => {
    renderWithProviders(<MultiStepForm steps={mockSteps} onComplete={jest.fn()} />);

    expect(screen.getByRole('heading', { name: 'Step 1' })).toBeInTheDocument();
    expect(screen.getByText('Step 1 Content')).toBeInTheDocument();
  });

  it('navigates to next step', async () => {
    renderWithProviders(<MultiStepForm steps={mockSteps} onComplete={jest.fn()} />);

    const nextButton = screen.getByRole('button', { name: /next/i });

    await act(async () => {
      fireEvent.click(nextButton);
    });

    expect(screen.getByRole('heading', { name: 'Step 2' })).toBeInTheDocument();
    expect(screen.getByText('Step 2 Content')).toBeInTheDocument();
  });

  it('navigates to previous step', async () => {
    renderWithProviders(<MultiStepForm steps={mockSteps} onComplete={jest.fn()} initialStep={1} />);

    const previousButton = screen.getByRole('button', { name: /previous/i });

    await act(async () => {
      fireEvent.click(previousButton);
    });

    expect(screen.getByRole('heading', { name: 'Step 1' })).toBeInTheDocument();
    expect(screen.getByText('Step 1 Content')).toBeInTheDocument();
  });

  it('disables previous button on first step', () => {
    renderWithProviders(<MultiStepForm steps={mockSteps} onComplete={jest.fn()} />);

    const previousButton = screen.getByRole('button', { name: /previous/i });
    expect(previousButton).toBeDisabled();
  });

  it('shows complete button on last step', () => {
    renderWithProviders(<MultiStepForm steps={mockSteps} onComplete={jest.fn()} initialStep={2} />);

    const completeButton = screen.getByRole('button', { name: /complete/i });
    expect(completeButton).toBeInTheDocument();
  });

  it('calls onComplete when finishing last step', async () => {
    const onComplete = jest.fn();
    renderWithProviders(
      <MultiStepForm steps={mockSteps} onComplete={onComplete} initialStep={2} />
    );

    const completeButton = screen.getByRole('button', { name: /complete/i });

    await act(async () => {
      fireEvent.click(completeButton);
    });

    expect(onComplete).toHaveBeenCalled();
  });

  it('shows optional label for optional steps', () => {
    renderWithProviders(<MultiStepForm steps={mockSteps} onComplete={jest.fn()} initialStep={1} />);

    expect(screen.getByText('Optional Step')).toBeInTheDocument();
  });

  it('shows skip button for optional steps', () => {
    renderWithProviders(
      <MultiStepForm
        steps={mockSteps}
        onComplete={jest.fn()}
        initialStep={1}
        allowSkipOptional={true}
      />
    );

    const skipButton = screen.getByRole('button', { name: /skip/i });
    expect(skipButton).toBeInTheDocument();
  });

  it('skips optional step when skip is clicked', async () => {
    renderWithProviders(
      <MultiStepForm
        steps={mockSteps}
        onComplete={jest.fn()}
        initialStep={1}
        allowSkipOptional={true}
      />
    );

    const skipButton = screen.getByRole('button', { name: /skip/i });

    await act(async () => {
      fireEvent.click(skipButton);
    });

    expect(screen.getByRole('heading', { name: 'Step 3' })).toBeInTheDocument();
    expect(screen.getByText('Step 3 Content')).toBeInTheDocument();
  });

  it('validates step before proceeding', async () => {
    const validationFn = jest.fn().mockResolvedValue(false);
    const stepsWithValidation: FormStep[] = [
      {
        id: 'step1',
        label: 'Step 1',
        component: <div>Step 1 Content</div>,
        validation: validationFn,
      },
      {
        id: 'step2',
        label: 'Step 2',
        component: <div>Step 2 Content</div>,
      },
    ];

    renderWithProviders(<MultiStepForm steps={stepsWithValidation} onComplete={jest.fn()} />);

    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(validationFn).toHaveBeenCalled();
    });

    // Should still be on step 1 because validation failed
    expect(screen.getByText('Step 1 Content')).toBeInTheDocument();
  });

  it('proceeds when validation passes', async () => {
    const validationFn = jest.fn().mockResolvedValue(true);
    const stepsWithValidation: FormStep[] = [
      {
        id: 'step1',
        label: 'Step 1',
        component: <div>Step 1 Content</div>,
        validation: validationFn,
      },
      {
        id: 'step2',
        label: 'Step 2',
        component: <div>Step 2 Content</div>,
      },
    ];

    renderWithProviders(<MultiStepForm steps={stepsWithValidation} onComplete={jest.fn()} />);

    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Step 2 Content')).toBeInTheDocument();
    });
  });

  it('persists state to localStorage', async () => {
    renderWithProviders(
      <MultiStepForm
        steps={mockSteps}
        onComplete={jest.fn()}
        persistState={true}
        storageKey='testForm'
      />
    );

    const nextButton = screen.getByRole('button', { name: /next/i });

    await act(async () => {
      fireEvent.click(nextButton);
    });

    const savedState = localStorage.getItem('testForm_state');
    expect(savedState).toBeTruthy();

    const parsed = JSON.parse(savedState!);
    expect(parsed.step).toBe(1);
    expect(parsed.completed).toContain(0);
  });

  it('restores state from localStorage', () => {
    const savedState = {
      step: 1,
      completed: [0],
    };
    localStorage.setItem('testForm_state', JSON.stringify(savedState));

    renderWithProviders(
      <MultiStepForm
        steps={mockSteps}
        onComplete={jest.fn()}
        persistState={true}
        storageKey='testForm'
      />
    );

    // Should start at step 2 (index 1)
    expect(screen.getByRole('heading', { name: 'Step 2' })).toBeInTheDocument();
    expect(screen.getByText('Step 2 Content')).toBeInTheDocument();
  });

  it('calls onStepChange when step changes', async () => {
    const onStepChange = jest.fn();
    renderWithProviders(
      <MultiStepForm steps={mockSteps} onComplete={jest.fn()} onStepChange={onStepChange} />
    );

    expect(onStepChange).toHaveBeenCalledWith(0, 'step1');

    const nextButton = screen.getByRole('button', { name: /next/i });

    await act(async () => {
      fireEvent.click(nextButton);
    });

    expect(onStepChange).toHaveBeenCalledWith(1, 'step2');
  });

  it('uses custom button texts', () => {
    renderWithProviders(
      <MultiStepForm
        steps={mockSteps}
        onComplete={jest.fn()}
        nextButtonText='Continue'
        previousButtonText='Back'
        submitButtonText='Finish'
        skipButtonText='Skip This'
        initialStep={1}
        allowSkipOptional={true}
      />
    );

    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /skip this/i })).toBeInTheDocument();
  });
});
