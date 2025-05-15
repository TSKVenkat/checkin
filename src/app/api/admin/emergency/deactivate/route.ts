import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorize } from '@/lib/auth/authorize';
import { getUserFromRequest } from '@/lib/auth/auth';
import { broadcastEmergencyDeactivation, sendSystemNotification } from '@/app/api/websocket';

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
    const { eventId, allClear, message } = body;

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
      // Get the most recent event with an active emergency
      const activeEvents = await prisma.event.findMany({
        where: {
          isEmergencyActive: true
        },
        orderBy: { emergencyActivatedAt: 'desc' },
        take: 1
      });
      
      if (!activeEvents || activeEvents.length === 0) {
        return NextResponse.json(
          { success: false, message: 'No active emergency found' },
          { status: 404 }
        );
      }
      
      event = activeEvents[0];
    }

    // Store previous emergency details for reference
    const previousEmergencyType = event.emergencyType;
    const previousZones = event.emergencyAffectedZones;

    // Update the event to deactivate emergency
    const updatedEvent = await prisma.event.update({
      where: { id: event.id },
      data: {
        isEmergencyActive: false,
        emergencyType: null,
        emergencyAffectedZones: [],
        emergencyLastUpdated: new Date(),
        emergencyInstructions: allClear 
          ? message || "All clear. The emergency situation has been resolved." 
          : event.emergencyInstructions
      }
    });

    // Prepare the deactivation notification data
    const deactivationData = {
      id: updatedEvent.id,
      previousType: previousEmergencyType,
      previousZones: previousZones,
      deactivatedAt: new Date(),
      deactivatedById: user.id,
      message: message || "All clear. The emergency situation has been resolved.",
      eventName: updatedEvent.name,
      allClear: allClear || true
    };

    // Broadcast the emergency deactivation via WebSocket for real-time updates
    try {
      broadcastEmergencyDeactivation(deactivationData);
    } catch (wsError) {
      console.error('Failed to broadcast emergency deactivation via websocket:', wsError);
      // Continue with deactivation even if broadcast fails
    }

    // Send system notification to staff
    try {
      sendSystemNotification(['admin', 'manager', 'staff'], {
        type: 'emergency-deactivated',
        priority: 'medium',
        title: `EMERGENCY DEACTIVATED: ${previousEmergencyType}`,
        message: `Emergency has been deactivated for: ${previousZones.join(', ')}`,
        timestamp: new Date(),
        allClear: allClear || true
      });
    } catch (notifyError) {
      console.error('Failed to send staff notifications:', notifyError);
    }

    // Log the emergency deactivation
    await prisma.activityLog.create({
      data: {
        type: 'emergency',
        action: 'deactivated',
        description: `Emergency deactivated: ${previousEmergencyType} from ${previousZones.join(', ')}`,
        entityType: 'Event',
        entityId: event.id,
        staffId: user.id,
        metadata: { 
          previousType: previousEmergencyType,
          previousZones: previousZones,
          message: message || "All clear. The emergency situation has been resolved."
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Emergency deactivated successfully',
      event: {
        id: updatedEvent.id,
        name: updatedEvent.name,
        wasEmergencyType: previousEmergencyType,
        wasEmergencyZones: previousZones,
        isEmergencyActive: updatedEvent.isEmergencyActive,
        allClear: allClear || true
      }
    });
  } catch (error) {
    console.error('Emergency deactivation error:', error);
    return NextResponse.json(
      { success: false, message: `Server error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 