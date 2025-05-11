// Authentication system implementation for Edge runtime
import { NextRequest, NextResponse } from 'next/server';
import { sign, verify } from 'jsonwebtoken';
import { SHA256, PBKDF2 } from 'crypto-js';

// Environment variables should be properly configured in .env file
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'your-refresh-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'; // 15 minutes
const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || '7d'; // 7 days

// User data structure for payload
export interface UserPayload {
  id: string;
  email: string;
  role: string;
  permissions: string[];
}

// Token data structure
export interface TokenData {
  token: string;
  expiresAt: Date;
}

/**
 * Generates a secure password hash using PBKDF2
 * Note: This function should only be used in API routes, not in middleware
 */
export async function hashPassword(password: string): Promise<string> {
  // Generate a random salt (16 bytes)
  const salt = Array.from(
    { length: 16 },
    () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
  ).join('');
  
  // Use PBKDF2 with 10000 iterations and SHA256
  const hash = PBKDF2(password, salt, { 
    keySize: 8, // 256 bits
    iterations: 10000 
  }).toString();
  
  // Format: iterations:salt:hash
  return `10000:${salt}:${hash}`;
}

/**
 * Compares a password against its hash
 * Note: This function should only be used in API routes, not in middleware
 */
export async function comparePassword(password: string, storedHash: string): Promise<boolean> {
  try {
    // Split the stored hash value
    const [iterations, salt, hash] = storedHash.split(':');
    
    // Hash the password with the same parameters
    const testHash = PBKDF2(password, salt, {
      keySize: 8,
      iterations: parseInt(iterations)
    }).toString();
    
    // Compare the hashes
    return testHash === hash;
  } catch (error) {
    return false;
  }
}

/**
 * Generates a JWT token for authentication
 * Note: This function should only be used in API routes, not in middleware
 */
export function generateAccessToken(user: UserPayload): string {
  return sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Generates a refresh token
 * Note: This function should only be used in API routes, not in middleware
 */
export function generateRefreshToken(userId: string): TokenData {
  // Generate a random token using crypto-safe approach
  const refreshToken = Array.from(
    { length: 40 },
    () => Math.floor(Math.random() * 36).toString(36)
  ).join('');
  
  // Set expiration date based on environment setting
  const expiresAt = new Date();
  const days = parseInt(REFRESH_EXPIRES_IN) || 7;
  expiresAt.setDate(expiresAt.getDate() + days);
  
  return {
    token: refreshToken,
    expiresAt
  };
}

/**
 * Verifies a JWT access token
 * This is safe to use in Edge middleware
 */
export function verifyAccessToken(token: string): UserPayload | null {
  try {
    return verify(token, JWT_SECRET) as UserPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Get user from cookies
 * This is safe to use in Edge middleware
 */
export function getUserFromCookie(req: NextRequest): UserPayload | null {
  // Try to get token from cookie first
  const cookieToken = req.cookies.get('auth_token')?.value;
  
  // Fallback to authorization header if cookie not present
  const authHeader = req.headers.get('authorization');
  const headerToken = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null;
  
  const token = cookieToken || headerToken;
  
  if (!token) {
    return null;
  }
  
  return verifyAccessToken(token);
}

/**
 * Middleware authentication check
 * This is safe to use in Edge middleware
 */
export function authenticate(req: NextRequest): {
  authenticated: boolean;
  user?: UserPayload;
  message?: string;
} {
  const user = getUserFromCookie(req);
  
  if (!user) {
    return { 
      authenticated: false, 
      message: 'Authentication required' 
    };
  }
  
  return {
    authenticated: true,
    user
  };
}

/**
 * Role-based authorization check for middleware
 * This is safe to use in Edge middleware
 */
export function authorize(requiredRole: string | string[], requiredPermissions?: string[]) {
  return (req: NextRequest) => {
    const { authenticated, user, message } = authenticate(req);
    
    if (!authenticated || !user) {
      return { authorized: false, message };
    }
    
    // Check role
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasRole = roles.includes(user.role);
    
    if (!hasRole) {
      return {
        authorized: false,
        message: 'Insufficient role privileges'
      };
    }
    
    // If permissions are specified, check them
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasAllPermissions = requiredPermissions.every(permission => 
        user.permissions.includes(permission)
      );
      
      if (!hasAllPermissions) {
        return {
          authorized: false,
          message: 'Insufficient permissions'
        };
      }
    }
    
    return {
      authorized: true,
      user
    };
  };
}

/**
 * Set authentication cookies
 */
export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
  refreshExpiry: Date
): void {
  // Set HTTP-only secure cookies
  response.cookies.set({
    name: 'auth_token',
    value: accessToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    // JWT expiry is handled by the token itself
  });
  
  response.cookies.set({
    name: 'refresh_token',
    value: refreshToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    expires: refreshExpiry
  });
}

/**
 * Clear authentication cookies
 */
export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set({
    name: 'auth_token',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    expires: new Date(0)
  });
  
  response.cookies.set({
    name: 'refresh_token',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    expires: new Date(0)
  });
} 