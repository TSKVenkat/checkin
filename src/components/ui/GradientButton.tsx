'use client';

import React from 'react';
import Link from 'next/link';

interface GradientButtonProps {
  children: React.ReactNode;
  variant?: 'blue' | 'purple' | 'pink' | 'teal' | 'amber';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  withArrow?: boolean;
}

export function GradientButton({
  children,
  variant = 'blue',
  size = 'md',
  href,
  className = '',
  onClick,
  disabled = false,
  fullWidth = false,
  type = 'button',
  withArrow = false,
}: GradientButtonProps) {
  // These static classes will help Tailwind detect them even if dynamically used
  const staticClasses = `
    from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700
    from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700
    from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700
    from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700
    from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700
  `;

  // Define gradient styles
  const gradientStyles = {
    blue: 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700',
    purple: 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700',
    pink: 'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700',
    teal: 'bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700',
    amber: 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700',
  };

  // Define sizes
  const sizeStyles = {
    sm: 'py-1 px-3 text-sm',
    md: 'py-2 px-6 text-base',
    lg: 'py-3 px-8 text-lg',
  };

  const baseClasses = `
    relative inline-flex items-center justify-center
    font-medium text-white rounded-lg shadow-md
    transition-all duration-300 ease-in-out 
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-opacity-50
    ${gradientStyles[variant]}
    ${sizeStyles[size]}
    ${fullWidth ? 'w-full' : ''}
    ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-lg transform hover:-translate-y-0.5'}
    ${className}
  `;

  const arrowIcon = withArrow ? (
    <svg 
      className="ml-2 w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 20 20" 
      fill="currentColor"
    >
      <path 
        fillRule="evenodd" 
        d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" 
        clipRule="evenodd" 
      />
    </svg>
  ) : null;

  // If href is provided, render as Link
  if (href) {
    return (
      <Link 
        href={href} 
        className={`group ${baseClasses}`}
        onClick={onClick}
      >
        <span>{children}</span>
        {arrowIcon}
      </Link>
    );
  }

  // Otherwise, render as button
  return (
    <button
      type={type}
      className={`group ${baseClasses}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span>{children}</span>
      {arrowIcon}
    </button>
  );
} 