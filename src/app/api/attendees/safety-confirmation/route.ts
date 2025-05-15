import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth/auth';
import { notifySafetyConfirmation } from '../../websocket';

export async function POST(req: NextRequest) {
  try {
    // Get the authenticated user
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const { emergencyId } = body;

    if (!emergencyId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Emergency ID is required' 
      }, { status: 400 });
    }

    // Get attendee info if the user is an attendee
    if (user.role !== 'attendee') {
      return NextResponse.json({ 
        success: false, 
        message: 'Only attendees can confirm safety' 
      }, { status: 403 });
    }

    // Record the safety confirmation
    const attendee = await prisma.attendee.findUnique({
      where: { userId: user.id }
    });

    if (!attendee) {
      return NextResponse.json({ 
        success: false, 
        message: 'Attendee record not found' 
      }, { status: 404 });
    }

    // Update the attendee record with safety confirmation
    const updatedAttendee = await prisma.attendee.update({
      where: { id: attendee.id },
      data: {
        safetyConfirmed: true,
        safetyConfirmedAt: new Date()
      }
    });

    // Broadcast the safety confirmation to admin dashboard
    notifySafetyConfirmation(attendee.id, {
      name: attendee.name,
      email: attendee.email,
      confirmedAt: updatedAttendee.safetyConfirmedAt,
      emergencyId
    });

    return NextResponse.json({
      success: true,
      message: 'Safety confirmation recorded',
      attendee: {
        id: attendee.id,
        name: attendee.name,
        safetyConfirmed: updatedAttendee.safetyConfirmed,
        safetyConfirmedAt: updatedAttendee.safetyConfirmedAt
      }
    });
    
  } catch (error) {
    console.error('Safety confirmation error:', error);
    return NextResponse.json(
      { success: false, message: `Server error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 