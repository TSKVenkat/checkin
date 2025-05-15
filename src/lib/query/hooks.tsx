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

// Query keys as constants for consistency
export const QueryKeys = {
  systemHealth: ['system', 'health'] as const,
  adminStats: ['admin', 'stats'] as const,
  eventStats: ['events', 'stats'] as const,
  attendee: (id: string) => ['attendee', id] as const,
  attendees: ['attendees'] as const,
  resources: ['resources'] as const,
  checkIns: ['check-ins'] as const,
  staff: ['staff'] as const,
  staffMember: (id: string) => ['staff', id] as const,
  adminDashboardStats: ['admin', 'dashboard', 'stats'] as const,
  emergencyStatus: ['admin', 'emergency', 'status'] as const,
  attendeesSafetyStatus: ['admin', 'emergency', 'attendees'] as const,
  recentCheckins: ['attendees', 'recent-checkins'] as const,
};

// ================================
// System Health Hook
// ================================
export function useSystemHealth(options = {}) {
  return useQuery({
    queryKey: QueryKeys.systemHealth,
    queryFn: async () => {
      const { data } = await api.get('/api/system/health');
      return data.data;
    },
    staleTime: 60 * 1000, // 1 minute
    ...options,
  });
}

// ================================
// Admin Stats Hook
// ================================
export function useAdminStats(options = {}) {
  return useQuery({
    queryKey: QueryKeys.adminStats,
    queryFn: async () => {
      try {
        const { data } = await api.get('/api/admin/stats');
        return data.data;
      } catch (error) {
        console.error('Error fetching admin stats:', error);
        // Re-throw the error so React Query can handle it
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

// ================================
// Event Stats Hook
// ================================
export function useEventStats(options = {}) {
  return useQuery({
    queryKey: QueryKeys.eventStats,
    queryFn: async () => {
      try {
        const { data } = await api.get('/api/events/stats');
        return data.data;
      } catch (error) {
        console.error('Error fetching event stats:', error);
        // Re-throw the error so React Query can handle it
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

// ================================
// Attendee Hooks
// ================================
export function useAttendees(options = {}) {
  return useQuery({
    queryKey: QueryKeys.attendees,
    queryFn: async () => {
      const { data } = await api.get('/api/attendees');
      return data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

export function useAttendee(id: string, options: Record<string, any> = {}) {
  return useQuery({
    queryKey: [QueryKeys.attendee(id)[0], id],
    queryFn: async () => {
      const { data } = await api.get(`/api/attendees/${id}`);
      return data.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
    enabled: !!id && options?.enabled !== false,
  });
}

export function useRecentCheckins(day: string, limit = 5, options = {}) {
  return useQuery({
    queryKey: [...QueryKeys.recentCheckins, day, limit],
    queryFn: async () => {
      const { data } = await api.get(`/api/attendees/recent-checkins?day=${day}&limit=${limit}`);
      return data;
    },
    refetchInterval: 10000, // 10 seconds 
    ...options,
  });
}

// ================================
// Staff Hooks
// ================================
export function useStaff(options = {}) {
  return useQuery({
    queryKey: QueryKeys.staff,
    queryFn: async () => {
      const { data } = await api.get('/api/admin/staff');
      return data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

export function useStaffMember(id: string, options: Record<string, any> = {}) {
  return useQuery({
    queryKey: [QueryKeys.staffMember(id)[0], id],
    queryFn: async () => {
      const { data } = await api.get(`/api/admin/staff/${id}`);
      return data.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
    enabled: !!id && options?.enabled !== false,
  });
}

// ================================
// Admin Dashboard Stats
// ================================
export function useAdminDashboardStats(options = {}) {
  return useQuery({
    queryKey: QueryKeys.adminDashboardStats,
    queryFn: async () => {
      const { data } = await api.get('/api/admin/dashboard/stats');
      return data.data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  });
}

// ================================
// Emergency Management
// ================================
export function useEmergencyStatus(options = {}) {
  return useQuery({
    queryKey: QueryKeys.emergencyStatus,
    queryFn: async () => {
      const { data } = await api.get('/api/admin/emergency/status');
      return data.data;
    },
    refetchInterval: 10000, // Every 10 seconds
    ...options,
  });
}

export function useAttendeesSafetyStatus(options = {}) {
  return useQuery({
    queryKey: QueryKeys.attendeesSafetyStatus,
    queryFn: async () => {
      const { data } = await api.get('/api/admin/emergency/attendees');
      return data.data;
    },
    refetchInterval: 15000, // Every 15 seconds
    ...options,
  });
}

// Mutations for emergency actions
export function useEmergencyActions() {
  const queryClient = useQueryClient();
  
  const activateEmergency = useMutation({
    mutationFn: async ({ type, zones }: { type: string, zones: string[] }) => {
      const { data } = await api.post('/api/admin/emergency/activate', { type, zones });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.emergencyStatus });
    }
  });
  
  const deactivateEmergency = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/api/admin/emergency/deactivate');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.emergencyStatus });
    }
  });
  
  return { activateEmergency, deactivateEmergency };
}

// ================================
// Check-in Attendee Mutation
// ================================
export function useCheckInAttendee() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ attendeeId, staffId }: { attendeeId: string; staffId: string }) => {
      const { data } = await api.post(`/api/check-in/${attendeeId}`, { staffId });
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries after successful check-in
      queryClient.invalidateQueries({ queryKey: QueryKeys.attendee(variables.attendeeId) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.eventStats });
      queryClient.invalidateQueries({ queryKey: QueryKeys.adminStats });
      queryClient.invalidateQueries({ queryKey: QueryKeys.checkIns });
    },
  });
}

// ================================
// Resource Claim Mutation
// ================================
export function useClaimResource() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      attendeeId, 
      resourceType,
      staffId 
    }: { 
      attendeeId: string; 
      resourceType: 'lunch' | 'kit' | 'badge' | 'swag';
      staffId: string;
    }) => {
      const { data } = await api.post(`/api/resources/claim`, { 
        attendeeId,
        resourceType,
        staffId
      });
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries after successful resource claim
      queryClient.invalidateQueries({ queryKey: QueryKeys.attendee(variables.attendeeId) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.eventStats });
      queryClient.invalidateQueries({ queryKey: QueryKeys.resources });
    },
  });
}

// ================================
// Prefetch helpers
// ================================

// Prefetch system health
export async function prefetchSystemHealth(queryClient: any) {
  await queryClient.prefetchQuery({
    queryKey: QueryKeys.systemHealth,
    queryFn: async () => {
      const { data } = await api.get('/api/system/health');
      return data.data;
    },
    staleTime: 60 * 1000,
  });
}

// Prefetch event stats
export async function prefetchEventStats(queryClient: any) {
  await queryClient.prefetchQuery({
    queryKey: QueryKeys.eventStats,
    queryFn: async () => {
      try {
        const { data } = await api.get('/api/events/stats');
        return data.data;
      } catch (error) {
        console.error('Error prefetching event stats:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Prefetch admin stats
export async function prefetchAdminStats(queryClient: any) {
  await queryClient.prefetchQuery({
    queryKey: QueryKeys.adminStats,
    queryFn: async () => {
      const { data } = await api.get('/api/admin/stats');
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Force invalidate helper
export function invalidateQueries(queryClient: any, queryKey: any) {
  return queryClient.invalidateQueries({ queryKey });
} 