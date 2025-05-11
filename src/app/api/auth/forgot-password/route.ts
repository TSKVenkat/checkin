// API route for forgot password
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/dbConnect';
import { Staff, OTP } from '@/lib/db/models';
import { generateOTP, sendPasswordResetEmail } from '@/lib/email/emailService';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Connect to database
    await dbConnect();
    
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
    const staff = await Staff.findOne({ email: email.toLowerCase() });
    if (!staff) {
      // For security reasons, don't reveal if the email exists or not
      return NextResponse.json({
        success: true,
        message: 'If your email is registered, you will receive a password reset code'
      });
    }
    
    // Delete any existing OTPs for this email and type
    await OTP.deleteMany({
      email: email.toLowerCase(),
      type: 'password-reset'
    });
    
    // Generate new OTP
    const otp = generateOTP();
    
    // Store OTP
    const newOTP = new OTP({
      email: email.toLowerCase(),
      otp,
      type: 'password-reset',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });
    
    await newOTP.save();
    
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