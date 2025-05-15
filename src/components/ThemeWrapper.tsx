'use client';

import { useTheme } from '@/components/ThemeProvider';
import React from 'react';

interface ThemeWrapperProps {
  children: React.ReactNode;
}

export default function ThemeWrapper({ children }: ThemeWrapperProps) {
  const { theme, setTheme } = useTheme();
  
  // Clone children and inject theme props
  const childrenWithProps = React.Children.map(children, child => {
    // Check if the child is a valid element
    if (React.isValidElement(child)) {
      // Clone the child with the theme props
      return React.cloneElement(child, { 
        ...(child.props || {}),
        theme, 
        setTheme 
      });
    }
    return child;
  });

  return <>{childrenWithProps}</>;
} 