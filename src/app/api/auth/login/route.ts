// API route for staff login
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { comparePassword, generateAccessToken, generateRefreshToken } from '@/lib/auth/auth';

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const { email, password } = await req.json();
    
    // Validate inputs
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Find user by email
    const staff = await prisma.staff.findUnique({
      where: { email: email }
    });
    
    // User not found
    if (!staff) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Verify password
    const isPasswordValid = await comparePassword(password, staff.passwordHash);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Generate JWT tokens
    const user = {
      id: staff.id,
      email: staff.email,
      role: staff.role,
      permissions: staff.permissions
    };
    
    const accessToken = generateAccessToken(user);
    const refreshTokenData = generateRefreshToken(staff.id);
    
    // Store refresh token in database
    const deviceInfo = req.headers.get('user-agent') || 'unknown';
    
    // Add to active sessions
    await prisma.staffSession.create({
      data: {
        token: Buffer.from(refreshTokenData.token).toString('base64'),
        device: deviceInfo,
        expiresAt: refreshTokenData.expiresAt,
        staffId: staff.id,
      }
    });
    
    // Update last login time
    await prisma.staff.update({
      where: { id: staff.id },
      data: { lastLogin: new Date() }
    });
    
    // Create response with cookies
    const response = NextResponse.json(
      { 
        success: true, 
        user: {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          role: staff.role
        }
      },
      { status: 200 }
    );
    
    // Set cookies
    response.cookies.set({
      name: 'auth_token',
      value: accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 15 * 60 // 15 minutes in seconds
    });
    
    response.cookies.set({
      name: 'refresh_token',
      value: refreshTokenData.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
    });
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred during login' },
      { status: 500 }
    );
  }
} 