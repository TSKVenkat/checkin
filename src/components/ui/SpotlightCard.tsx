'use client';

import React, { useRef, useState, useEffect } from 'react';

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  spotlightSize?: 'sm' | 'md' | 'lg';
  gradient?: 'blue' | 'purple' | 'pink' | 'teal' | 'amber' | 'none';
  borderGlow?: boolean;
  hoverScale?: boolean;
}

export function SpotlightCard({
  children,
  className = '',
  spotlightSize = 'md',
  gradient = 'none',
  borderGlow = false,
  hoverScale = true,
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Static classes to ensure Tailwind processes them
  const staticClasses = `
    bg-gradient-to-br from-blue-600/[0.15] via-transparent to-transparent
    bg-gradient-to-br from-purple-600/[0.15] via-transparent to-transparent
    bg-gradient-to-br from-pink-600/[0.15] via-transparent to-transparent
    bg-gradient-to-br from-teal-600/[0.15] via-transparent to-transparent
    bg-gradient-to-br from-amber-600/[0.15] via-transparent to-transparent
    shadow-neon shadow-neon-green shadow-neon-purple
    hover:scale-[1.02]
    group-hover:opacity-100
  `;

  // Calculate size based on the spotlightSize prop
  const spotlightSizes = {
    sm: '600px',
    md: '1000px',
    lg: '1500px',
  };

  // Define gradient styles
  const gradientStyles = {
    none: '',
    blue: 'bg-gradient-to-br from-blue-600/[0.15] via-transparent to-transparent',
    purple: 'bg-gradient-to-br from-purple-600/[0.15] via-transparent to-transparent',
    pink: 'bg-gradient-to-br from-pink-600/[0.15] via-transparent to-transparent',
    teal: 'bg-gradient-to-br from-teal-600/[0.15] via-transparent to-transparent',
    amber: 'bg-gradient-to-br from-amber-600/[0.15] via-transparent to-transparent',
  };

  // Define border glow styles
  const borderGlowStyles = {
    none: '',
    blue: 'shadow-neon',
    purple: 'shadow-neon-purple',
    teal: 'shadow-neon-green',
    amber: 'shadow-neon',
    pink: 'shadow-neon-purple',
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    };

    card.addEventListener('mousemove', handleMouseMove);

    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isMounted]);

  return (
    <div
      ref={cardRef}
      className={`
        rounded-xl relative overflow-hidden
        ${hoverScale ? 'hover:scale-[1.02]' : ''} 
        ${gradient !== 'none' ? gradientStyles[gradient] : ''}
        ${borderGlow && gradient !== 'none' ? borderGlowStyles[gradient] : ''}
        transition-all duration-300
        ${className}
      `}
    >
      <div
        className={`absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-spotlight`}
        style={{
          '--spotlight-size': spotlightSizes[spotlightSize],
        } as React.CSSProperties}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
} 