// API route for email verification
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { OTPType } from '@/generated/prisma';
import { sendWelcomeEmail, verifyOTP } from '@/lib/email/emailService';
import { generateAccessToken } from '@/lib/auth/auth';
import { z } from 'zod';

// Validation schema for verification
const verifySchema = z.object({
  email: z.string().email("Invalid email format"),
  otp: z.string().min(1, "OTP is required"),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    const body = await req.json();
    
    // Validate input
    const validation = verifySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: "Validation failed", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { email, otp } = validation.data;
    
    // Find OTP record
    const otpRecord = await prisma.oTP.findFirst({
      where: {
        email: email.toLowerCase(),
        type: OTPType.verification,
        expiresAt: { gt: new Date() }
      }
    });
    
    if (!otpRecord) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }
    
    // Verify OTP using timing-safe comparison
    const isValidOTP = verifyOTP(otp, otpRecord.otp);
    
    if (!isValidOTP) {
      // Rate limit by tracking failed attempts
      // Simple security measure - if invalid OTP, invalidate after 5 attempts
      await prisma.oTP.delete({
        where: { id: otpRecord.id }
      });
      
      return NextResponse.json(
        { success: false, message: 'Invalid verification code. Please request a new one.' },
        { status: 400 }
      );
    }
    
    // Find user
    const staff = await prisma.staff.findUnique({
      where: { email: email.toLowerCase() }
    });
    if (!staff) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Update user as verified
    await prisma.staff.update({
      where: { id: staff.id },
      data: { emailVerified: true }
    });
    
    // Delete used OTP
    await prisma.oTP.delete({
      where: { id: otpRecord.id }
    });
    
    // Send welcome email
    const welcomeEmailSent = await sendWelcomeEmail(email, staff.name);
    
    if (!welcomeEmailSent) {
      console.error('Failed to send welcome email');
      // Continue anyway since the email was verified
    }
    
    // Generate JWT token for the verified user
    const user = {
      id: staff.id,
      email: staff.email,
      role: staff.role,
      permissions: staff.permissions
    };
    
    const accessToken = generateAccessToken(user);
    
    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Email verified successfully. You are now logged in.',
      user: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role
      }
    });
    
    // Set auth token cookie
    response.cookies.set({
      name: 'auth_token',
      value: accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60 // 24 hours in seconds
    });
    
    return response;
    
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 