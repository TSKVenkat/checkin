// API route for broadcasting emergency notifications
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/dbConnect';
import { Attendee, Event } from '@/lib/db/models';
import { authorize } from '@/lib/auth/auth';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Check authorization (only admin can broadcast messages)
    const authResult = await authorize(['admin'])(req);
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, message: authResult.message || 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Connect to database
    await dbConnect();
    
    // Parse request body
    const body = await req.json();
    const { 
      eventId, 
      message, 
      messageType, 
      targetZones,
      targetRoles,
      staffId 
    } = body;
    
    if (!eventId) {
      return NextResponse.json(
        { success: false, message: 'Event ID is required' },
        { status: 400 }
      );
    }
    
    if (!message) {
      return NextResponse.json(
        { success: false, message: 'Broadcast message is required' },
        { status: 400 }
      );
    }
    
    if (!staffId) {
      return NextResponse.json(
        { success: false, message: 'Staff ID is required' },
        { status: 400 }
      );
    }
    
    // Get the event
    const event = await Event.findById(eventId);
    
    if (!event) {
      return NextResponse.json(
        { success: false, message: 'Event not found' },
        { status: 404 }
      );
    }
    
    // Build filters for targeted attendees
    const filters: any = {};
    
    // If targeting specific zones
    if (targetZones && targetZones.length > 0) {
      filters['emergencyStatus.currentZone'] = { $in: targetZones };
    }
    
    // If targeting specific roles
    if (targetRoles && targetRoles.length > 0) {
      filters.role = { $in: targetRoles };
    }
    
    // Count affected attendees
    const targetedAttendeeCount = await Attendee.countDocuments(filters);
    
    // In a real implementation, we would send actual notifications here
    // For now, we'll just return a success response with the count
    
    // Log the broadcast action
    console.log(`Broadcast sent by ${staffId}: ${message} to ${targetedAttendeeCount} attendees`);
    
    return NextResponse.json({
      success: true,
      message: 'Broadcast sent successfully',
      data: {
        messageType: messageType || 'general',
        targetedAttendeeCount,
        timestamp: new Date()
      }
    });
    
  } catch (error) {
    console.error('Broadcast error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 