import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorize } from '@/lib/auth/authorize';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    // Authorize the request
    const authResult = await authorize(['admin', 'manager', 'staff'])(req);
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, message: authResult.message || 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Get query parameters
    const url = new URL(req.url);
    const dayParam = url.searchParams.get('day');
    const limitParam = url.searchParams.get('limit');
    const eventIdParam = url.searchParams.get('eventId');
    
    // Set default values if not provided
    const limit = limitParam ? parseInt(limitParam, 10) : 5;
    
    // Parse day with timezone considerations
    const day = dayParam ? new Date(dayParam) : new Date();
    
    // Create start and end of day timestamps
    const startOfDay = new Date(day);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(day);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Prepare the where clause based on parameters
    const whereClause: any = {
      isCheckedIn: true,
      checkedInAt: {
        gte: startOfDay,
        lte: endOfDay
      }
    };
    
    // If eventId is specified, filter by that event
    if (eventIdParam) {
      whereClause.eventId = eventIdParam;
    }
    
    // Get recent check-ins
    const recentCheckins = await prisma.attendee.findMany({
      where: whereClause,
      orderBy: {
        checkedInAt: 'desc'
      },
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        checkedInAt: true,
        checkedInLocation: true,
        checkedInById: true,
        checkedInBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        eventId: true,
        event: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    // Get stats for the day
    const checkedInToday = await prisma.attendee.count({
      where: whereClause
    });
    
    // Get total expected attendees (based on event if specified)
    const totalExpectedWhereClause: any = {};
    if (eventIdParam) {
      totalExpectedWhereClause.eventId = eventIdParam;
    }
    
    const totalExpected = await prisma.attendee.count({
      where: totalExpectedWhereClause
    });
    
    // Get check-in distribution by hour for the day
    // Build the SQL query with proper condition handling
    let hourlySQL = Prisma.sql`
      SELECT 
        EXTRACT(HOUR FROM "checkedInAt") as hour,
        COUNT(*) as count
      FROM 
        "Attendee"
      WHERE 
        "isCheckedIn" = true
        AND "checkedInAt" >= ${startOfDay}
        AND "checkedInAt" <= ${endOfDay}
    `;
    
    // Add eventId condition if needed
    if (eventIdParam) {
      hourlySQL = Prisma.sql`${hourlySQL} AND "eventId" = ${eventIdParam}`;
    }
    
    // Complete the query with GROUP BY and ORDER BY
    hourlySQL = Prisma.sql`
      ${hourlySQL}
      GROUP BY 
        EXTRACT(HOUR FROM "checkedInAt")
      ORDER BY 
        hour ASC
    `;
    
    const hourlyCheckins = await prisma.$queryRaw(hourlySQL);
    
    // Get check-in distribution by location using the same approach
    let locationSQL = Prisma.sql`
      SELECT 
        "checkedInLocation" as location,
        COUNT(*) as count
      FROM 
        "Attendee"
      WHERE 
        "isCheckedIn" = true
        AND "checkedInAt" >= ${startOfDay}
        AND "checkedInAt" <= ${endOfDay}
    `;
    
    // Add eventId condition if needed
    if (eventIdParam) {
      locationSQL = Prisma.sql`${locationSQL} AND "eventId" = ${eventIdParam}`;
    }
    
    // Complete the query
    locationSQL = Prisma.sql`
      ${locationSQL}
      GROUP BY 
        "checkedInLocation"
      ORDER BY 
        count DESC
    `;
    
    const locationCheckins = await prisma.$queryRaw(locationSQL);
    
    // Format check-ins to include all necessary data for reports
    const formattedCheckins = recentCheckins.map(checkIn => ({
      id: checkIn.id,
      name: checkIn.name,
      email: checkIn.email,
      checkedInAt: checkIn.checkedInAt,
      location: checkIn.checkedInLocation || 'Unknown',
      checkedInBy: checkIn.checkedInBy ? {
        id: checkIn.checkedInBy.id,
        name: checkIn.checkedInBy.name,
        role: checkIn.checkedInBy.role
      } : null,
      event: checkIn.event ? {
        id: checkIn.event.id,
        name: checkIn.event.name
      } : null
    }));
    
    // Return combined data
    return NextResponse.json({
      success: true,
      day: day.toISOString().split('T')[0],
      attendees: formattedCheckins,
      stats: {
        checkedInToday,
        totalExpected,
        completionRate: totalExpected > 0 ? Math.round((checkedInToday / totalExpected) * 100) : 0
      },
      hourlyDistribution: hourlyCheckins,
      locationDistribution: locationCheckins
    });
    
  } catch (error) {
    console.error('Error fetching recent check-ins:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch recent check-ins',
        error: (error as Error).message
      },
      { status: 500 }
    );
  }
} 