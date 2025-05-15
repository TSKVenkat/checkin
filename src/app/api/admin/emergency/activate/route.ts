import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorize } from '@/lib/auth/authorize';
import { getUserFromRequest } from '@/lib/auth/auth';
import { broadcastEmergencyActivation, sendSystemNotification } from '@/app/api/websocket';
import { sendEmergencyAlert } from '@/lib/email/mailer';

// Allowed roles for emergency management
const ALLOWED_ROLES = ['admin', 'manager'];

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
      type, 
      zones, 
      message,
      sendEmail = true,
      eventId  // Optional - will use the most recent active event if not provided
    } = body;

    // Validate required fields
    if (!type) {
      return NextResponse.json(
        { success: false, message: 'Emergency type is required' },
        { status: 400 }
      );
    }

    if (!zones || !Array.isArray(zones) || zones.length === 0) {
      return NextResponse.json(
        { success: false, message: 'At least one affected zone must be specified' },
        { status: 400 }
      );
    }

    // Find the event to update
    let event;
    if (eventId) {
      event = await prisma.event.findUnique({
        where: { id: eventId }
      });
      
      if (!event) {
        return NextResponse.json(
          { success: false, message: 'Event not found' },
          { status: 404 }
        );
      }
    } else {
      // Get the most recent active event
      const activeEvents = await prisma.event.findMany({
        where: {
          status: 'active',
          startDate: { lte: new Date() },
          endDate: { gte: new Date() }
        },
        orderBy: { startDate: 'desc' },
        take: 1
      });
      
      if (!activeEvents || activeEvents.length === 0) {
        return NextResponse.json(
          { success: false, message: 'No active events found' },
          { status: 404 }
        );
      }
      
      event = activeEvents[0];
    }

    // Update the event with emergency status
    const updatedEvent = await prisma.event.update({
      where: { id: event.id },
      data: {
        isEmergencyActive: true,
        emergencyType: type,
        emergencyAffectedZones: zones,
        emergencyActivatedAt: new Date(),
        emergencyActivatedById: user.id,
        emergencyLastUpdated: new Date(),
        emergencyInstructions: message || `Emergency situation in ${zones.join(', ')}. Please follow staff instructions.`
      },
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

    // Prepare the emergency notification data
    const emergencyData = {
      id: updatedEvent.id,
      type: updatedEvent.emergencyType,
      activatedAt: updatedEvent.emergencyActivatedAt,
      activatedBy: updatedEvent.emergencyActivatedBy,
      affectedZones: updatedEvent.emergencyAffectedZones,
      message: updatedEvent.emergencyInstructions,
      eventName: updatedEvent.name
    };

    // Broadcast the emergency activation via WebSocket for real-time updates
    try {
      broadcastEmergencyActivation(emergencyData);
    } catch (wsError) {
      console.error('Failed to broadcast emergency activation via websocket:', wsError);
      // Continue with activation even if broadcast fails
    }

    // Send system notification to staff
    try {
      sendSystemNotification(['admin', 'manager', 'staff'], {
        type: 'emergency',
        priority: 'high',
        title: `EMERGENCY: ${type}`,
        message: `Emergency activated for zones: ${zones.join(', ')}`,
        timestamp: new Date()
      });
    } catch (notifyError) {
      console.error('Failed to send staff notifications:', notifyError);
    }

    // Send email alerts if requested
    if (sendEmail) {
      try {
        // Get all checked-in attendees for notification
        const attendees = await prisma.attendee.findMany({
          where: {
            eventId: event.id,
            isCheckedIn: true
          },
          select: {
            id: true,
            email: true,
            name: true
          }
        });

        if (attendees.length > 0) {
          const emails = attendees.map(a => a.email);
          // Send batch emails
          await sendEmergencyAlert(
            emails,
            `Emergency Alert: ${type}`,
            message || updatedEvent.emergencyInstructions || `Emergency situation in ${zones.join(', ')}. Please follow staff instructions.`,
            type,
            zones
          );
          
          // Log the email notifications
          await prisma.activityLog.create({
            data: {
              type: 'emergency',
              action: 'notification',
              description: `Emergency alerts sent to ${attendees.length} attendees`,
              entityType: 'Event',
              entityId: event.id,
              staffId: user.id,
              metadata: { 
                type,
                zones,
                emailsSent: attendees.length
              }
            }
          });
        }
      } catch (emailError) {
        console.error('Error sending emergency email alerts:', emailError);
        // Continue with activation even if email sending fails
      }
    }

    // Log the emergency activation
    await prisma.activityLog.create({
      data: {
        type: 'emergency',
        action: 'activated',
        description: `Emergency activated: ${type} affecting ${zones.join(', ')}`,
        entityType: 'Event',
        entityId: event.id,
        staffId: user.id,
        metadata: { 
          type,
          zones,
          message: updatedEvent.emergencyInstructions
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Emergency activated successfully',
      event: {
        id: updatedEvent.id,
        name: updatedEvent.name,
        emergencyType: updatedEvent.emergencyType,
        emergencyAffectedZones: updatedEvent.emergencyAffectedZones,
        emergencyActivatedAt: updatedEvent.emergencyActivatedAt,
        activatedBy: updatedEvent.emergencyActivatedBy
      }
    });
  } catch (error) {
    console.error('Emergency activation error:', error);
    return NextResponse.json(
      { success: false, message: `Server error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 