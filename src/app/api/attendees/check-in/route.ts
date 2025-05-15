// API route for attendee check-in
import { NextRequest, NextResponse } from 'next/server';
import { verifyQRCode } from '@/lib/qr/generator';
import prisma from '@/lib/prisma';
import { authorize } from '@/lib/auth/authorize';
import { getUserFromRequest } from '@/lib/auth/auth';
import { broadcastAttendeeCheckedIn } from '@/app/api/websocket';

// Allowed roles for check-in
const ALLOWED_ROLES = ['admin', 'manager', 'staff'];

export async function POST(req: NextRequest) {
  try {
    // Authorize the request
    const authResult = await authorize(ALLOWED_ROLES)(req);
  
    if (!authResult.success || !authResult.authorized) {
      return NextResponse.json(
        { success: false, message: authResult.message || 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Use the user from auth result
    const user = authResult.user;
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User identification failed' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    // Extract fields from the body - handle both formats (from QR scan and manual entry)
    const { attendeeId, id, staffId, location, day, eventId } = body;
    
    // Ensure at least one identifier is provided
    if (!attendeeId && !id) {
      return NextResponse.json(
        { success: false, message: 'Attendee ID is required' },
        { status: 400 }
      );
    }
    
    // Use the provided ID from either source
    const targetId = attendeeId || id;
    
    // Try to parse as JSON if it's a QR code data
    let parsedId = targetId;
    if (typeof targetId === 'string' && targetId.startsWith('{') && targetId.endsWith('}')) {
      try {
        const parsed = JSON.parse(targetId);
        parsedId = parsed.id || parsed.attendeeId || targetId;
      } catch (e) {
        console.error('Failed to parse QR data:', e);
        // Continue with original id
      }
    }
    
    // Find the attendee
    const attendee = await prisma.attendee.findFirst({
      where: {
        OR: [
          { id: parsedId },
          { uniqueId: parsedId },
          { email: parsedId }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        isCheckedIn: true,
        checkedInAt: true,
        eventId: true,
      }
    });
    
    if (!attendee) {
      return NextResponse.json(
        { success: false, message: 'Attendee not found' },
        { status: 404 }
      );
    }
    
    // Additional verification for QR code if needed
    // We can extend this in the future for more secure QR codes
    
    // Check if attendee is already checked in
    if (attendee.isCheckedIn) {
      return NextResponse.json({
        success: false,
        message: 'Attendee already checked in',
        attendee: {
          id: attendee.id,
          name: attendee.name,
          email: attendee.email,
          checkedInAt: attendee.checkedInAt,
        },
        checkInStatus: 'duplicate'
      });
    }

    // Start a transaction to ensure data consistency
    const updatedData = await prisma.$transaction(async (tx) => {
      // Check in the attendee
      const updatedAttendee = await tx.attendee.update({
        where: { id: attendee.id },
        data: {
          isCheckedIn: true,
          checkedInAt: new Date(),
          checkedInById: user.id,
          checkedInLocation: location || 'Main entrance',
          lastKnownCheckIn: new Date(),
          currentZone: location || 'Main entrance',
        },
        select: {
          id: true,
          name: true,
          email: true,
          isCheckedIn: true,
          checkedInAt: true,
          checkedInLocation: true,
          eventId: true,
        }
      });
      
      // Log the activity
      await tx.activityLog.create({
        data: {
          type: 'check-in',
          action: 'created',
          description: `Checked in attendee: ${attendee.name}`,
          entityType: 'Attendee',
          entityId: attendee.id,
          staffId: user.id,
          metadata: { 
            location: location || 'Main entrance',
            eventId: attendee.eventId || eventId || null
          }
        }
      });
      
      // For multi-day events, create a daily record
      if (day) {
        const date = new Date(day);
        
        await tx.dailyRecord.upsert({
          where: {
            attendeeId_date: {
              attendeeId: attendee.id,
              date,
            }
          },
          update: {
            checkedIn: true,
            checkedInAt: new Date(),
          },
          create: {
            attendeeId: attendee.id,
            date,
            checkedIn: true,
            checkedInAt: new Date(),
          }
        });
      }
      
      return updatedAttendee;
    });
    
    // After successful check-in, broadcast the event via websocket for real-time updates
    try {
      broadcastAttendeeCheckedIn({
        attendeeId: updatedData.id,
        name: updatedData.name,
        checkedInAt: updatedData.checkedInAt || new Date(),
        location: updatedData.checkedInLocation || undefined,
        eventId: updatedData.eventId || undefined
      });
    } catch (wsError) {
      // Log but don't fail if websocket broadcast fails
      console.error('Failed to broadcast check-in via websocket:', wsError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Attendee checked in successfully',
      attendee: updatedData,
      checkInStatus: 'success'
    });
  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json(
      { success: false, message: `Server error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 