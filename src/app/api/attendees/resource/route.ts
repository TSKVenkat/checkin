// API route for resource distribution tracking
import { NextRequest, NextResponse } from 'next/server';
import { verifyQRCode } from '@/lib/qr/generator';
import prisma from '@/lib/prisma';
import { authorize } from '@/lib/auth/authorize';
import { getUserFromRequest } from '@/lib/auth/auth';

// Allowed roles for resource distribution
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
    const { qrData, manualId, resourceType, location } = body;

    // Validate resource type
    if (!resourceType || !['lunch', 'kit'].includes(resourceType)) {
      return NextResponse.json(
        { success: false, message: 'Valid resource type (lunch or kit) is required' },
        { status: 400 }
      );
    }

    // Ensure at least one identifier is provided
    if (!qrData && !manualId) {
      return NextResponse.json(
        { success: false, message: 'QR data or manual ID is required' },
        { status: 400 }
      );
    }

    // Get current active event
    const currentEvent = await prisma.event.findFirst({
      where: {
        status: 'active',
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    if (!currentEvent) {
      return NextResponse.json(
        { success: false, message: 'No active event found. Please configure an event first.' },
        { status: 400 }
      );
    }

    let attendeeId: string | null = null;

    // If QR data is provided, verify it
    if (qrData) {
      const qrVerification = verifyQRCode(qrData);
      
      if (!qrVerification.valid) {
        return NextResponse.json(
          { 
            success: false, 
            message: `Invalid QR code: ${qrVerification.reason || 'unknown error'}` 
          },
          { status: 400 }
        );
      }
      
      attendeeId = qrVerification.attendeeId!;
    } else if (manualId) {
      // For manual ID, do a direct lookup - try uniqueId or email
      console.log(`Attempting to find attendee with ID/email: ${manualId}`);
      
      const attendee = await prisma.attendee.findFirst({
        where: {
          OR: [
            { uniqueId: manualId },
            { email: manualId.toLowerCase() }
          ]
        }
      });
      
      if (!attendee) {
        console.log(`No attendee found with ID/email: ${manualId}`);
        return NextResponse.json(
          { success: false, message: 'Attendee not found with provided ID or email' },
          { status: 404 }
        );
      }
      
      console.log(`Found attendee with ID: ${attendee.id}, Name: ${attendee.name}`);
      attendeeId = attendee.id;
    }

    // Find the attendee
    const attendee = await prisma.attendee.findUnique({
      where: { id: attendeeId! }
    });

    if (!attendee) {
      return NextResponse.json(
        { success: false, message: 'Attendee not found' },
        { status: 404 }
      );
    }

    // Check if attendee is checked in
    if (!attendee.isCheckedIn) {
      return NextResponse.json({
        success: false,
        message: 'Attendee must be checked in before receiving resources',
        code: 'NOT_CHECKED_IN'
      }, { status: 400 });
    }

    // Check if resource was already claimed
    const alreadyClaimed = resourceType === 'lunch' 
      ? attendee.lunchClaimed 
      : attendee.kitClaimed;

    if (alreadyClaimed) {
      return NextResponse.json({
        success: false,
        message: `${resourceType === 'lunch' ? 'Lunch' : 'Kit'} already claimed by this attendee`,
        attendee: {
          id: attendee.id,
          name: attendee.name,
          email: attendee.email,
        },
        distributionStatus: 'duplicate'
      });
    }

    // Update inventory count for this resource type
    const resource = await prisma.resource.findFirst({
      where: {
        type: resourceType,
        eventId: currentEvent.id
      }
    });

    if (resource) {
      // Check if we have enough resources left
      if (resource.claimedQuantity >= resource.totalQuantity) {
        return NextResponse.json({
          success: false,
          message: `${resourceType === 'lunch' ? 'Lunch' : 'Kit'} resources depleted`,
          distributionStatus: 'depleted'
        }, { status: 400 });
      }

      // Increment claimed quantity
      await prisma.resource.update({
        where: { id: resource.id },
        data: {
          claimedQuantity: {
            increment: 1
          }
        }
      });

      // Check if we're running low and should alert
      const remainingAfterClaim = resource.totalQuantity - (resource.claimedQuantity + 1);
      if (remainingAfterClaim <= resource.lowThreshold) {
        // In a real system, we'd send alerts here
        console.warn(`${resourceType} resources running low: ${remainingAfterClaim} remaining`);
      }
    }

    // Update attendee record based on resource type
    const updateData: any = {};
    if (resourceType === 'lunch') {
      updateData.lunchClaimed = true;
      updateData.lunchClaimedAt = new Date();
      updateData.lunchClaimedById = user.id;
      updateData.lunchClaimedLocation = location || 'Main distribution';
    } else {
      updateData.kitClaimed = true;
      updateData.kitClaimedAt = new Date();
      updateData.kitClaimedById = user.id;
      updateData.kitClaimedLocation = location || 'Main distribution';
    }

    // Apply the update
    const updatedAttendee = await prisma.attendee.update({
      where: { id: attendee.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        lunchClaimed: true,
        lunchClaimedAt: true,
        kitClaimed: true,
        kitClaimedAt: true,
        lunchClaimedLocation: true,
        kitClaimedLocation: true,
        isCheckedIn: true,
        checkedInAt: true
      }
    });
    
    // Log the activity
    await prisma.activityLog.create({
      data: {
        type: 'distribution',
        action: 'claimed',
        description: `${attendee.name} claimed ${resourceType}`,
        entityType: 'Attendee',
        entityId: attendee.id,
        staffId: user.id,
        metadata: { 
          resourceType,
          location: location || 'Main distribution',
          eventId: currentEvent.id
        }
      }
    });

    // For multi-day events, update daily record
    const eventDay = req.headers.get('x-event-day');
    
    if (eventDay) {
      const date = new Date(eventDay);
      
      // Find or create daily record
      await prisma.dailyRecord.upsert({
        where: {
          attendeeId_date: {
            attendeeId: attendee.id,
            date,
          }
        },
        update: resourceType === 'lunch' 
          ? { lunchClaimed: true, lunchClaimedAt: new Date() }
          : { kitClaimed: true, kitClaimedAt: new Date() },
        create: {
          attendeeId: attendee.id,
          date,
          ...(resourceType === 'lunch' 
            ? { lunchClaimed: true, lunchClaimedAt: new Date() }
            : { kitClaimed: true, kitClaimedAt: new Date() })
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: `${resourceType === 'lunch' ? 'Lunch' : 'Kit'} distributed successfully`,
      attendee: {
        id: updatedAttendee.id,
        name: updatedAttendee.name,
        email: updatedAttendee.email,
        claimedAt: resourceType === 'lunch' ? updatedAttendee.lunchClaimedAt : updatedAttendee.kitClaimedAt,
        location: resourceType === 'lunch' ? updatedAttendee.lunchClaimedLocation : updatedAttendee.kitClaimedLocation
      },
      distributionStatus: 'success',
      resourceType
    });
  } catch (error) {
    console.error('Resource distribution error:', error);
    return NextResponse.json(
      { success: false, message: `Server error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 