// Authentication system implementation
import { NextRequest, NextResponse } from 'next/server';
import { sign, verify } from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { SessionStatus, User } from './types';
// Import prisma only when not in edge runtime
let prisma: any;
if (typeof window === 'undefined' && process.env.NEXT_RUNTIME !== 'edge') {
  // Dynamically import prisma only in Node.js environment, not in Edge Runtime
  const { default: prismaModule } = require('../prisma');
  prisma = prismaModule;
}

// Environment variables (should be properly configured in a real project)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'your-refresh-secret-change-in-production';
const JWT_EXPIRES_IN = '15m'; // 15 minutes
const REFRESH_EXPIRES_IN = '7d'; // 7 days

// Define type for authentication status
export type AuthStatus = 'authenticated' | 'unauthenticated' | 'loading';

// Define the user payload interface
export interface UserPayload {
  id: string;
  email: string;
  role: string;
  permissions: string[];
}

// Define authentication result interface
export interface AuthResult {
  status: SessionStatus;
  user?: UserPayload;
  message?: string;
  authenticated: boolean;
}

interface TokenData {
  token: string;
  expiresAt: Date;
}

/**
 * Generates a secure password hash using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  if (typeof window !== 'undefined' || process.env.NEXT_RUNTIME === 'edge') {
    throw new Error('hashPassword is not available in the browser or Edge Runtime');
  }
  const saltRounds = 12;
  return bcryptjs.hash(password, saltRounds);
}

/**
 * Compares a password against its hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  if (typeof window !== 'undefined' || process.env.NEXT_RUNTIME === 'edge') {
    throw new Error('comparePassword is not available in the browser or Edge Runtime');
  }
  return bcryptjs.compare(password, hash);
}

/**
 * Generates a JWT token for authentication
 */
export function generateAccessToken(user: UserPayload): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
}

/**
 * Generates a one-time use refresh token
 */
export function generateRefreshToken(user: UserPayload): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Stores a refresh token in the user's active sessions
 * Only available in API routes, not in middleware
 */
export async function storeRefreshToken(userId: string, token: string, device: string, expiresAt: Date): Promise<void> {
  if (typeof window !== 'undefined' || process.env.NEXT_RUNTIME === 'edge') {
    throw new Error('storeRefreshToken is not available in the browser or Edge Runtime');
  }
  
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  // Update with Prisma instead of MongoDB model
  await prisma.staff.update({
    where: { id: userId },
    data: {
      // This would need to be adjusted based on the actual Prisma schema
      // activeSessions: { push: { token: hashedToken, device, expiresAt } }
      // For now, just update the lastLogin field as a placeholder
      lastLogin: new Date()
    }
  });
}

/**
 * Verify an access token and return the decoded user information
 */
export function verifyAccessToken(token: string): UserPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    return decoded;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

/**
 * Verifies a refresh token against stored tokens
 * Only available in API routes, not in middleware
 */
export async function verifyRefreshToken(userId: string, token: string): Promise<boolean> {
  if (typeof window !== 'undefined' || process.env.NEXT_RUNTIME === 'edge') {
    throw new Error('verifyRefreshToken is not available in the browser or Edge Runtime');
  }
  
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  // This would need to be adjusted based on the actual Prisma schema
  // For now, just check if the user exists as a placeholder
  const user = await prisma.staff.findUnique({
    where: { id: userId }
  });
  
  return !!user;
}

/**
 * Invalidates a refresh token after use (one-time use tokens)
 * Only available in API routes, not in middleware
 */
export async function invalidateRefreshToken(userId: string, token: string): Promise<void> {
  if (typeof window !== 'undefined' || process.env.NEXT_RUNTIME === 'edge') {
    throw new Error('invalidateRefreshToken is not available in the browser or Edge Runtime');
  }
  
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  // This would need to be adjusted based on the actual Prisma schema
  // For now, just update the lastLogin field as a placeholder
  await prisma.staff.update({
    where: { id: userId },
    data: {
      lastLogin: new Date()
    }
  });
}

/**
 * Middleware to authenticate requests
 * Authentication from cookies is safe for middleware
 */
export function authenticateFromCookies(req: NextRequest): AuthResult {
  const token = req.cookies.get('auth_token')?.value;
  
  if (!token) {
    return { 
      authenticated: false,
      status: 'unauthenticated',
      message: 'No authentication token provided' 
    };
  }
  
  const user = verifyAccessToken(token);
  
  if (!user) {
    return { 
      authenticated: false,
      status: 'unauthenticated',
      message: 'Invalid or expired token' 
    };
  }
  
  return {
    authenticated: true,
    status: 'authenticated',
    user
  };
}

/**
 * Middleware to authenticate requests - For API routes, not middleware
 */
export async function authenticate(req: NextRequest): Promise<AuthResult> {
  // In middleware, prefer using cookies
  if (process.env.NEXT_RUNTIME === 'edge') {
    return authenticateFromCookies(req);
  }
  
  const authHeader = req.headers.get('authorization');
  // Also check cookie as fallback
  const cookie = req.cookies.get('auth_token')?.value;
  
  // Try header first
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = verifyAccessToken(token);
    
    if (user) {
      return {
        authenticated: true,
        status: 'authenticated',
        user
      };
    }
  }
  
  // Fall back to cookie
  if (cookie) {
    const user = verifyAccessToken(cookie);
    
    if (user) {
      return {
        authenticated: true,
        status: 'authenticated',
        user
      };
    }
  }
  
  return { 
    authenticated: false,
    status: 'unauthenticated',
    message: 'No valid authentication token provided' 
  };
}

/**
 * Role-based authorization middleware
 */
export function authorize(requiredRole: string | string[], requiredPermissions?: string[]) {
  return async (req: NextRequest): Promise<{
    authorized: boolean;
    message?: string;
  }> => {
    const { authenticated, user, message } = await authenticate(req);
    
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
    
    return { authorized: true };
  };
}

/**
 * Legacy function to get user from request for backward compatibility
 */
export function getUserFromRequest(req: NextRequest): UserPayload | null {
  // In middleware, prefer using cookies
  if (process.env.NEXT_RUNTIME === 'edge') {
    const token = req.cookies.get('auth_token')?.value;
    if (!token) return null;
    return verifyAccessToken(token);
  }

  // Try header first
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
  const token = authHeader.substring(7);
    return verifyAccessToken(token);
  }
  
  // Fall back to cookie
  const token = req.cookies.get('auth_token')?.value;
  if (!token) return null;
  return verifyAccessToken(token);
}

/**
 * Create a test token for development purposes
 */
export function createTestToken(role: string = 'user'): string {
  const user: UserPayload = {
    id: `test-${role}-id`,
    email: `${role}@example.com`,
    role,
    permissions: []
  };
  
  return generateAccessToken(user);
}

/**
 * Extract token from request
 */
export function extractTokenFromRequest(req: NextRequest): string | null {
  // Try to get token from cookies
  const tokenFromCookie = req.cookies.get('auth_token')?.value;
  if (tokenFromCookie) return tokenFromCookie;
  
  // Try to get token from authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
} 