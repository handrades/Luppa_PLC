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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  // Early return if no steps
  if (!steps || steps.length === 0) {
    return null;
  }

  // Clamp currentStep within bounds
  const clampedCurrentStep = Math.max(0, Math.min(currentStep, steps.length - 1));
  const isFirstStep = clampedCurrentStep === 0;
  const isLastStep = clampedCurrentStep === steps.length - 1;
  const currentStepData = steps[clampedCurrentStep];

  // Load persisted state
  useEffect(() => {
    if (persistState && storageKey) {
      const savedState = localStorage.getItem(`${storageKey}_state`);
      if (savedState) {
        try {
          const { step, completed } = JSON.parse(savedState);
          // Clamp persisted step within bounds
          const clampedStep = Math.max(0, Math.min(step, steps.length - 1));
          setCurrentStep(clampedStep);
          // Filter completed indices to valid range
          const validCompleted = completed.filter((idx: number) => idx >= 0 && idx < steps.length);
          setCompletedSteps(new Set(validCompleted));
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
  }, [currentStep, completedSteps, persistState, storageKey, steps.length]);

  // Notify step change
  useEffect(() => {
    onStepChange?.(clampedCurrentStep, currentStepData.id);
  }, [clampedCurrentStep, currentStepData.id, onStepChange]);

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
    if (isSubmitting) return; // Prevent re-entry

    const isValid = await validateStep();
    if (!isValid && !currentStepData.optional) return;

    const newCompletedSteps = new Set(completedSteps);
    newCompletedSteps.add(clampedCurrentStep);
    setCompletedSteps(newCompletedSteps);

    if (isLastStep) {
      setIsSubmitting(true);
      try {
        await onComplete();
        // Clear persisted state after completion
        if (persistState && storageKey) {
          localStorage.removeItem(`${storageKey}_state`);
        }
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setSlideDirection('left');
      setCurrentStep(clampedCurrentStep + 1);
    }
  }, [
    clampedCurrentStep,
    completedSteps,
    isLastStep,
    validateStep,
    currentStepData.optional,
    onComplete,
    persistState,
    storageKey,
    isSubmitting,
  ]);

  const handlePrevious = useCallback(() => {
    if (!isFirstStep) {
      setSlideDirection('right');
      setCurrentStep(clampedCurrentStep - 1);
    }
  }, [clampedCurrentStep, isFirstStep]);

  const handleSkip = useCallback(() => {
    if (allowSkipOptional && currentStepData.optional && !isLastStep) {
      setSlideDirection('left');
      setCurrentStep(clampedCurrentStep + 1);
    }
  }, [clampedCurrentStep, currentStepData.optional, isLastStep, allowSkipOptional]);

  const handleStepClick = useCallback(
    async (stepIndex: number) => {
      // Can only go to previous steps or completed steps
      if (stepIndex < clampedCurrentStep || completedSteps.has(stepIndex)) {
        setSlideDirection(stepIndex < clampedCurrentStep ? 'right' : 'left');
        setCurrentStep(stepIndex);
      } else if (stepIndex === clampedCurrentStep + 1) {
        // Allow going to next step with validation
        await handleNext();
      }
    },
    [clampedCurrentStep, completedSteps, handleNext]
  );

  return (
    <Box sx={{ width: '100%' }}>
      <StepIndicator
        steps={steps}
        currentStep={clampedCurrentStep}
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
        <Fade in key={clampedCurrentStep} timeout={300}>
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
              disabled={isValidating || isSubmitting}
              endIcon={isLastStep ? <CheckIcon /> : <ArrowForwardIcon />}
              sx={{ minWidth: '120px' }}
            >
              {isSubmitting
                ? 'Submitting...'
                : isValidating
                  ? 'Validating...'
                  : isLastStep
                    ? submitButtonText
                    : nextButtonText}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};
