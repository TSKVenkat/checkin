'use client';

import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Input variants using class-variance-authority
const inputVariants = cva(
  "w-full rounded-md bg-dark-bg-tertiary text-white border-dark-border focus:border-primary/70 focus:ring-2 focus:ring-primary/30 transition-colors duration-200",
  {
    variants: {
      variant: {
        default: "border border-dark-border",
        filled: "bg-dark-bg-tertiary border border-transparent focus:border-primary/70",
        outline: "bg-transparent border border-dark-border hover:border-primary/30 focus:border-primary/70",
        ghost: "bg-transparent border-none hover:bg-dark-bg-tertiary focus:bg-dark-bg-tertiary/70",
      },
      size: {
        sm: "text-xs px-3 py-1.5 h-8",
        md: "text-sm px-4 py-2 h-10",
        lg: "text-base px-4 py-2.5 h-12",
      },
      state: {
        default: "",
        disabled: "opacity-50 cursor-not-allowed",
        error: "border-error focus:border-error focus:ring-error/30",
        success: "border-success focus:border-success focus:ring-success/30",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      state: "default",
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  helperText?: string;
  errorText?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
  fullWidth?: boolean;
  containerClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      size,
      state,
      label,
      helperText,
      errorText,
      leftAddon,
      rightAddon,
      fullWidth = true,
      containerClassName,
      disabled,
      ...props
    },
    ref
  ) => {
    // Determine state based on props
    const inputState = disabled ? 'disabled' : errorText ? 'error' : state;
    
    return (
      <div className={cn("space-y-1.5", fullWidth && "w-full", containerClassName)}>
        {label && (
          <label
            htmlFor={props.id}
            className="block text-sm font-medium text-gray-300 mb-1.5"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftAddon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
              {leftAddon}
            </div>
          )}
          
          <input
            ref={ref}
            className={cn(
              inputVariants({ variant, size, state: inputState }),
              leftAddon && "pl-10",
              rightAddon && "pr-10",
              className
            )}
            disabled={disabled}
            {...props}
          />
          
          {rightAddon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
              {rightAddon}
            </div>
          )}
        </div>
        
        {errorText && (
          <p className="text-xs text-error mt-1">{errorText}</p>
        )}
        
        {helperText && !errorText && (
          <p className="text-xs text-gray-400 mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input; 