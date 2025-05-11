// API route for managing emergency mode
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorize } from '@/lib/auth/auth';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Check authorization (only admin can activate/deactivate emergency mode)
    const authResult = await authorize(['admin'])(req);
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, message: authResult.message || 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await req.json();
    const { 
      eventId, 
      isActive, 
      type, 
      affectedZones,
      staffId 
    } = body;
    
    if (!eventId) {
      return NextResponse.json(
        { success: false, message: 'Event ID is required' },
        { status: 400 }
      );
    }
    
    if (isActive === undefined) {
      return NextResponse.json(
        { success: false, message: 'isActive status is required' },
        { status: 400 }
      );
    }
    
    if (isActive && !staffId) {
      return NextResponse.json(
        { success: false, message: 'Staff ID is required to activate emergency mode' },
        { status: 400 }
      );
    }
    
    // Get the event
    const event = await prisma.event.findUnique({ 
      where: { id: eventId } 
    });
    
    if (!event) {
      return NextResponse.json(
        { success: false, message: 'Event not found' },
        { status: 404 }
      );
    }
    
    // Define the update data
    const updateData: any = {
      isEmergencyActive: isActive,
      emergencyLastUpdated: new Date()
    };
    
    if (isActive) {
      // Set emergency details when activating
      updateData.emergencyType = type || 'unspecified';
      updateData.emergencyAffectedZones = affectedZones || [];
      updateData.emergencyActivatedAt = new Date();
      updateData.emergencyActivatedById = staffId;
    }
    
    // Update the event
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: updateData
    });
    
    // Prepare response data
    const emergencyStatus = {
      isActive: updatedEvent.isEmergencyActive,
      type: updatedEvent.emergencyType,
      affectedZones: updatedEvent.emergencyAffectedZones,
      activatedAt: updatedEvent.emergencyActivatedAt,
      activatedBy: updatedEvent.emergencyActivatedById,
      lastUpdated: updatedEvent.emergencyLastUpdated
    };
    
    return NextResponse.json({
      success: true,
      message: isActive ? 'Emergency mode activated' : 'Emergency mode deactivated',
      data: emergencyStatus
    });
    
  } catch (error) {
    console.error('Emergency mode error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 