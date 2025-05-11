'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import DateSelector from '@/components/DateSelector';
import DailyRecords from '@/components/DailyRecords';

interface Attendee {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  uniqueId: string;
  qrCodeUrl: string;
  registrationStatus: {
    isCheckedIn: boolean;
    checkedInAt?: string;
    checkedInLocation?: string;
  };
  resourceClaims: {
    lunch: {
      claimed: boolean;
      claimedAt?: string;
      claimedLocation?: string;
    };
    kit: {
      claimed: boolean;
      claimedAt?: string;
      claimedLocation?: string;
    };
  };
  emergencyStatus: {
    lastKnownCheckIn?: string;
    safetyConfirmed: boolean;
    safetyConfirmedAt?: string;
    currentZone?: string;
  };
  dailyRecords: Array<{
    date: string;
    checkedIn: boolean;
    checkedInAt?: string;
    lunchClaimed: boolean;
    lunchClaimedAt?: string;
    kitClaimed: boolean;
    kitClaimedAt?: string;
  }>;
}

interface Event {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export default function AttendeeDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const attendeeId = params.id as string;
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [attendee, setAttendee] = useState<Attendee | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Fetch attendee and event data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // In a real application, these would be actual API calls
        // For demo purposes, we'll use mock data
        
        // Mock attendee data
        const mockAttendee: Attendee = {
          _id: attendeeId,
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '+1 (555) 123-4567',
          role: 'Participant',
          uniqueId: 'u_123456',
          qrCodeUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA',
          registrationStatus: {
            isCheckedIn: true,
            checkedInAt: '2023-05-10T09:30:00Z',
            checkedInLocation: 'Main Entrance'
          },
          resourceClaims: {
            lunch: {
              claimed: true,
              claimedAt: '2023-05-10T12:15:00Z',
              claimedLocation: 'Cafeteria'
            },
            kit: {
              claimed: true,
              claimedAt: '2023-05-10T10:00:00Z',
              claimedLocation: 'Welcome Desk'
            }
          },
          emergencyStatus: {
            lastKnownCheckIn: '2023-05-10T15:45:00Z',
            safetyConfirmed: true,
            safetyConfirmedAt: '2023-05-10T16:00:00Z',
            currentZone: 'Main Hall'
          },
          dailyRecords: [
            {
              date: '2023-05-10T00:00:00Z',
              checkedIn: true,
              checkedInAt: '2023-05-10T09:30:00Z',
              lunchClaimed: true,
              lunchClaimedAt: '2023-05-10T12:15:00Z',
              kitClaimed: true,
              kitClaimedAt: '2023-05-10T10:00:00Z'
            },
            {
              date: '2023-05-11T00:00:00Z',
              checkedIn: true,
              checkedInAt: '2023-05-11T09:45:00Z',
              lunchClaimed: true,
              lunchClaimedAt: '2023-05-11T12:30:00Z',
              kitClaimed: false,
              kitClaimedAt: undefined
            },
            {
              date: '2023-05-12T00:00:00Z',
              checkedIn: false,
              checkedInAt: undefined,
              lunchClaimed: false,
              lunchClaimedAt: undefined,
              kitClaimed: false,
              kitClaimedAt: undefined
            }
          ]
        };
        
        // Mock event data
        const mockEvent: Event = {
          _id: 'evt_123',
          name: 'Annual Hackathon 2023',
          startDate: '2023-05-10T00:00:00Z',
          endDate: '2023-05-12T23:59:59Z'
        };
        
        setAttendee(mockAttendee);
        setEvent(mockEvent);
        
