import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorize } from '@/lib/auth/authorize';
import { getUserFromRequest } from '@/lib/auth/auth';
import { sendEmergencyAlert } from '@/lib/email/mailer';
import { broadcastEmergencyActivation, broadcastEmergencyDeactivation } from '../../websocket';

// Allowed roles for emergency management
const ALLOWED_ROLES = ['admin', 'manager'];
// Required permissions for activation/deactivation
const REQUIRED_PERMISSIONS = ['emergency:activate'];

export async function POST(req: NextRequest) {
  try {
    // Authorize the request with high permissions
    const authResult = await authorize(ALLOWED_ROLES)(req);
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, message: authResult.message || 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get user info from request
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User identification failed' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { 
      eventId, 
      isActive, 
      emergencyType, 
      affectedZones, 
      alertMessage,
      sendAlert 
    } = body;

    // Validate required fields for activation
    if (isActive === true) {
      if (!emergencyType) {
        return NextResponse.json(
          { success: false, message: 'Emergency type is required for activation' },
          { status: 400 }
        );
      }
    }

    // Find the event
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      return NextResponse.json(
        { success: false, message: 'Event not found' },
        { status: 404 }
      );
    }

    // Update emergency status
    const updateData: any = {
      isEmergencyActive: isActive,
      emergencyLastUpdated: new Date()
    };

    // Add activation data if activating
    if (isActive) {
      updateData.emergencyType = emergencyType;
      updateData.emergencyAffectedZones = affectedZones || ['All areas'];
      updateData.emergencyActivatedAt = new Date();
      updateData.emergencyActivatedById = user.id;
      updateData.emergencyInstructions = alertMessage || 'Please follow emergency protocols';
    } else {
      // If deactivating, keep the previous values for record
      updateData.previousEmergencyType = event.emergencyType;
      updateData.previousEmergencyAffectedZones = event.emergencyAffectedZones;
      // Clear active emergency data
      updateData.emergencyType = null;
      updateData.emergencyAffectedZones = [];
      updateData.emergencyInstructions = null;
    }

    // Apply the update
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: updateData,
      include: {
        emergencyActivatedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Broadcast to all connected WebSocket clients
    if (isActive) {
      // Prepare emergency data for broadcasting
      const emergencyData = {
        id: updatedEvent.id,
        type: emergencyType,
        activatedAt: updateData.emergencyActivatedAt.toISOString(),
        affectedZones: affectedZones || ['All areas'],
        message: alertMessage || 'Please follow emergency protocols',
        eventName: updatedEvent.name,
        activatedBy: updatedEvent.emergencyActivatedBy?.name || user.email
      };
      
      // Broadcast emergency activation to all clients
      console.log('Broadcasting emergency activation:', emergencyData);
      broadcastEmergencyActivation(emergencyData);
    } else {
      // Broadcast emergency deactivation
      console.log('Broadcasting emergency deactivation');
      broadcastEmergencyDeactivation({
        id: updatedEvent.id,
        previousType: event.emergencyType,
        previousZones: event.emergencyAffectedZones,
        message: alertMessage || 'Emergency has been resolved. All clear.',
        eventName: updatedEvent.name,
        deactivatedBy: user.email
      });
    }

    // Send email alerts if requested and emergency is active
    if (isActive && sendAlert && alertMessage) {
      try {
        // Get all checked-in attendees for notification
        const attendees = await prisma.attendee.findMany({
          where: {
            isCheckedIn: true
          },
          select: {
            email: true,
            name: true
          }
        });

        // Send email alert to all attendees
        if (attendees.length > 0) {
          const emails = attendees.map(a => a.email);
          await sendEmergencyAlert(
            emails,
            `Emergency Alert: ${emergencyType}`,
            alertMessage,
            emergencyType,
            updateData.emergencyAffectedZones
          );
        }
      } catch (alertError) {
        console.error('Error sending emergency alerts:', alertError);
        // Continue with activation even if alert sending fails
      }
    }

    // Extract and use any available activatedBy data
    const activatedByData = (updatedEvent as any).emergencyActivatedBy || null;

    return NextResponse.json({
      success: true,
      message: isActive 
        ? 'Emergency mode activated successfully' 
        : 'Emergency mode deactivated successfully',
      event: {
        id: updatedEvent.id,
        name: updatedEvent.name,
        isEmergencyActive: updatedEvent.isEmergencyActive,
        emergencyType: updatedEvent.emergencyType,
        emergencyAffectedZones: updatedEvent.emergencyAffectedZones,
        emergencyActivatedAt: updatedEvent.emergencyActivatedAt,
        emergencyLastUpdated: updatedEvent.emergencyLastUpdated,
        activatedBy: activatedByData
      }
    });
  } catch (error) {
    console.error('Emergency system error:', error);
    return NextResponse.json(
      { success: false, message: `Server error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

// GET endpoint to check current emergency status
export async function GET(req: NextRequest) {
  try {
    // Allow any authenticated user to check emergency status
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get event ID from URL or get the active event
    const url = new URL(req.url);
    const eventId = url.searchParams.get('eventId');

    let query: any = {};
    if (eventId) {
      query.where = { id: eventId };
    } else {
      // Get the currently active event or the most recent one
      query.orderBy = { startDate: 'desc' };
      query.take = 1;
    }

    // Include related data
    query.include = {
      emergencyActivatedBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    };

    // Get event(s)
    const events = eventId 
      ? [await prisma.event.findUnique(query)]
      : await prisma.event.findMany(query);

    if (!events || events.length === 0 || !events[0]) {
      return NextResponse.json(
        { success: false, message: 'No events found' },
        { status: 404 }
      );
    }

    const event = events[0];
    // Extract and use any available activatedBy data
    const activatedByData = (event as any).emergencyActivatedBy || null;

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        name: event.name,
        isEmergencyActive: event.isEmergencyActive,
        emergencyType: event.emergencyType,
        emergencyAffectedZones: event.emergencyAffectedZones,
        emergencyActivatedAt: event.emergencyActivatedAt,
        emergencyLastUpdated: event.emergencyLastUpdated,
        activatedBy: activatedByData
      }
    });
  } catch (error) {
    console.error('Emergency status check error:', error);
    return NextResponse.json(
      { success: false, message: `Server error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 