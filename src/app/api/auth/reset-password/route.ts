// API route for reset password
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { OTPType } from '@/generated/prisma';
import { hashPassword } from '@/lib/auth/auth';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    const body = await req.json();
    const { email, otp, newPassword } = body;
    
    // Validate request
    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Email, code, and new password are required' },
        { status: 400 }
      );
    }
    
    // Validate password strength
    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }
    
    // Find OTP record
    const otpRecord = await prisma.oTP.findFirst({
      where: {
        email: email.toLowerCase(),
        otp,
        type: OTPType.password_reset,
        expiresAt: { gt: new Date() }
      }
    });
    
    if (!otpRecord) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired reset code' },
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
    
    // Hash new password
    const passwordHash = await hashPassword(newPassword);
    
    // Update password and verify email if needed
    await prisma.staff.update({
      where: { id: staff.id },
      data: {
        passwordHash,
        emailVerified: true
      }
    });
    
    // Delete used OTP
    await prisma.oTP.delete({
      where: { id: otpRecord.id }
    });
    
    // Invalidate all active sessions for security
    await prisma.staffSession.deleteMany({
      where: { staffId: staff.id }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. Please login with your new password.'
    });
    
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 