        // Set selected date to first day of event
        setSelectedDate(new Date(mockEvent.startDate));
        
      } catch (err) {
        console.error('Failed to fetch attendee data:', err);
        setError('Failed to load attendee data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [attendeeId]);
  
  // Print QR code
  const handlePrintQR = () => {
    if (!attendee) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print QR code');
      return;
    }
    
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code: ${attendee.name}</title>
          <style>
            body { font-family: sans-serif; text-align: center; }
            .qr-container { margin: 30px auto; }
            .attendee-info { margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="attendee-info">
            <h2>${attendee.name}</h2>
            <p>${attendee.role}</p>
          </div>
          <div class="qr-container">
            <img src="${attendee.qrCodeUrl}" alt="QR Code" style="max-width: 300px;" />
          </div>
          <p>Unique ID: ${attendee.uniqueId}</p>
          <script>
            setTimeout(() => window.print(), 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };
  
  // Format date for display
  const formatDateTime = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Attendee Details</h1>
        <Link 
          href="/admin" 
          className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-gray-800"
        >
          Back to Dashboard
        </Link>
      </div>
      
      {loading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 p-4 rounded-md text-red-700 mb-8">
          {error}
        </div>
      ) : attendee && event ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Attendee Details Card */}
          <div className="bg-white p-6 rounded-lg shadow col-span-1">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold">Personal Information</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => router.push(`/admin/attendees/${attendeeId}/edit`)}
                  className="p-2 bg-blue-100 rounded-md text-blue-600 hover:bg-blue-200"
                  title="Edit Attendee"
                >
                  ✏️
                </button>
                <button
                  onClick={handlePrintQR}
                  className="p-2 bg-purple-100 rounded-md text-purple-600 hover:bg-purple-200"
                  title="Print QR Code"
                >
                  🖨️
                </button>
              </div>
            </div>
            
            <div className="mb-6">
              <img 
                src={attendee.qrCodeUrl} 
                alt="QR Code" 
                className="mx-auto w-48 h-48 mb-4"
              />
              <p className="text-center text-sm text-gray-500 break-all">
                {attendee.uniqueId}
              </p>
            </div>
            
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Name</h3>
                <p className="text-lg">{attendee.name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Email</h3>
                <p className="text-lg">{attendee.email}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Phone</h3>
                <p className="text-lg">{attendee.phone}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Role</h3>
                <p className="text-lg">
                  <span className={`px-2 py-1 text-sm rounded-full ${
                    attendee.role === 'VIP' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {attendee.role}
                  </span>
                </p>
              </div>
            </div>
          </div>
          
          {/* Current Status Card */}
          <div className="bg-white p-6 rounded-lg shadow col-span-2">
            <h2 className="text-xl font-semibold mb-6">Event Status</h2>
            
            {/* Date Selector */}
            {event && (
              <DateSelector
                startDate={new Date(event.startDate)}
                endDate={new Date(event.endDate)}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Check-In Status</h3>
                {attendee.registrationStatus.isCheckedIn ? (
                  <div>
                    <span className="text-green-600 font-medium">✓ Checked In</span>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDateTime(attendee.registrationStatus.checkedInAt)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Location: {attendee.registrationStatus.checkedInLocation}
                    </p>
                  </div>
                ) : (
                  <span className="text-red-600 font-medium">✗ Not Checked In</span>
                )}
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Lunch Status</h3>
                {attendee.resourceClaims.lunch.claimed ? (
                  <div>
                    <span className="text-green-600 font-medium">✓ Claimed</span>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDateTime(attendee.resourceClaims.lunch.claimedAt)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Location: {attendee.resourceClaims.lunch.claimedLocation}
                    </p>
                  </div>
                ) : (
                  <span className="text-red-600 font-medium">✗ Not Claimed</span>
                )}
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Welcome Kit Status</h3>
                {attendee.resourceClaims.kit.claimed ? (
                  <div>
                    <span className="text-green-600 font-medium">✓ Claimed</span>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDateTime(attendee.resourceClaims.kit.claimedAt)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Location: {attendee.resourceClaims.kit.claimedLocation}
                    </p>
                  </div>
                ) : (
                  <span className="text-red-600 font-medium">✗ Not Claimed</span>
                )}
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Safety Status</h3>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm">
                    <span className="font-medium">Last Known Location:</span> {attendee.emergencyStatus.currentZone || 'Unknown'}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Last Check-in:</span> {formatDateTime(attendee.emergencyStatus.lastKnownCheckIn)}
                  </p>
                </div>
                <div>
                  {attendee.emergencyStatus.safetyConfirmed ? (
                    <div className="text-right">
                      <span className="px-2 py-1 text-sm rounded-full bg-green-100 text-green-800">
                        ✓ Safety Confirmed
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDateTime(attendee.emergencyStatus.safetyConfirmedAt)}
                      </p>
                    </div>
                  ) : (
                    <span className="px-2 py-1 text-sm rounded-full bg-yellow-100 text-yellow-800">
                      Safety Not Confirmed
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Attendance History */}
          <div className="bg-white p-6 rounded-lg shadow col-span-1 lg:col-span-3">
            <DailyRecords 
              records={attendee.dailyRecords} 
              title="Multi-Day Attendance Records"
            />
          </div>
        </div>
      ) : (
        <div className="bg-yellow-100 p-4 rounded-md text-yellow-700">
          Attendee not found
        </div>
      )}
    </div>
  );
} 