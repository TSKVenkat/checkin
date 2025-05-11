// Type definitions for Prisma models
// These are simplified types designed to be used in the application
// and may exclude some Prisma-specific fields

import { Attendee, Staff, Event, Resource, OTP, DailyRecord } from '../../generated/prisma';

// Simplified types for use in the application
export type AttendeeWithoutRelations = Omit<Attendee, 
  'checkedInBy' | 'lunchClaimedBy' | 'kitClaimedBy' | 'dailyRecords'
>;

export type StaffWithoutRelations = Omit<Staff, 
  'activeSessions' | 'checkedInAttendees' | 'lunchClaimedAttendees' | 'kitClaimedAttendees' | 'activatedEmergencies'
>;

export type EventWithoutRelations = Omit<Event, 
  'locations' | 'resources' | 'emergencyActivatedBy'
>;

export type ResourceWithoutRelations = Omit<Resource, 
  'event'
>;

export type OTPData = Pick<OTP, 
  'email' | 'otp' | 'type' | 'expiresAt'
>;

export type DailyRecordWithoutRelations = Omit<DailyRecord,
  'attendee'
>;

// Auth related types
export interface UserPayload {
  id: string;
  email: string;
  role: string;
  permissions: string[];
} 