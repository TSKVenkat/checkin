// API route for getting admin dashboard statistics
import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/lib/auth/authorize';
import prisma from '@/lib/prisma';

// Cache duration in seconds - 5 minutes
const CACHE_DURATION = 300;

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Check if user is authorized to access admin stats
  const authResult = await authorize(['admin'])(req);
  
  if (!authResult.authorized) {
      return NextResponse.json(
      { success: false, message: 'Unauthorized access to admin stats' },
      { status: 401 }
    );
  }
  
  try {
    // Get actual stats from database
    
    // Count attendees
    const totalAttendees = await prisma.attendee.count();
    
    // Get checked-in attendees
    const checkedInAttendees = await prisma.attendee.count({
      where: {
        isCheckedIn: true
      }
    });
    
    // Calculate percentage
    const checkedInPercentage = totalAttendees > 0 
      ? Math.round((checkedInAttendees / totalAttendees) * 100) 
      : 0;
    
    // Count events
    const totalEvents = await prisma.event.count();
    
    // Get active events
    const activeEvents = await prisma.event.count({
      where: {
        status: 'published',
        endDate: {
          gte: new Date()
        }
      }
    });
    
    // Get upcoming events
    const upcomingEvents = await prisma.event.count({
      where: {
        status: 'published',
        startDate: {
          gt: new Date()
        }
      }
    });
    
    // Get resource stats
    const lunchClaimedCount = await prisma.attendee.count({
      where: {
        lunchClaimed: true
      }
    });
    
    const kitClaimedCount = await prisma.attendee.count({
      where: {
        kitClaimed: true
      }
    });
    
    // Calculate percentages
    const lunchClaimedPercentage = totalAttendees > 0 
      ? Math.round((lunchClaimedCount / totalAttendees) * 100) 
      : 0;
    
    const kitClaimedPercentage = totalAttendees > 0 
      ? Math.round((kitClaimedCount / totalAttendees) * 100) 
      : 0;
    
    const resourcesDistributed = lunchClaimedCount + kitClaimedCount;
    const resourcesDistributedPercentage = totalAttendees > 0 
      ? Math.round((resourcesDistributed / (totalAttendees * 2)) * 100) 
      : 0;
    
    // Count staff
    const staffCounts = await prisma.staff.groupBy({
      by: ['role'],
      _count: {
        id: true
      }
    });
    
    // Format staff counts
    const staffCount = {
      admin: 0,
      manager: 0,
      staff: 0,
      total: 0
    };
    
    // Create staff by role count
    const staffByRole = {
      admin: 0,
      'check-in': 0,
      distribution: 0
    };
    
    staffCounts.forEach(item => {
      const role = item.role;
      const count = item._count.id;
      
      // Update staff count
      if (role === 'admin' || role === 'manager' || role === 'staff') {
        staffCount[role] = count;
      }
      
      // Update total count
      staffCount.total += count;
      
      // Estimate role distribution - in a real app you'd have more precise data
      if (role === 'admin') {
        staffByRole.admin = count;
      } else if (role === 'staff') {
        // Rough estimate that 75% of staff handle check-in
        staffByRole['check-in'] = Math.round(count * 0.75);
        // And 25% handle distribution
        staffByRole.distribution = Math.round(count * 0.25);
      }
    });
    
    // Get recent activity logs
    const recentActivity = await prisma.activityLog.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        staff: {
          select: {
            name: true
          }
        }
      }
    });
    
    // Format activity logs
    const formattedActivity = recentActivity.map(activity => ({
      id: activity.id,
      type: activity.type,
      description: activity.description,
      timestamp: activity.createdAt.toISOString(),
      user: activity.staff ? activity.staff.name : 'System'
    }));
    
    // Compile stats
    const stats = {
      totalAttendees,
      totalEvents,
      activeEvents,
      upcomingEvents,
      checkedInCount: checkedInAttendees,
      checkedInPercentage,
      resourcesDistributed,
      resourcesDistributedPercentage,
      lunchClaimedCount,
      lunchClaimedPercentage,
      kitClaimedCount,
      kitClaimedPercentage,
      totalStaff: staffCount.total,
      staffCount,
      staffByRole,
      recentActivity: formattedActivity
    };
    
    return NextResponse.json(
      { success: true, data: stats },
      { 
        status: 200,
        headers: {
          'Cache-Control': `public, max-age=${CACHE_DURATION}`,
          'ETag': generateETag(stats)
        }
      }
    );
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { success: false, message: 'Error fetching admin statistics' },
      { status: 500 }
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
