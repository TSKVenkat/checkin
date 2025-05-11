// API route for configuring resource alerts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/dbConnect';
import { Event } from '@/lib/db/models';
import { authorize } from '@/lib/auth/auth';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Check authorization (only admin can configure alerts)
    const authResult = await authorize(['admin'])(req);
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, message: authResult.message || 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Connect to database
    await dbConnect();
    
    // Parse request body
    const body = await req.json();
    const { 
      eventId, 
      resourceId, 
      lowThreshold 
    } = body;
    
    if (!eventId) {
      return NextResponse.json(
        { success: false, message: 'Event ID is required' },
        { status: 400 }
      );
    }
    
    if (!resourceId) {
      return NextResponse.json(
        { success: false, message: 'Resource ID is required' },
        { status: 400 }
      );
    }
    
    if (lowThreshold === undefined) {
      return NextResponse.json(
        { success: false, message: 'Low threshold value is required' },
        { status: 400 }
      );
    }
    
    // Get the event
    const event = await Event.findById(eventId);
    
    if (!event) {
      return NextResponse.json(
        { success: false, message: 'Event not found' },
        { status: 404 }
      );
    }
    
    // Find the resource
    const resourceIndex = event.resources.findIndex(
      r => r._id.toString() === resourceId
    );
    
    if (resourceIndex === -1) {
      return NextResponse.json(
        { success: false, message: 'Resource not found' },
        { status: 404 }
      );
    }
    
    // Update the resource's low threshold
    event.resources[resourceIndex].lowThreshold = lowThreshold;
    
    // Check if currently below threshold
    const remainingQuantity = 
      event.resources[resourceIndex].totalQuantity - 
      event.resources[resourceIndex].claimedQuantity;
    
    const isLow = remainingQuantity <= lowThreshold;
    
    await event.save();
    
    return NextResponse.json({
      success: true,
      message: 'Resource alert threshold updated',
      data: {
        resourceId,
        name: event.resources[resourceIndex].name,
        type: event.resources[resourceIndex].type,
        lowThreshold,
        remainingQuantity,
        isLow
      }
    });
    
  } catch (error) {
    console.error('Resource alert error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 