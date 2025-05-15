import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, generateAccessToken, generateRefreshToken } from '@/lib/auth/auth';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function POST(req: NextRequest) {
  try {
    // Get refresh token from request body or cookies
    const body = await req.json().catch(() => ({}));
    const refreshToken = body.refreshToken || req.cookies.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: 'Refresh token is required' },
        { status: 400 }
      );
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    // Get user information from decoded token
    const { id, email, role } = decoded as { id: string; email: string; role: string };

    // For attendees, simply issue a new token if the refresh token is valid
    if (role === 'attendee') {
      // Find attendee in database to ensure they still exist
      const attendee = await prisma.attendee.findUnique({
        where: { id },
        select: { id: true, email: true, uniqueId: true }
      });

      if (!attendee) {
        return NextResponse.json(
          { success: false, message: 'Attendee not found' },
          { status: 404 }
        );
      }

      // Generate new tokens
      const accessToken = jwt.sign(
        {
          id: attendee.id,
          email: attendee.email,
          uniqueId: attendee.uniqueId,
          role: 'attendee',
          permissions: ['view:own']
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      const response = NextResponse.json({
        success: true,
        accessToken,
        user: {
          id: attendee.id,
          email: attendee.email,
          role: 'attendee'
        }
      });

      // Set cookies
      response.cookies.set({
        name: 'auth_token',
        value: accessToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60, // 24 hours
        path: '/',
      });

      return response;
    }

    // For staff, check user in database and issue new tokens
    const staff = await prisma.staff.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        permissions: true,
        name: true,
      },
    });

    if (!staff) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Generate new tokens
    const accessToken = generateAccessToken({
      id: staff.id,
      email: staff.email,
      role: staff.role,
      permissions: staff.permissions || [],
    });

    const newRefreshToken = generateRefreshToken({
      id: staff.id,
      email: staff.email,
      role: staff.role,
      permissions: staff.permissions || [],
    });

    // Update last login timestamp
    await prisma.staff.update({
      where: { id: staff.id },
      data: { lastLogin: new Date() }
    });

    // Create response
    const response = NextResponse.json({
      success: true,
      accessToken,
      user: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
      }
    });

    // Set cookies
    response.cookies.set({
      name: 'auth_token',
      value: accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });

    response.cookies.set({
      name: 'refresh_token',
      value: newRefreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 