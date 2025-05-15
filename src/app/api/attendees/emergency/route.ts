import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth/auth';
import { broadcastEmergencyActivation } from '../../websocket';

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

    console.log('Emergency status checked by:', user.email);

    // Get the currently active event or the most recent one
    const activeEvent = await prisma.event.findFirst({
      where: {
        isEmergencyActive: true
      },
      orderBy: { startDate: 'desc' },
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

    if (!activeEvent || !activeEvent.isEmergencyActive) {
      return NextResponse.json({
        success: true,
        active: false,
        message: 'No active emergencies'
      });
    }

    console.log('Found active emergency:', activeEvent.name, activeEvent.emergencyType);

    // Prepare emergency data in the format expected by the EmergencyAlert component
    return NextResponse.json({
      success: true,
      active: true,
      emergency: {
        id: activeEvent.id,
        type: activeEvent.emergencyType || 'other',
        activatedAt: activeEvent.emergencyActivatedAt?.toISOString() || new Date().toISOString(),
        affectedZones: activeEvent.emergencyAffectedZones || ['All areas'],
        message: activeEvent.emergencyInstructions || 'Please follow staff instructions',
        eventName: activeEvent.name
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

// Add a POST method to manually notify attendees about emergencies (for testing)
export async function POST(req: NextRequest) {
  try {
    // Only allow admins to test emergency broadcasts
    const user = getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await req.json();
    
    // This is just a test endpoint to manually broadcast an emergency alert
    // In a real system, this would be triggered by the proper emergency activation endpoint
    broadcastEmergencyActivation({
      id: body.id || 'test-emergency',
      type: body.type || 'test',
      activatedAt: new Date().toISOString(),
      affectedZones: body.affectedZones || ['All areas'],
      message: body.message || 'This is a test emergency alert',
      eventName: body.eventName || 'Current Event'
    });

    return NextResponse.json({
      success: true,
      message: 'Emergency alert broadcasted to all connected clients'
    });
    
  } catch (error) {
    console.error('Emergency broadcast error:', error);
    return NextResponse.json(
      { success: false, message: `Server error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 