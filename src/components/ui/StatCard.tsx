'use client';

import React, { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// StatCard variants
const statCardVariants = cva(
  'rounded-xl transition-all duration-300 overflow-hidden spotlight-card',
  {
    variants: {
      variant: {
        default: 'bg-dark-card border border-dark-border',
        elevated: 'bg-dark-card border border-dark-border shadow-lg',
        success: 'bg-success/10 border border-success/20',
        warning: 'bg-warning/10 border border-warning/20',
        error: 'bg-error/10 border border-error/20',
        info: 'bg-info/10 border border-info/20',
        primary: 'bg-primary/10 border border-primary/20',
        secondary: 'bg-secondary/10 border border-secondary/20',
      },
      padding: {
        none: '',
        sm: 'p-3',
        md: 'p-5',
        lg: 'p-6',
      },
      hover: {
        true: 'hover:shadow-lg hover:translate-y-[-2px]',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
      hover: true,
    },
  }
);

export interface StatCardProps
  extends VariantProps<typeof statCardVariants>,
    React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  trend?: number;
  icon?: ReactNode;
  helpText?: string;
  footer?: ReactNode;
  className?: string;
  valueClassName?: string;
  valueSize?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function StatCard({
  title,
  value,
  trend,
  icon,
  helpText,
  footer,
  className,
  valueClassName,
  valueSize = 'lg',
  variant,
  padding,
  hover,
  ...props
}: StatCardProps) {
  const valueSizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  };

  const isTrendPositive = trend && trend > 0;
  const isTrendNegative = trend && trend < 0;
  const trendValueAbs = trend ? Math.abs(trend) : 0;

  return (
    <div
      className={cn(statCardVariants({ variant, padding, hover }), className)}
      {...props}
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      
      <div className="flex flex-col">
        <div className="flex items-end gap-2">
          <span className={cn('font-bold tracking-tight', valueSizeClasses[valueSize], valueClassName)}>
            {value}
          </span>
          
          {trend !== undefined && (
            <div 
              className={cn(
                'flex items-center text-xs font-medium',
                isTrendPositive ? 'text-green-400' : 
                isTrendNegative ? 'text-red-400' : 'text-gray-400'
              )}
            >
              {isTrendPositive && (
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
                </svg>
              )}
              
              {isTrendNegative && (
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                </svg>
              )}
              
              {trendValueAbs}%
            </div>
          )}
        </div>
        
        {helpText && (
          <p className="text-xs text-gray-400 mt-1">{helpText}</p>
        )}
      </div>
      
      {footer && (
        <div className="mt-4 pt-3 border-t border-dark-border">
          {footer}
        </div>
      )}
    </div>
  );
} 