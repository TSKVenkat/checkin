import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sign } from 'jsonwebtoken';

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h'; // 24 hours for attendees

// Validation for email
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const { email } = body;

    // Validate email
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Find attendee by email
    const attendee = await prisma.attendee.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        name: true,
        email: true,
        uniqueId: true,
        role: true,
      },
    });

    // If attendee doesn't exist
    if (!attendee) {
      return NextResponse.json(
        { success: false, message: 'No attendee found with this email' },
        { status: 404 }
      );
    }

    // Generate a JWT token for the attendee - no verification checks needed for attendees
    const token = sign(
      {
        id: attendee.id,
        email: attendee.email,
        uniqueId: attendee.uniqueId,
        role: 'attendee', // Always set role to attendee for attendee login
        permissions: ['view:own'], // Limited permissions
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Create response with user data
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: attendee.id,
        name: attendee.name,
        email: attendee.email,
        role: 'attendee',
      },
      redirectUrl: '/attendee'
    });

    // Set the auth token cookie
    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60, // 24 hours in seconds
      sameSite: 'strict',
    });

    // Log the login
    try {
      await prisma.activityLog.create({
        data: {
          type: 'auth',
          action: 'login',
          description: `Attendee login: ${attendee.email}`,
          entityType: 'Attendee',
          entityId: attendee.id,
          ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
        }
      });
    } catch (logError) {
      console.error('Failed to log attendee login:', logError);
      // Continue with login even if logging fails
    }

    return response;
  } catch (error) {
    console.error('Attendee login error:', error);
    return NextResponse.json(
      { success: false, message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 