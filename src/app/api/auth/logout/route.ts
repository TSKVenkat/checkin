// API route for logging out
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/dbConnect';
import { Staff } from '@/lib/db/models';
import { verifyAccessToken } from '@/lib/auth/auth';

export async function POST(req: NextRequest) {
  try {
    // Connect to database
    await dbConnect();
    
    // Get tokens from cookies
    const accessToken = req.cookies.get('auth_token')?.value;
    const refreshToken = req.cookies.get('refresh_token')?.value;
    
    // Create response
    const response = NextResponse.json(
      { success: true, message: 'Successfully logged out' },
      { status: 200 }
    );
    
    // Clear cookies regardless of whether the token is valid
    response.cookies.set({
      name: 'auth_token',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0
    });
    
    response.cookies.set({
      name: 'refresh_token',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0
    });
    
    // If there's a valid access token, remove the session from the database
    if (accessToken && refreshToken) {
      const userData = verifyAccessToken(accessToken);
      
      if (userData && userData.id) {
        const hashedToken = Buffer.from(refreshToken).toString('base64');
        
        // Remove this session from active sessions
        await Staff.findByIdAndUpdate(userData.id, {
          $pull: {
            'authData.activeSessions': {
              token: hashedToken
            }
          }
        });
      }
    }
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    
    // Even if there's an error, we should clear cookies
    const response = NextResponse.json(
      { success: true, message: 'Logged out, but failed to clear server session' },
      { status: 200 }
    );
    
    // Clear cookies
    response.cookies.set({
      name: 'auth_token',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0
    });
    
    response.cookies.set({
      name: 'refresh_token',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0
    });
    
    return response;
  }
} 