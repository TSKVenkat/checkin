import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/lib/auth/authorize';

// Cache duration in seconds - 5 minutes
const CACHE_DURATION = 300;

// Dynamically import prisma to avoid edge runtime issues
let prisma: any = null;

if (typeof process !== 'undefined' && process.env.NEXT_RUNTIME !== 'edge') {
  import('@/lib/prisma').then((module) => {
    prisma = module.default;
  });
}

export async function GET(req: NextRequest) {
  // Check authentication and authorization
  const authResult = await authorize(['admin', 'manager', 'staff'])(req);
  
  if (!authResult.success || !authResult.authorized) {
    return NextResponse.json(
      { success: false, message: authResult.message || 'Unauthorized' },
      { 
        status: 403,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
  }
  
  try {
    // Make sure prisma is available (should only run in Node.js environment, not Edge)
    if (!prisma) {
      prisma = (await import('@/lib/prisma')).default;
    }
    
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');
    const skipCache = searchParams.get('skipCache') === 'true';
    
    // Find active event
    const whereClause: any = {};
    
    if (eventId) {
      whereClause.id = eventId;
    } else {
      // If no eventId provided, look for currently active events
      whereClause.startDate = { lte: new Date() };
      whereClause.endDate = { gte: new Date() };
    }
    
    const event = await prisma.event.findFirst({
      where: whereClause,
      include: {
        resources: true,
        locations: true
      }
    });
    
    if (!event) {
      return NextResponse.json(
        { success: false, message: 'Event not found' },
        { 
          status: 404,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          }
        }
      );
    }
    
    // Get attendee statistics specific to this event
    const totalAttendees = await prisma.attendee.count({
      where: { eventId: event.id }
    });
    
    const checkedInCount = await prisma.attendee.count({
      where: { 
        eventId: event.id,
        isCheckedIn: true 
      }
    });
    
    // Get resource distribution data
    const resourceStats: { [key: string]: any } = {};
    
    for (const resource of event.resources) {
      let claimedCount = 0;
      
      if (resource.type === 'lunch') {
        claimedCount = await prisma.attendee.count({
          where: { 
            eventId: event.id,
            lunchClaimed: true 
          }
        });
      } else if (resource.type === 'kit') {
        claimedCount = await prisma.attendee.count({
          where: { 
            eventId: event.id,
            kitClaimed: true 
          }
        });
      }
      
      resourceStats[resource.type] = {
        claimed: claimedCount,
        total: resource.totalQuantity,
        percentage: resource.totalQuantity > 0 ? Math.round((claimedCount / resource.totalQuantity) * 100) : 0
      };
    }
    
    // Ensure we have default resources even if not defined
    if (!resourceStats.lunch) {
      resourceStats.lunch = { claimed: 0, total: 0, percentage: 0 };
    }
    if (!resourceStats.kit) {
      resourceStats.kit = { claimed: 0, total: 0, percentage: 0 };
    }
    if (!resourceStats.badge) {
      resourceStats.badge = { claimed: 0, total: 0, percentage: 0 };
    }
    if (!resourceStats.swag) {
      resourceStats.swag = { claimed: 0, total: 0, percentage: 0 };
    }
    
    // Get recent activity for this event
    const recentAttendeeUpdates = await prisma.attendee.findMany({
      where: {
        eventId: event.id,
        OR: [
          { isCheckedIn: true },
          { lunchClaimed: true },
          { kitClaimed: true }
        ]
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        isCheckedIn: true,
        checkedInAt: true,
        lunchClaimed: true,
        lunchClaimedAt: true,
        kitClaimed: true,
        kitClaimedAt: true,
        updatedAt: true
      }
    });
    
    // Format recent activity
    const recentActivity = recentAttendeeUpdates.map((attendee: {
      id: string;
      name: string;
      email: string;
      isCheckedIn: boolean;
      checkedInAt: Date | null;
      lunchClaimed: boolean;
      lunchClaimedAt: Date | null;
      kitClaimed: boolean;
      kitClaimedAt: Date | null;
      updatedAt: Date;
    }) => {
      let action = 'unknown';
      let timestamp = attendee.updatedAt;
      
      if (attendee.checkedInAt && 
          (!timestamp || attendee.checkedInAt > timestamp)) {
        action = 'check-in';
        timestamp = attendee.checkedInAt;
      }
      
      if (attendee.lunchClaimedAt && 
          (!timestamp || attendee.lunchClaimedAt > timestamp)) {
        action = 'lunch claim';
        timestamp = attendee.lunchClaimedAt;
      }
      
      if (attendee.kitClaimedAt && 
          (!timestamp || attendee.kitClaimedAt > timestamp)) {
        action = 'kit claim';
        timestamp = attendee.kitClaimedAt;
      }
      
      return {
        timestamp: timestamp.toISOString(),
        action,
        user: attendee.name,
        details: `${attendee.name} (${attendee.email})`
      };
    });
    
    // Log this view to activity log
    await prisma.activityLog.create({
      data: {
        type: 'events',
        action: 'view',
        description: `Viewed event stats for ${event.name}`,
        entityType: 'Event',
        entityId: event.id,
        staffId: authResult.user?.id || 'unknown',
        metadata: { timestamp: new Date().toISOString() }
      }
    });
    
    // Compile all event stats
    const eventStats = {
      id: event.id,
      name: event.name,
      startDate: event.startDate,
      endDate: event.endDate,
      totalAttendees,
      checkedInCount,
      checkInPercentage: totalAttendees > 0 ? Math.round((checkedInCount / totalAttendees) * 100) : 0,
      resourceDistribution: resourceStats,
      emergencyStatus: event.isEmergencyActive ? {
        isActive: event.isEmergencyActive,
        type: event.emergencyType,
        affectedZones: event.emergencyAffectedZones,
        activatedAt: event.emergencyActivatedAt,
        lastUpdated: event.emergencyLastUpdated,
        severity: 'high' // Default to high for emergencies
      } : null,
      recentActivity,
      locations: event.locations
    };

    // Generate ETag for caching
    const etag = `"${generateETag(eventStats)}"`;
    
    // Return with HTTP caching headers
    return NextResponse.json(
      {
        success: true,
        data: eventStats
      },
      {
        headers: skipCache ? {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        } : {
          'Cache-Control': `private, max-age=${CACHE_DURATION}`,
          'ETag': etag,
          'Vary': 'Authorization, Accept-Encoding, Accept' // Include Authorization in Vary header
        }
      }
    );
    
  } catch (error) {
    console.error('Event stats error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error', 
        error: (error as Error).message 
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  }
}

// Generate a simple ETag hash for caching
function generateETag(data: any): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
} 