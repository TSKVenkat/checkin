import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorize } from '@/lib/auth/authorize';

// Access control
const ALLOWED_ROLES = ['admin', 'manager', 'staff'];

export async function GET(req: NextRequest) {
  try {
    // Authorize the request
    const authResult = await authorize(ALLOWED_ROLES)(req);
    
    if (!authResult.success || !authResult.authorized) {
      return NextResponse.json(
        { success: false, message: authResult.message || 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get user info for role-specific data
    const user = authResult.user;
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User identification failed' },
        { status: 401 }
      );
    }

    // Get query parameters
    const url = new URL(req.url);
    const eventId = url.searchParams.get('eventId');
    const day = url.searchParams.get('day');

    // Check for current event if none specified
    let event;
    if (eventId) {
      event = await prisma.event.findUnique({
        where: { id: eventId }
      });
    } else {
      // Get most recent event
      event = await prisma.event.findFirst({
        orderBy: { startDate: 'desc' }
      });
    }

    if (!event) {
      return NextResponse.json(
        { success: false, message: 'No event found' },
        { status: 404 }
      );
    }

    // Get base statistics
    const stats: any = {
      eventInfo: {
        id: event.id,
        name: event.name,
        startDate: event.startDate,
        endDate: event.endDate,
        isEmergencyActive: event.isEmergencyActive
      }
    };

    // Query conditions
    const dateCondition: any = {};
    if (day) {
      // For specific day stats in multi-day events
      const dayDate = new Date(day);
      
      // Daily record stats
      const dailyStats = await prisma.$transaction([
        // Total daily records for this day
        prisma.dailyRecord.count({
          where: { date: dayDate }
        }),
        // Checked in today
        prisma.dailyRecord.count({
          where: { 
            date: dayDate,
            checkedIn: true
          }
        }),
        // Lunch claimed today
        prisma.dailyRecord.count({
          where: { 
            date: dayDate,
            lunchClaimed: true
          }
        }),
        // Kit claimed today
        prisma.dailyRecord.count({
          where: { 
            date: dayDate,
            kitClaimed: true
          }
        })
      ]);
      
      stats.dailyStats = {
        date: dayDate,
        registered: dailyStats[0],
        checkedIn: dailyStats[1],
        lunchDistributed: dailyStats[2],
        kitDistributed: dailyStats[3],
        checkInRate: dailyStats[0] ? Math.round((dailyStats[1] / dailyStats[0]) * 100) : 0
      };
    }

    // Get overall event stats
    const [
      totalAttendees,
      checkedInAttendees,
      lunchClaimedCount,
      kitClaimedCount
    ] = await prisma.$transaction([
      // Total registered attendees
      prisma.attendee.count({
        where: { eventId: event.id }
      }),
      // Total checked in
      prisma.attendee.count({
        where: { 
          eventId: event.id,
          isCheckedIn: true 
        }
      }),
      // Total lunch claimed
      prisma.attendee.count({
        where: { 
          eventId: event.id,
          lunchClaimed: true 
        }
      }),
      // Total kit claimed
      prisma.attendee.count({
        where: { 
          eventId: event.id,
          kitClaimed: true 
        }
      })
    ]);

    stats.overallStats = {
      registered: totalAttendees,
      checkedIn: checkedInAttendees,
      lunchDistributed: lunchClaimedCount,
      kitDistributed: kitClaimedCount,
      checkInRate: totalAttendees ? Math.round((checkedInAttendees / totalAttendees) * 100) : 0
    };

    // Get resource inventory stats
    const resources = await prisma.resource.findMany({
      where: { eventId: event.id }
    });

    stats.resourceStats = resources.map(resource => ({
      id: resource.id,
      name: resource.name,
      type: resource.type,
      total: resource.totalQuantity,
      distributed: resource.claimedQuantity,
      remaining: resource.totalQuantity - resource.claimedQuantity,
      status: resource.claimedQuantity >= resource.totalQuantity ? 'depleted' :
              resource.totalQuantity - resource.claimedQuantity <= resource.lowThreshold ? 'low' : 'available'
    }));

    // Get recent check-ins (only for admin and manager roles)
    if (['admin', 'manager'].includes(user.role)) {
      const recentCheckIns = await prisma.attendee.findMany({
        where: { 
          eventId: event.id,
          isCheckedIn: true 
        },
        orderBy: { checkedInAt: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          email: true,
          checkedInAt: true,
          lunchClaimed: true,
          kitClaimed: true
        }
      });

      stats.recentCheckIns = recentCheckIns;
    }

    // Get hourly check-in stats for the past 24 hours
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // This is a simplified example - in a real implementation, 
    // you would use database-specific time functions for proper hourly grouping
    const recentAttendees = await prisma.attendee.findMany({
      where: {
        eventId: event.id,
        checkedInAt: {
          gte: twentyFourHoursAgo
        }
      },
      select: {
        checkedInAt: true
      },
      orderBy: {
        checkedInAt: 'asc'
      }
    });

    // Group by hour
    const hourlyStats: {[hour: string]: number} = {};
    recentAttendees.forEach(attendee => {
      if (attendee.checkedInAt) {
        const hour = attendee.checkedInAt.toISOString().substring(0, 13); // YYYY-MM-DDTHH format
        hourlyStats[hour] = (hourlyStats[hour] || 0) + 1;
      }
    });

    stats.hourlyCheckIns = Object.entries(hourlyStats).map(([hour, count]) => ({
      hour,
      count
    }));

    // For admin users, add staff activity data
    if (user.role === 'admin') {
      const staffActivity = await prisma.staff.findMany({
        select: {
          id: true,
          name: true,
          role: true,
          lastLogin: true,
          _count: {
            select: {
              checkedInAttendees: true,
              lunchClaimedAttendees: true,
              kitClaimedAttendees: true
            }
          }
        }
      });

      stats.staffActivity = staffActivity.map(staff => ({
        id: staff.id,
        name: staff.name,
        role: staff.role,
        lastLogin: staff.lastLogin,
        checkedInCount: staff._count.checkedInAttendees,
        lunchDistributedCount: staff._count.lunchClaimedAttendees,
        kitDistributedCount: staff._count.kitClaimedAttendees,
        totalActivity: staff._count.checkedInAttendees + 
                      staff._count.lunchClaimedAttendees + 
                      staff._count.kitClaimedAttendees
      }));
    }

    // Emergency statistics if active
    if (event.isEmergencyActive) {
      // Get the total count of checked-in attendees
      const totalPresent = await prisma.attendee.count({
        where: {
          eventId: event.id,
          isCheckedIn: true
        }
      });
      
      // Get count of attendees with safety confirmed
      const safeCount = await prisma.attendee.count({
        where: {
          eventId: event.id,
          isCheckedIn: true,
          safetyConfirmed: true
        }
      });
      
      // Calculate unsafe count
      const unsafeCount = totalPresent - safeCount;

      stats.emergencyStats = {
        totalPresent,
        safeCount,
        unsafeCount,
        safetyPercentage: totalPresent > 0 ? Math.round((safeCount / totalPresent) * 100) : 0,
        emergencyType: event.emergencyType,
        activatedAt: event.emergencyActivatedAt,
        lastUpdated: event.emergencyLastUpdated,
        affectedZones: event.emergencyAffectedZones
      };
    }

    // Log this dashboard view
    await prisma.activityLog.create({
      data: {
        type: 'dashboard',
        action: 'view',
        description: `Dashboard statistics viewed`,
        staffId: user.id,
        metadata: { 
          eventId: event.id,
          eventName: event.name,
          timestamp: new Date().toISOString()
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: `Server error: ${(error as Error).message}`,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 