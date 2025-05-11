// API route for email verification
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/dbConnect';
import { Staff, OTP } from '@/lib/db/models';
import { sendWelcomeEmail } from '@/lib/email/emailService';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Connect to database
    await dbConnect();
    
    // Parse request body
    const body = await req.json();
    const { email, otp } = body;
    
    // Validate request
    if (!email || !otp) {
      return NextResponse.json(
        { success: false, message: 'Email and verification code are required' },
        { status: 400 }
      );
    }
    
    // Find OTP record
    const otpRecord = await OTP.findOne({
      email: email.toLowerCase(),
      otp,
      type: 'verification',
      expiresAt: { $gt: new Date() }
    });
    
    if (!otpRecord) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired verification code' },
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
    
    // Update user as verified
    staff.authData.emailVerified = true;
    await staff.save();
    
    // Delete used OTP
    await OTP.deleteOne({ _id: otpRecord._id });
    
    // Send welcome email
    await sendWelcomeEmail(email, staff.name);
    
    return NextResponse.json({
      success: true,
      message: 'Email verified successfully'
    });
    
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 