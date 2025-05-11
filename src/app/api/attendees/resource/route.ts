// API route for resource distribution tracking
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyQRCode } from '@/lib/qr/qrGenerator';
import { authorize } from '@/lib/auth/auth';

const EVENT_SECRET = process.env.EVENT_SECRET || 'your-event-secret-change-in-production';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Check authorization
    const authResult = await authorize(['admin', 'distribution'])(req);
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, message: authResult.message || 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await req.json();
    const { qrData, resourceType, location, staffId, manualId, eventId } = body;
    
    if (!resourceType || !['lunch', 'kit'].includes(resourceType)) {
      return NextResponse.json(
        { success: false, message: 'Valid resource type (lunch or kit) is required' },
        { status: 400 }
      );
    }
    
    if (!location) {
      return NextResponse.json(
        { success: false, message: 'Distribution location is required' },
        { status: 400 }
      );
    }
    
    if (!staffId) {
      return NextResponse.json(
        { success: false, message: 'Staff ID is required' },
        { status: 400 }
      );
    }
    
    if (!eventId) {
      return NextResponse.json(
        { success: false, message: 'Event ID is required' },
        { status: 400 }
      );
    }
    
    // Handle QR code-based verification
    if (qrData) {
      // Verify QR code
      const verificationResult = verifyQRCode(qrData, EVENT_SECRET);
      
      if (!verificationResult.valid) {
        return NextResponse.json(
          { 
            success: false, 
            message: `Invalid QR code: ${verificationResult.reason || 'Unknown error'}` 
          },
          { status: 400 }
        );
      }
      
      const attendeeId = verificationResult.attendeeId;
      
      // Process the resource distribution
      return await processResourceDistribution(
        attendeeId,
        resourceType,
        location,
        staffId,
        eventId
      );
    }
    
    // Handle manual ID-based verification
    if (manualId) {
      // Find attendee by email or unique ID
      const attendee = await prisma.attendee.findFirst({
        where: {
          OR: [
            { email: manualId },
            { uniqueId: manualId }
          ]
        }
      });
      
      if (!attendee) {
        return NextResponse.json(
          { success: false, message: 'Attendee not found' },
          { status: 404 }
        );
      }
      
      // Process the resource distribution
      return await processResourceDistribution(
        attendee.uniqueId,
        resourceType,
        location,
        staffId,
        eventId
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Either QR data or manual ID is required' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Resource distribution error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: (error as Error).message || 'An error occurred during resource distribution' 
      },
      { status: 500 }
    );
  }
}

/**
 * Process resource distribution for an attendee
 */
