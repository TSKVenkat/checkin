'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { prefetchSystemHealth, prefetchEventStats, prefetchAdminStats } from '@/lib/query/hooks';

interface PrefetcherProps {
  children?: React.ReactNode;
}

/**
 * Prefetches critical application data on initial load
 */
export default function Prefetcher({ children }: PrefetcherProps) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Get user information for conditional prefetching
    const storedUser = localStorage.getItem('user');
    let user = null;
    
    try {
      if (storedUser) {
        user = JSON.parse(storedUser);
      }
    } catch (e) {
      console.error('Failed to parse user data', e);
    }

    // Always prefetch system health
    prefetchSystemHealth(queryClient);

    // Only prefetch data relevant to authenticated users
    if (user) {
      // Prefetch event stats for all users
      prefetchEventStats(queryClient);
      
      // Prefetch admin-specific data only for admins
      if (user.role === 'admin') {
        prefetchAdminStats(queryClient);
      }
    }
  }, [queryClient]);

  return children || null;
} 