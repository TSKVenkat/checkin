// API route for uploading and processing attendee CSV data
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/dbConnect';
import { processAttendeeCSV } from '@/lib/csv/csvProcessor';
import { authorize } from '@/lib/auth/auth';

const EVENT_SECRET = process.env.EVENT_SECRET || 'your-event-secret-change-in-production';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Check authorization (require admin role)
    const authResult = await authorize(['admin'])(req);
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, message: authResult.message || 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Connect to database
    await dbConnect();
    
    // Handle multipart form data using FormData API
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file uploaded' },
        { status: 400 }
      );
    }
    
    // Check if it's a CSV file
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { success: false, message: 'Uploaded file must be a CSV file' },
        { status: 400 }
      );
    }
    
    // Read the file content
    const csvData = await file.text();
    
    // Process the CSV data
    const result = await processAttendeeCSV(csvData, EVENT_SECRET);
    
    // Return the result
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Attendees processed successfully',
        stats: {
          totalProcessed: result.totalProcessed,
          successful: result.successful,
          duplicates: result.duplicates,
          invalid: result.invalid
        }
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to process attendees',
          stats: {
            totalProcessed: result.totalProcessed,
            successful: result.successful,
            duplicates: result.duplicates,
            invalid: result.invalid
          },
          errors: result.errorDetails
        },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('CSV upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Increase payload size limit for CSV uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}; 