'use client';

import React, { useRef, useState } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Card variants using class-variance-authority
const cardVariants = cva(
  "rounded-lg text-white",
  {
    variants: {
      variant: {
        default: "bg-dark-card border border-dark-border",
        elevated: "bg-dark-card border border-dark-border shadow-lg",
        filled: "bg-dark-bg-secondary",
        outline: "bg-transparent border border-dark-border",
        glass: "backdrop-blur-md bg-dark-card/80 border border-white/10",
      },
      padding: {
        none: "",
        sm: "p-3",
        md: "p-4",
        lg: "p-6",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "md",
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  spotlight?: boolean;
}

// Main Card component
export default function Card({
  className,
  variant,
  padding,
  spotlight = false,
  children,
  ...props
}: CardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  // Handle spotlight effect mouse movement
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (cardRef.current && spotlight) {
      const rect = cardRef.current.getBoundingClientRect();
      setCoords({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  return (
    <div
      ref={cardRef}
      className={cn(
        cardVariants({ variant, padding }),
        spotlight && "spotlight-card",
        className
      )}
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
      {children}
    </div>
  );
}

// Card header component
export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("card-header", className)} {...props}>
      {children}
    </div>
  );
}

// Card body component
export function CardBody({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("card-body", className)} {...props}>
      {children}
    </div>
  );
}

// Card footer component
export function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("card-footer", className)} {...props}>
      {children}
    </div>
  );
}

// Card title component
export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-lg font-semibold text-white", className)} {...props}>
      {children}
    </h3>
  );
}

// Card description component
export function CardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-gray-400 mt-1", className)} {...props}>
      {children}
    </p>
  );
}
