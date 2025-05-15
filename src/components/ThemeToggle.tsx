'use client';

import { useState, useEffect } from 'react';
import type { Theme } from './ThemeProvider';

interface ThemeToggleProps {
  theme?: Theme;
  setTheme?: (theme: Theme) => void;
}

export default function ThemeToggle({ theme = 'dark', setTheme = () => {} }: ThemeToggleProps) {
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  // Always show dark mode icon
  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        className="p-2 rounded-full bg-gray-700 text-gray-200 transition-colors duration-200"
        aria-label="Dark mode enabled"
        // Disabled actual toggle for now
        onClick={() => {}}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </button>
    </div>
  );
}
