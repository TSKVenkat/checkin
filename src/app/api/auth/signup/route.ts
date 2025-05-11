// API route for staff signup
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/auth';
import { generateOTP, sendVerificationEmail } from '@/lib/email/emailService';
import { OTPType } from '@prisma/client';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    const body = await req.json();
    const { name, email, password, role = 'staff' } = body;
    
    // Validate request
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'Name, email, and password are required' },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }
    
    // Check if email already exists
    const existingStaff = await prisma.staff.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    if (existingStaff) {
      return NextResponse.json(
        { success: false, message: 'Email already registered' },
        { status: 409 }
      );
    }
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Set default permissions based on role
    let permissions: string[] = ['view:own'];
    if (role === 'admin') {
      permissions = ['admin:all', 'edit:all', 'view:all'];
    } else if (role === 'manager') {
      permissions = ['edit:all', 'view:all'];
    }
    
    // Generate OTP for email verification
    const otp = generateOTP();
    
    // Use transaction to ensure both staff and OTP creation succeed
    const result = await prisma.$transaction(async (tx) => {
      // Create new staff member
      const newStaff = await tx.staff.create({
        data: {
          name,
          email: email.toLowerCase(),
          role,
          permissions,
          passwordHash,
          emailVerified: false
        }
      });
      
      // Store OTP in database
      await tx.oTP.create({
        data: {
          email: email.toLowerCase(),
          otp,
          type: OTPType.verification,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
        }
      });
      
      return newStaff;
    });
    
    // Send verification email
    await sendVerificationEmail(email, otp);
    
    return NextResponse.json({
      success: true,
      message: 'Account created successfully. Please verify your email.',
      user: {
        id: result.id,
        name: result.name,
        email: result.email,
        role: result.role
      }
    });
    
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 