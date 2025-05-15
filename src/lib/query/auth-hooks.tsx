'use client';

import { 
  useQuery, 
  useMutation, 
  useQueryClient,
  QueryClient
} from '@tanstack/react-query';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { SessionStatus, AuthSession } from '../auth/types';

// Auth-related query keys
export const AuthKeys = {
  user: ['auth', 'user'],
  session: ['auth', 'session'],
};

// Custom axios instance for auth
const authApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookie-based auth
});

// Token storage interface
interface TokenStorage {
  getToken: () => string | null;
  setToken: (token: string) => void;
  removeToken: () => void;
  getRefreshToken: () => string | null;
  setRefreshToken: (token: string) => void;
  removeRefreshToken: () => void;
  getUser: () => any | null;
  setUser: (user: any) => void;
  removeUser: () => void;
  clearAll: () => void;
  clearTokens: () => void;
}

// Implement token storage with localStorage and secure HttpOnly cookies (for refresh tokens)
export const tokenStorage: TokenStorage = {
  getToken: () => typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null,
  setToken: (token) => typeof window !== 'undefined' && localStorage.setItem('auth_token', token),
  removeToken: () => typeof window !== 'undefined' && localStorage.removeItem('auth_token'),
  
  getRefreshToken: () => typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null,
  setRefreshToken: (token) => typeof window !== 'undefined' && localStorage.setItem('refresh_token', token),
  removeRefreshToken: () => typeof window !== 'undefined' && localStorage.removeItem('refresh_token'),
  
  getUser: () => {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch (e) {
      console.error('Error parsing user from localStorage:', e);
      return null;
    }
  },
  setUser: (user) => typeof window !== 'undefined' && localStorage.setItem('user', JSON.stringify(user)),
  removeUser: () => typeof window !== 'undefined' && localStorage.removeItem('user'),
  
  clearAll: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },
  
  clearTokens: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
  }
};

// Configure auth interceptor to handle token refresh
authApi.interceptors.request.use((config) => {
  const token = tokenStorage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses with token refresh
authApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        const refreshToken = tokenStorage.getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        
        const response = await axios.post('/api/auth/refresh', { 
          refreshToken 
        }, {
          withCredentials: true
        });
        
        if (response.data.success) {
          const { accessToken } = response.data;
          
          // Update stored token
          tokenStorage.setToken(accessToken);
          
          // Update authorization header and retry
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return authApi(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        
        // Clear tokens on refresh failure and redirect to login
        tokenStorage.clearAll();
        
        // We'll handle redirection in the component using useAuthSession
        return Promise.reject(error);
      }
    }
    
    return Promise.reject(error);
  }
);

// Check if token is expired
function isTokenExpired(token: string): boolean {
  try {
    const decoded: any = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch (e) {
    return true;
  }
}

// ====================================
// Authentication Hooks using TanStack Query
// ====================================

// Hook for login
export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();
  
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      try {
        const { data } = await axios.post('/api/auth/login', { email, password }, { withCredentials: true });
        return data;
      } catch (error: any) {
        // Format error response consistently for UI display
        if (error.response?.data?.message) {
          throw new Error(error.response.data.message);
        } else {
          throw new Error('Authentication failed. Please check your credentials and try again.');
        }
      }
    },
    onSuccess: (data) => {
      if (data.success) {
        // Store user info and tokens
        tokenStorage.setUser(data.user);
        
        // If tokens were sent in response rather than cookies
        if (data.accessToken) {
          tokenStorage.setToken(data.accessToken);
        }
        
        if (data.refreshToken) {
          tokenStorage.setRefreshToken(data.refreshToken);
        }
        
        // Update auth state in React Query
        queryClient.setQueryData(AuthKeys.user, data.user);
        queryClient.setQueryData(AuthKeys.session, { isAuthenticated: true });
        
        // Use the redirectUrl from the server if provided, or fallback to role-based redirect
        if (data.redirectUrl) {
          router.push(data.redirectUrl);
        } else if (data.user.role === 'admin') {
          router.push('/admin/dashboard');
        } else if (data.user.role === 'manager') {
          router.push('/admin/dashboard');
        } else if (data.user.role === 'attendee' || data.user.role === 'speaker') {
          router.push('/attendee');
        } else {
          // Default to staff dashboard
          router.push('/dashboard');
        }
      }
    },
  });
}

