/**
 * Activity Logger Service
 * 
 * A utility for logging activities across the application
 */
import axios from 'axios';

// Define activity types
export type ActivityType = 'check-in' | 'distribution' | 'admin' | 'security' | 'emergency' | 'system';

// Define action types
export type ActionType = 'create' | 'update' | 'delete' | 'view' | 'login' | 'logout' | 'activate' | 'deactivate' | 'claim' | 'export' | 'import';

// Define activity log payload type
export interface ActivityLogPayload {
  type: ActivityType;
  action: ActionType;
  description: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

/**
 * Log an activity to the activity log API
 * 
 * @param payload The activity log data
 * @returns A promise that resolves when the activity is logged
 */
export async function logActivity(payload: ActivityLogPayload): Promise<boolean> {
  try {
    // Call the API to log the activity
    const response = await axios.post('/api/activity/log', payload);
    
    if (response.status === 200 && response.data.success) {
      return true;
    }
    
    console.error('Failed to log activity:', response.data.message);
    return false;
  } catch (error) {
    console.error('Error logging activity:', error);
    
    // Don't throw errors - logging should never break application flow
    return false;
  }
}

/**
 * Helper for check-in related activities
 */
export const checkInActivities = {
  attendeeCheckedIn: (attendeeId: string, attendeeName: string, location?: string) => 
    logActivity({
      type: 'check-in',
      action: 'update',
      description: `Attendee ${attendeeName} checked in`,
      entityType: 'Attendee',
      entityId: attendeeId,
      metadata: { location }
    }),
  
  kitClaimed: (attendeeId: string, attendeeName: string, location?: string) =>
    logActivity({
      type: 'distribution',
      action: 'claim',
      description: `Welcome kit claimed by ${attendeeName}`,
      entityType: 'Attendee',
      entityId: attendeeId,
      metadata: { resource: 'kit', location }
    }),
  
  lunchClaimed: (attendeeId: string, attendeeName: string, location?: string) =>
    logActivity({
      type: 'distribution',
      action: 'claim',
      description: `Lunch claimed by ${attendeeName}`,
      entityType: 'Attendee',
      entityId: attendeeId,
      metadata: { resource: 'lunch', location }
    })
};

/**
 * Helper for admin related activities
 */
export const adminActivities = {
  staffCreated: (staffId: string, staffName: string, role: string) =>
    logActivity({
      type: 'admin',
      action: 'create',
      description: `New ${role} staff member ${staffName} created`,
      entityType: 'Staff',
      entityId: staffId,
      metadata: { role }
    }),
  
  staffUpdated: (staffId: string, staffName: string, changes: Record<string, any>) =>
    logActivity({
      type: 'admin',
      action: 'update',
      description: `Staff member ${staffName} updated`,
      entityType: 'Staff',
      entityId: staffId,
      metadata: { changes }
    }),
  
  staffDeleted: (staffId: string, staffName: string) =>
    logActivity({
      type: 'admin',
      action: 'delete',
      description: `Staff member ${staffName} deleted`,
      entityType: 'Staff',
      entityId: staffId
    }),
  
  eventCreated: (eventId: string, eventName: string) =>
    logActivity({
      type: 'admin',
      action: 'create',
      description: `New event ${eventName} created`,
      entityType: 'Event',
      entityId: eventId
    }),
  
  attendeesImported: (count: number, eventId?: string) =>
    logActivity({
      type: 'admin',
      action: 'import',
      description: `${count} attendees imported`,
      entityType: eventId ? 'Event' : undefined,
      entityId: eventId,
      metadata: { count }
    }),
  
  reportExported: (reportType: string, filters?: Record<string, any>) =>
    logActivity({
      type: 'admin',
      action: 'export',
      description: `${reportType} report exported`,
      metadata: { reportType, filters }
    })
};

/**
 * Helper for security related activities
 */
export const securityActivities = {
  userLoggedIn: (userId: string, email: string, ipAddress?: string) =>
    logActivity({
      type: 'security',
      action: 'login',
      description: `User ${email} logged in`,
      entityType: 'Staff',
      entityId: userId,
      metadata: { ipAddress }
    }),
  
  userLoggedOut: (userId: string, email: string) =>
    logActivity({
      type: 'security',
      action: 'logout',
      description: `User ${email} logged out`,
      entityType: 'Staff',
      entityId: userId
    }),
  
  passwordReset: (userId: string, email: string) =>
    logActivity({
      type: 'security',
      action: 'update',
      description: `Password reset for ${email}`,
      entityType: 'Staff',
      entityId: userId
    }),
  
  suspiciousActivity: (description: string, metadata?: Record<string, any>) =>
    logActivity({
      type: 'security',
      action: 'view',
      description,
      metadata
    })
};

/**
 * Helper for emergency related activities
 */
export const emergencyActivities = {
  emergencyActivated: (eventId: string, eventName: string, emergencyType: string, zones: string[]) =>
    logActivity({
      type: 'emergency',
      action: 'activate',
      description: `Emergency ${emergencyType} activated for event ${eventName}`,
      entityType: 'Event',
      entityId: eventId,
      metadata: { emergencyType, affectedZones: zones }
    }),
  
  emergencyDeactivated: (eventId: string, eventName: string, emergencyType: string) =>
    logActivity({
      type: 'emergency',
      action: 'deactivate',
      description: `Emergency ${emergencyType} deactivated for event ${eventName}`,
      entityType: 'Event',
      entityId: eventId,
      metadata: { emergencyType }
    }),
  
  attendeeSafetyConfirmed: (attendeeId: string, attendeeName: string, zone?: string) =>
    logActivity({
      type: 'emergency',
      action: 'update',
      description: `Safety confirmed for attendee ${attendeeName}`,
      entityType: 'Attendee',
      entityId: attendeeId,
      metadata: { zone }
    })
}; 