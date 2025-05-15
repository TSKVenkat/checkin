'use client';

import { useTheme } from '@/components/ThemeProvider';
import React from 'react';

interface ThemeWrapperProps {
  children: React.ReactNode;
}

interface ThemeProps {
  theme?: string;
  setTheme?: (theme: string) => void;
}

export default function ThemeWrapper({ children }: ThemeWrapperProps) {
  const { theme, setTheme } = useTheme();
  
  // Clone children and inject theme props
  const childrenWithProps = React.Children.map(children, child => {
    // Check if the child is a valid element
    if (React.isValidElement(child)) {
      // Check if the component accepts theme props
      if (child.type && 
          (typeof child.type === 'function' || 
           (typeof child.type === 'object' && 'displayName' in child.type))) {
        // Only pass theme props to components that might handle them
        // Create a merged props object to avoid spread type issues
        const props = Object.assign({}, child.props || {}, { theme, setTheme });
        return React.cloneElement(child, props);
      }
      
      // For other elements, just clone without additional props
      return React.cloneElement(child);
    }
    return child;
  });

  return <>{childrenWithProps}</>;
} 