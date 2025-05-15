import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorize } from '@/lib/auth/authorize';

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  // Authorize the request
  const authResult = await authorize(['admin', 'manager', 'staff'])(req);
  
  if (!authResult.authorized) {
    return NextResponse.json(
      { error: authResult.message || 'Unauthorized' },
      { status: 403 }
    );
  }
  
  try {
    // Properly extract the id from context.params
    const id = context.params.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Attendee ID is required' },
        { status: 400 }
      );
    }
    
    // Find attendee by ID or uniqueId
    const attendee = await prisma.attendee.findFirst({
      where: {
        OR: [
          { id },
          { uniqueId: id },
          { email: id } // Allow lookup by email as well
        ]
      },
      include: {
        checkedInBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        lunchClaimedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        kitClaimedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        dailyRecords: {
          orderBy: {
            date: 'desc'
          }
        }
      }
    });
    
    if (!attendee) {
      return NextResponse.json(
        { error: 'Attendee not found' },
        { status: 404 }
      );
    }
    
    // Return attendee details, but exclude sensitive information
    const sanitizedAttendee = {
      id: attendee.id,
      name: attendee.name,
      email: attendee.email,
      phone: attendee.phone,
      role: attendee.role,
      uniqueId: attendee.uniqueId,
      qrCodeUrl: attendee.qrCodeUrl,
      
      checkIn: {
        isCheckedIn: attendee.isCheckedIn,
        checkedInAt: attendee.checkedInAt,
        checkedInBy: attendee.checkedInBy,
        checkedInLocation: attendee.checkedInLocation
      },
      
      resources: {
        lunch: {
          claimed: attendee.lunchClaimed,
          claimedAt: attendee.lunchClaimedAt,
          claimedBy: attendee.lunchClaimedBy,
          claimedLocation: attendee.lunchClaimedLocation
        },
        kit: {
          claimed: attendee.kitClaimed,
          claimedAt: attendee.kitClaimedAt,
          claimedBy: attendee.kitClaimedBy,
          claimedLocation: attendee.kitClaimedLocation
        }
      },
      
      emergencyStatus: {
        lastKnownCheckIn: attendee.lastKnownCheckIn,
        safetyConfirmed: attendee.safetyConfirmed,
        safetyConfirmedAt: attendee.safetyConfirmedAt,
        currentZone: attendee.currentZone
      },
      
      dailyRecords: attendee.dailyRecords,
      
      metadata: {
        createdAt: attendee.createdAt,
        updatedAt: attendee.updatedAt,
        version: attendee.version
      }
    };
    
    return NextResponse.json(sanitizedAttendee);
    
  } catch (error) {
    console.error('Get attendee error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// Allow updating attendee information
export async function PATCH(
  req: NextRequest,
  context: { params: { id: string } }
) {
  // Authorize the request (admin only)
  const authResult = await authorize(['admin', 'manager'])(req);
  
  if (!authResult.authorized) {
    return NextResponse.json(
      { error: authResult.message || 'Unauthorized' },
      { status: 403 }
    );
  }
  
  try {
    // Properly extract the id from context.params
    const id = context.params.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Attendee ID is required' },
        { status: 400 }
      );
    }
    
    const data = await req.json();
    
    // Remove protected fields that shouldn't be directly updated
    delete data.uniqueId;
    delete data.qrCodeUrl;
    delete data.createdAt;
    delete data.updatedAt;
    delete data.version;
    
    // Check if attendee exists
    const attendee = await prisma.attendee.findUnique({
      where: { id }
    });
    
    if (!attendee) {
      return NextResponse.json(
        { error: 'Attendee not found' },
        { status: 404 }
      );
    }
    
    // Update attendee
    const updatedAttendee = await prisma.attendee.update({
      where: { id },
      data: {
        ...data,
        version: attendee.version + 1 // Increment version for optimistic concurrency control
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Attendee updated successfully',
      attendee: {
        id: updatedAttendee.id,
        name: updatedAttendee.name,
        email: updatedAttendee.email,
        version: updatedAttendee.version
      }
    });
    
  } catch (error) {
    console.error('Update attendee error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
} 