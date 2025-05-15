import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth/auth-utils';

export async function GET(req: NextRequest) {
  try {
    // Authorize the request
    const authResult = await verifyAuth(req);
    
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.message || 'Unauthorized' },
        { status: authResult.status || 401 }
      );
    }

    // Check if user has an allowed role (admin, manager, or staff)
    if (!['admin', 'manager', 'staff'].includes(authResult.user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');
    const role = searchParams.get('role');
    const isCheckedIn = searchParams.has('isCheckedIn') ? searchParams.get('isCheckedIn') === 'true' : undefined;
    const searchTerm = searchParams.get('search');

    // Build query conditions
    const where: any = {};
    
    if (eventId) {
      where.eventId = eventId;
    }
    
    if (role) {
      where.role = role;
    }
    
    if (isCheckedIn !== undefined) {
      where.isCheckedIn = isCheckedIn;
    }
    
    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { uniqueId: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }

    // Fetch attendees from database
    const attendees = await prisma.attendee.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        uniqueId: true,
        phone: true,
        isCheckedIn: true,
        checkedInAt: true,
        lunchClaimed: true,
        kitClaimed: true,
        eventId: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform attendees to expected format
    const formattedAttendees = attendees.map(attendee => ({
      id: attendee.id,
      name: attendee.name,
      email: attendee.email,
      role: attendee.role,
      uniqueId: attendee.uniqueId,
      phone: attendee.phone,
      isCheckedIn: attendee.isCheckedIn,
      checkedInAt: attendee.checkedInAt,
      eventId: attendee.eventId,
      resourceClaims: {
        lunch: {
          claimed: attendee.lunchClaimed,
          claimedAt: null // Updated when we have the actual data
        },
        kit: {
          claimed: attendee.kitClaimed,
          claimedAt: null // Updated when we have the actual data
        }
      },
      createdAt: attendee.createdAt,
      updatedAt: attendee.updatedAt
    }));

    return NextResponse.json({
      success: true,
      data: formattedAttendees,
      total: formattedAttendees.length
    });
    
  } catch (error) {
    console.error('Error fetching attendees:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch attendees data' },
      { status: 500 }
    );
  }
} 