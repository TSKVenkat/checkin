'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ProgressBar variants
const progressBarVariants = cva(
  'w-full rounded-full overflow-hidden bg-dark-bg-tertiary',
  {
    variants: {
      size: {
        xs: 'h-1',
        sm: 'h-1.5',
        md: 'h-2',
        lg: 'h-2.5',
        xl: 'h-3',
      },
      variant: {
        default: '',
        indented: 'p-1 bg-dark-bg-secondary rounded-lg',
        glassy: 'backdrop-blur-sm bg-dark-bg-tertiary/50',
        sunken: 'shadow-inner bg-dark-bg-tertiary/70',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
    },
  }
);

// ProgressBar indicator variants
const indicatorVariants = cva(
  'h-full rounded-full transition-all duration-300 ease-out',
  {
    variants: {
      color: {
        default: 'bg-primary',
        primary: 'bg-primary',
        secondary: 'bg-secondary',
        success: 'bg-success',
        warning: 'bg-warning',
        error: 'bg-error',
        info: 'bg-info',
      },
      animated: {
        true: 'animate-pulse',
        false: '',
      },
      striped: {
        true: 'bg-stripes',
        false: '',
      },
    },
    defaultVariants: {
      color: 'default',
      animated: false,
      striped: false,
    },
  }
);

export interface ProgressBarProps 
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'>,
    VariantProps<typeof progressBarVariants> {
  value: number;
  max?: number;
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  showValue?: boolean;
  valuePosition?: 'top' | 'right' | 'bottom' | 'inside';
  animated?: boolean;
  striped?: boolean;
  valuePrefix?: string;
  valueSuffix?: string;
}

export default function ProgressBar({
  value,
  max = 100,
  color,
  size,
  variant,
  className,
  showValue = false,
  valuePosition = 'right',
  animated = false,
  striped = false,
  valuePrefix = '',
  valueSuffix = '%',
  ...props
}: ProgressBarProps) {
  // Calculate percentage (ensure it's between 0-100)
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const formattedValue = valuePrefix + (valueSuffix === '%' ? Math.round(percentage) : value) + valueSuffix;
  
  // For inside position, only show text if there's enough space
  const showInsideText = valuePosition === 'inside' && percentage > 25;
  
  return (
    <div className="w-full">
      {/* Top value position */}
      {showValue && valuePosition === 'top' && (
        <div className="flex justify-between items-center mb-1 text-xs text-gray-400">
          <span>{formattedValue}</span>
        </div>
      )}
      
      {/* Progress bar */}
      <div className={cn(progressBarVariants({ size, variant }), className)} {...props}>
        <div 
          className={cn(indicatorVariants({ color, animated, striped }))}
          style={{ width: `${percentage}%` }}
        >
          {/* Inside value position */}
          {showValue && showInsideText && (
            <span className="text-xs text-white px-2 h-full flex items-center">
              {formattedValue}
            </span>
          )}
        </div>
      </div>
      
      {/* Bottom value position */}
      {showValue && valuePosition === 'bottom' && (
        <div className="flex justify-between items-center mt-1 text-xs text-gray-400">
          <span>{formattedValue}</span>
        </div>
      )}
      
      {/* Right value position */}
      {showValue && valuePosition === 'right' && (
        <div className="flex items-center mt-1">
          <div className="flex-1" />
          <span className="text-xs text-gray-400 ml-2">{formattedValue}</span>
        </div>
      )}
    </div>
  );
} 