import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth/auth-utils';

// Cache duration in seconds - 1 minute
const CACHE_DURATION = 60;

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Check if user is authorized to access admin dashboard stats
  const authResult = await verifyAuth(req);
  
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, message: authResult.message || 'Unauthorized access to admin dashboard stats' },
      { status: authResult.status || 401 }
    );
  }
  
  // Check if user has admin role
  if (authResult.user.role !== 'admin') {
    return NextResponse.json(
      { success: false, message: 'Admin access required' },
      { status: 403 }
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
    
    // Count events
    const totalEvents = await prisma.event.count();
    
    // Get active events (currently running)
    const today = new Date();
    const activeEvents = await prisma.event.count({
      where: {
        startDate: { lte: today },
        endDate: { gte: today }
      }
    });
    
    // Get upcoming events (future events)
    const upcomingEvents = await prisma.event.count({
      where: {
        startDate: { gt: today }
      }
    });
    
    // Get resource stats
    const resources = await prisma.resource.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        totalQuantity: true,
        claimedQuantity: true,
        lowThreshold: true
      }
    });
    
    // Format resource stats
    const resourceStats = resources.map(resource => ({
      id: resource.id,
      name: resource.name,
      type: resource.type,
      total: resource.totalQuantity,
      distributed: resource.claimedQuantity,
      remaining: resource.totalQuantity - resource.claimedQuantity,
      status: resource.claimedQuantity >= resource.totalQuantity ? 'depleted' :
              resource.totalQuantity - resource.claimedQuantity <= resource.lowThreshold ? 'low' : 'available'
    }));
    
    // Get resource distribution by type
    const resourceDistribution = {};
    resources.forEach(resource => {
      const type = resource.type;
      if (!resourceDistribution[type]) {
        resourceDistribution[type] = {
          total: 0,
          distributed: 0
        };
      }
      resourceDistribution[type].total += resource.totalQuantity;
      resourceDistribution[type].distributed += resource.claimedQuantity;
    });
    
    // Count staff
    const totalStaff = await prisma.staff.count();
    
    // Get staff by role
    const staffByRole = await prisma.staff.groupBy({
      by: ['role'],
      _count: {
        id: true
      }
    });
    
    // Format staff counts
    const staffCounts = {};
    staffByRole.forEach(item => {
      staffCounts[item.role] = item._count.id;
    });
    
    // Get recent activity
    const recentActivity = await prisma.activityLog.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        staff: {
          select: {
            name: true,
            role: true
          }
        }
      }
    });
    
    // Format activity logs
    const formattedActivity = recentActivity.map(activity => ({
      id: activity.id,
      action: activity.action,
      description: activity.description,
      timestamp: activity.createdAt.toISOString(),
      user: activity.staff ? activity.staff.name : 'System',
      userRole: activity.staff ? activity.staff.role : 'system'
    }));
    
    // Compile stats
    const stats = {
      attendees: {
        total: totalAttendees,
        checkedIn: checkedInAttendees,
        checkInRate: totalAttendees > 0 ? Math.round((checkedInAttendees / totalAttendees) * 100) : 0
      },
      events: {
        total: totalEvents,
        active: activeEvents,
        upcoming: upcomingEvents
      },
      resources: {
        stats: resourceStats,
        distribution: resourceDistribution
      },
      staff: {
        total: totalStaff,
        byRole: staffCounts
      },
      recentActivity: formattedActivity
    };
    
    return NextResponse.json(
      { success: true, data: stats },
      { 
        status: 200,
        headers: {
          'Cache-Control': `public, max-age=${CACHE_DURATION}`
        }
      }
    );
  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
    return NextResponse.json(
      { success: false, message: 'Error fetching admin dashboard statistics' },
      { status: 500 }
    );
  }
} 