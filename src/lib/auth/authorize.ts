// Authorization utility for API routes
import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from './auth';

// User payload interface from auth.ts
interface UserPayload {
  id: string;
  email: string;
  role: string;
  permissions: string[];
}

/**
 * Authorization middleware factory for API routes
 * @param allowedRoles Array of roles allowed to access the resource, empty array means any authenticated user
 * @returns Function that checks if the user is authorized
 */
export const authorize = (allowedRoles: string[] = []) => {
  return async (req: NextRequest): Promise<{
    authorized: boolean;
    success?: boolean; // Backward compatibility
    message?: string;
    status?: number; // Backward compatibility
    user?: UserPayload;
  }> => {
    // Get token from request
    const token = req.cookies.get('auth_token')?.value || extractBearerToken(req);
    
    if (!token) {
      return { 
        authorized: false, 
        success: false,
        message: 'Authentication required',
        status: 401
      };
      }
      
      // Verify the token
    const user = verifyAccessToken(token);
        
        if (!user) {
      return { 
        authorized: false, 
        success: false,
        message: 'Invalid or expired token',
        status: 401
      };
        }
        
        // If no roles specified, just require authentication
        if (allowedRoles.length === 0) {
      return { 
        authorized: true,
        success: true,
        user
      };
    }
    
    // Special case: admin role can access everything
    if (user.role === 'admin') {
      return { 
        authorized: true,
        success: true,
        user
      };
        }
        
        // Check if user has an allowed role
        if (!user.role || !allowedRoles.includes(user.role)) {
          console.log(`[authorize] User role ${user.role} not in allowed roles [${allowedRoles.join(', ')}]`);
          return { 
            authorized: false, 
        success: false,
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        status: 403,
            user
          };
        }
        
    // All checks passed
    return { 
      authorized: true,
      success: true,
      user
    };
  };
};

/**
 * Extracts bearer token from authorization header
 */
function extractBearerToken(req: NextRequest): string | null {
  const authorization = req.headers.get('authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }
  return authorization.substring(7);
    }

/**
 * Checks if the user has permission to access the endpoint and returns an appropriate response if not
 * @param req The Next.js request object
 * @param allowedRoles Array of roles that are allowed to access the endpoint
 * @param requiredPermissions Optional array of permissions that the user must have
 * @returns NextResponse with error if unauthorized, null if authorized
 */
export async function checkAuthorization(
  req: NextRequest, 
  allowedRoles: string[],
  requiredPermissions?: string[]
): Promise<NextResponse | null> {
  const authResult = await authorize(allowedRoles)(req);
  
  if (!authResult.authorized) {
    return NextResponse.json(
      { success: false, message: authResult.message },
      { status: authResult.status || 401 }
    );
  }
  
  return null;
}

/**
 * Check if the current user is the requested attendee by ID
 * Used for attendee self-service endpoints
 */
export function authorizeAttendee(req: NextRequest, attendeeId: string): {
  authorized: boolean;
  success?: boolean; // Backward compatibility
  message?: string;
  status?: number; // Backward compatibility
  user?: UserPayload;
} {
  // Get token from request
  const token = req.cookies.get('auth_token')?.value || extractBearerToken(req);
  
  if (!token) {
    return { 
      authorized: false, 
      success: false,
      message: 'Authentication required',
      status: 401
    };
  }
  
  // Verify the token
  const user = verifyAccessToken(token);
  
  if (!user) {
    return { 
      authorized: false, 
      success: false,
      message: 'Invalid or expired token',
      status: 401
    };
  }
  
  // Admin can access any attendee
  if (user.role === 'admin') {
    return { 
      authorized: true, 
      success: true,
      user 
    };
  }
  
  // Manager can access any attendee
  if (user.role === 'manager') {
    return { 
      authorized: true, 
      success: true,
      user 
    };
  }
  
  // Staff can access any attendee for check-in purposes
  if (user.role === 'staff') {
    return { 
      authorized: true, 
      success: true,
      user 
    };
  }
  
  // Attendees can only access their own data
  if (user.role === 'attendee' || user.role === 'speaker') {
    if (user.id === attendeeId) {
      return { 
        authorized: true, 
        success: true,
        user 
      };
    } else {
      return { 
        authorized: false, 
        success: false,
        message: 'You can only access your own data',
        status: 403,
        user
      };
    }
  }
  
  // Default deny
  return { 
    authorized: false, 
    success: false,
    message: 'Access denied',
    status: 403,
    user
  };
}
