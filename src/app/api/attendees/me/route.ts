import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth/auth';

export async function GET(req: NextRequest) {
  try {
    // Get user from request
    const user = getUserFromRequest(req);
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Only attendees can access this endpoint
    if (user.role !== 'attendee') {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Fetch attendee data
    const attendee = await prisma.attendee.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        uniqueId: true,
        qrCodeUrl: true,
        isCheckedIn: true,
        checkedInAt: true,
        checkedInLocation: true,
        lunchClaimed: true,
        lunchClaimedAt: true,
        kitClaimed: true,
        kitClaimedAt: true,
      },
    });
    
    if (!attendee) {
      return NextResponse.json(
        { success: false, message: 'Attendee not found' },
        { status: 404 }
      );
    }
    
    // Fetch events associated with this attendee
    // This is a simplified approach - in a real application, you'd have a proper
    // relationship between attendees and events in your database schema
    const events = await prisma.event.findMany({
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        locations: {
          select: {
            name: true,
            type: true,
          },
        },
      },
      // In a real implementation, you would filter events that this attendee is registered for
      // For now, just fetch all events as a demonstration
      take: 3, // Limit to a few events for demonstration
    });
    
    return NextResponse.json({
      success: true,
      attendee: {
        ...attendee,
        events, // Add events to the attendee object
      },
    });
  } catch (error) {
    console.error('Error fetching attendee data:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve attendee information' },
      { status: 500 }
    );
  }
} 