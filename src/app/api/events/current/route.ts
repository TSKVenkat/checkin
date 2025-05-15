import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorize } from '@/lib/auth/authorize';

// Access control - all authenticated users can access
const ALLOWED_ROLES = ['admin', 'manager', 'staff', 'attendee', 'speaker'];

export async function GET(req: NextRequest) {
  try {
    // Authorize the request
    const { authorized, message } = await authorize(ALLOWED_ROLES)(req);
    
    if (!authorized) {
      return NextResponse.json(
        { success: false, message: message || 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get the current active event
    const currentEvent = await prisma.event.findFirst({
      where: {
        status: 'published',
        startDate: {
          lte: new Date()
        },
        endDate: {
          gte: new Date()
        }
      },
      include: {
        locations: true
      },
      orderBy: {
        startDate: 'desc'
      }
    });

    // If no current event, get the next upcoming event
    if (!currentEvent) {
      const upcomingEvent = await prisma.event.findFirst({
        where: {
          status: 'published',
          startDate: {
            gt: new Date()
          }
        },
        include: {
          locations: true
        },
        orderBy: {
          startDate: 'asc'
        }
      });

      if (upcomingEvent) {
        return NextResponse.json({
          success: true,
          event: upcomingEvent,
          status: 'upcoming'
        });
      }

      // If no events at all, return error
      return NextResponse.json(
        { success: false, message: 'No active or upcoming events found' },
        { status: 404 }
      );
    }

    // Return current event
    return NextResponse.json({
      success: true,
      event: currentEvent,
      status: 'active'
    });
  } catch (error) {
    console.error('Error fetching current event:', error);
    return NextResponse.json(
      { success: false, message: 'Error fetching current event' },
      { status: 500 }
    );
  }
} 