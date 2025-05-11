// API route for getting event statistics
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorize } from '@/lib/auth/auth';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // Check authorization (allow admin and check-in roles)
    const authResult = await authorize(['admin', 'check-in', 'distribution'])(req);
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, message: authResult.message || 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const eventId = searchParams.get('eventId');
    
    // If specific event ID provided, get that event's data
    let event;
    if (eventId) {
      event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          resources: true
        }
      });
      
      if (!event) {
        return NextResponse.json(
          { success: false, message: 'Event not found' },
          { status: 404 }
        );
      }
    } else {
      // Otherwise get the most recent event
      event = await prisma.event.findFirst({
        orderBy: { startDate: 'desc' },
        include: {
          resources: true
        }
      });
    }
    
    // Get total attendee count
    const totalAttendees = await prisma.attendee.count();
    
    // Get checked-in attendee count
    const checkedInCount = await prisma.attendee.count({
      where: { isCheckedIn: true }
    });
    
    // Get resource distribution stats
    const lunchClaimedCount = await prisma.attendee.count({
      where: { lunchClaimed: true }
    });
    
    const kitClaimedCount = await prisma.attendee.count({
      where: { kitClaimed: true }
    });
    
    // Get check-in rate over time (last 24 hours in hourly buckets)
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Get checked-in attendees from the last 24 hours
    const recentCheckIns = await prisma.attendee.findMany({
      where: {
        isCheckedIn: true,
        checkedInAt: { gte: yesterday }
      },
      select: {
        checkedInAt: true
      }
    });
    
    // Process the data to create hourly buckets
    const hourlyBuckets = new Map();
    
    recentCheckIns.forEach(checkIn => {
      if (checkIn.checkedInAt) {
        const hour = new Date(checkIn.checkedInAt);
        hour.setMinutes(0, 0, 0); // Normalize to the hour
        
        const timeKey = hour.toISOString();
        const current = hourlyBuckets.get(timeKey) || 0;
        hourlyBuckets.set(timeKey, current + 1);
      }
    });
    
    // Convert to sorted array
    const timeline = Array.from(hourlyBuckets.entries())
      .map(([time, count]) => ({ time, count }))
      .sort((a, b) => a.time.localeCompare(b.time));
    
    // Get stats by role
    const statsByRoleRaw = await prisma.attendee.groupBy({
      by: ['role'],
      _count: {
        id: true
      }
    });
    
    const checkedInByRoleRaw = await prisma.attendee.groupBy({
      by: ['role'],
      where: {
        isCheckedIn: true
      },
      _count: {
        id: true
      }
    });
    
    // Format role stats
    const roleMap = new Map();
    
    statsByRoleRaw.forEach(item => {
      roleMap.set(item.role, {
        _id: item.role,
        total: item._count.id,
        checkedIn: 0
      });
    });
    
    checkedInByRoleRaw.forEach(item => {
      const role = roleMap.get(item.role);
      if (role) {
        role.checkedIn = item._count.id;
      }
    });
    
    const statsByRole = Array.from(roleMap.values());
    
    // Get resource inventory status if event exists
    let resources = [];
    if (event) {
      resources = event.resources.map(resource => ({
        name: resource.name,
        type: resource.type,
        totalQuantity: resource.totalQuantity,
        claimedQuantity: resource.claimedQuantity,
        remainingQuantity: resource.totalQuantity - resource.claimedQuantity,
        lowThreshold: resource.lowThreshold,
        isLow: (resource.totalQuantity - resource.claimedQuantity) <= resource.lowThreshold
      }));
    }
    
    // Format emergency status data if event exists
    let emergencyStatus = null;
    if (event) {
      emergencyStatus = {
        isActive: event.isEmergencyActive,
        type: event.emergencyType,
        affectedZones: event.emergencyAffectedZones,
        activatedAt: event.emergencyActivatedAt,
        activatedBy: event.emergencyActivatedById,
        lastUpdated: event.emergencyLastUpdated
      };
    }
    
    // Return stats
    return NextResponse.json({
      success: true,
      data: {
        totalAttendees,
        checkedInCount,
        checkInPercentage: totalAttendees > 0 ? (checkedInCount / totalAttendees) * 100 : 0,
        resourceDistribution: {
          lunch: {
            claimed: lunchClaimedCount,
            percentage: totalAttendees > 0 ? (lunchClaimedCount / totalAttendees) * 100 : 0
          },
          kit: {
            claimed: kitClaimedCount,
            percentage: totalAttendees > 0 ? (kitClaimedCount / totalAttendees) * 100 : 0
          }
        },
        timeline,
        byRole: statsByRole,
        resources,
        emergencyStatus
      }
    });
    
  } catch (error) {
    console.error('Get event stats error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 