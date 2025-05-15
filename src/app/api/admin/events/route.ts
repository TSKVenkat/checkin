import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth/auth-utils';

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
    if (!['admin', 'manager'].includes(authResult.user.role)) {
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
    const events = await prisma.event.findMany({
      where,
      ...(simple 
        ? { select: { id: true, name: true, status: true } }
        : { 
            include: {
              _count: {
                select: { attendees: true }
              }
            } 
          }
      ),
      orderBy: {
        startDate: 'desc'
      }
    });
    
    // Return simplified format if requested
    if (simple) {
      return NextResponse.json({
        success: true,
        data: events,
        total: events.length
      });
    }
    
    // Transform the data to match the expected format
    const formattedEvents = events.map(event => ({
      id: event.id,
      name: event.name,
      startDate: event.startDate.toISOString(),
      endDate: event.endDate.toISOString(),
      location: event.venue || 'Not specified',
      status: event.status,
      attendeeCount: event._count.attendees,
      description: event.description || ''
    }));
    
    return NextResponse.json({
      success: true,
      data: formattedEvents,
      total: formattedEvents.length
    });
    
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events data' },
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
    
    // Check if user has admin role
    if (authResult.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    // Parse the request body
    const eventData = await req.json();
    
    // Basic validation
    if (!eventData.name || !eventData.startDate || !eventData.endDate) {
      return NextResponse.json(
        { error: 'Missing required fields: name, startDate, endDate' },
        { status: 400 }
      );
    }
    
    // Create event in database
    const newEvent = await prisma.event.create({
      data: {
        name: eventData.name,
        description: eventData.description,
        startDate: new Date(eventData.startDate),
        endDate: new Date(eventData.endDate),
        venue: eventData.location || eventData.venue,
        status: eventData.status || 'draft',
        timezone: eventData.timezone || 'UTC',
        organizer: eventData.organizer,
        maxAttendees: eventData.maxAttendees ? parseInt(eventData.maxAttendees) : null,
        isPublic: eventData.isPublic === true,
        registrationUrl: eventData.registrationUrl,
        bannerImageUrl: eventData.bannerImageUrl,
        logoUrl: eventData.logoUrl,
        website: eventData.website
      }
    });
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        type: 'admin',
        action: 'created',
        description: `Created new event: ${newEvent.name}`,
        entityType: 'Event',
        entityId: newEvent.id,
        staffId: authResult.user.id,
        metadata: { eventData: newEvent }
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Event created successfully',
      data: newEvent
    });
    
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
} 