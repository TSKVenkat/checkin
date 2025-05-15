'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Spinner variants
const spinnerVariants = cva(
  "animate-spin rounded-full border-solid border-t-transparent",
  {
    variants: {
      variant: {
        default: "border-primary border-t-transparent",
        white: "border-white border-t-transparent",
        primary: "border-primary border-t-transparent",
        secondary: "border-secondary border-t-transparent",
        success: "border-green-500 border-t-transparent",
        error: "border-red-500 border-t-transparent",
        warning: "border-amber-500 border-t-transparent",
        info: "border-blue-500 border-t-transparent",
      },
      size: {
        xs: "w-3 h-3 border-[2px]",
        sm: "w-4 h-4 border-2",
        md: "w-6 h-6 border-2",
        lg: "w-8 h-8 border-[3px]",
        xl: "w-12 h-12 border-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

// Spinner props
export interface SpinnerProps extends VariantProps<typeof spinnerVariants> {
  className?: string;
}

// Spinner component
export function Spinner({ variant, size, className }: SpinnerProps) {
  return (
    <div
      className={cn(spinnerVariants({ variant, size }), className)}
      role="status"
      aria-label="Loading"
    />
  );
}

// Loading overlay for full page or component
export function LoadingOverlay({ 
  fullPage = false, 
  transparent = false,
  text
}: { 
  fullPage?: boolean; 
  transparent?: boolean;
  text?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center",
        fullPage ? "fixed inset-0 z-50" : "absolute inset-0 z-10",
        transparent ? "bg-dark-bg-primary/50" : "bg-dark-bg-primary/80",
        "backdrop-blur-sm"
      )}
    >
      <Spinner size="lg" />
      {text && (
        <p className="mt-4 text-white font-medium">{text}</p>
      )}
    </div>
  );
}

// Loading dots (alternative loading indicator)
export function LoadingDots({ 
  className,
  color = "primary" 
}: { 
  className?: string;
  color?: "primary" | "white" | "secondary"; 
}) {
  const colorClasses = {
    primary: "bg-primary",
    white: "bg-white",
    secondary: "bg-secondary",
  };
  
  return (
    <div className={cn("flex space-x-1", className)}>
      <div className={cn("w-2 h-2 rounded-full animate-bounce", colorClasses[color])} 
        style={{ animationDelay: "0s" }} />
      <div className={cn("w-2 h-2 rounded-full animate-bounce", colorClasses[color])} 
        style={{ animationDelay: "0.2s" }} />
      <div className={cn("w-2 h-2 rounded-full animate-bounce", colorClasses[color])} 
        style={{ animationDelay: "0.4s" }} />
    </div>
  );
}

// Loading skeleton
export function Skeleton({ className }: { className?: string }) {
  return (
    <div 
      className={cn(
        "animate-pulse bg-gradient-to-r from-dark-bg-tertiary via-dark-bg-secondary to-dark-bg-tertiary bg-[length:400%_100%]",
        "rounded",
        className
      )}
    />
  );
} 