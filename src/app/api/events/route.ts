import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorize } from '@/lib/auth/authorize';

export async function GET(req: NextRequest) {
  try {
    // Authorize the request
    const authResult = await authorize(['admin', 'manager', 'staff', 'attendee', 'speaker'])(req);
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, message: authResult.message || 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get query parameters
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);
    const status = url.searchParams.get('status');
    
    // Build where clause
    const where: any = {};
    if (status) {
      where.status = status;
    }
    
    // Query events
    const events = await prisma.event.findMany({
      where,
      orderBy: {
        startDate: 'desc'
      },
      take: limit,
      include: {
        locations: true,
        _count: {
          select: {
            attendees: true
          }
        }
      }
    });
    
    // Format the response
    const formattedEvents = events.map(event => ({
      id: event.id,
      name: event.name,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      venue: event.venue,
      status: event.status,
      locations: event.locations,
      attendeeCount: event._count.attendees
    }));
    
    return NextResponse.json({
      success: true,
      events: formattedEvents
    });
    
  } catch (error) {
    console.error('Error fetching events:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch events',
        error: (error as Error).message
      },
      { status: 500 }
    );
  }
} 