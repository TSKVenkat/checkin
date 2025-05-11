// API route for listing attendees with pagination and filtering
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorize } from '@/lib/auth/auth';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // Check authorization (allow admin and check-in roles)
    const authResult = await authorize(['admin', 'check-in', 'distribution'])(req);
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, message: authResult.message || 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const isCheckedIn = searchParams.get('isCheckedIn');
    const role = searchParams.get('role');
    const resourceClaimed = searchParams.get('resourceClaimed');
    const resourceType = searchParams.get('resourceType') || 'lunch';
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Build Prisma where clause
    let whereClause: any = {};
    
    // Add search filter if provided (search by name, email, or uniqueId)
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { uniqueId: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Add check-in filter if provided
    if (isCheckedIn !== null && isCheckedIn !== undefined) {
      whereClause.isCheckedIn = isCheckedIn === 'true';
    }
    
    // Add role filter if provided
    if (role) {
      whereClause.role = role;
    }
    
    // Add resource claimed filter if provided
    if (resourceClaimed !== null && resourceClaimed !== undefined && resourceType) {
      if (resourceType === 'lunch') {
        whereClause.lunchClaimed = resourceClaimed === 'true';
      } else if (resourceType === 'kit') {
        whereClause.kitClaimed = resourceClaimed === 'true';
      }
    }
    
    // Get total count for pagination
    const total = await prisma.attendee.count({
      where: whereClause
    });
    
    // Get attendees with pagination and filters
    const attendees = await prisma.attendee.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        uniqueId: true,
        isCheckedIn: true,
        checkedInAt: true,
        lunchClaimed: true,
        lunchClaimedAt: true,
        kitClaimed: true,
        kitClaimedAt: true,
        safetyConfirmed: true,
        currentZone: true,
        createdAt: true
      }
    });
    
    // Return paginated results
    return NextResponse.json({
      success: true,
      data: {
        attendees,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    console.error('List attendees error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 