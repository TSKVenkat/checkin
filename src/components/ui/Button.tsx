'use client';

import React, { useRef, useState } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Button variants using class-variance-authority
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 disabled:pointer-events-none relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-primary hover:bg-primary-dark text-white",
        primary: "bg-primary hover:bg-primary-dark text-white",
        secondary: "bg-secondary hover:bg-secondary-dark text-white",
        outline: "bg-transparent border border-dark-border hover:border-primary hover:text-primary text-white",
        ghost: "bg-transparent hover:bg-dark-bg-tertiary/30 text-white",
        link: "bg-transparent underline-offset-4 hover:underline text-primary hover:text-primary-light p-0 h-auto font-medium",
        destructive: "bg-red-600 hover:bg-red-700 text-white",
        success: "bg-green-600 hover:bg-green-700 text-white",
        warning: "bg-amber-500 hover:bg-amber-600 text-white",
        info: "bg-blue-500 hover:bg-blue-600 text-white",
        dark: "bg-dark-card hover:bg-dark-card-hover text-white border border-dark-border",
      },
      size: {
        xs: "text-xs px-2.5 py-1.5 rounded",
        sm: "text-sm px-3 py-2 rounded-md",
        md: "text-sm px-4 py-2 rounded-md",
        lg: "text-base px-5 py-3 rounded-md",
        xl: "text-lg px-6 py-4 rounded-md",
        icon: "p-2",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      fullWidth: false,
    },
  }
);

// Button props extend button HTMLAttributes and add our variants
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  spotlight?: boolean;
}

// Base Button component
export default function Button({
  className,
  variant,
  size,
  fullWidth,
  leftIcon,
  rightIcon,
  disabled,
  children,
  loading,
  spotlight,
  ...props
}: ButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  // Handle spotlight effect mouse movement
  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (buttonRef.current && spotlight) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  return (
    <button
      ref={buttonRef}
      className={cn(
        buttonVariants({ variant, size, fullWidth }),
        loading && "opacity-80",
        spotlight && "spotlight-card",
        className,
        "hover-button"
      )}
      disabled={disabled || loading}
      onMouseMove={handleMouseMove}
      style={
        spotlight
          ? {
              '--x': `${coords.x}px`,
              '--y': `${coords.y}px`,
            } as React.CSSProperties
          : undefined
      }
      {...props}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-10">
          <svg
            className="animate-spin h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </span>
      )}

      <span className="flex items-center justify-center gap-2">
        {leftIcon && <span className="inline-flex">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="inline-flex">{rightIcon}</span>}
      </span>
    </button>
  );
}

// Link button component
interface LinkButtonProps extends 
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>, 
  VariantProps<typeof buttonVariants> {
  href: string;
  external?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  spotlight?: boolean;
  disabled?: boolean;
}

export function LinkButton({ 
  href, 
  external, 
  children, 
  variant, 
  size, 
  spotlight, 
  fullWidth, 
  className, 
  disabled, 
  loading, 
  leftIcon, 
  rightIcon, 
  ...props 
}: LinkButtonProps) {
  const buttonRef = useRef<HTMLAnchorElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  // Handle spotlight effect mouse movement
  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (buttonRef.current && spotlight) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  return (
    <a
      ref={buttonRef}
      href={external ? href : undefined}
      className={cn(
        buttonVariants({ variant, size, fullWidth }),
        disabled && "opacity-60 pointer-events-none",
        loading && "opacity-80 pointer-events-none",
        spotlight && "spotlight-card",
        className,
        "hover-button"
      )}
      {...(external
        ? { target: "_blank", rel: "noopener noreferrer" }
        : { onClick: (e) => disabled && e.preventDefault() })}
      onMouseMove={handleMouseMove}
      style={
        spotlight
          ? {
              '--x': `${coords.x}px`,
              '--y': `${coords.y}px`,
            } as React.CSSProperties
          : undefined
      }
      {...props}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-10">
          <svg
            className="animate-spin h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </span>
      )}

      <span className="flex items-center justify-center gap-2">
        {leftIcon && <span className="inline-flex">{leftIcon}</span>}
        {!external ? (
          <Link href={href} passHref legacyBehavior>
            <span className="cursor-pointer">{children}</span>
          </Link>
        ) : (
          children
        )}
        {rightIcon && <span className="inline-flex">{rightIcon}</span>}
      </span>
    </a>
  );
}
