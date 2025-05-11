// API route for managing resource inventory
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/dbConnect';
import { Event } from '@/lib/db/models';
import { authorize } from '@/lib/auth/auth';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // Check authorization
    const authResult = await authorize(['admin', 'distribution'])(req);
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, message: authResult.message || 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Connect to database
    await dbConnect();
    
    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const eventId = searchParams.get('eventId');
    
    if (!eventId) {
      return NextResponse.json(
        { success: false, message: 'Event ID is required' },
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
    
    // Format resource data
    const resources = event.resources.map(resource => ({
      id: resource._id,
      name: resource.name,
      type: resource.type,
      totalQuantity: resource.totalQuantity,
      claimedQuantity: resource.claimedQuantity,
      remainingQuantity: resource.totalQuantity - resource.claimedQuantity,
      lowThreshold: resource.lowThreshold,
      isLow: (resource.totalQuantity - resource.claimedQuantity) <= resource.lowThreshold
    }));
    
    return NextResponse.json({
      success: true,
      data: resources
    });
    
  } catch (error) {
    console.error('Resource inventory error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Check authorization (only admin can modify resources)
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
      update 
    } = body;
    
    if (!eventId) {
      return NextResponse.json(
        { success: false, message: 'Event ID is required' },
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
    
    // If resourceId is provided, update an existing resource
    if (resourceId) {
      const resourceIndex = event.resources.findIndex(
        r => r._id.toString() === resourceId
      );
      
      if (resourceIndex === -1) {
        return NextResponse.json(
          { success: false, message: 'Resource not found' },
          { status: 404 }
        );
      }
      
      // Update the resource
      if (update.name) event.resources[resourceIndex].name = update.name;
      if (update.type) event.resources[resourceIndex].type = update.type;
      if (update.totalQuantity !== undefined) {
        event.resources[resourceIndex].totalQuantity = update.totalQuantity;
      }
      if (update.claimedQuantity !== undefined) {
        event.resources[resourceIndex].claimedQuantity = update.claimedQuantity;
      }
      if (update.lowThreshold !== undefined) {
        event.resources[resourceIndex].lowThreshold = update.lowThreshold;
      }
    }
    // Otherwise, add a new resource
    else if (update) {
      event.resources.push({
        name: update.name,
        type: update.type,
        totalQuantity: update.totalQuantity || 0,
        claimedQuantity: update.claimedQuantity || 0,
        lowThreshold: update.lowThreshold || 0
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'Resource data is required' },
        { status: 400 }
      );
    }
    
    await event.save();
    
    return NextResponse.json({
      success: true,
      message: resourceId ? 'Resource updated' : 'Resource added',
      data: event.resources
    });
    
  } catch (error) {
    console.error('Resource update error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 