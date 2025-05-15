import React from 'react';

interface GradientTextProps {
  children: React.ReactNode;
  variant?: 'blue' | 'purple' | 'pink' | 'teal' | 'amber' | 'multi';
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
  animate?: boolean;
}

export function GradientText({
  children,
  variant = 'blue',
  className = '',
  as: Tag = 'span',
  animate = false,
}: GradientTextProps) {
  // Static classes to ensure Tailwind includes these in the build
  const staticClasses = `
    from-blue-600 to-indigo-700
    from-purple-600 to-indigo-700
    from-pink-500 to-purple-700
    from-teal-500 to-blue-600
    from-amber-500 to-orange-600
    from-pink-500 via-purple-500 to-indigo-500
  `;

  // Define gradient styles
  const gradientStyles = {
    blue: 'from-blue-600 to-indigo-700',
    purple: 'from-purple-600 to-indigo-700',
    pink: 'from-pink-500 to-purple-700',
    teal: 'from-teal-500 to-blue-600',
    amber: 'from-amber-500 to-orange-600',
    multi: 'from-pink-500 via-purple-500 to-indigo-500',
  };

  return (
    <Tag 
      className={`
        text-transparent bg-clip-text
        bg-gradient-to-r ${gradientStyles[variant]}
        ${animate ? 'animate-gradient-x' : ''}
        ${className}
      `}
    >
      {children}
    </Tag>
  );
} 