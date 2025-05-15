'use client';

import React, { useState, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Avatar variants
const avatarVariants = cva(
  'inline-flex items-center justify-center overflow-hidden',
  {
    variants: {
      shape: {
        circle: 'rounded-full',
        square: 'rounded-md',
      },
      size: {
        xs: 'h-6 w-6 text-xs',
        sm: 'h-8 w-8 text-sm',
        md: 'h-10 w-10 text-base',
        lg: 'h-14 w-14 text-lg',
        xl: 'h-20 w-20 text-xl',
      },
      border: {
        none: 'border-0',
        thin: 'border',
        medium: 'border-2',
        thick: 'border-4',
      },
      borderColor: {
        default: 'border-dark-border',
        primary: 'border-primary',
        white: 'border-white/50',
      },
      status: {
        online: 'ring-2 ring-success',
        offline: 'ring-2 ring-gray-500',
        away: 'ring-2 ring-warning',
        busy: 'ring-2 ring-error',
        none: '',
      },
    },
    defaultVariants: {
      shape: 'circle',
      size: 'md',
      border: 'thin',
      borderColor: 'default',
      status: 'none',
    },
  }
);

export interface AvatarProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  src?: string;
  alt?: string;
  fallback?: string;
  showFallback?: boolean;
  statusIndicator?: boolean;
}

export default function Avatar({
  className,
  src,
  alt = "Avatar",
  fallback,
  showFallback = true,
  shape,
  size,
  border,
  borderColor,
  status,
  statusIndicator = false,
  ...props
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [initials, setInitials] = useState("");
  
  useEffect(() => {
    if (fallback) {
      setInitials(fallback);
    } else if (alt && typeof alt === 'string') {
      // Extract initials from alt text (name)
      const nameParts = alt.split(' ').filter(part => part.length > 0);
      if (nameParts.length === 1) {
        setInitials(nameParts[0].charAt(0).toUpperCase());
      } else if (nameParts.length > 1) {
        setInitials(
          (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase()
        );
      }
    }
  }, [alt, fallback]);

  // Get background color from initials
  const getInitialsBg = () => {
    const colors = [
      'bg-primary/20',
      'bg-secondary/20',
      'bg-success/20',
      'bg-warning/20',
      'bg-info/20',
      'bg-error/20',
    ];
    
    // Simple hash function based on initials to get consistent color
    let hash = 0;
    for (let i = 0; i < initials.length; i++) {
      hash = initials.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Status indicator styles
  const statusClasses = {
    online: 'bg-success',
    offline: 'bg-gray-500',
    away: 'bg-warning',
    busy: 'bg-error',
  };

  const statusColor = status !== 'none' ? statusClasses[status as keyof typeof statusClasses] : '';

  return (
    <div className="relative inline-flex">
      <div
        className={cn(
          avatarVariants({ shape, size, border, borderColor, status }),
          className
        )}
        {...props}
      >
        {src && !imageError ? (
          <img
            src={src}
            alt={alt}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : showFallback ? (
          <div className={cn('flex h-full w-full items-center justify-center font-medium', getInitialsBg())}>
            {initials || "?"}
          </div>
        ) : (
          <div className="bg-dark-bg-tertiary h-full w-full flex items-center justify-center">
            <svg className="h-1/2 w-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
          </div>
        )}
      </div>
      
      {statusIndicator && status !== 'none' && (
        <span
          className={cn(
            'absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-dark-bg-primary',
            statusColor
          )}
        />
      )}
    </div>
  );
} 