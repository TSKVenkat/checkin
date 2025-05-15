// API route for staff signup
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/auth';
import { generateOTP, sendVerificationEmail } from '@/lib/email/emailService';
// Import OTPType enum directly from the Prisma client
import { OTPType } from '@/generated/prisma';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    const body = await req.json();
    const { name, email, password, role = 'attendee' } = body;
    
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
    
    // Enhanced password strength validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        },
        { status: 400 }
      );
    }
    
    // Validate role
    const validRoles = ['admin', 'manager', 'staff', 'speaker', 'attendee'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, message: 'Invalid role. Must be one of: admin, manager, staff, speaker, attendee' },
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
    
    // Set permissions based on role
    let permissions: string[] = [];
    
    switch (role) {
      case 'admin':
        permissions = ['admin:all', 'edit:all', 'view:all', 'check-in:process', 'distribution:process'];
        break;
      case 'manager':
        permissions = ['edit:all', 'view:all', 'check-in:process', 'distribution:process'];
        break;
      case 'staff':
        permissions = ['view:own', 'check-in:process', 'distribution:process'];
        break;
      case 'speaker':
        permissions = ['view:own', 'view:schedule'];
        break;
      case 'attendee':
        permissions = ['view:own', 'view:schedule'];
        break;
      default:
        permissions = ['view:own'];
    }
    
    // Generate OTP for email verification - using enhanced security
    const otp = generateOTP({ 
      length: 8,
      type: 'alphanumeric'
    });
    
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
    const emailSent = await sendVerificationEmail(email, otp);
    
    if (!emailSent) {
      console.error('Failed to send verification email');
      // Continue anyway since the account was created
    }
    
    // Create response - don't set auth token until email is verified
    const response = NextResponse.json({
      success: true,
      message: 'Account created successfully. Please check your email for verification instructions.',
      user: {
        id: result.id,
        name: result.name,
        email: result.email,
        role: result.role
      }
    });
    
    return response;
    
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 