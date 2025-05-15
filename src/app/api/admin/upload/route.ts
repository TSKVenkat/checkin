import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth-utils';
import prisma from '@/lib/prisma';
import * as csv from 'csv-parse/sync';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// Function to generate a unique QR code
function generateUniqueId() {
  return crypto.randomBytes(8).toString('hex');
}

// Function to create a QR code URL (in real implementation, you'd actually generate and store a QR code image)
function generateQrCodeUrl(uniqueId: string) {
  return `/api/qr/${uniqueId}`;
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
    
    // Only admin users can upload data
    if (authResult.user?.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Admin access required for data upload' },
        { status: 403 }
      );
    }
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    if (!type) {
      return NextResponse.json(
        { error: 'Upload type is required' },
        { status: 400 }
      );
    }
    
    // Check file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Only CSV files are supported' },
        { status: 400 }
      );
    }
    
    // Read file content
    const fileContent = await file.text();
    
    // Parse CSV
    let records;
    try {
      records = csv.parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
      
      if (records.length === 0) {
        return NextResponse.json(
          { error: 'CSV file is empty or has no valid data rows' },
          { status: 400 }
        );
      }
    } catch (csvError) {
      console.error('CSV parsing error:', csvError);
      return NextResponse.json(
        { error: `Invalid CSV format: ${csvError instanceof Error ? csvError.message : 'Unknown parsing error'}` },
        { status: 400 }
      );
    }
    
    // Process based on type
    let results;
    
    switch (type) {
      case 'attendees':
        results = await processAttendees(records);
        break;
      case 'events':
        results = await processEvents(records);
        break;
      case 'staff':
        results = await processStaff(records);
        break;
      case 'resources':
        results = await processResources(records);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown upload type: ${type}` },
          { status: 400 }
        );
    }
    
    // Record activity log
    await recordActivityLog(authResult.user?.id || 'unknown', `Uploaded ${type} data`, `Uploaded ${records.length} ${type} records`);
    
    // Return success response with results
    return NextResponse.json({
      success: true,
      message: `Successfully processed ${file.name}`,
      results,
      filename: file.name,
      type,
      size: file.size
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process upload',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : null
      },
      { status: 500 }
    );
  }
}

async function recordActivityLog(userId: string, action: string, details: string) {
  try {
    await prisma.activityLog.create({
      data: {
        staffId: userId,
        action,
        description: details,
        type: 'admin',
        ipAddress: 'N/A', // In a real implementation, get from request
        userAgent: 'N/A'  // In a real implementation, get from request
      }
    });
  } catch (error) {
    console.error('Error recording activity log:', error);
    // Don't throw error to avoid stopping the main process
  }
}

async function processAttendees(records: any[]) {
  let created = 0;
  let updated = 0;
  let errors = 0;
  const errorDetails = [];
  
  // Process records one by one to avoid transaction timeout
  for (const record of records) {
    try {
      if (!record.email || !record.name || !record.phone || !record.role) {
        throw new Error('Missing required fields (name, email, phone, or role)');
      }
      
      // Check if attendee already exists
      const existingAttendee = await prisma.attendee.findUnique({
        where: { email: record.email }
      });

      // Verify eventId exists if provided
      let validatedEventId = null;
      if (record.eventId) {
        const eventExists = await prisma.event.findUnique({
          where: { id: record.eventId }
        });
        
        if (!eventExists) {
          throw new Error(`Event with ID ${record.eventId} does not exist`);
        }
        validatedEventId = record.eventId;
      }
      
      if (existingAttendee) {
        // Update existing attendee
        await prisma.attendee.update({
          where: { id: existingAttendee.id },
          data: {
            name: record.name,
            phone: record.phone,
            role: record.role,
            // Only update eventId if it's valid
            ...(validatedEventId ? { eventId: validatedEventId } : {})
            // Don't override uniqueId and qrCodeUrl for existing attendees
          }
        });
        updated++;
      } else {
        // Generate unique identifiers for new attendees
        const uniqueId = generateUniqueId();
        const qrCodeUrl = generateQrCodeUrl(uniqueId);
        
        // Create new attendee
        await prisma.attendee.create({
          data: {
            name: record.name,
            email: record.email,
            phone: record.phone,
            role: record.role,
            uniqueId,
            qrCodeUrl,
            eventId: validatedEventId, // Use validated eventId
            // Optional fields from CSV
            tags: record.tags ? record.tags.split(',').map((tag: string) => tag.trim()) : [],
            notes: record.notes || null,
          }
        });
        created++;
      }
    } catch (error) {
      errors++;
      errorDetails.push({
        record: record.email || record.name || 'Unknown',
        error: (error as Error).message
      });
      console.error('Error processing attendee:', error);
      // Continue processing other records
    }
  }
  
  return { total: records.length, created, updated, errors, errorDetails };
}

async function processEvents(records: any[]) {
  let created = 0;
  let updated = 0;
  let errors = 0;
  const errorDetails = [];
  
  // Process records one by one to avoid transaction timeout
  for (const record of records) {
    try {
      if (!record.name || !record.startDate || !record.endDate) {
        throw new Error('Missing required fields (name, startDate, or endDate)');
      }
      
      const startDate = new Date(record.startDate);
      const endDate = new Date(record.endDate);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format for startDate or endDate');
      }
      
      // Check if event already exists by ID or name
      const existingEvent = record.id 
        ? await prisma.event.findUnique({ where: { id: record.id } })
        : await prisma.event.findFirst({ where: { name: record.name } });
      
      if (existingEvent) {
        // Update existing event
        await prisma.event.update({
          where: { id: existingEvent.id },
          data: {
            name: record.name,
            description: record.description || existingEvent.description,
            startDate,
            endDate,
            venue: record.location || existingEvent.venue,
            status: record.status || existingEvent.status,
            maxAttendees: record.capacity ? parseInt(record.capacity) : existingEvent.maxAttendees,
            timezone: record.timezone || existingEvent.timezone,
            isPublic: record.isPublic === 'true' || existingEvent.isPublic,
            organizer: record.organizer || existingEvent.organizer,
          }
        });
        updated++;
      } else {
        // Create new event
        await prisma.event.create({
          data: {
            id: record.id || uuidv4(),
            name: record.name,
            description: record.description || null,
            startDate,
            endDate,
            venue: record.location || null,
            status: record.status || 'draft',
            maxAttendees: record.capacity ? parseInt(record.capacity) : null,
            timezone: record.timezone || 'UTC',
            isPublic: record.isPublic === 'true',
            organizer: record.organizer || null,
          }
        });
        created++;
      }
    } catch (error) {
      errors++;
      errorDetails.push({
        record: record.name || record.id || 'Unknown',
        error: (error as Error).message
      });
      console.error('Error processing event:', error);
    }
  }
  
  return { total: records.length, created, updated, errors, errorDetails };
}

async function processStaff(records: any[]) {
  let created = 0;
  let updated = 0;
  let errors = 0;
  const errorDetails = [];
  
  // Process records one by one to avoid transaction timeout
  for (const record of records) {
    try {
      if (!record.email || !record.firstName || !record.lastName || !record.role) {
        throw new Error('Missing required fields (email, firstName, lastName, or role)');
      }
      
      // Check if staff already exists
      const existingStaff = record.id 
        ? await prisma.staff.findUnique({ where: { id: record.id } })
        : await prisma.staff.findUnique({ where: { email: record.email } });
      
      // Generate a temporary password for new staff members
      const tempPassword = crypto.randomBytes(8).toString('hex');
      const passwordHash = crypto.createHash('sha256').update(tempPassword).digest('hex');
      
      const fullName = `${record.firstName} ${record.lastName}`;
      
      if (existingStaff) {
        // Update existing staff
        await prisma.staff.update({
          where: { id: existingStaff.id },
          data: {
            name: fullName,
            role: record.role,
            department: record.department || existingStaff.department,
            phoneNumber: record.phone || existingStaff.phoneNumber,
            // Don't update password for existing staff
          }
        });
        updated++;
      } else {
        // Create new staff
        await prisma.staff.create({
          data: {
            id: record.id || uuidv4(),
            name: fullName,
            email: record.email,
            role: record.role,
            passwordHash,
            department: record.department || null,
            phoneNumber: record.phone || null,
            permissions: record.permissions ? 
              record.permissions.split(',').map((p: string) => p.trim()) : 
              ["basic"], // Default permissions
          }
        });
        created++;
        
        // In a real implementation, you would send an email with the temporary password
        // and a link to reset it
        console.log(`New staff created: ${fullName}, temp password: ${tempPassword}`);
      }
    } catch (error) {
      errors++;
      errorDetails.push({
        record: record.email || `${record.firstName} ${record.lastName}` || 'Unknown',
        error: (error as Error).message
      });
      console.error('Error processing staff:', error);
    }
  }
  
  return { total: records.length, created, updated, errors, errorDetails };
}

async function processResources(records: any[]) {
  let created = 0;
  let updated = 0;
  let errors = 0;
  const errorDetails = [];
  
  // Process records one by one to avoid transaction timeout
  for (const record of records) {
    try {
      if (!record.name || !record.type || !record.quantity) {
        throw new Error('Missing required fields (name, type, or quantity)');
      }

      // Parse the quantity to ensure it's a valid number
      const totalQuantity = parseInt(record.quantity);
      if (isNaN(totalQuantity) || totalQuantity < 0) {
        throw new Error('Quantity must be a valid positive number');
      }
      
      // Calculate low threshold if not provided (default to 10% of total)
      const lowThreshold = record.lowThreshold ? 
        parseInt(record.lowThreshold) : 
        Math.max(Math.floor(totalQuantity * 0.1), 1);
      
      // Verify eventId exists if provided
      let validatedEventId = null;
      if (record.eventId) {
        const eventExists = await prisma.event.findUnique({
          where: { id: record.eventId }
        });
        
        if (!eventExists) {
          throw new Error(`Event with ID ${record.eventId} does not exist`);
        }
        validatedEventId = record.eventId;
      }
      
      // Check if resource already exists
      const existingResource = record.id 
        ? await prisma.resource.findUnique({ where: { id: record.id } })
        : await prisma.resource.findFirst({ 
            where: { 
              name: record.name,
              eventId: validatedEventId
            } 
          });
      
      if (existingResource) {
        // Update existing resource
        await prisma.resource.update({
          where: { id: existingResource.id },
          data: {
            name: record.name,
            type: record.type,
            totalQuantity,
            lowThreshold,
            description: record.description || existingResource.description,
            location: record.location || existingResource.location,
            // Only update eventId if we have validated it
            ...(validatedEventId ? { eventId: validatedEventId } : {})
          }
        });
        updated++;
      } else {
        // We need a valid eventId for new resources
        if (!validatedEventId) {
          throw new Error('Valid eventId is required for new resources');
        }
        
        // Create new resource
        await prisma.resource.create({
          data: {
            id: record.id || uuidv4(),
            name: record.name,
            type: record.type,
            totalQuantity,
            lowThreshold,
            description: record.description || null,
            location: record.location || null,
            eventId: validatedEventId
          }
        });
        created++;
      }
    } catch (error) {
      errors++;
      errorDetails.push({
        record: record.name || record.id || 'Unknown',
        error: (error as Error).message
      });
      console.error('Error processing resource:', error);
    }
  }
  
  return { total: records.length, created, updated, errors, errorDetails };
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
    
    // Check if user has admin role
    if (authResult.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    // Return sample templates for different upload types
    return NextResponse.json({
      success: true,
      templates: {
        attendees: '/templates/attendees.csv',
        events: '/templates/events.csv',
        staff: '/templates/staff.csv',
        resources: '/templates/resources.csv'
      }
    });
    
  } catch (error) {
    console.error('Error fetching upload templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upload templates' },
      { status: 500 }
    );
  }
} 