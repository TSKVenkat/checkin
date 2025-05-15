import { NextRequest, NextResponse } from 'next/server';
import { comparePassword, generateAccessToken, generateRefreshToken } from '@/lib/auth/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for login
const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();

    // Validate input
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: "Validation failed", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Find the staff member by email
    const staff = await prisma.staff.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        permissions: true,
        name: true,
        emailVerified: true,
      },
    });

    // If staff doesn't exist or password is incorrect
    if (!staff) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check if user has verified their email
    if (!staff.emailVerified) {
      return NextResponse.json(
        { success: false, message: "Please verify your email before logging in" },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, staff.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check if the role is one of the allowed staff roles
    const validStaffRoles = ['admin', 'manager', 'staff'];
    if (!validStaffRoles.includes(staff.role)) {
      return NextResponse.json(
        { success: false, message: `Role '${staff.role}' cannot use standard login. Please use the appropriate login method.` },
        { status: 403 }
      );
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      id: staff.id,
      email: staff.email,
      role: staff.role,
      permissions: staff.permissions,
    });

    const userPayload = {
      id: staff.id,
      email: staff.email,
      role: staff.role,
      permissions: staff.permissions,
    };

    const refreshToken = generateRefreshToken(userPayload);

    // Store refresh token in database (in a real system, this would store the token in
    // the StaffSession table with device information)
    await prisma.staff.update({
      where: { id: staff.id },
      data: { 
        lastLogin: new Date() 
      }
    });

    // Prepare the response
    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      user: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
      },
      redirectUrl: getRedirectUrlForRole(staff.role)
    });
    
    // Set cookies in the response
    response.cookies.set({
      name: 'auth_token',
      value: accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });

    response.cookies.set({
      name: 'refresh_token',
      value: refreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Get the appropriate redirect URL based on user role
 */
function getRedirectUrlForRole(role: string): string {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'manager':
      return '/manager/dashboard';
    case 'staff':
      return '/dashboard';
    case 'speaker':
      return '/attendee';
    case 'attendee':
      return '/attendee';
    default:
      return '/dashboard';
  }
} 