'use client';

import { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// GlassCard variants
const glassCardVariants = cva(
  'rounded-xl backdrop-filter transition-all duration-300',
  {
    variants: {
      variant: {
        default: 'bg-dark-bg-secondary/30',
        dark: 'bg-dark-bg-primary/50',
        light: 'bg-white/10',
        green: 'bg-primary/5',
      },
      blur: {
        sm: 'backdrop-blur-sm',
        md: 'backdrop-blur-md',
        lg: 'backdrop-blur-lg',
      },
      border: {
        true: 'border border-white/10',
        false: '',
      },
      hover: {
        true: 'hover:bg-primary/10 hover:border-primary/20 hover:shadow-lg',
        false: '',
      },
      spotlight: {
        true: 'spotlight-card',
        false: '',
      },
      padding: {
        none: '',
        sm: 'p-3',
        md: 'p-5',
        lg: 'p-7',
      },
    },
    defaultVariants: {
      variant: 'default',
      blur: 'md',
      border: true,
      hover: true,
      spotlight: true,
      padding: 'md',
    },
  }
);

export interface GlassCardProps
  extends VariantProps<typeof glassCardVariants> {
  children: ReactNode;
  className?: string;
}

export function GlassCard({
  children,
  className,
  variant,
  blur,
  border,
  hover,
  spotlight,
  padding,
}: GlassCardProps) {
  return (
    <div
      className={cn(
        glassCardVariants({
          variant,
          blur,
          border,
          hover,
          spotlight,
          padding,
        }),
        className
      )}
    >
      {children}
    </div>
  );
} 