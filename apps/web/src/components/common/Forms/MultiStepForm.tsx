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

  // Ensure steps is valid for hooks
  const safeSteps = steps || [];
  const safeCurrentStep = Math.max(0, Math.min(currentStep, Math.max(0, safeSteps.length - 1)));
  const safeCurrentStepData = safeSteps[safeCurrentStep];

  // Load persisted state
  useEffect(() => {
    if (persistState && storageKey && safeSteps.length > 0) {
      const savedState = localStorage.getItem(`${storageKey}_state`);
      if (savedState) {
        try {
          const { step, completed } = JSON.parse(savedState);
          // Clamp persisted step within bounds
          const clampedStep = Math.max(0, Math.min(step, safeSteps.length - 1));
          setCurrentStep(clampedStep);
          // Filter completed indices to valid range
          const validCompleted = completed.filter(
            (idx: number) => idx >= 0 && idx < safeSteps.length
          );
          setCompletedSteps(new Set(validCompleted));
        } catch {
          // Failed to load persisted form state
        }
      }
    }
  }, [persistState, storageKey, safeSteps.length]);

  // Save state on changes
  useEffect(() => {
    if (persistState && storageKey && safeSteps.length > 0) {
      const stateToSave = {
        step: currentStep,
        completed: Array.from(completedSteps),
      };
      localStorage.setItem(`${storageKey}_state`, JSON.stringify(stateToSave));
    }
  }, [currentStep, completedSteps, persistState, storageKey, safeSteps.length]);

  // Notify step change
  useEffect(() => {
    if (safeCurrentStepData?.id) {
      onStepChange?.(safeCurrentStep, safeCurrentStepData.id);
    }
  }, [safeCurrentStep, safeCurrentStepData?.id, onStepChange]);

  const validateStep = useCallback(async (): Promise<boolean> => {
    if (!safeCurrentStepData?.validation) return true;

    setIsValidating(true);
    try {
      const isValid = await safeCurrentStepData.validation();
      return isValid;
    } catch {
      // Step validation error
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [safeCurrentStepData]);

  const handleNext = useCallback(async () => {
    if (isSubmitting || safeSteps.length === 0) return; // Prevent re-entry

    const isValid = await validateStep();
    if (!isValid && !safeCurrentStepData?.optional) return;

    const newCompletedSteps = new Set(completedSteps);
    newCompletedSteps.add(safeCurrentStep);
    setCompletedSteps(newCompletedSteps);

    const isLastStep = safeCurrentStep === safeSteps.length - 1;
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
      setCurrentStep(safeCurrentStep + 1);
    }
  }, [
    safeCurrentStep,
    completedSteps,
    safeSteps.length,
    validateStep,
    safeCurrentStepData?.optional,
    onComplete,
    persistState,
    storageKey,
    isSubmitting,
  ]);

  const handlePrevious = useCallback(() => {
    const isFirstStep = safeCurrentStep === 0;
    if (!isFirstStep) {
      setSlideDirection('right');
      setCurrentStep(safeCurrentStep - 1);
    }
  }, [safeCurrentStep]);

  const handleSkip = useCallback(() => {
    const isLastStep = safeCurrentStep === safeSteps.length - 1;
    if (allowSkipOptional && safeCurrentStepData?.optional && !isLastStep) {
      setSlideDirection('left');
      setCurrentStep(safeCurrentStep + 1);
    }
  }, [safeCurrentStep, safeCurrentStepData?.optional, safeSteps.length, allowSkipOptional]);

  const handleStepClick = useCallback(
    async (stepIndex: number) => {
      // Can only go to previous steps or completed steps
      if (stepIndex < safeCurrentStep || completedSteps.has(stepIndex)) {
        setSlideDirection(stepIndex < safeCurrentStep ? 'right' : 'left');
        setCurrentStep(stepIndex);
      } else if (stepIndex === safeCurrentStep + 1) {
        // Allow going to next step with validation
        await handleNext();
      }
    },
    [safeCurrentStep, completedSteps, handleNext]
  );

  // Early return if no steps
  if (!steps || steps.length === 0) {
    return null;
  }

  // Clamp currentStep within bounds
  const clampedCurrentStep = Math.max(0, Math.min(currentStep, steps.length - 1));
  const isFirstStep = clampedCurrentStep === 0;
  const isLastStep = clampedCurrentStep === steps.length - 1;
  const currentStepData = steps[clampedCurrentStep];

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
