import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sign } from 'jsonwebtoken';

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h'; // 24 hours for speakers

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

    // Check if there is a staff with this email and role=speaker
    const speaker = await prisma.staff.findFirst({
      where: { 
        email: email.toLowerCase(),
        role: 'speaker'
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
      },
    });

    // If speaker doesn't exist
    if (!speaker) {
      return NextResponse.json(
        { success: false, message: 'No speaker found with this email' },
        { status: 404 }
      );
    }

    // Generate a JWT token for the speaker
    const token = sign(
      {
        id: speaker.id,
        email: speaker.email,
        role: 'speaker',
        permissions: speaker.permissions,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Create response with user data
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: speaker.id,
        name: speaker.name,
        email: speaker.email,
        role: 'speaker',
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

    // Update the last login timestamp
    await prisma.staff.update({
      where: { id: speaker.id },
      data: { lastLogin: new Date() }
    });

    return response;
  } catch (error) {
    console.error('Speaker login error:', error);
    return NextResponse.json(
      { success: false, message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 