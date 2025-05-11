// API route for reset password
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/dbConnect';
import { Staff, OTP } from '@/lib/db/models';
import { hashPassword } from '@/lib/auth/auth';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Connect to database
    await dbConnect();
    
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
    const otpRecord = await OTP.findOne({
      email: email.toLowerCase(),
      otp,
      type: 'password-reset',
      expiresAt: { $gt: new Date() }
    });
    
    if (!otpRecord) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired reset code' },
        { status: 400 }
      );
    }
    
    // Find user
    const staff = await Staff.findOne({ email: email.toLowerCase() });
    if (!staff) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Hash new password
    const passwordHash = await hashPassword(newPassword);
    
    // Update password
    staff.authData.passwordHash = passwordHash;
    
    // If user wasn't verified, verify them now
    if (!staff.authData.emailVerified) {
      staff.authData.emailVerified = true;
    }
    
    // Save changes
    await staff.save();
    
    // Delete used OTP
    await OTP.deleteOne({ _id: otpRecord._id });
    
    // Invalidate all active sessions for security
    staff.authData.activeSessions = [];
    await staff.save();
    
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