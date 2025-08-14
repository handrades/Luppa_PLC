import React from 'react';
import {
  Box,
  Step,
  StepButton,
  StepConnector,
  StepLabel,
  Stepper,
  Typography,
  stepConnectorClasses,
  styled,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { FormStep } from './MultiStepForm';

const CustomConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: {
    top: 22,
  },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage:
        'linear-gradient( 95deg,rgb(242,113,33) 0%,rgb(233,64,87) 50%,rgb(138,35,135) 100%)',
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage:
        'linear-gradient( 95deg,rgb(242,113,33) 0%,rgb(233,64,87) 50%,rgb(138,35,135) 100%)',
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 3,
    border: 0,
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : '#eaeaf0',
    borderRadius: 1,
  },
}));

const CustomStepIcon = styled('div')<{
  ownerState: { completed?: boolean; active?: boolean };
}>(({ theme, ownerState }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : '#ccc',
  zIndex: 1,
  color: '#fff',
  width: 50,
  height: 50,
  display: 'flex',
  borderRadius: '50%',
  justifyContent: 'center',
  alignItems: 'center',
  transition: 'all 0.3s ease',
  cursor: 'pointer',
  ...(ownerState.active && {
    backgroundImage:
      'linear-gradient( 136deg, rgb(242,113,33) 0%, rgb(233,64,87) 50%, rgb(138,35,135) 100%)',
    boxShadow: '0 4px 10px 0 rgba(0,0,0,.25)',
    transform: 'scale(1.1)',
  }),
  ...(ownerState.completed && {
    backgroundImage:
      'linear-gradient( 136deg, rgb(242,113,33) 0%, rgb(233,64,87) 50%, rgb(138,35,135) 100%)',
  }),
}));

export interface StepIndicatorProps {
  steps: FormStep[];
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick?: (_stepIndex: number) => void;
  showLabels?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

/**
 * StepIndicator component for visualizing progress through multi-step forms
 * Provides clickable steps with completion status
 */
export const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  showLabels = true,
  orientation = 'horizontal',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const effectiveOrientation = isMobile ? 'vertical' : orientation;

  const StepIconComponent = (props: {
    active?: boolean;
    completed?: boolean;
    className?: string;
    icon?: React.ReactNode;
  }) => {
    const { active = false, completed = false, className = '', icon } = props;

    return (
      <CustomStepIcon ownerState={{ completed, active }} className={className}>
        {completed ? (
          <CheckIcon sx={{ fontSize: '1.5rem' }} />
        ) : (
          <Typography variant='h6'>{icon}</Typography>
        )}
      </CustomStepIcon>
    );
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Stepper
        activeStep={currentStep}
        alternativeLabel={effectiveOrientation === 'horizontal'}
        orientation={effectiveOrientation}
        connector={<CustomConnector />}
      >
        {steps.map((step, index) => {
          const isCompleted = completedSteps.has(index);
          const isClickable =
            onStepClick && (index < currentStep || isCompleted || index === currentStep + 1);

          return (
            <Step key={step.id} completed={isCompleted}>
              {isClickable ? (
                <StepButton
                  onClick={() => onStepClick(index)}
                  optional={
                    step.optional && showLabels ? (
                      <Typography variant='caption'>Optional</Typography>
                    ) : undefined
                  }
                  StepIconComponent={StepIconComponent}
                  sx={{
                    '& .MuiStepLabel-label': {
                      mt: 1,
                      fontSize: isMobile ? '0.875rem' : '1rem',
                    },
                  }}
                >
                  {showLabels && step.label}
                </StepButton>
              ) : (
                <StepLabel
                  optional={
                    step.optional && showLabels ? (
                      <Typography variant='caption'>Optional</Typography>
                    ) : undefined
                  }
                  StepIconComponent={StepIconComponent}
                  sx={{
                    '& .MuiStepLabel-label': {
                      mt: 1,
                      fontSize: isMobile ? '0.875rem' : '1rem',
                    },
                  }}
                >
                  {showLabels && step.label}
                </StepLabel>
              )}
            </Step>
          );
        })}
      </Stepper>

      {/* Mobile progress text */}
      {isMobile && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant='body2' color='text.secondary'>
            Step {currentStep + 1} of {steps.length}
          </Typography>
        </Box>
      )}
    </Box>
  );
};