// Hook for logout
export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  
  return useMutation({
    mutationFn: async () => {
      try {
        await axios.post('/api/auth/logout', {}, { withCredentials: true });
      } catch (error) {
        console.error('Error during logout API call:', error);
        // Continue with local logout regardless of API errors
      }
      
      return { success: true };
    },
    onSuccess: () => {
      // Clear tokens and user data
      tokenStorage.clearAll();
      
      // Invalidate all queries to clear cached data
      queryClient.clear();
      
      // Update auth state
      queryClient.setQueryData(AuthKeys.user, null);
      queryClient.setQueryData(AuthKeys.session, { isAuthenticated: false });
      
      // Redirect to login
      router.push('/login');
    },
  });
}

// Hook to check current auth session status
export function useAuthSession(options: { onUnauthenticated?: () => void; refetchOnMount?: boolean } = {}): AuthSession {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { onUnauthenticated } = options;
  
  // Query to verify session
  const query = useQuery({
    queryKey: AuthKeys.session,
    queryFn: async () => {
      try {
        // Check if we have a token and if it's expired
        const token = tokenStorage.getToken();
        if (!token) {
          return { isAuthenticated: false, status: 'unauthenticated' as SessionStatus };
        }
        
        if (isTokenExpired(token)) {
          // Try to refresh token only if we have a refresh token
          const refreshToken = tokenStorage.getRefreshToken();
          if (!refreshToken) {
            tokenStorage.clearAll(); // Clean up any stale data
            return { isAuthenticated: false, status: 'unauthenticated' as SessionStatus };
          }
          
          try {
            // Attempt to refresh the token
            const { data } = await axios.post('/api/auth/refresh', { refreshToken }, { withCredentials: true });
            
            if (data.success && data.accessToken) {
              tokenStorage.setToken(data.accessToken);
              
              // Update refresh token if provided
              if (data.refreshToken) {
                tokenStorage.setRefreshToken(data.refreshToken);
              }
              
              return { isAuthenticated: true, status: 'authenticated' as SessionStatus };
            } else {
              tokenStorage.clearAll();
              return { isAuthenticated: false, status: 'unauthenticated' as SessionStatus };
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            tokenStorage.clearAll();
            return { isAuthenticated: false, status: 'unauthenticated' as SessionStatus };
          }
        }
        
        // Token is valid
        return { isAuthenticated: true, status: 'authenticated' as SessionStatus };
      } catch (error) {
        console.error('Auth session check failed:', error);
        return { isAuthenticated: false, status: 'unauthenticated' as SessionStatus };
      }
    },
    // Only make this request on mount or when manually invalidated
    refetchOnWindowFocus: false,
    refetchOnMount: options.refetchOnMount !== false,
    refetchOnReconnect: false,
    retry: false,
    // If this query fails, we just want to silently assume not authenticated
    throwOnError: false,
  });
  
  // Effect to run the unauthenticated callback
  useEffect(() => {
    if (query.data?.isAuthenticated === false && onUnauthenticated) {
      onUnauthenticated();
    }
  }, [query.data?.isAuthenticated, onUnauthenticated]);
  
  // Fetch user data if authenticated
  const userQuery = useQuery({
    queryKey: AuthKeys.user,
    queryFn: async () => {
      // Try to get the user from storage first
      const storedUser = tokenStorage.getUser();
      if (storedUser) {
        return storedUser;
      }
      
      // If no user in storage but we're authenticated, try to get from API
      try {
        const { data } = await authApi.get('/api/auth/user');
        if (data.user) {
          tokenStorage.setUser(data.user);
          return data.user;
        }
        return null;
      } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
      }
    },
    // Only fetch if authenticated
    enabled: query.data?.isAuthenticated === true && query.status === 'success',
    // Use cached data
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
  
  return {
    ...query,
    user: userQuery.data || null,
    status: query.data?.status || 'loading',
    error: query.error as Error | null,
    isError: query.isError,
    isPending: query.isPending,
    isLoading: query.isLoading,
    data: query.data || { isAuthenticated: false }
  };
}

// Hook to access the current user data
export function useCurrentUser() {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: AuthKeys.user,
    queryFn: async () => {
      const userData = queryClient.getQueryData<any>(AuthKeys.user);
      if (userData) return userData;
      
      // Try to get from storage
      const storedUser = tokenStorage.getUser();
      if (storedUser) return storedUser;
      
      // If not in cache or storage, try to fetch from server
      try {
        const { data } = await authApi.get('/api/auth/user');
        if (data.user) {
          tokenStorage.setUser(data.user);
          return data.user;
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
      
      return null;
    },
    // Keep the data fresh, but don't refetch too often
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Function to prefetch auth state on app initialization
export async function prefetchAuthState(queryClient: QueryClient) {
  try {
    const token = tokenStorage.getToken();
    if (!token) {
      // No token, so set as unauthenticated
      queryClient.setQueryData(AuthKeys.session, { isAuthenticated: false });
      queryClient.setQueryData(AuthKeys.user, null);
      return;
    }
    
    if (isTokenExpired(token)) {
      // Token expired, try refresh if possible
      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) {
        // No refresh token, clear and set as unauthenticated
        tokenStorage.clearAll();
        queryClient.setQueryData(AuthKeys.session, { isAuthenticated: false });
        queryClient.setQueryData(AuthKeys.user, null);
        return;
      }
      
      try {
        // Try to refresh token
        const { data } = await axios.post('/api/auth/refresh', 
          { refreshToken }, 
          { withCredentials: true }
        );
        
        if (data.success && data.accessToken) {
          tokenStorage.setToken(data.accessToken);
          if (data.refreshToken) {
            tokenStorage.setRefreshToken(data.refreshToken);
          }
          
          // Set as authenticated
          queryClient.setQueryData(AuthKeys.session, { isAuthenticated: true });
          
          // Get user data if available
          if (data.user) {
            tokenStorage.setUser(data.user);
            queryClient.setQueryData(AuthKeys.user, data.user);
          } else {
            // Use stored user data if available
            const storedUser = tokenStorage.getUser();
            if (storedUser) {
              queryClient.setQueryData(AuthKeys.user, storedUser);
            }
          }
        } else {
          // Refresh failed, clear and set as unauthenticated
          tokenStorage.clearAll();
          queryClient.setQueryData(AuthKeys.session, { isAuthenticated: false });
          queryClient.setQueryData(AuthKeys.user, null);
        }
      } catch (error) {
        console.error('Token refresh failed during prefetch:', error);
        tokenStorage.clearAll();
        queryClient.setQueryData(AuthKeys.session, { isAuthenticated: false });
        queryClient.setQueryData(AuthKeys.user, null);
      }
    } else {
      // Token is valid
      queryClient.setQueryData(AuthKeys.session, { isAuthenticated: true });
      
      // Use stored user data if available
      const storedUser = tokenStorage.getUser();
      if (storedUser) {
        queryClient.setQueryData(AuthKeys.user, storedUser);
      }
    }
  } catch (error) {
    console.error('Error during auth prefetch:', error);
    // In case of any errors, set as unauthenticated
    queryClient.setQueryData(AuthKeys.session, { isAuthenticated: false });
    queryClient.setQueryData(AuthKeys.user, null);
  }
} 