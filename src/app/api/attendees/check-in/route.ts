// API route for attendee check-in
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyQRCode } from '@/lib/qr/qrGenerator';
import { authorize } from '@/lib/auth/auth';

const EVENT_SECRET = process.env.EVENT_SECRET || 'your-event-secret-change-in-production';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Check authorization
    const authResult = await authorize(['admin', 'check-in'])(req);
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, message: authResult.message || 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await req.json();
    const { qrData, location, staffId, manualId } = body;
    
    if (!location) {
      return NextResponse.json(
        { success: false, message: 'Check-in location is required' },
        { status: 400 }
      );
    }
    
    if (!staffId) {
      return NextResponse.json(
        { success: false, message: 'Staff ID is required' },
        { status: 400 }
      );
    }
    
    // Handle QR code-based check-in
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
      
      // Check if already checked in
      if (attendee.isCheckedIn) {
        return NextResponse.json(
          {
            success: false,
            message: 'Attendee is already checked in',
            attendee: {
              name: attendee.name,
              email: attendee.email,
              checkedInAt: attendee.checkedInAt,
              checkedInLocation: attendee.checkedInLocation
            }
          },
          { status: 409 }
        );
      }
      
      // Create today's date for daily records
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Use transaction to ensure all updates succeed or fail together
      const updatedAttendee = await prisma.$transaction(async (tx) => {
        // Perform check-in
        const updated = await tx.attendee.update({
          where: { id: attendee.id },
          data: {
            isCheckedIn: true,
            checkedInAt: new Date(),
            checkedInById: staffId,
            checkedInLocation: location,
            // Update emergency status
            lastKnownCheckIn: new Date(),
            currentZone: location
          }
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
          await tx.dailyRecord.update({
            where: { id: existingDailyRecord.id },
            data: {
              checkedIn: true,
              checkedInAt: new Date()
            }
          });
        } else {
          await tx.dailyRecord.create({
            data: {
              date: today,
              checkedIn: true,
              checkedInAt: new Date(),
              lunchClaimed: false,
              kitClaimed: false,
              attendeeId: attendee.id
            }
          });
        }
        
        return updated;
      });
      
      return NextResponse.json({
        success: true,
        message: 'Attendee checked in successfully',
        attendee: {
          name: updatedAttendee.name,
          email: updatedAttendee.email,
          role: updatedAttendee.role,
          checkedInAt: updatedAttendee.checkedInAt,
          location: updatedAttendee.checkedInLocation
        }
      });
    }
    
    // Handle manual ID-based check-in
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
      
      // Check if already checked in
      if (attendee.isCheckedIn) {
        return NextResponse.json(
          {
            success: false,
            message: 'Attendee is already checked in',
            attendee: {
              name: attendee.name,
              email: attendee.email,
              checkedInAt: attendee.checkedInAt,
              checkedInLocation: attendee.checkedInLocation
            }
          },
          { status: 409 }
        );
      }
      
      // Create today's date for daily records
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Use transaction to ensure all updates succeed or fail together
      const updatedAttendee = await prisma.$transaction(async (tx) => {
        // Perform check-in
        const updated = await tx.attendee.update({
          where: { id: attendee.id },
          data: {
            isCheckedIn: true,
            checkedInAt: new Date(),
            checkedInById: staffId,
            checkedInLocation: location,
            // Update emergency status
            lastKnownCheckIn: new Date(),
            currentZone: location
          }
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
          await tx.dailyRecord.update({
            where: { id: existingDailyRecord.id },
            data: {
              checkedIn: true,
              checkedInAt: new Date()
            }
          });
        } else {
          await tx.dailyRecord.create({
            data: {
              date: today,
              checkedIn: true,
              checkedInAt: new Date(),
              lunchClaimed: false,
              kitClaimed: false,
              attendeeId: attendee.id
            }
          });
        }
        
        return updated;
      });
      
      return NextResponse.json({
        success: true,
        message: 'Attendee checked in successfully',
        attendee: {
          name: updatedAttendee.name,
          email: updatedAttendee.email,
          role: updatedAttendee.role,
          checkedInAt: updatedAttendee.checkedInAt,
          location: updatedAttendee.checkedInLocation
        }
      });
    }
    
    return NextResponse.json(
      { success: false, message: 'Either QR data or manual ID is required' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || 'An error occurred during check-in' },
      { status: 500 }
    );
  }
} 