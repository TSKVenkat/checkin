import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth-utils';

// Mock reports data (in a real app, this would come from a database)
const mockAttendanceReport = {
  totalAttendees: 548,
  checkedIn: 423,
  checkedInPercentage: 77,
  byDay: [
    { day: 'Monday', count: 87, percentage: 16 },
    { day: 'Tuesday', count: 95, percentage: 17 },
    { day: 'Wednesday', count: 128, percentage: 23 },
    { day: 'Thursday', count: 113, percentage: 21 },
    { day: 'Friday', count: 105, percentage: 19 },
  ],
};

const mockResourcesReport = {
  totalResources: 1200,
  distributed: 892,
  distributedPercentage: 74,
  byType: [
    { type: 'Welcome Kit', total: 548, claimed: 487, percentage: 89 },
    { type: 'Lunch Voucher', total: 548, claimed: 423, percentage: 77 },
    { type: 'Event Badge', total: 548, claimed: 510, percentage: 93 },
    { type: 'Swag Bag', total: 548, claimed: 375, percentage: 68 },
  ],
};

const mockStaffActivityReport = {
  totalStaff: 24,
  activeToday: 18,
  averageCheckins: 23,
  byStaff: [
    { name: 'John Doe', role: 'Check-in Staff', activities: 38 },
    { name: 'Jane Smith', role: 'Check-in Staff', activities: 42 },
    { name: 'Robert Johnson', role: 'Distribution Staff', activities: 56 },
    { name: 'Emily Wilson', role: 'Manager', activities: 27 },
    { name: 'Michael Brown', role: 'Check-in Staff', activities: 33 },
  ],
};

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
    
    // Get report type from query parameters
    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get('type') || 'attendance';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    let reportData;
    
    // Select the report based on type
    switch (reportType) {
      case 'attendance':
        reportData = mockAttendanceReport;
        break;
      case 'resources':
        reportData = mockResourcesReport;
        break;
      case 'staff':
        reportData = mockStaffActivityReport;
        break;
      default:
        reportData = mockAttendanceReport;
    }
    
    // In a real app, we would filter by date range here
    // For now, we'll just return the mock data
    
    return NextResponse.json({
      success: true,
      data: reportData,
      reportType,
      dateRange: { startDate, endDate }
    });
    
  } catch (error) {
    console.error('Error fetching report data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report data' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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
    
    // Parse the request body
    const { reportType, format, dateRange } = await req.json();
    
    // In a real app, this would generate and return a report file
    // For now, we'll just return a success message
    
    return NextResponse.json({
      success: true,
      message: `Report ${reportType} exported successfully in ${format} format`,
      downloadUrl: `/api/admin/reports/download?type=${reportType}&format=${format}&token=mock-download-token-${Date.now()}`,
    });
    
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
} 