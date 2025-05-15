'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import DateSelector from '@/components/DateSelector';
import DailyRecords from '@/components/DailyRecords';

interface Attendee {
  id: string;
  uniqueId: string;
  name: string;
  email: string;
  role: string;
  isCheckedIn: boolean;
  checkedInAt?: string;
  phoneNumber?: string;
  profilePhoto?: string;
  organization?: string;
  jobTitle?: string;
  ticketType?: string;
  registrationDate?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phoneNumber: string;
  };
  resourceClaims?: {
    lunch?: {
      claimed: boolean;
      claimedAt?: string;
    };
    kit?: {
      claimed: boolean;
      claimedAt?: string;
    };
  };
}

interface AttendanceRecord {
  id: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  area?: string;
  resources?: {
    lunch?: boolean;
    kit?: boolean;
    badge?: boolean;
    swag?: boolean;
  };
  notes?: string;
}

export default function AttendeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const attendeeId = params.id as string;
  const [attendee, setAttendee] = useState<Attendee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dailyRecords, setDailyRecords] = useState<AttendanceRecord[]>([]);
  
  // Fetch attendee data
  useEffect(() => {
    const fetchAttendee = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // In a real application, you would fetch data from the API:
        // const response = await axios.get(`/api/attendees/${attendeeId}`);
        // setAttendee(response.data);
        
        // For now, using mock data
        const mockAttendee: Attendee = {
          id: attendeeId,
          uniqueId: `uid_${Math.random().toString(36).substring(2, 10)}`,
          name: `Attendee ${attendeeId.split('_')[1]}`,
          email: `attendee${attendeeId.split('_')[1]}@example.com`,
          role: Math.random() > 0.75 ? 'VIP' : 'Attendee',
          isCheckedIn: Math.random() > 0.5,
          checkedInAt: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 10000000).toISOString() : undefined,
          phoneNumber: '+1 (555) 123-4567',
          organization: 'Example Corp',
          jobTitle: 'Software Engineer',
          ticketType: Math.random() > 0.7 ? 'Premium' : 'Standard',
          registrationDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          emergencyContact: {
            name: 'Emergency Contact',
            relationship: 'Family',
            phoneNumber: '+1 (555) 987-6543'
          },
          resourceClaims: {
            lunch: {
              claimed: Math.random() > 0.5,
              claimedAt: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 5000000).toISOString() : undefined
            },
            kit: {
              claimed: Math.random() > 0.5,
              claimedAt: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 8000000).toISOString() : undefined
            }
          }
        };
        
        setAttendee(mockAttendee);
        
      } catch (err) {
        console.error('Failed to fetch attendee:', err);
        setError('Failed to load attendee details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAttendee();
  }, [attendeeId]);
  
  // Fetch daily records for the selected date
  useEffect(() => {
    const fetchDailyRecords = async () => {
      try {
        // In a real application, you would fetch data from the API:
        // const response = await axios.get(`/api/attendees/${attendeeId}/records?date=${selectedDate.toISOString().split('T')[0]}`);
        // setDailyRecords(response.data);
        
        // For now, using mock data
        // Random number of records for demonstration
        const numRecords = Math.floor(Math.random() * 3) + (selectedDate.getDay() % 2 === 0 ? 1 : 0);
        
        if (numRecords === 0) {
          setDailyRecords([]);
          return;
        }
        
        const mockRecords: AttendanceRecord[] = Array.from({ length: numRecords }, (_, i) => {
          const checkInTime = new Date(selectedDate);
          checkInTime.setHours(8 + i, Math.floor(Math.random() * 60), 0);
          
          const checkOutTime = new Date(selectedDate);
          checkOutTime.setHours(16 + i, Math.floor(Math.random() * 60), 0);
          
          return {
            id: `record_${i}_${selectedDate.toISOString().split('T')[0]}`,
            date: selectedDate.toISOString().split('T')[0],
            checkInTime: checkInTime.toISOString(),
            checkOutTime: i === 0 ? checkOutTime.toISOString() : undefined,
            area: ['Main Hall', 'Conference Room A', 'Exhibition Area'][i % 3],
            resources: {
              lunch: i === 0,
              kit: i === 1,
              badge: true,
              swag: i === 2
            },
            notes: i === 0 ? 'Attended morning session' : undefined
          };
        });
        
        setDailyRecords(mockRecords);
        
      } catch (err) {
        console.error('Failed to fetch daily records:', err);
        // Not setting an error here as it's not critical
        setDailyRecords([]);
      }
    };
    
    fetchDailyRecords();
  }, [selectedDate, attendeeId]);
  
  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };
  
  const handleAddNote = (recordId: string, note: string) => {
    setDailyRecords(prevRecords => 
      prevRecords.map(record => 
        record.id === recordId 
          ? { ...record, notes: note }
          : record
      )
    );
    
    // In a real application, you would save the note to the API:
    // axios.post(`/api/attendees/${attendeeId}/records/${recordId}/notes`, { note });
  };
  
  const handleCheckIn = async () => {
    if (!attendee) return;
    
    try {
      // In a real application, you would make an API call:
      // await axios.post(`/api/attendees/${attendeeId}/check-in`);
      
      // For now, we'll just update the local state
      setAttendee({
        ...attendee,
        isCheckedIn: true,
        checkedInAt: new Date().toISOString()
      });
      
    } catch (err) {
      console.error('Failed to check in attendee:', err);
      alert('Failed to check in attendee. Please try again.');
    }
  };
  
  const handleClaimResource = async (resourceType: 'lunch' | 'kit') => {
    if (!attendee || !attendee.resourceClaims) return;
    
    try {
      // In a real application, you would make an API call:
      // await axios.post(`/api/attendees/${attendeeId}/claim-resource`, { resourceType });
      
      // For now, we'll just update the local state
      const newResourceClaims = {
        ...attendee.resourceClaims,
        [resourceType]: {
          claimed: true,
          claimedAt: new Date().toISOString()
        }
      };
      
      setAttendee({
        ...attendee,
        resourceClaims: newResourceClaims
      });
      
    } catch (err) {
      console.error(`Failed to claim ${resourceType}:`, err);
      alert(`Failed to claim ${resourceType}. Please try again.`);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }
  
  if (error || !attendee) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {error || "Failed to load attendee. Please try again."}
              </p>
            </div>
          </div>
        </div>
        <div className="flex justify-center">
          <button
            onClick={() => router.push('/admin/attendees')}
            className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Attendees
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div className="flex items-center">
          <Link
            href="/admin/attendees"
            className="mr-4 text-blue-600 hover:text-blue-800"
          >
            ← Back to Attendees
          </Link>
          <h1 className="text-3xl font-bold">Attendee Details</h1>
        </div>
        <div className="flex space-x-3">
          {!attendee.isCheckedIn && (
            <button
              onClick={handleCheckIn}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
            >
              Check In
            </button>
          )}
          <button
            onClick={() => router.push(`/admin/attendees/${attendeeId}/edit`)}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Edit
          </button>
        </div>
      </div>
      
      <div className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
        <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-800">Attendee Information</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="mb-6">
                <div className="text-sm font-medium text-gray-500 mb-1">Name</div>
                <div className="text-lg font-semibold text-gray-900">{attendee.name}</div>
              </div>
              <div className="mb-6">
                <div className="text-sm font-medium text-gray-500 mb-1">Email</div>
                <div className="text-lg text-gray-900">{attendee.email}</div>
              </div>
              <div className="mb-6">
                <div className="text-sm font-medium text-gray-500 mb-1">Phone</div>
                <div className="text-lg text-gray-900">{attendee.phoneNumber || 'Not provided'}</div>
              </div>
              <div className="mb-6">
                <div className="text-sm font-medium text-gray-500 mb-1">Organization</div>
                <div className="text-lg text-gray-900">{attendee.organization || 'Not provided'}</div>
              </div>
              <div className="mb-6">
                <div className="text-sm font-medium text-gray-500 mb-1">Job Title</div>
                <div className="text-lg text-gray-900">{attendee.jobTitle || 'Not provided'}</div>
              </div>
            </div>
            <div>
              <div className="mb-6">
                <div className="text-sm font-medium text-gray-500 mb-1">Unique ID</div>
                <div className="text-lg font-mono bg-gray-100 p-2 rounded">{attendee.uniqueId}</div>
              </div>
              <div className="mb-6">
                <div className="text-sm font-medium text-gray-500 mb-1">Role</div>
                <div className="inline-flex rounded-full px-3 py-1 text-sm font-semibold">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    attendee.role === 'VIP' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {attendee.role}
                  </span>
                </div>
              </div>
              <div className="mb-6">
                <div className="text-sm font-medium text-gray-500 mb-1">Check-In Status</div>
                <div>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    attendee.isCheckedIn 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {attendee.isCheckedIn ? 'Checked In' : 'Not Checked In'}
                  </span>
                  {attendee.isCheckedIn && attendee.checkedInAt && (
                    <span className="block text-xs text-gray-500 mt-1">
                      {new Date(attendee.checkedInAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="mb-6">
                <div className="text-sm font-medium text-gray-500 mb-1">Resources</div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleClaimResource('lunch')}
                    disabled={attendee.resourceClaims?.lunch?.claimed}
                    className={`px-3 py-1 rounded-md text-sm font-medium ${
                      attendee.resourceClaims?.lunch?.claimed
                        ? 'bg-blue-100 text-blue-800 cursor-default'
                        : 'bg-white border border-blue-600 text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    {attendee.resourceClaims?.lunch?.claimed ? 'Lunch Claimed' : 'Claim Lunch'}
                  </button>
                  <button
                    onClick={() => handleClaimResource('kit')}
                    disabled={attendee.resourceClaims?.kit?.claimed}
                    className={`px-3 py-1 rounded-md text-sm font-medium ${
                      attendee.resourceClaims?.kit?.claimed
                        ? 'bg-green-100 text-green-800 cursor-default'
                        : 'bg-white border border-green-600 text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {attendee.resourceClaims?.kit?.claimed ? 'Kit Claimed' : 'Claim Kit'}
                  </button>
                </div>
              </div>
              <div className="mb-6">
                <div className="text-sm font-medium text-gray-500 mb-1">Registration Date</div>
                <div className="text-lg text-gray-900">
                  {attendee.registrationDate 
                    ? new Date(attendee.registrationDate).toLocaleDateString() 
                    : 'Not available'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
        <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-800">Attendance Records</h2>
        </div>
        <div className="p-6">
          <div className="mb-6">
            <DateSelector
              initialDate={selectedDate}
              onDateChange={handleDateChange}
              minDate={new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
              maxDate={new Date()}
            />
          </div>
          
          <DailyRecords
            records={dailyRecords}
            onAddNote={handleAddNote}
          />
        </div>
      </div>
      
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-800">Emergency Contact</h2>
        </div>
        <div className="p-6">
          {attendee.emergencyContact ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">Name</div>
                <div className="text-lg text-gray-900">{attendee.emergencyContact.name}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">Relationship</div>
                <div className="text-lg text-gray-900">{attendee.emergencyContact.relationship}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">Phone</div>
                <div className="text-lg text-gray-900">{attendee.emergencyContact.phoneNumber}</div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 italic">No emergency contact provided</div>
          )}
        </div>
      </div>
    </div>
  );
} 