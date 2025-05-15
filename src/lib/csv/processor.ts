import { parse } from 'csv-parse';
import { generateSecureId, generateSecureQRCode } from '@/lib/qr/generator';
import prisma from '@/lib/prisma';
import { sendAttendeeQRCode } from '@/lib/email/mailer';
import crypto from 'crypto';

// Types for CSV processing
export interface AttendeeInput {
  name: string;
  email: string;
  phone: string;
  role: string;
}

export interface AttendeeWithId extends AttendeeInput {
  uniqueId: string;
  qrCodeUrl: string;
}

export interface CSVProcessingResult {
  success: boolean;
  message: string;
  processed: number;
  duplicates: number;
  errors: { line: number; error: string }[];
  attendees?: AttendeeWithId[];
}

/**
 * Process a CSV file containing attendee information
 * Validates data, detects duplicates, generates secure IDs and QR codes
 */
export async function processAttendeesCSV(
  csvData: string,
  eventSecret: string,
  sendEmails: boolean = false
): Promise<CSVProcessingResult> {
  return new Promise((resolve) => {
    // Create parser
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const attendees: AttendeeWithId[] = [];
    const errors: { line: number; error: string }[] = [];
    let processed = 0;
    let duplicates = 0;
    let lineNumber = 1;

    // Track emails to detect duplicates within the CSV
    const emails = new Set<string>();

    // Stream handling
    parser.on('readable', async function() {
      let record: any;
      while ((record = parser.read()) !== null) {
        lineNumber++;
        try {
          // Validate required fields
          if (!record.name || !record.email || !record.phone || !record.role) {
            errors.push({
              line: lineNumber,
              error: 'Missing required fields (name, email, phone, role)'
            });
            continue;
          }

          // Validate name
          const name = record.name.trim();
          if (name.length < 2) {
            errors.push({
              line: lineNumber,
              error: `Name is too short: ${name}`
            });
            continue;
          }

          // Normalize and validate email
          const email = record.email.toLowerCase().trim();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push({
              line: lineNumber,
              error: `Invalid email format: ${email}`
            });
            continue;
          }

          // Validate phone
          const phone = record.phone.trim();
          if (phone.length < 5) {
            errors.push({
              line: lineNumber,
              error: `Phone number is too short: ${phone}`
            });
            continue;
          }

          // Validate role
          const role = record.role.trim();
          if (!role) {
            errors.push({
              line: lineNumber,
              error: 'Role cannot be empty'
            });
            continue;
          }

          // Check for duplicates in the current CSV
          if (emails.has(email)) {
            duplicates++;
            errors.push({
              line: lineNumber,
              error: `Duplicate email in CSV: ${email}`
            });
            continue;
          }

          // Check for existing attendee in database
          const existingAttendee = await prisma.attendee.findUnique({
            where: { email }
          });

          if (existingAttendee) {
            duplicates++;
            errors.push({
              line: lineNumber,
              error: `Email already exists in database: ${email}`
            });
            continue;
          }

          // Add email to set to track duplicates
          emails.add(email);

          // Process attendee
          const attendeeData = {
            name: name,
            email: email,
            phone: phone,
            role: role
          };

          // Generate secure attendee ID
          const uniqueId = generateSecureId(attendeeData, eventSecret);
          
          // Generate QR code
          const qrCodeUrl = await generateSecureQRCode(uniqueId, eventSecret);

          // Add to processed attendees
          attendees.push({
            ...attendeeData,
            uniqueId,
            qrCodeUrl
          });

          processed++;
        } catch (error) {
          console.error('Error processing line', lineNumber, error);
          errors.push({
            line: lineNumber,
            error: `Processing error: ${(error as Error).message}`
          });
        }
      }
    });

    // Handle parsing completion
    parser.on('end', async () => {
      try {
        // Store attendees in database
        if (attendees.length > 0) {
          // Use transaction for atomic operations
          const savedAttendees = await prisma.$transaction(
            attendees.map((attendee) => 
              prisma.attendee.create({
                data: {
                  name: attendee.name,
                  email: attendee.email,
                  phone: attendee.phone,
                  role: attendee.role,
                  uniqueId: attendee.uniqueId,
                  qrCodeUrl: attendee.qrCodeUrl,
                },
              })
            )
          );

          // Send QR codes via email if requested
          if (sendEmails) {
            // Get first event for email info
            const event = await prisma.event.findFirst({
              orderBy: { startDate: 'asc' }
            });

            const eventName = event?.name || 'Upcoming Event';

            // Send emails in batches to avoid overwhelming the email service
            const batchSize = 10;
            for (let i = 0; i < attendees.length; i += batchSize) {
              const batch = attendees.slice(i, i + batchSize);
              await Promise.all(
                batch.map((attendee) =>
                  sendAttendeeQRCode(
                    attendee.email,
                    attendee.name,
                    eventName,
                    attendee.qrCodeUrl,
                    attendee.uniqueId
                  )
                )
              );
              
              // Small delay between batches
              if (i + batchSize < attendees.length) {
                await new Promise(r => setTimeout(r, 1000));
              }
            }
          }
        }

        resolve({
          success: processed > 0,
          message: processed > 0
            ? `Successfully processed ${processed} attendees`
            : 'No valid attendees found in CSV',
          processed,
          duplicates,
          errors,
          attendees: attendees.length > 0 ? attendees : undefined,
        });
      } catch (error) {
        console.error('Database processing error:', error);
        resolve({
          success: false,
          message: `Database error: ${(error as Error).message}`,
          processed: 0,
          duplicates,
          errors: [
            ...errors,
            { line: 0, error: `Database error: ${(error as Error).message}` },
          ],
        });
      }
    });

    // Handle parsing errors
    parser.on('error', (error) => {
      resolve({
        success: false,
        message: `CSV parsing error: ${error.message}`,
        processed: 0,
        duplicates: 0,
        errors: [{ line: 0, error: `Parsing error: ${error.message}` }],
      });
    });

    // Write data to the parser
    parser.write(csvData);
    parser.end();
  });
}

/**
 * Create a template CSV string for attendee imports
 */
export function generateTemplateCSV(): string {
  return 'name,email,phone,role,company,title\nJohn Doe,john@example.com,1234567890,Attendee,Acme Inc,Software Engineer\nJane Smith,jane@example.com,0987654321,VIP,Tech Corp,Product Manager';
} 