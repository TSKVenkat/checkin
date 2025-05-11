// API route for getting a specific attendee by ID
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorize } from '@/lib/auth/auth';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    // Check authorization (allow admin, check-in, and distribution roles)
    const authResult = await authorize(['admin', 'check-in', 'distribution'])(req);
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, message: authResult.message || 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id } = params;
    
    // Try to find attendee by ID, uniqueId, or email
    const attendee = await prisma.attendee.findFirst({
      where: {
        OR: [
          { id },
          { uniqueId: id },
          { email: id }
        ]
      },
      include: {
        dailyRecords: true,
        checkedInBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });
    
    if (!attendee) {
      return NextResponse.json(
        { success: false, message: 'Attendee not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: attendee
    });
    
  } catch (error) {
    console.error('Get attendee error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 