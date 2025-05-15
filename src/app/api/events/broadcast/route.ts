import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorize } from '@/lib/auth/authorize';

export async function POST(req: NextRequest) {
  // Only admin and authorized staff can send broadcasts
  const authResult = await authorize(['admin', 'manager'])(req);
  
  if (!authResult.authorized) {
    return NextResponse.json(
      { success: false, message: authResult.message || 'Unauthorized' },
      { status: 403 }
    );
  }
  
  try {
    // Parse request body
    const body = await req.json();
    const { message, recipients, priority, zones, eventId } = body;
    
    if (!message) {
      return NextResponse.json(
        { success: false, message: 'Message content is required' },
        { status: 400 }
      );
    }
    
    // Get the staff user from auth
    const userId = authResult.user?.id;
    
    // Determine if this is an emergency broadcast
    const isEmergency = priority === 'emergency';
    
    // Get all attendees or filter by zones
    let attendeeFilter: any = {};
    
    if (zones && zones.length > 0) {
      attendeeFilter.currentZone = { in: zones };
    }
    
    const attendees = await prisma.attendee.findMany({
      where: attendeeFilter,
      select: {
        id: true,
        name: true,
        email: true,
        currentZone: true
      }
    });
    
    if (attendees.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No attendees found matching the criteria' },
        { status: 404 }
      );
    }
    
    // In a real application, we would send the messages to attendees
    // via push notifications, email, SMS, etc.
    // For this demo, we'll just log the message
    
    console.log(`Broadcasting message to ${attendees.length} attendees:`);
    console.log(`Message: ${message}`);
    console.log(`Priority: ${priority || 'normal'}`);
    
    // Record the broadcast in the database
    // This would be in a Broadcast model in a real application
    // For now, we'll just return success
    
    return NextResponse.json({
      success: true,
      message: 'Broadcast sent successfully',
      recipients: attendees.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Broadcast error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 