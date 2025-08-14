import React, { useCallback, useEffect, useState } from 'react';
import { Box, Button, Fade, Paper, Slide, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckIcon from '@mui/icons-material/Check';
import { StepIndicator } from './StepIndicator';

export interface FormStep {
  id: string;
  label: string;
  component: React.ReactNode;
  validation?: () => boolean | Promise<boolean>;
  optional?: boolean;
}

export interface MultiStepFormProps {
  steps: FormStep[];
  onComplete: (_data?: Record<string, unknown>) => void | Promise<void>;
  onStepChange?: (_stepIndex: number, _stepId: string) => void;
  initialStep?: number;
  showStepLabels?: boolean;
  allowSkipOptional?: boolean;
  persistState?: boolean;
  storageKey?: string;
  submitButtonText?: string;
  nextButtonText?: string;
  previousButtonText?: string;
  skipButtonText?: string;
}

/**
 * MultiStepForm component for handling multi-step form workflows
 * Provides step navigation, validation, and state persistence
 */
export const MultiStepForm: React.FC<MultiStepFormProps> = ({
  steps,
  onComplete,
  onStepChange,
  initialStep = 0,
  showStepLabels = true,
  allowSkipOptional = true,
  persistState = true,
  storageKey = 'multiStepForm',
  submitButtonText = 'Complete',
  nextButtonText = 'Next',
  previousButtonText = 'Previous',
  skipButtonText = 'Skip',
}) => {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isValidating, setIsValidating] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const currentStepData = steps[currentStep];

  // Load persisted state
  useEffect(() => {
    if (persistState && storageKey) {
      const savedState = localStorage.getItem(`${storageKey}_state`);
      if (savedState) {
        try {
          const { step, completed } = JSON.parse(savedState);
          setCurrentStep(step);
          setCompletedSteps(new Set(completed));
        } catch {
          // Failed to load persisted form state
        }
      }
    }
  }, [persistState, storageKey]);

  // Save state on changes
  useEffect(() => {
    if (persistState && storageKey) {
      const stateToSave = {
        step: currentStep,
        completed: Array.from(completedSteps),
      };
      localStorage.setItem(`${storageKey}_state`, JSON.stringify(stateToSave));
    }
  }, [currentStep, completedSteps, persistState, storageKey]);

  // Notify step change
  useEffect(() => {
    onStepChange?.(currentStep, currentStepData.id);
  }, [currentStep, currentStepData.id, onStepChange]);

  const validateStep = useCallback(async (): Promise<boolean> => {
    if (!currentStepData.validation) return true;

    setIsValidating(true);
    try {
      const isValid = await currentStepData.validation();
      return isValid;
    } catch {
      // Step validation error
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [currentStepData]);

  const handleNext = useCallback(async () => {
    const isValid = await validateStep();
    if (!isValid && !currentStepData.optional) return;

    const newCompletedSteps = new Set(completedSteps);
    newCompletedSteps.add(currentStep);
    setCompletedSteps(newCompletedSteps);

    if (isLastStep) {
      await onComplete();
      // Clear persisted state after completion
      if (persistState && storageKey) {
        localStorage.removeItem(`${storageKey}_state`);
      }
    } else {
      setSlideDirection('left');
      setCurrentStep(currentStep + 1);
    }
  }, [
    currentStep,
    completedSteps,
    isLastStep,
    validateStep,
    currentStepData.optional,
    onComplete,
    persistState,
    storageKey,
  ]);

  const handlePrevious = useCallback(() => {
    if (!isFirstStep) {
      setSlideDirection('right');
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep, isFirstStep]);

  const handleSkip = useCallback(() => {
    if (currentStepData.optional && !isLastStep) {
      setSlideDirection('left');
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, currentStepData.optional, isLastStep]);

  const handleStepClick = useCallback(
    async (stepIndex: number) => {
      // Can only go to previous steps or completed steps
      if (stepIndex < currentStep || completedSteps.has(stepIndex)) {
        setSlideDirection(stepIndex < currentStep ? 'right' : 'left');
        setCurrentStep(stepIndex);
      } else if (stepIndex === currentStep + 1) {
        // Allow going to next step with validation
        await handleNext();
      }
    },
    [currentStep, completedSteps, handleNext]
  );

  return (
    <Box sx={{ width: '100%' }}>
      <StepIndicator
        steps={steps}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
        showLabels={showStepLabels}
      />

      <Paper
        elevation={2}
        sx={{
          mt: 3,
          p: 4,
          minHeight: '400px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Fade in key={currentStep} timeout={300}>
          <Box>
            <Slide direction={slideDirection} in mountOnEnter unmountOnExit timeout={300}>
              <Box>
                <Typography variant='h5' gutterBottom>
                  {currentStepData.label}
                </Typography>

                {currentStepData.optional && (
                  <Typography
                    variant='caption'
                    color='text.secondary'
                    sx={{ display: 'block', mb: 2 }}
                  >
                    Optional Step
                  </Typography>
                )}

                <Box sx={{ mt: 3 }}>{currentStepData.component}</Box>
              </Box>
            </Slide>
          </Box>
        </Fade>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mt: 4,
            pt: 3,
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <Button
            variant='outlined'
            onClick={handlePrevious}
            disabled={isFirstStep}
            startIcon={<ArrowBackIcon />}
            sx={{ minWidth: '120px' }}
          >
            {previousButtonText}
          </Button>

          <Box sx={{ display: 'flex', gap: 2 }}>
            {currentStepData.optional && allowSkipOptional && !isLastStep && (
              <Button variant='text' onClick={handleSkip} disabled={isValidating}>
                {skipButtonText}
              </Button>
            )}

            <Button
              variant='contained'
              onClick={handleNext}
              disabled={isValidating}
              endIcon={isLastStep ? <CheckIcon /> : <ArrowForwardIcon />}
              sx={{ minWidth: '120px' }}
            >
              {isValidating ? 'Validating...' : isLastStep ? submitButtonText : nextButtonText}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};
