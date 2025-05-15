import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth-utils';

// Mock activity data (in a real app, this would come from a database)
const mockActivities = [
  {
    id: '1',
    type: 'check-in',
    action: 'create',
    description: 'Attendee John Doe checked in',
    entityType: 'Attendee',
    entityId: 'att_123',
    metadata: { location: 'Main Entrance' },
    ipAddress: '192.168.1.1',
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
    staffId: '1',
    staff: {
      id: '1',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin'
    }
  },
  {
    id: '2',
    type: 'distribution',
    action: 'claim',
    description: 'Resource Welcome Kit claimed by Jane Smith',
    entityType: 'Resource',
    entityId: 'res_456',
    metadata: { resourceType: 'Welcome Kit', attendeeId: 'att_456' },
    ipAddress: '192.168.1.2',
    createdAt: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
    staffId: '2',
    staff: {
      id: '2',
      name: 'Staff User',
      email: 'staff@example.com',
      role: 'staff'
    }
  },
  {
    id: '3',
    type: 'admin',
    action: 'update',
    description: 'Event Tech Conference 2023 details updated',
    entityType: 'Event',
    entityId: 'evt_123',
    metadata: { 
      changes: [
        { field: 'location', from: 'Main Hall', to: 'Convention Center' },
        { field: 'startTime', from: '09:00', to: '10:00' }
      ] 
    },
    ipAddress: '192.168.1.3',
    createdAt: new Date(Date.now() - 5 * 60 * 60000).toISOString(),
    staffId: '1',
    staff: {
      id: '1',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin'
    }
  },
  {
    id: '4',
    type: 'security',
    action: 'login',
    description: 'User manager@example.com logged in',
    entityType: 'Staff',
    entityId: '3',
    metadata: { ipAddress: '192.168.1.4' },
    ipAddress: '192.168.1.4',
    createdAt: new Date(Date.now() - 12 * 60 * 60000).toISOString(),
    staffId: '3',
    staff: {
      id: '3',
      name: 'Manager User',
      email: 'manager@example.com',
      role: 'manager'
    }
  },
  {
    id: '5',
    type: 'emergency',
    action: 'activate',
    description: 'Emergency Fire Alert activated for event Tech Conference 2023',
    entityType: 'Event',
    entityId: 'evt_123',
    metadata: { emergencyType: 'Fire Alert', affectedZones: ['Main Hall', 'Entrance'] },
    ipAddress: '192.168.1.5',
    createdAt: new Date(Date.now() - 5 * 60 * 60000).toISOString(),
    staffId: '1',
    staff: {
      id: '1',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin'
    }
  },
  {
    id: '6',
    type: 'check-in',
    action: 'create',
    description: 'Attendee Sarah Williams checked in',
    entityType: 'Attendee',
    entityId: 'att_789',
    metadata: { location: 'VIP Entrance' },
    ipAddress: '192.168.1.6',
    createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
    staffId: '2',
    staff: {
      id: '2',
      name: 'Staff User',
      email: 'staff@example.com',
      role: 'staff'
    }
  },
  {
    id: '7',
    type: 'system',
    action: 'backup',
    description: 'System backup completed successfully',
    entityType: 'System',
    entityId: 'sys_1',
    metadata: { backupSize: '1.2GB', duration: '45s' },
    ipAddress: '192.168.1.7',
    createdAt: new Date(Date.now() - 8 * 60 * 60000).toISOString(),
    staffId: '1',
    staff: {
      id: '1',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin'
    }
  }
];

// Mock staff data
const mockStaff = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin'
  },
  {
    id: '2',
    name: 'Staff User',
    email: 'staff@example.com',
    role: 'staff'
  },
  {
    id: '3',
    name: 'Manager User',
    email: 'manager@example.com',
    role: 'manager'
  }
];

export async function GET(req: NextRequest) {
  try {
    // Verify authentication and authorization
    const authResult = await verifyAuth(req);
    
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }
    
    // Check if user has admin or manager role
    if (!['admin', 'manager'].includes(authResult.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    // Apply filtering if query parameters exist
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const staffId = searchParams.get('staffId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    let filteredActivities = [...mockActivities];
    
    // Filter by type
    if (type && type !== 'all') {
      filteredActivities = filteredActivities.filter(activity => activity.type === type);
    }
    
    // Filter by staff
    if (staffId && staffId !== 'all') {
      filteredActivities = filteredActivities.filter(activity => activity.staffId === staffId);
    }
    
    // Filter by date range
    if (startDate) {
      const startTimestamp = new Date(startDate).getTime();
      filteredActivities = filteredActivities.filter(activity => 
        new Date(activity.createdAt).getTime() >= startTimestamp
      );
    }
    
    if (endDate) {
      const endTimestamp = new Date(endDate).getTime() + (24 * 60 * 60 * 1000); // Add one day to include the end date
      filteredActivities = filteredActivities.filter(activity => 
        new Date(activity.createdAt).getTime() <= endTimestamp
      );
    }
    
    // Sort by most recent first
    filteredActivities.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    // Pagination
    const total = filteredActivities.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedActivities = filteredActivities.slice(startIndex, endIndex);
    
    return NextResponse.json({
      success: true,
      data: paginatedActivities,
      pagination: {
        total,
        page,
        limit,
        totalPages
      },
      staffList: mockStaff
    });
    
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
} 