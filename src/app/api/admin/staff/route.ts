import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/auth';
import { authorize } from '@/lib/auth/authorize';
import { adminActivities } from '@/lib/logging/activityLogger';
import { z } from 'zod';

// Schema for validating staff creation/updates
const staffSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  role: z.enum(["admin", "manager", "staff", "speaker"]),
  permissions: z.array(z.string()),
  password: z.string().optional(),
  department: z.string().optional(),
  phoneNumber: z.string().optional(),
  profileImage: z.string().optional(),
  twoFactorEnabled: z.boolean().optional()
});

// GET all staff members
export async function GET(req: NextRequest) {
  try {
    // Only admin users can view all staff
    const authResult = await authorize(['admin'])(req);
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, message: authResult.message || 'Unauthorized' },
        { status: authResult.status || 401 }
      );
    }

    // Parse query parameters
    const url = new URL(req.url);
    const role = url.searchParams.get('role');
    const search = url.searchParams.get('search');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    // Build where conditions
    const where: any = {};
    if (role && role !== 'all') {
      where.role = role;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch staff members with pagination
    const [staffMembers, totalCount] = await Promise.all([
      prisma.staff.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          permissions: true,
          lastLogin: true,
          createdAt: true,
          emailVerified: true,
          department: true,
          phoneNumber: true,
          profileImage: true,
          twoFactorEnabled: true,
          _count: {
            select: {
              checkedInAttendees: true,
              lunchClaimedAttendees: true,
              kitClaimedAttendees: true
            }
          }
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit
      }),
      prisma.staff.count({ where })
    ]);

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: staffMembers,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching staff members:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch staff members' },
      { status: 500 }
    );
  }
}

// POST create a new staff member
export async function POST(req: NextRequest) {
  try {
    // Only admin can create staff
    const authResult = await authorize(['admin'])(req);
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, message: authResult.message || 'Unauthorized' },
        { status: authResult.status || 401 }
      );
    }

    // Parse request body
    const body = await req.json();

    // Validate input
    const validation = staffSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: "Validation failed", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { name, email, role, permissions, password, department, phoneNumber, profileImage, twoFactorEnabled } = validation.data;

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

    // Ensure password is provided for new staff
    if (!password) {
      return NextResponse.json(
        { success: false, message: 'Password is required for new staff members' },
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

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create new staff member
    const newStaff = await prisma.staff.create({
      data: {
        name,
        email: email.toLowerCase(),
        role,
        permissions,
        passwordHash,
        emailVerified: false,
        department,
        phoneNumber,
        profileImage,
        twoFactorEnabled: twoFactorEnabled || false
      }
    });

    // Log the activity
    await adminActivities.staffCreated(newStaff.id, newStaff.name, newStaff.role);

    return NextResponse.json({
      success: true,
      message: 'Staff member created successfully',
      data: {
        id: newStaff.id,
        name: newStaff.name,
        email: newStaff.email,
        role: newStaff.role,
        permissions: newStaff.permissions
      }
    });
  } catch (error) {
    console.error('Error creating staff member:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create staff member' },
      { status: 500 }
    );
  }
}

// PUT update a staff member
export async function PUT(req: NextRequest) {
  try {
    // Only admin can update staff
    const authResult = await authorize(['admin'])(req);
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, message: authResult.message || 'Unauthorized' },
        { status: authResult.status || 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { id, ...data } = body;

    // Validate input
    const validation = staffSchema.partial().safeParse(data);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: "Validation failed", details: validation.error.format() },
        { status: 400 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Staff ID is required' },
        { status: 400 }
      );
    }

    // Check if staff exists
    const existingStaff = await prisma.staff.findUnique({
      where: { id }
    });

    if (!existingStaff) {
      return NextResponse.json(
        { success: false, message: 'Staff member not found' },
        { status: 404 }
      );
    }

    // If email is being updated, check if it already exists
    if (data.email && data.email !== existingStaff.email) {
      const emailExists = await prisma.staff.findUnique({
        where: { email: data.email.toLowerCase() }
      });

      if (emailExists) {
        return NextResponse.json(
          { success: false, message: 'Email already in use' },
          { status: 409 }
        );
      }
    }

    // Handle password update
    let updateData: any = { ...data };
    delete updateData.password;

    if (data.password) {
      // Enhanced password strength validation
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(data.password)) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
          },
          { status: 400 }
        );
      }

      // Hash password
      updateData.passwordHash = await hashPassword(data.password);
    }

    // If email is being updated, ensure it's lowercase
    if (updateData.email) {
      updateData.email = updateData.email.toLowerCase();
    }

    // Update staff
    const updatedStaff = await prisma.staff.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        department: true,
        phoneNumber: true,
        profileImage: true,
        twoFactorEnabled: true,
        lastLogin: true,
        createdAt: true,
        emailVerified: true
      }
    });

    // Log the activity
    await adminActivities.staffUpdated(updatedStaff.id, updatedStaff.name, data);

    return NextResponse.json({
      success: true,
      message: 'Staff member updated successfully',
      data: updatedStaff
    });
  } catch (error) {
    console.error('Error updating staff member:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update staff member' },
      { status: 500 }
    );
  }
}

// DELETE a staff member
export async function DELETE(req: NextRequest) {
  try {
    // Only admin can delete staff
    const authResult = await authorize(['admin'])(req);
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, message: authResult.message || 'Unauthorized' },
        { status: authResult.status || 401 }
      );
    }

    // Parse query parameters
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Staff ID is required' },
        { status: 400 }
      );
    }

    // Check if staff exists
    const existingStaff = await prisma.staff.findUnique({
      where: { id }
    });

    if (!existingStaff) {
      return NextResponse.json(
        { success: false, message: 'Staff member not found' },
        { status: 404 }
      );
    }

    // Store staff info for activity log
    const { name } = existingStaff;

    // Delete staff
    await prisma.staff.delete({
      where: { id }
    });

    // Log the activity
    await adminActivities.staffDeleted(id, name);

    return NextResponse.json({
      success: true,
      message: 'Staff member deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting staff member:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete staff member' },
      { status: 500 }
    );
  }
} 