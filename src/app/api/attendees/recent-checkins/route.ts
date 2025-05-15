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
    
    // Fetch recent check-ins
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
        uniqueId: true,
        checkedInAt: true,
        checkedInLocation: true,
        event: {
          select: {
            name: true
          }
        }
      }
    });

    // Get hourly check-in stats for today
    // For hourly stats, we'll do a direct SQL query for more efficiency
    // Define the query window (hours we want to show)
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    // Initialize results array with all hours
    const hourlyStats = hours.map(hour => {
      const hourStart = new Date(day);
      hourStart.setHours(hour, 0, 0, 0);
      
      const hourEnd = new Date(day);
      hourEnd.setHours(hour, 59, 59, 999);
      
      return {
        hour,
        count: 0,
        time: `${hour.toString().padStart(2, '0')}:00`
      };
    });
    
    // Create base SQL query
    let hourlyQuery = `
      SELECT 
        EXTRACT(HOUR FROM "checkedInAt") as hour,
        COUNT(*) as count
      FROM "Attendee"
      WHERE 
        "isCheckedIn" = true AND
        "checkedInAt" >= '${startOfDay.toISOString()}' AND
        "checkedInAt" <= '${endOfDay.toISOString()}'
    `;
    
    if (eventIdParam) {
      hourlyQuery += ` AND "eventId" = '${eventIdParam}'`;
    }
    
    hourlyQuery += `
      GROUP BY EXTRACT(HOUR FROM "checkedInAt")
      ORDER BY hour
    `;
    
    // Run the query as raw SQL
    const hourlyData = await prisma.$queryRawUnsafe(hourlyQuery);
    
    // Process the hourly results
    if (Array.isArray(hourlyData)) {
      hourlyData.forEach((row: any) => {
        const hourIndex = parseInt(row.hour);
        if (hourIndex >= 0 && hourIndex < 24) {
          hourlyStats[hourIndex].count = parseInt(row.count);
        }
      });
    }
    
    // Create location query with the same approach
    let locationQuery = `
      SELECT 
        COALESCE("checkedInLocation", 'Unknown') as location,
        COUNT(*) as count
      FROM "Attendee"
      WHERE 
        "isCheckedIn" = true AND
        "checkedInAt" >= '${startOfDay.toISOString()}' AND
        "checkedInAt" <= '${endOfDay.toISOString()}'
    `;
    
    if (eventIdParam) {
      locationQuery += ` AND "eventId" = '${eventIdParam}'`;
    }
    
    locationQuery += `
      GROUP BY "checkedInLocation"
      ORDER BY count DESC
    `;
    
    // Run the location query
    const locationData = await prisma.$queryRawUnsafe(locationQuery);
    
    // Format location stats
    const locationStats = Array.isArray(locationData) 
      ? locationData.map((row: any) => ({
          location: row.location || 'Unknown',
          count: parseInt(row.count)
        }))
      : [];
    
    // Get total check-ins for today
    const totalTodayCheckins = await prisma.attendee.count({
      where: whereClause
    });
    
    // Return all stats
    return NextResponse.json({
      success: true,
      data: {
        recentCheckins,
        hourlyStats,
        locationStats,
        totalToday: totalTodayCheckins
      }
    });
    
  } catch (error) {
    console.error('Error fetching recent check-ins:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to retrieve check-in data',
        error: (error as Error).message 
      },
      { status: 500 }
    );
  }
} 