import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';
import { generateSecureId } from '@/lib/qr/idGenerator';
import { generateSecureQRCode } from '@/lib/qr/generator';
import prisma from '@/lib/prisma';
import { authorize } from '@/lib/auth/authorize';
import fs from 'fs';
import path from 'path';
import { processAttendeesCSV } from '@/lib/csv/processor';
import crypto from 'crypto';

// Allowed roles for uploading attendees
const ALLOWED_ROLES = ['admin', 'manager'];
// Required permissions
const REQUIRED_PERMISSIONS = ['create:attendees'];

interface RawAttendeeData {
  name: string;
  email: string;
  phone: string;
  role: string;
  [key: string]: string;
}

interface ProcessedAttendee {
  name: string;
  email: string;
  phone: string;
  role: string;
  uniqueId: string;
  qrCodeUrl: string;
}

interface ImportResult {
  success: boolean;
  totalProcessed: number;
  successful: number;
  duplicates: number;
  invalid: number;
  errorDetails?: any[];
  attendees?: ProcessedAttendee[];
}

export async function POST(req: NextRequest) {
  try {
    // Authorize the request
    const authResult = await authorize(ALLOWED_ROLES)(req);
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, message: authResult.message || 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get event secret from environment or generate a consistent one
    const eventSecret = process.env.EVENT_SECRET || 'change-this-in-production';

    // Parse the multipart form data
    const formData = await req.formData();
    const csvFile = formData.get('file') as File | null;
    const sendEmails = formData.get('sendEmails') === 'true';
    const eventId = formData.get('eventId') as string;

    // Validate input
    if (!csvFile) {
      return NextResponse.json(
        { success: false, message: 'No CSV file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!csvFile.name.endsWith('.csv')) {
      return NextResponse.json(
        { success: false, message: 'File must be a CSV' },
        { status: 400 }
      );
    }

    // Validate event ID if provided
    if (eventId) {
      const event = await prisma.event.findUnique({
        where: { id: eventId }
      });

      if (!event) {
        return NextResponse.json(
          { success: false, message: 'Event not found' },
          { status: 404 }
        );
      }
    }

    // Convert file to text
    const csvText = await csvFile.text();

    // Verify file is not empty
    if (!csvText.trim()) {
      return NextResponse.json(
        { success: false, message: 'CSV file is empty' },
        { status: 400 }
      );
    }

    // Process the CSV data
    const result = await processAttendeesCSV(csvText, eventSecret, sendEmails);

    // Return the processing result
    return NextResponse.json({
      success: result.success,
      message: result.message,
      stats: {
        processed: result.processed,
        duplicates: result.duplicates,
        errors: result.errors.length,
      },
      errors: result.errors,
    });
  } catch (error) {
    console.error('Attendee upload error:', error);
    return NextResponse.json(
      { success: false, message: `Server error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

/**
 * Validates an individual attendee record
 */
function validateAttendeeData(attendee: RawAttendeeData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for required fields
  if (!attendee.name || attendee.name.trim() === '') {
    errors.push('Name is required');
  }
  
  if (!attendee.email || attendee.email.trim() === '') {
    errors.push('Email is required');
  } else {
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(attendee.email)) {
      errors.push('Invalid email format');
    }
  }
  
  if (!attendee.phone || attendee.phone.trim() === '') {
    errors.push('Phone is required');
  }
  
  if (!attendee.role || attendee.role.trim() === '') {
    errors.push('Role is required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Processes a CSV file and imports attendees into the database
 */
async function processAttendeeCSV(
  csvData: string,
  eventSecret: string
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    totalProcessed: 0,
    successful: 0,
    duplicates: 0,
    invalid: 0,
    errorDetails: [],
    attendees: []
  };
  
  try {
    // Parse CSV data
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as RawAttendeeData[];
    
    result.totalProcessed = records.length;
    
    // Process each record
    for (const record of records) {
      try {
        // Validate the attendee data
        const { valid, errors } = validateAttendeeData(record);
        
        if (!valid) {
          result.invalid++;
          result.errorDetails?.push({
            email: record.email || 'Unknown',
            errors
          });
          continue;
        }
        
        // Check for duplicate emails in database
        const existingAttendee = await prisma.attendee.findUnique({
          where: { email: record.email }
        });
        
        if (existingAttendee) {
          result.duplicates++;
          result.errorDetails?.push({
            email: record.email,
            errors: ['Duplicate email address']
          });
          continue;
        }
        
        // Generate secure identifier
        const uniqueId = generateSecureId(record, eventSecret);
        
        // Generate QR code
        const qrCodeUrl = await generateSecureQRCode(uniqueId, eventSecret);
        
        // Create the attendee record
        const newAttendee = await prisma.attendee.create({
          data: {
            name: record.name,
            email: record.email,
            phone: record.phone,
            role: record.role,
            uniqueId,
            qrCodeUrl,
            isCheckedIn: false,
            lunchClaimed: false,
            kitClaimed: false,
            safetyConfirmed: false,
            version: 1
          }
        });
        
        // Add to success list
        result.successful++;
        result.attendees?.push({
          name: record.name,
          email: record.email,
          phone: record.phone,
          role: record.role,
          uniqueId,
          qrCodeUrl
        });
        
      } catch (error) {
        result.invalid++;
        result.errorDetails?.push({
          email: record.email || 'Unknown',
          errors: [(error as Error).message]
        });
      }
    }
    
    // Generate backup file with mappings
    const timestamp = new Date().toISOString().replace(/[:.-]/g, '_');
    const backupFileName = `attendees_mapping_${timestamp}.json`;
    const backupDir = path.join(process.cwd(), 'backups');
    
    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Write backup file
    fs.writeFileSync(
      path.join(backupDir, backupFileName),
      JSON.stringify(result.attendees, null, 2)
    );
    
    result.success = true;
    return result;
    
  } catch (error) {
    return {
      ...result,
      success: false,
      errorDetails: [{ message: (error as Error).message }]
    };
  }
}

// Allow uploads up to 10MB (CSV files should be much smaller)
export const config = {
  api: {
    bodyParser: false,
    responseLimit: '10mb',
  },
}; 