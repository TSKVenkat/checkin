// API route for forgot password
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { OTPType } from '@/generated/prisma';
import { generateOTP, sendPasswordResetEmail } from '@/lib/email/emailService';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    const body = await req.json();
    const { email } = body;
    
    // Validate request
    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Check if user exists
    const staff = await prisma.staff.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    if (!staff) {
      // Return success even if user doesn't exist (security best practice)
      return NextResponse.json(
        { success: true, message: 'If your email is registered, you will receive a password reset link' },
        { status: 200 }
      );
    }
    
    // Generate OTP
    const otp = generateOTP();
    
    // Delete any existing OTPs for this email and type
    await prisma.oTP.deleteMany({
      where: {
        email: email.toLowerCase(),
        type: OTPType.password_reset
      }
    });
    
    // Create new OTP
    await prisma.oTP.create({
      data: {
        email: email.toLowerCase(),
        otp,
        type: OTPType.password_reset,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      }
    });
    
    // Send password reset email
    await sendPasswordResetEmail(email, otp);
    
    return NextResponse.json({
      success: true,
      message: 'If your email is registered, you will receive a password reset code'
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 