'use client';

import React, { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Alert variants
const alertVariants = cva(
  'relative w-full rounded-lg border p-4 flex gap-3 transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'bg-dark-bg-tertiary border-dark-border',
        success: 'bg-success/10 border-success/20 text-green-200',
        warning: 'bg-warning/10 border-warning/20 text-yellow-200',
        error: 'bg-error/10 border-error/20 text-red-200',
        info: 'bg-info/10 border-info/20 text-blue-200',
      },
      withIcon: {
        true: 'pl-12',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      withIcon: true,
    },
  }
);

export interface AlertProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  onClose?: () => void;
}

export default function Alert({
  className,
  title,
  description,
  icon,
  action,
  onClose,
  variant,
  withIcon,
  children,
  ...props
}: AlertProps) {
  // Get proper icon based on variant if custom icon not provided
  const getDefaultIcon = () => {
    switch (variant) {
      case 'success':
        return (
          <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        );
      case 'warning':
        return (
          <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        );
      case 'error':
        return (
          <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        );
      case 'info':
        return (
          <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        );
    }
  };

  // Determine icon to display
  const iconToDisplay = icon || getDefaultIcon();
  const hasIcon = withIcon && iconToDisplay;

  return (
    <div className={cn(alertVariants({ variant, withIcon: !!hasIcon }), className)} {...props}>
      {hasIcon && (
        <div className="absolute left-4 top-4 flex h-5 w-5 items-center justify-center">
          {iconToDisplay}
        </div>
      )}
      
      <div className="flex-1">
        {title && <h5 className="mb-1 font-medium leading-none tracking-tight">{title}</h5>}
        {description && <div className="text-sm opacity-90">{description}</div>}
        {children}
      </div>
      
      {(action || onClose) && (
        <div className="flex shrink-0 items-center gap-2">
          {action}
          
          {onClose && (
            <button 
              onClick={onClose}
              className="inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-dark-bg-tertiary/20 focus:outline-none"
              aria-label="Close"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
} 