'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// API Client with defaults
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Configure axios interceptor to add auth token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Query keys for admin-specific functionality
export const AdminQueryKeys = {
  events: ['admin', 'events'] as const,
  event: (id: string) => ['admin', 'events', id] as const,
  activity: ['admin', 'activity'] as const,
  reports: (type: string) => ['admin', 'reports', type] as const,
};

// ================================
// Admin Events Hooks
// ================================
export function useAdminEvents(filters = {}, options = {}) {
  const queryParams = new URLSearchParams();
  
  // Add filters to query parameters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, String(value));
    }
  });

  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  
  return useQuery({
    queryKey: [...AdminQueryKeys.events, filters],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/api/admin/events${queryString}`);
        return data.data;
      } catch (error) {
        console.error('Error fetching admin events:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

export function useAdminEvent(id: string, options = {}) {
  return useQuery({
    queryKey: AdminQueryKeys.event(id),
    queryFn: async () => {
      try {
        const { data } = await api.get(`/api/admin/events/${id}`);
        return data.data;
      } catch (error) {
        console.error(`Error fetching admin event with id ${id}:`, error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!id,
    ...options,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (eventData: any) => {
      try {
        const { data } = await api.post('/api/admin/events', eventData);
        return data;
      } catch (error) {
        console.error('Error creating event:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AdminQueryKeys.events });
    },
  });
}

export function useUpdateEvent(id: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (eventData: any) => {
      try {
        const { data } = await api.put(`/api/admin/events/${id}`, eventData);
        return data;
      } catch (error) {
        console.error(`Error updating event with id ${id}:`, error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AdminQueryKeys.events });
      queryClient.invalidateQueries({ queryKey: AdminQueryKeys.event(id) });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        const { data } = await api.delete(`/api/admin/events/${id}`);
        return data;
      } catch (error) {
        console.error(`Error deleting event with id ${id}:`, error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AdminQueryKeys.events });
    },
  });
}

// ================================
// Admin Activity Logs Hooks
// ================================
export function useActivityLogs(filters = {}, options = {}) {
  const queryParams = new URLSearchParams();
  
  // Add filters to query parameters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, String(value));
    }
  });

  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  
  return useQuery({
    queryKey: [...AdminQueryKeys.activity, filters],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/api/admin/activity${queryString}`);
        return data;
      } catch (error) {
        console.error('Error fetching activity logs:', error);
        throw error;
      }
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
    ...options,
  });
}

// ================================
// Admin Reports Hooks
// ================================
export function useReports(reportType: string, dateRange = {}, options = {}) {
  const queryParams = new URLSearchParams();
  queryParams.append('type', reportType);
  
  // Add date range to query parameters
  Object.entries(dateRange).forEach(([key, value]) => {
    if (value) {
      queryParams.append(key, String(value));
    }
  });

  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  
  return useQuery({
    queryKey: [...AdminQueryKeys.reports(reportType), dateRange],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/api/admin/reports${queryString}`);
        return data.data;
      } catch (error) {
        console.error(`Error fetching ${reportType} report:`, error);
        throw error;
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

export function useExportReport() {
  return useMutation({
    mutationFn: async ({ reportType, format, dateRange }: { reportType: string; format: string; dateRange: any }) => {
      try {
        const { data } = await api.post('/api/admin/reports', {
          reportType,
          format,
          dateRange,
        });
        return data;
      } catch (error) {
        console.error(`Error exporting ${reportType} report:`, error);
        throw error;
      }
    },
  });
} 