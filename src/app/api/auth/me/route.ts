import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth/auth';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // Get the auth token from cookies
    const authToken = req.cookies.get('auth_token')?.value;
    
    // If no token is present, return unauthorized
    if (!authToken) {
      console.log('No authentication token found in /api/auth/me request');
      return NextResponse.json(
        { success: false, message: 'No authentication token found' },
        { status: 401 }
      );
    }
    
    // Verify the token
    try {
      const user = verifyAccessToken(authToken);
      
      if (!user) {
        console.log('Invalid authentication token in /api/auth/me request');
        return NextResponse.json(
          { success: false, message: 'Invalid authentication token' },
          { status: 401 }
        );
      }
      
      // Determine appropriate dashboard URL based on user role
      let dashboardUrl = '/dashboard'; // Default for staff
      
      if (user.role === 'admin') {
        dashboardUrl = '/admin/dashboard';
      } else if (user.role === 'manager') {
        dashboardUrl = '/manager/dashboard';
      } else if (user.role === 'attendee' || user.role === 'speaker') {
        dashboardUrl = '/attendee';
      }
      
      // Return user data without sensitive information
      return NextResponse.json(
        { 
          success: true, 
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            permissions: user.permissions || [],
            // Generate a display name from email
            displayName: user.email.split('@')[0],
            dashboardUrl: dashboardUrl
          }
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('Token verification error:', error);
      return NextResponse.json(
        { success: false, message: 'Invalid or expired authentication token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while checking authentication' },
      { status: 500 }
    );
  }
} 