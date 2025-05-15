import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth/auth-utils';

// Define types for the event objects
interface SimpleEvent {
  id: string;
  name: string;
  status: string;
}

interface DetailedEvent {
  id: string;
  name: string;
  status: string;
  startDate: Date;
  endDate: Date;
  venue?: string;
  isEmergencyActive: boolean;
  description?: string;
  _count: {
    attendees: number;
  };
}

export async function GET(req: NextRequest) {
  try {
    // Verify authentication and authorization
    const authResult = await verifyAuth(req);
    
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }
    
    // Check if user has admin or manager role
    if (!['admin', 'manager'].includes(authResult.user?.role || '')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    // Apply filtering if query parameters exist
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');
    const searchTerm = searchParams.get('search');
    const simple = searchParams.get('simple') === 'true';
    
    // Build query filter
    const where: any = {};
    
    if (statusFilter && statusFilter !== 'all') {
      where.status = statusFilter;
    }
    
    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { venue: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }
    
    // Query database using Prisma
    if (simple) {
      const events = await prisma.event.findMany({
        where,
        select: { id: true, name: true, status: true },
        orderBy: {
          startDate: 'desc'
        }
      });
      
      return NextResponse.json({
        success: true,
        data: events,
        total: events.length
      });
    } else {
      const events = await prisma.event.findMany({
        where,
        include: {
          _count: {
            select: { attendees: true }
          }
        },
        orderBy: {
          startDate: 'desc'
        }
      });
      
      // Format response data for detailed view
      const formattedEvents = events.map(event => ({
        id: event.id,
        name: event.name,
        status: event.status,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        location: event.venue || 'Not specified',
        isEmergencyActive: event.isEmergencyActive,
        attendeeCount: event._count.attendees,
        description: event.description || ''
      }));
      
      return NextResponse.json({
        success: true,
        data: formattedEvents,
        total: events.length
      });
    }
    
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verify authentication and authorization
    const authResult = await verifyAuth(req);
    
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }
    
    // Only admin users can create events
    if (authResult.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admin users can create events' },
        { status: 403 }
      );
    }
    
    // Parse request body
    const data = await req.json();
    
    // Validate required fields
    const requiredFields = ['name', 'startDate', 'endDate', 'venue'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    // Format dates
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    
    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }
    
    if (startDate > endDate) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }
    
    // Create the event
    const newEvent = await prisma.event.create({
      data: {
        name: data.name,
        description: data.description || '',
        startDate,
        endDate,
        venue: data.venue,
        status: data.status || 'upcoming',
        maxAttendees: data.maxAttendees || 0,
        isEmergencyActive: false,
        // Store creator info in metadata or activity log instead of directly on event
        // since staffId is not in the schema
      }
    });
    
    // Log the activity
    await prisma.activityLog.create({
      data: {
        type: 'admin',
        action: 'create',
        description: `Created event: ${data.name}`,
        entityType: 'Event',
        entityId: newEvent.id,
        staffId: authResult.user?.id || '',
        metadata: { eventData: data }
      }
    });
    
    return NextResponse.json({
      success: true,
      data: newEvent
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Failed to create event', details: (error as Error).message },
      { status: 500 }
    );
  }
} 