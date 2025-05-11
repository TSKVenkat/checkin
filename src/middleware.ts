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
  
  // API routes (except auth endpoints)
  '/api/events',
  '/api/attendees',
  '/api/resources',
  '/api/system',
];

// Check if a route should be protected
function isProtectedRoute(path: string): boolean {
  return PROTECTED_ROUTES.some(route => path.startsWith(route));
}

// Check if an auth route should be accessible to logged in users
function isAuthRoute(path: string): boolean {
  return (
    path === '/login' || 
    path === '/signup' || 
    path === '/forgot-password' || 
    path === '/reset-password'
  );
}

// Middleware handler
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Get the auth token from cookies
  const authToken = request.cookies.get('auth_token')?.value;
  
  // If the user accesses auth routes while logged in, redirect to dashboard
  if (isAuthRoute(path) && authToken) {
    // Verify the token is valid
    const user = verifyAccessToken(authToken);
    
    // If token is valid, redirect to dashboard
    if (user) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }
  
  // If the user accesses protected routes without being logged in, redirect to login
  if (isProtectedRoute(path)) {
    // No token present, redirect to login
    if (!authToken) {
      const url = new URL('/login', request.url);
      url.searchParams.set('callbackUrl', encodeURI(request.url));
      return NextResponse.redirect(url);
    }
    
    // Token is present but might be invalid or expired
    const user = verifyAccessToken(authToken);
    
    // If token is invalid, redirect to login
    if (!user) {
      const url = new URL('/login', request.url);
      url.searchParams.set('callbackUrl', encodeURI(request.url));
      url.searchParams.set('error', 'Session expired. Please log in again.');
      return NextResponse.redirect(url);
    }
    
    // Add user role to headers for use in the application
    const response = NextResponse.next();
    response.headers.set('x-user-role', user.role);
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