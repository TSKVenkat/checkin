// Authentication utilities for API routes
import { NextRequest } from 'next/server';
import { verifyAccessToken } from './auth';
import { SessionStatus } from './types';

// User payload interface
export interface UserPayload {
  id: string;
  email: string;
  role: string;
  permissions: string[];
}

// Authentication result interface
export interface AuthResult {
  success: boolean;
  message?: string;
  user?: UserPayload;
  status?: number;
  authStatus: SessionStatus;
}

/**
 * Verifies authentication and authorization for API routes
 * @param req The Next.js request object
 * @returns Authentication result with user information if successful
 */
export async function verifyAuth(req: NextRequest): Promise<AuthResult> {
  try {
    // Extract token from Authorization header or cookies
    const token = extractTokenFromRequest(req);
    
    if (!token) {
      console.log('[AUTH] No authentication token found in request');
      return { 
        success: false, 
        message: 'Authentication required',
        status: 401,
        authStatus: 'unauthenticated'
      };
    }
    
    // Verify the token
    const user = verifyAccessToken(token);
    
    if (!user) {
      console.log('[AUTH] Invalid or expired token');
      return { 
        success: false, 
        message: 'Invalid or expired token',
        status: 401,
        authStatus: 'unauthenticated'
      };
    }
    
    // Log successful authentication
    console.log(`[AUTH] User authenticated: ${user.email} (${user.role})`);
    
    // Authentication successful
    return {
      success: true,
      user,
      status: 200,
      authStatus: 'authenticated'
    };
  } catch (error) {
    console.error('[AUTH] Authentication error:', error);
    return {
      success: false,
      message: `Authentication error: ${(error as Error).message}`,
      status: 500,
      authStatus: 'unauthenticated'
    };
  }
}

/**
 * Extracts token from the request (Authorization header or cookies)
 */
function extractTokenFromRequest(req: NextRequest): string | null {
  // Try Authorization header first
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Fall back to cookies
  const cookie = req.cookies.get('auth_token')?.value;
  if (cookie) {
    return cookie;
  }
  
  // Check for token in query parameters (for WebSocket connections)
  const url = new URL(req.url);
  const queryToken = url.searchParams.get('token');
  if (queryToken) {
    return queryToken;
  }
  
  return null;
}

/**
 * Check if user has required role
 */
export function hasRole(user: UserPayload, requiredRole: string | string[]): boolean {
  if (!user || !user.role) return false;
  
  // Admin role has access to everything
  if (user.role === 'admin') return true;
  
  // Check against a single role
  if (typeof requiredRole === 'string') {
    return user.role === requiredRole;
  }
  
  // Check against multiple roles
  return requiredRole.includes(user.role);
}

/**
 * Check if user has required permission
 */
export function hasPermission(user: UserPayload, permission: string): boolean {
  if (!user || !user.permissions) return false;
  
  // Admin role has all permissions
  if (user.role === 'admin') return true;
  
  // Check for wildcard permissions
  if (user.permissions.includes('*')) return true;
  
  // Check for specific permission
  return user.permissions.includes(permission);
}

/**
 * Check if user has any of the required permissions
 */
export function hasAnyPermission(user: UserPayload, permissions: string[]): boolean {
  if (!user || !user.permissions) return false;
  
  // Admin role has all permissions
  if (user.role === 'admin') return true;
  
  // Check for wildcard permissions
  if (user.permissions.includes('*')) return true;
  
  // Check if user has any of the required permissions
  return permissions.some(permission => user.permissions.includes(permission));
}

/**
 * Creates a test token for development mode
 * Should only be used for testing, never in production
 */
export function createTestAuth(role: string = 'admin'): AuthResult {
  if (process.env.NODE_ENV === 'production') {
    console.warn('[AUTH] Attempted to use test auth in production');
    return {
      success: false,
      message: 'Test authentication not available in production',
      status: 403,
      authStatus: 'unauthenticated'
    };
  }
  
  const testUser: UserPayload = {
    id: `test-${role}-${Date.now()}`,
    email: `test-${role}@example.com`,
    role: role,
    permissions: role === 'admin' ? ['*'] : ['check-in:process', 'distribution:process']
  };
  
  console.log('[AUTH] Created test authentication for role:', role);
  
  return {
    success: true,
    user: testUser,
    status: 200,
    authStatus: 'authenticated'
  };
} 