async function processResourceDistribution(
  attendeeId: string,
  resourceType: string,
  location: string,
  staffId: string,
  eventId: string
): Promise<NextResponse> {
  // Find attendee by unique ID
  const attendee = await prisma.attendee.findUnique({ 
    where: { uniqueId: attendeeId } 
  });
  
  if (!attendee) {
    return NextResponse.json(
      { success: false, message: 'Attendee not found' },
      { status: 404 }
    );
  }
  
  // Check if attendee is checked in
  if (!attendee.isCheckedIn) {
    return NextResponse.json(
      { success: false, message: 'Attendee must be checked in before claiming resources' },
      { status: 400 }
    );
  }
  
  // Check if resource is already claimed
  let isAlreadyClaimed = false;
  let claimedAt: Date | null = null;
  let claimedLocation: string | null = null;
  
  if (resourceType === 'lunch') {
    isAlreadyClaimed = attendee.lunchClaimed;
    claimedAt = attendee.lunchClaimedAt;
    claimedLocation = attendee.lunchClaimedLocation;
  } else if (resourceType === 'kit') {
    isAlreadyClaimed = attendee.kitClaimed;
    claimedAt = attendee.kitClaimedAt;
    claimedLocation = attendee.kitClaimedLocation;
  }
  
  if (isAlreadyClaimed) {
    return NextResponse.json(
      {
        success: false,
        message: `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} already claimed`,
        attendee: {
          name: attendee.name,
          email: attendee.email,
          claimedAt: claimedAt,
          claimedLocation: claimedLocation
        }
      },
      { status: 409 }
    );
  }
  
  // Create today's date for daily records
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Use transaction to ensure all updates succeed or fail together
  const result = await prisma.$transaction(async (tx) => {
    // Update attendee resource claim status
    let updateData: any = {};
    
    if (resourceType === 'lunch') {
      updateData = {
        lunchClaimed: true,
        lunchClaimedAt: new Date(),
        lunchClaimedById: staffId,
        lunchClaimedLocation: location
      };
    } else if (resourceType === 'kit') {
      updateData = {
        kitClaimed: true,
        kitClaimedAt: new Date(),
        kitClaimedById: staffId,
        kitClaimedLocation: location
      };
    }
    
    // Update the attendee
    const updatedAttendee = await tx.attendee.update({
      where: { id: attendee.id },
      data: updateData
    });
    
    // Check if there's already a daily record for today
    const existingDailyRecord = await tx.dailyRecord.findFirst({
      where: {
        attendeeId: attendee.id,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) // next day
        }
      }
    });
    
    // Create or update daily record
    if (existingDailyRecord) {
      // Create update data for the record
      const recordUpdateData: any = {};
      
      if (resourceType === 'lunch') {
        recordUpdateData.lunchClaimed = true;
        recordUpdateData.lunchClaimedAt = new Date();
      } else if (resourceType === 'kit') {
        recordUpdateData.kitClaimed = true;
        recordUpdateData.kitClaimedAt = new Date();
      }
      
      await tx.dailyRecord.update({
        where: { id: existingDailyRecord.id },
        data: recordUpdateData
      });
    } else {
      // Create new daily record
      const newRecordData: any = {
        date: today,
        checkedIn: false,
        attendeeId: attendee.id
      };
      
      if (resourceType === 'lunch') {
        newRecordData.lunchClaimed = true;
        newRecordData.lunchClaimedAt = new Date();
        newRecordData.kitClaimed = false;
      } else if (resourceType === 'kit') {
        newRecordData.kitClaimed = true;
        newRecordData.kitClaimedAt = new Date();
        newRecordData.lunchClaimed = false;
      }
      
      await tx.dailyRecord.create({
        data: newRecordData
      });
    }
    
    // Find the resource in the event
    const resource = await tx.resource.findFirst({
      where: {
        eventId: eventId,
        type: resourceType
      }
    });
    
    if (resource) {
      // Update resource claimed quantity
      const updatedResource = await tx.resource.update({
        where: { id: resource.id },
        data: {
          claimedQuantity: resource.claimedQuantity + 1
        }
      });
      
      // Check if inventory is running low
      const lowInventory = updatedResource.claimedQuantity >= 
        (updatedResource.totalQuantity - updatedResource.lowThreshold);
      
      return {
        attendee: updatedAttendee,
        resource: updatedResource,
        lowInventory: lowInventory
      };
    }
    
    return {
      attendee: updatedAttendee,
      resource: null,
      lowInventory: false
    };
  });
  
  // Prepare response data
  const claimedAt = resourceType === 'lunch' 
    ? result.attendee.lunchClaimedAt 
    : result.attendee.kitClaimedAt;
    
  const claimedLocation = resourceType === 'lunch'
    ? result.attendee.lunchClaimedLocation
    : result.attendee.kitClaimedLocation;
  
  // Return response with low inventory warning if applicable
  if (result.resource && result.lowInventory) {
    const remaining = result.resource.totalQuantity - result.resource.claimedQuantity;
    
    return NextResponse.json({
      success: true,
      message: `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} claimed successfully`,
      warning: `Low ${resourceType} inventory: ${remaining} remaining`,
      attendee: {
        name: result.attendee.name,
        email: result.attendee.email,
        claimedAt: claimedAt,
        location: claimedLocation
      }
    });
  }
  
  return NextResponse.json({
    success: true,
    message: `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} claimed successfully`,
    attendee: {
      name: result.attendee.name,
      email: result.attendee.email,
      claimedAt: claimedAt,
      location: claimedLocation
    }
  });
} 