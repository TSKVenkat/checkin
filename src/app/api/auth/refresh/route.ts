// API route for refreshing access tokens
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/dbConnect';
import { Staff } from '@/lib/db/models';
import { generateAccessToken, verifyAccessToken } from '@/lib/auth/auth';

export async function POST(req: NextRequest) {
  try {
    // Connect to database
    await dbConnect();
    
    // Get refresh token from cookies
    const refreshToken = req.cookies.get('refresh_token')?.value;
    
    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: 'Refresh token is required' },
        { status: 401 }
      );
    }
    
    // Get existing access token to extract user ID
    const existingToken = req.cookies.get('auth_token')?.value;
    const userData = existingToken ? verifyAccessToken(existingToken) : null;
    
    if (!userData || !userData.id) {
      return NextResponse.json(
        { success: false, message: 'Invalid session' },
        { status: 401 }
      );
    }
    
    // Hash the token for DB comparison
    const hashedToken = Buffer.from(refreshToken).toString('base64');
    
    // Find user with the refresh token
    const staff = await Staff.findOne({
      _id: userData.id,
      'authData.activeSessions': {
        $elemMatch: {
          token: hashedToken,
          expiresAt: { $gt: new Date() }
        }
      }
    });
    
    if (!staff) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }
    
    // Generate new access token
    const user = {
      id: staff._id.toString(),
      email: staff.email,
      role: staff.role,
      permissions: staff.permissions
    };
    
    const newAccessToken = generateAccessToken(user);
    
    // Create response
    const response = NextResponse.json(
      { 
        success: true,
        user: {
          id: staff._id,
          name: staff.name,
          email: staff.email,
          role: staff.role
        }
      },
      { status: 200 }
    );
    
    // Set new access token cookie
    response.cookies.set({
      name: 'auth_token',
      value: newAccessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 15 * 60 // 15 minutes in seconds
    });
    
    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred during token refresh' },
      { status: 500 }
    );
  }
} 