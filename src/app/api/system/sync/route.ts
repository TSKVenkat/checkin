// API route for synchronizing data between instances
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorize } from '@/lib/auth/auth';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Check authorization (allow admin, check-in, and distribution roles)
    const authResult = await authorize(['admin', 'check-in', 'distribution'])(req);
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, message: authResult.message || 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await req.json();
    const { 
      offlineRecords,
      stationId,
      staffId,
      lastSyncTimestamp
    } = body;
    
    if (!offlineRecords || !Array.isArray(offlineRecords)) {
      return NextResponse.json(
        { success: false, message: 'Offline records are required and must be an array' },
        { status: 400 }
      );
    }
    
    if (!staffId) {
      return NextResponse.json(
        { success: false, message: 'Staff ID is required' },
        { status: 400 }
      );
    }
    
    // Process offline records and sync with database
    const results = {
      total: offlineRecords.length,
      processed: 0,
      skipped: 0,
      conflicts: 0,
      details: []
    };
    
    for (const record of offlineRecords) {
      try {
        const { type, attendeeId, data, timestamp } = record;
        
        // Validate record
        if (!type || !attendeeId || !data || !timestamp) {
          results.skipped++;
          results.details.push({
            attendeeId: attendeeId || 'unknown',
            status: 'skipped',
            reason: 'Missing required fields'
          });
          continue;
        }
        
        // Find the attendee
        const attendee = await prisma.attendee.findFirst({
          where: {
            OR: [
              { id: attendeeId },
              { uniqueId: attendeeId },
              { email: attendeeId }
            ]
          },
          include: {
            dailyRecords: true
          }
        });
        
        if (!attendee) {
          results.skipped++;
          results.details.push({
            attendeeId,
            status: 'skipped',
            reason: 'Attendee not found'
          });
          continue;
        }
        
        // Handle different record types
        switch (type) {
          case 'check-in':
            // Check for conflict (already checked in by another station)
            if (attendee.isCheckedIn && 
                attendee.checkedInAt && 
                attendee.checkedInAt > new Date(timestamp)) {
              results.conflicts++;
              results.details.push({
                attendeeId,
                status: 'conflict',
                reason: 'More recent check-in exists',
                serverTimestamp: attendee.checkedInAt
              });
              continue;
            }
            
            // Create today's date for daily records
            const checkInDate = new Date(timestamp);
            checkInDate.setHours(0, 0, 0, 0);
            
            // Use transaction to ensure all updates succeed or fail together
            await prisma.$transaction(async (tx) => {
              // Update check-in status
              await tx.attendee.update({
                where: { id: attendee.id },
                data: {
                  isCheckedIn: true,
                  checkedInAt: new Date(timestamp),
                  checkedInById: staffId,
                  checkedInLocation: data.location,
                  // Update emergency status
                  lastKnownCheckIn: new Date(timestamp),
                  currentZone: data.location
                }
              });
              
              // Find existing daily record for the check-in date
              const existingDailyRecord = attendee.dailyRecords.find(record => {
                const recordDate = new Date(record.date);
                recordDate.setHours(0, 0, 0, 0);
                return recordDate.getTime() === checkInDate.getTime();
              });
              
              if (existingDailyRecord) {
                // Update existing record
                await tx.dailyRecord.update({
                  where: { id: existingDailyRecord.id },
                  data: {
                    checkedIn: true,
                    checkedInAt: new Date(timestamp)
                  }
                });
              } else {
                // Create new daily record
                await tx.dailyRecord.create({
                  data: {
                    date: checkInDate,
                    checkedIn: true,
                    checkedInAt: new Date(timestamp),
                    lunchClaimed: false,
                    kitClaimed: false,
                    attendeeId: attendee.id
                  }
                });
              }
            });
            break;
            
          case 'resource':
            const resourceType = data.resourceType;
            
            // Check for conflict (already claimed)
            let isAlreadyClaimed = false;
            let claimedAt: Date | null = null;
            
            if (resourceType === 'lunch') {
              isAlreadyClaimed = attendee.lunchClaimed;
              claimedAt = attendee.lunchClaimedAt;
            } else if (resourceType === 'kit') {
              isAlreadyClaimed = attendee.kitClaimed;
              claimedAt = attendee.kitClaimedAt;
            }
            
            if (isAlreadyClaimed && claimedAt && claimedAt > new Date(timestamp)) {
              results.conflicts++;
              results.details.push({
                attendeeId,
                status: 'conflict',
                reason: `More recent ${resourceType} claim exists`,
                serverTimestamp: claimedAt
              });
              continue;
            }
            
            // Create date for daily records
            const resourceDate = new Date(timestamp);
            resourceDate.setHours(0, 0, 0, 0);
            
            // Use transaction to ensure all updates succeed or fail together
            await prisma.$transaction(async (tx) => {
              // Update resource claim
              const updateData: any = {};
              
              if (resourceType === 'lunch') {
                updateData.lunchClaimed = true;
                updateData.lunchClaimedAt = new Date(timestamp);
                updateData.lunchClaimedById = staffId;
                updateData.lunchClaimedLocation = data.location;
              } else if (resourceType === 'kit') {
                updateData.kitClaimed = true;
                updateData.kitClaimedAt = new Date(timestamp);
                updateData.kitClaimedById = staffId;
                updateData.kitClaimedLocation = data.location;
              }
              
              await tx.attendee.update({
                where: { id: attendee.id },
                data: updateData
              });
              
              // Find existing daily record for the resource date
              const existingDailyRecord = attendee.dailyRecords.find(record => {
                const recordDate = new Date(record.date);
                recordDate.setHours(0, 0, 0, 0);
                return recordDate.getTime() === resourceDate.getTime();
              });
              
              if (existingDailyRecord) {
                // Update existing record
                const recordUpdateData: any = {};
                
                if (resourceType === 'lunch') {
                  recordUpdateData.lunchClaimed = true;
                  recordUpdateData.lunchClaimedAt = new Date(timestamp);
                } else if (resourceType === 'kit') {
                  recordUpdateData.kitClaimed = true;
                  recordUpdateData.kitClaimedAt = new Date(timestamp);
                }
                
                await tx.dailyRecord.update({
                  where: { id: existingDailyRecord.id },
                  data: recordUpdateData
                });
              } else {
                // Create new daily record
                const newRecordData: any = {
                  date: resourceDate,
                  checkedIn: false,
                  attendeeId: attendee.id
                };
                
                if (resourceType === 'lunch') {
                  newRecordData.lunchClaimed = true;
                  newRecordData.lunchClaimedAt = new Date(timestamp);
                  newRecordData.kitClaimed = false;
                } else if (resourceType === 'kit') {
                  newRecordData.kitClaimed = true;
                  newRecordData.kitClaimedAt = new Date(timestamp);
                  newRecordData.lunchClaimed = false;
                }
                
                await tx.dailyRecord.create({
                  data: newRecordData
                });
              }
            });
            break;
            
          default:
            results.skipped++;
            results.details.push({
              attendeeId,
              status: 'skipped',
              reason: `Unknown record type: ${type}`
            });
            continue;
        }
        
        results.processed++;
        results.details.push({
          attendeeId,
          status: 'synced',
          type
        });
        
      } catch (error) {
        console.error('Sync record error:', error);
        results.skipped++;
        results.details.push({
          attendeeId: record.attendeeId || 'unknown',
          status: 'error',
          reason: (error as Error).message
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Sync completed',
      data: {
        results,
        syncTimestamp: new Date()
      }
    });
    
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 