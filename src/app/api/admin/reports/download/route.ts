import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth-utils';

/**
 * Generates mock report data based on report type
 */
function generateReportData(reportType: string) {
  switch (reportType) {
    case 'attendance':
      return [
        ['Day', 'Total Attendees', 'Checked In', 'Percentage'],
        ['Monday', '100', '87', '87%'],
        ['Tuesday', '100', '95', '95%'],
        ['Wednesday', '125', '128', '102%'], // Over 100% means additional walk-ins
        ['Thursday', '120', '113', '94%'],
        ['Friday', '103', '105', '102%'],
        ['Total', '548', '423', '77%']
      ];
    case 'resources':
      return [
        ['Resource Type', 'Total', 'Claimed', 'Percentage'],
        ['Welcome Kit', '548', '487', '89%'],
        ['Lunch Voucher', '548', '423', '77%'],
        ['Event Badge', '548', '510', '93%'],
        ['Swag Bag', '548', '375', '68%'],
        ['Total', '2192', '1795', '82%']
      ];
    case 'staff':
      return [
        ['Staff Name', 'Role', 'Activities'],
        ['John Doe', 'Check-in Staff', '38'],
        ['Jane Smith', 'Check-in Staff', '42'],
        ['Robert Johnson', 'Distribution Staff', '56'],
        ['Emily Wilson', 'Manager', '27'],
        ['Michael Brown', 'Check-in Staff', '33'],
        ['Total', '', '196']
      ];
    default:
      return [
        ['No data available for the selected report type']
      ];
  }
}

/**
 * Converts report data to CSV format
 */
function convertToCSV(data: string[][]) {
  return data.map(row => row.map(cell => {
    // Escape quotes and wrap in quotes if the cell contains a comma
    if (cell.includes('"') || cell.includes(',')) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  }).join(',')).join('\n');
}

/**
 * Converts report data to simple HTML table for PDF generation
 */
function convertToHTML(data: string[][], title: string) {
  const tableRows = data.map((row, index) => {
    if (index === 0) {
      // Header row
      return `<tr>${row.map(cell => `<th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">${cell}</th>`).join('')}</tr>`;
    } else {
      return `<tr>${row.map(cell => `<td style="border: 1px solid #ddd; padding: 8px;">${cell}</td>`).join('')}</tr>`;
    }
  }).join('');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th { text-align: left; }
        h1 { color: #333; }
        .report-date { color: #666; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="report-date">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
      <table>
        ${tableRows}
      </table>
    </body>
    </html>
  `;
}

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
    
    // Get parameters from the URL
    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get('type') || 'attendance';
    const format = searchParams.get('format') || 'csv';
    const token = searchParams.get('token');
    
    // Validate token (this would be more sophisticated in a real app)
    if (!token || !token.startsWith('mock-download-token-')) {
      return NextResponse.json(
        { error: 'Invalid download token' },
        { status: 400 }
      );
    }
    
    // Generate the report data
    const reportData = generateReportData(reportType);
    
    // Convert data to the requested format
    let content: string;
    let contentType: string;
    let fileName: string;
    
    switch (format) {
      case 'csv':
        content = convertToCSV(reportData);
        contentType = 'text/csv';
        fileName = `${reportType}-report-${Date.now()}.csv`;
        break;
      case 'excel':
        // For demo purposes, we'll just return CSV with an .xlsx extension
        content = convertToCSV(reportData);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        fileName = `${reportType}-report-${Date.now()}.xlsx`;
        break;
      case 'pdf':
        // For demo purposes, we'll just return HTML that could be converted to PDF
        content = convertToHTML(reportData, `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`);
        contentType = 'text/html';
        fileName = `${reportType}-report-${Date.now()}.html`;
        break;
      default:
        return NextResponse.json(
          { error: 'Unsupported format' },
          { status: 400 }
        );
    }
    
    // Set response headers for file download
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
    
    return new NextResponse(content, {
      status: 200,
      headers
    });
    
  } catch (error) {
    console.error('Error generating report download:', error);
    return NextResponse.json(
      { error: 'Failed to generate report download' },
      { status: 500 }
    );
  }
} 