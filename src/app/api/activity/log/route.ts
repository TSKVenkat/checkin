import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorize } from '@/lib/auth/authorize';

// Route to log new activities
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Authorize request - all logged in users can log activities
    const authResult = await authorize()(req);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.message || 'Unauthorized' },
        { status: authResult.status || 401 }
      );
    }

    const user = authResult.user;
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User information not found' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { 
      type, 
      action, 
      description, 
      entityType, 
      entityId, 
      metadata 
    } = body;

    // Basic validation
    if (!type || !action || !description) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: type, action, description' },
        { status: 400 }
      );
    }

    // Get IP address and user agent
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Create activity log entry
    const activityLog = await prisma.activityLog.create({
      data: {
        type,
        action,
        description,
        entityType: entityType || null,
        entityId: entityId || null,
        metadata: metadata || {},
        ipAddress: typeof ipAddress === 'string' && ipAddress.includes(',') 
          ? ipAddress.split(',')[0].trim() 
          : String(ipAddress),
        userAgent,
        staffId: user.id
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Activity logged successfully',
      data: { id: activityLog.id }
    });

  } catch (error) {
    console.error('Error logging activity:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to log activity' },
      { status: 500 }
    );
  }
}

// Route to get activity logs (with pagination and filtering)
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // Only admin and managers can view activity logs
    const authResult = await authorize(['admin', 'manager'])(req);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.message || 'Unauthorized' },
        { status: authResult.status || 401 }
      );
    }

    // Parse query parameters
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const type = url.searchParams.get('type');
    const staffId = url.searchParams.get('staffId');
    const entityType = url.searchParams.get('entityType');
    const entityId = url.searchParams.get('entityId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    // Build where clause for filtering
    const where: any = {};
    
    if (type) where.type = type;
    if (staffId) where.staffId = staffId;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    
    // Date range filtering
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Query for activities
    const [activities, totalCount] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          staff: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.activityLog.count({ where })
    ]);

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: activities,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages
      }
    });

  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
} 