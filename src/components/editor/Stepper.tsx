import { Check } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

interface StepperProps {
  steps: string[];
  activeStep: number;
  className?: string;
}

// The connector line between steps
const StepConnector: React.FC<{ active?: boolean; completed?: boolean }> = ({ 
  active, 
  completed 
}) =>(
    <div
      className={cn(
        'absolute left-0 top-[15px] -ml-px h-0.5 w-full transition-colors duration-200',
        {
          'bg-muted': !active && !completed,
          'bg-primary': active || completed,
        }
      )}
    />
  );

// The step icon
const StepIcon: React.FC<{ 
  active?: boolean; 
  completed?: boolean; 
  step: number;
}> = ({ active, completed, step }) => (
    <div
      className={cn(
        'relative z-10 flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200',
        {
          'bg-primary text-white': active || completed,
          'bg-muted text-muted-foreground': !active && !completed,
        }
      )}
    >
      {completed ? (
        <Check className="h-5 w-5" />
      ) : (
        <span className="text-sm font-medium">{step + 1}</span>
      )}
    </div>
  );

// The step label
const StepLabel: React.FC<{ 
  label: string; 
  active?: boolean; 
  completed?: boolean;
}> = ({ label, active, completed }) => (
    <span
      className={cn(
        'mt-2 text-sm font-medium transition-colors duration-200',
        {
          'text-foreground': active,
          'text-primary': completed,
          'text-muted-foreground': !active && !completed,
        }
      )}
    >
      {label}
    </span>
  );

export const Stepper: React.FC<StepperProps> = ({ 
  steps, 
  activeStep, 
  className 
}) => (
    <div className={cn('relative flex w-full justify-between', className)}>
      {steps.map((label, index) => {
        const active = index === activeStep;
        const completed = index < activeStep;

        return (
          <div
            key={label}
            className="flex flex-1 flex-col items-center"
          >
            {index !== 0 && (
              <StepConnector active={active} completed={completed} />
            )}
            <StepIcon
              active={active}
              completed={completed}
              step={index}
            />
            <StepLabel
              label={label}
              active={active}
              completed={completed}
            />
          </div>
        );
      })}
    </div>
  );