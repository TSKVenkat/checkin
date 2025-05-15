import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth-utils';

// Mock events data (in a real app, this would come from a database)
const mockEvents = [
  {
    id: 'evt_1',
    name: 'Annual Tech Conference',
    startDate: '2025-06-15T09:00:00Z',
    endDate: '2025-06-17T18:00:00Z',
    location: 'Convention Center, Downtown',
    status: 'active',
    attendeeCount: 320,
    description: 'Our flagship technology conference featuring keynotes, workshops, and networking opportunities.'
  },
  {
    id: 'evt_2',
    name: 'Developer Workshop Series',
    startDate: '2025-07-10T10:00:00Z',
    endDate: '2025-07-12T16:00:00Z',
    location: 'Innovation Hub',
    status: 'upcoming',
    attendeeCount: 150,
    description: 'Hands-on workshops focused on the latest programming languages and frameworks.'
  },
  {
    id: 'evt_3',
    name: 'Product Launch Event',
    startDate: '2025-05-20T18:00:00Z',
    endDate: '2025-05-20T21:00:00Z',
    location: 'Grand Hotel Ballroom',
    status: 'completed',
    attendeeCount: 200,
    description: 'Exclusive product launch with demonstrations and networking reception.'
  },
  {
    id: 'evt_4',
    name: 'Startup Pitch Competition',
    startDate: '2025-08-05T13:00:00Z',
    endDate: '2025-08-05T18:00:00Z',
    location: 'Venture Capital Building',
    status: 'upcoming',
    attendeeCount: 120,
    description: 'Pitch competition for early-stage startups with prizes and investor networking.'
  }
];

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
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
    
    // Find the event by ID
    const event = mockEvents.find(event => event.id === id);
    
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: event
    });
    
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event data' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
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
    
    // Find the event by ID
    const eventIndex = mockEvents.findIndex(event => event.id === id);
    
    if (eventIndex === -1) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }
    
    // Parse the request body
    const updatedEventData = await req.json();
    
    // In a real app, we would update the event in the database
    // For now, just return a success message
    
    return NextResponse.json({
      success: true,
      message: 'Event updated successfully',
      data: {
        ...mockEvents[eventIndex],
        ...updatedEventData,
        id: mockEvents[eventIndex].id, // Ensure the ID doesn't change
        updatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
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
    
    // Find the event by ID
    const eventIndex = mockEvents.findIndex(event => event.id === id);
    
    if (eventIndex === -1) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }
    
    // In a real app, we would delete the event from the database
    // For now, just return a success message
    
    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully',
      data: { id }
    });
    
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
} 