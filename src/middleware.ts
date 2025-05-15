// Next.js middleware for authentication and authorization
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAccessToken } from './lib/auth/auth';

// Protected routes configuration
const PROTECTED_ROUTES = [
  // Dashboard and admin routes
  '/dashboard',
  '/admin',
  '/events',
  '/attendees',
  '/profile',
  '/resources',
  '/check-in',
  '/distribution',
  '/attendee',
  '/manager',
  '/day',
  '/api/events',
  '/api/attendees',
  '/api/resources',
  '/api/system',
  '/api/day',
  '/api/admin',
];

// Public routes that don't need authentication
const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/',
  '/api/auth',
];

// Role-based route restrictions
const ADMIN_ONLY_ROUTES = [
  '/admin',
  '/api/admin',
  '/api/system',
  '/api/events/create',
  '/api/events/update',
  '/api/events/delete',
];

const MANAGER_ROUTES = [
  '/manager',
  '/dashboard',
  '/check-in',
  '/distribution',
  '/api/attendees/check-in',
  '/api/attendees/resource',
  '/day/check-in',
  '/day/distribution',
];

const STAFF_ROUTES = [
  '/dashboard',
  '/check-in',
  '/distribution',
  '/api/attendees/check-in',
  '/api/attendees/resource',
  '/day/check-in',
  '/day/distribution',
];

const ATTENDEE_ROUTES = [
  '/attendee',
  '/api/attendees/me',
  '/day/schedule',
];

// Speaker role has the same access as attendee
const SPEAKER_ROUTES = [
  ...ATTENDEE_ROUTES
];

// Check if a route should be protected
function isProtectedRoute(path: string): boolean {
  return PROTECTED_ROUTES.some(route => path.startsWith(route));
}

// Check if a route is public
function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some(route => path.startsWith(route));
}

// Check if a route is admin-only
function isAdminOnlyRoute(path: string): boolean {
  // Special case for admin path - all /admin and its subpaths are admin-only
  if (path === '/admin' || path.startsWith('/admin/')) {
    return true;
  }
  
  // Check other admin-only routes
  return ADMIN_ONLY_ROUTES.some(route => path.startsWith(route));
}

// Check if a route is manager-only
function isManagerRoute(path: string): boolean {
  // Special case for manager path - all /manager and its subpaths are manager-only
  if (path === '/manager' || path.startsWith('/manager/')) {
    return true;
  }
  
  return MANAGER_ROUTES.some(route => path.startsWith(route));
}

// Check if a route is staff-only
function isStaffRoute(path: string): boolean {
  return STAFF_ROUTES.some(route => path.startsWith(route));
}

// Check if a route is attendee-only
function isAttendeeRoute(path: string): boolean {
  return ATTENDEE_ROUTES.some(route => path.startsWith(route));
}

// Check if a route is speaker-only
function isSpeakerRoute(path: string): boolean {
  return SPEAKER_ROUTES.some(route => path.startsWith(route));
}

// Middleware handler
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Skip middleware for public routes and static assets
  if (isPublicRoute(path) || path.includes('/_next/') || path.includes('/public/')) {
    return NextResponse.next();
  }
  
  // For protected routes, verify authentication
  if (isProtectedRoute(path)) {
    // Get the auth token from cookies
    const authToken = request.cookies.get('auth_token')?.value;
    
    // No token present, redirect to login
    if (!authToken) {
      console.log('No auth token found, redirecting to login');
      const url = new URL('/login', request.url);
      url.searchParams.set('callbackUrl', request.url);
      return NextResponse.redirect(url);
    }
    
    // Verify the token
    let user;
    try {
      user = verifyAccessToken(authToken);
    } catch (error) {
      console.error('Error verifying token:', error);
      user = null;
    }
    
    // If token is invalid, redirect to login
    if (!user) {
      console.log('Invalid auth token, redirecting to login');
      const url = new URL('/login', request.url);
      url.searchParams.set('callbackUrl', request.url);
      url.searchParams.set('error', 'Session expired. Please log in again.');
      return NextResponse.redirect(url);
    }
    
    // Handle multi-day event paths specifically
    if (path.startsWith('/day/')) {
      // Extract day parameter from URL if present
      const dayParam = new URL(request.url).searchParams.get('day');
      
      // If no day parameter provided and not a resource/documentation link
      if (!dayParam && !path.includes('/resources/') && !path.includes('/docs/')) {
        // Redirect to same URL but with today's date as the day parameter
        const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
        const url = new URL(request.url);
        url.searchParams.set('day', today);
        return NextResponse.redirect(url);
      }
    }
    
    // Role-based access control - redirect to appropriate dashboard if trying to access root

    // If a user tries to access the root dashboard
    if (path === '/dashboard') {
      // Admin should go to admin dashboard
      if (user.role === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
      // Manager should go to their dashboard
      else if (user.role === 'manager') {
        return NextResponse.redirect(new URL('/manager/dashboard', request.url));
      }
      // Attendee should go to their dashboard
      else if (user.role === 'attendee' || user.role === 'speaker') {
        return NextResponse.redirect(new URL('/attendee', request.url));
      }
      // Staff stays on the dashboard
    }
    
    // Role-based access control - restrict access to admin routes
    if (isAdminOnlyRoute(path) && user.role !== 'admin') {
      // Redirect non-admin users trying to access admin routes to their appropriate dashboard
      if (user.role === 'manager') {
        return NextResponse.redirect(new URL('/manager/dashboard', request.url));
      } else if (user.role === 'staff') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      } else if (user.role === 'attendee' || user.role === 'speaker') {
        return NextResponse.redirect(new URL('/attendee', request.url));
      } else {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }
    
    // Restrict access to manager routes
    if (isManagerRoute(path) && user.role !== 'manager' && user.role !== 'admin') {
      // Admin can access manager routes
      if (user.role === 'staff') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      } else if (user.role === 'attendee' || user.role === 'speaker') {
        return NextResponse.redirect(new URL('/attendee', request.url));
      } else {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }
    
    // Restrict access to staff routes
    if (isStaffRoute(path) && !['admin', 'manager', 'staff'].includes(user.role)) {
      // Redirect non-staff users trying to access staff routes
      if (user.role === 'attendee' || user.role === 'speaker') {
        return NextResponse.redirect(new URL('/attendee', request.url));
      } else {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }
    
    // Restrict access to attendee routes
    if (isAttendeeRoute(path) && user.role !== 'attendee' && user.role !== 'speaker') {
      // Redirect non-attendees trying to access attendee routes
      if (user.role === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      } else if (user.role === 'manager') {
        return NextResponse.redirect(new URL('/manager/dashboard', request.url));
      } else if (user.role === 'staff') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      } else {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }
    
    // Token is valid, add user info to headers and proceed
    const response = NextResponse.next();
    response.headers.set('x-user-id', user.id);
    response.headers.set('x-user-role', user.role);
    
    // Add day parameter to headers if it exists (for multi-day events)
    const dayParam = new URL(request.url).searchParams.get('day');
    if (dayParam) {
      response.headers.set('x-event-day', dayParam);
    }
    
    return response;
  }
  
  // For all other routes, proceed normally
  return NextResponse.next();
}

// Configure the middleware to run only on specified paths
export const config = {
  matcher: [
    /*
     * Match all routes except:
     * 1. Public static files (/_next/, /images/, /favicon.ico, etc.)
     * 2. API routes that handle their own auth (/api/auth/)
     */
    '/((?!_next|public|images|favicon.ico).*)',
    '/api/((?!auth).*)$',
  ],
}; 