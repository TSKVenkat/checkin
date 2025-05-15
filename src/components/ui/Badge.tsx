'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Badge variants
const badgeVariants = cva(
  'inline-flex items-center rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-dark-bg-tertiary text-white border border-dark-border',
        primary: 'bg-primary/20 text-primary-light border border-primary/30',
        secondary: 'bg-secondary/20 text-secondary-light border border-secondary/30',
        success: 'bg-success/20 text-green-300 border border-green-500/20',
        warning: 'bg-warning/20 text-yellow-300 border border-yellow-500/20',
        error: 'bg-error/20 text-red-300 border border-red-500/20',
        info: 'bg-info/20 text-blue-300 border border-blue-500/20',
        outline: 'bg-transparent border border-dark-border text-gray-300',
      },
      size: {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-xs px-2.5 py-1',
        lg: 'text-sm px-3 py-1',
      },
      rounded: {
        default: 'rounded-full',
        sm: 'rounded-md',
        md: 'rounded-lg',
        lg: 'rounded-xl',
        none: 'rounded-none',
      },
      interactive: {
        true: 'cursor-pointer hover:opacity-80',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      rounded: 'default',
      interactive: false,
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
  endIcon?: React.ReactNode;
  onClose?: () => void;
}

export default function Badge({
  className,
  variant,
  size,
  rounded,
  interactive,
  icon,
  endIcon,
  onClose,
  children,
  ...props
}: BadgeProps) {
  return (
    <div 
      className={cn(badgeVariants({ variant, size, rounded, interactive }), className)}
      {...props}
    >
      {icon && <span className="mr-1 -ml-0.5">{icon}</span>}
      <span className="truncate">{children}</span>
      {endIcon && <span className="ml-1 -mr-0.5">{endIcon}</span>}
      
      {onClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="ml-1 -mr-0.5 rounded-full p-0.5 hover:bg-dark-bg-primary/40 transition-colors"
          aria-label="Remove"
        >
          <svg
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>
      )}
    </div>
  );
} 