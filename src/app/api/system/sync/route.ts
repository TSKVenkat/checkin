import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticate } from '@/lib/auth/auth';

export async function POST(req: NextRequest) {
  try {
    // Authenticate request
    const authResult = await authenticate(req);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, message: authResult.message || 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const data = await req.json();
    const { syncType, timestamp } = data;
    
    if (!syncType) {
      return NextResponse.json(
        { success: false, message: 'Sync type is required' },
        { status: 400 }
      );
    }
    
    // Handle different sync types
    switch (syncType) {
      case 'attendees':
        // Sync attendee data
        return handleAttendeeSync(data);
      
      case 'resources':
        // Sync resource data
        return handleResourceSync(data);
      
      case 'events':
        // Sync event data
        return handleEventSync(data);
      
      default:
        return NextResponse.json(
          { success: false, message: 'Unknown sync type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { success: false, message: 'Sync operation failed' },
      { status: 500 }
    );
  }
}

// Handle attendee data synchronization
async function handleAttendeeSync(data: any) {
  const { attendees, lastSyncTimestamp } = data;
  
  if (!attendees || !Array.isArray(attendees)) {
    return NextResponse.json(
      { success: false, message: 'Invalid attendee data format' },
      { status: 400 }
    );
  }
  
  // Get updates from server since lastSyncTimestamp
  const serverUpdates = await prisma.attendee.findMany({
    where: {
      updatedAt: { gt: new Date(lastSyncTimestamp) }
    }
  });
  
  // Process client updates (in a real implementation, you would handle
  // conflict resolution more carefully)
  // This is a simplified version for demonstration
  for (const attendee of attendees) {
    if (attendee.id) {
      // Update existing attendee
      await prisma.attendee.update({
        where: { id: attendee.id },
        data: {
          // Only update fields that can be changed offline
          isCheckedIn: attendee.isCheckedIn,
          checkedInAt: attendee.checkedInAt,
          lunchClaimed: attendee.lunchClaimed,
          lunchClaimedAt: attendee.lunchClaimedAt,
          kitClaimed: attendee.kitClaimed,
          kitClaimedAt: attendee.kitClaimedAt,
          updatedAt: new Date()
        }
      });
    }
  }
  
  return NextResponse.json({
    success: true,
    message: 'Sync completed successfully',
    updates: serverUpdates,
    syncTimestamp: new Date().toISOString()
  });
}

// Handle resource data synchronization
async function handleResourceSync(data: any) {
  const { resources, lastSyncTimestamp } = data;
  
  // Get all resources, as the model doesn't have updatedAt
  // We'll filter on the client side if needed
  const serverUpdates = await prisma.resource.findMany({
    where: {
      // We can use the eventId if provided to filter resources for a specific event
      // but Resource model doesn't have an updatedAt field
    }
  });
  
  return NextResponse.json({
    success: true,
    message: 'Resource sync completed successfully',
    updates: serverUpdates,
    syncTimestamp: new Date().toISOString()
  });
}

// Handle event data synchronization
async function handleEventSync(data: any) {
  const { events, lastSyncTimestamp } = data;
  
  // Get updates from server since lastSyncTimestamp
  const serverUpdates = await prisma.event.findMany({
    where: {
      updatedAt: { gt: new Date(lastSyncTimestamp) }
    },
    include: {
      locations: true,
      resources: true
    }
  });
  
  return NextResponse.json({
    success: true,
    message: 'Event sync completed successfully',
    updates: serverUpdates,
    syncTimestamp: new Date().toISOString()
  });
} 