'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import QRScanner from '@/components/QRScanner';
import DashboardLayout from '@/components/DashboardLayout';
import DateSelector from '@/components/DateSelector';

interface AttendeeInfo {
  name: string;
  email: string;
  role: string;
  resourceClaims: {
    [key: string]: {
      claimed: boolean;
      claimedAt?: string;
      claimedBy?: string;
      claimedLocation?: string;
    }
  };
  registrationStatus: {
    isCheckedIn: boolean;
    checkedInAt?: string;
  };
}

export default function DistributionPage() {
  const [user, setUser] = useState<any | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [distributionLocation, setDistributionLocation] = useState('Main Hall');
  const [resourceType, setResourceType] = useState('lunch');
  const [manualId, setManualId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [attendeeInfo, setAttendeeInfo] = useState<AttendeeInfo | null>(null);
  const [isAlreadyClaimed, setIsAlreadyClaimed] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Multi-day event data (coming from API in real app)
  const eventStartDate = new Date();
  const eventEndDate = new Date();
  eventEndDate.setDate(eventEndDate.getDate() + 2); // 3-day event

  // Location options
  const locationOptions = [
    'Main Hall',
    'Cafeteria',
    'Registration Desk',
    'Workshop Area'
  ];

  // Resource type options
  const resourceOptions = [
    { value: 'lunch', label: 'Lunch' },
    { value: 'kit', label: 'Welcome Kit' },
    { value: 'swag', label: 'Swag Bag' },
    { value: 'certificate', label: 'Certificate' }
  ];

  // Get user info from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse user from localStorage');
      }
    }
  }, []);

  // Handle QR code scan
  const handleScan = async (data: string) => {
    try {
      setError(null);
      setSuccessMessage(null);
      setAttendeeInfo(null);
      setIsAlreadyClaimed(false);
      setLoading(true);
      
      if (!user) {
        setError('Authentication required');
        setLoading(false);
        return;
      }
      
      // Reset scanning state to prevent multiple scans
      setIsScanning(false);
      
      // Process resource claim
      await processResourceClaim(data);
      
    } catch (err: any) {
      console.error('Scan error:', err);
      setError(err.message || 'Failed to process QR code');
    } finally {
      setLoading(false);
    }
  };

  // Handle manual ID resource claim
  const handleManualResourceClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setError(null);
      setSuccessMessage(null);
      setAttendeeInfo(null);
      setIsAlreadyClaimed(false);
      setLoading(true);
      
      if (!user) {
        setError('Authentication required');
        setLoading(false);
        return;
      }
      
      if (!manualId.trim()) {
        setError('Please enter an ID or email');
        setLoading(false);
        return;
      }
      
      // Process resource claim
      await processResourceClaim(null, manualId.trim());
      
      // Clear the input field
      setManualId('');
      
    } catch (err: any) {
      console.error('Manual resource claim error:', err);
      setError(err.message || 'Failed to process resource claim');
    } finally {
      setLoading(false);
    }
  };

  // Common function to process resource claim
  const processResourceClaim = async (qrData: string | null, manualIdValue: string = '') => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      // Format date for API
      const formattedDate = selectedDate.toISOString().split('T')[0];
      
      const response = await axios.post(
        '/api/attendees/resource',
        {
          qrData,
          manualId: manualIdValue,
          resourceType,
          location: distributionLocation,
          staffId: user.id,
          date: formattedDate
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        setSuccessMessage(`${response.data.attendee.name} received ${resourceType} successfully!`);
        setAttendeeInfo(response.data.attendee);
      } else {
        throw new Error(response.data.message || 'Resource claim failed');
      }
      
    } catch (err: any) {
      // Handle case where resource is already claimed
      if (err.response?.status === 409) {
        setIsAlreadyClaimed(true);
        setAttendeeInfo(err.response.data.attendee);
        throw new Error(`Already claimed ${resourceType} at ${
          err.response.data.attendee.resourceClaims[resourceType]?.claimedAt 
            ? new Date(err.response.data.attendee.resourceClaims[resourceType].claimedAt).toLocaleString() 
            : 'unknown time'
        }`);
      }
      
      // Handle not checked in error
      if (err.response?.status === 400 && err.response.data.code === 'NOT_CHECKED_IN') {
        setAttendeeInfo(err.response.data.attendee);
        throw new Error('Attendee has not checked in. Resources can only be claimed after check-in.');
      }
      
      // Handle other errors
      throw new Error(err.response?.data?.message || err.message || 'Resource claim failed');
    }
  };

  // Handle date selection for multi-day events
  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  // Reset and start a new scan
  const handleReset = () => {
    setError(null);
    setSuccessMessage(null);
    setAttendeeInfo(null);
    setIsAlreadyClaimed(false);
    setManualId('');
    setIsScanning(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Resource Distribution</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">QR Code Scanner</h2>
                
                <div className="mb-4">
                  <QRScanner 
                    onScan={handleScan} 
                    onError={(err) => setError(err.message)}
                    cameraFacingMode="environment"
                    scanning={isScanning}
                  />
                </div>
                
                <div className="mt-4 border-t pt-4">
                  <h3 className="text-md font-medium text-gray-700 mb-2">Or Enter ID Manually</h3>
                  <form onSubmit={handleManualResourceClaim} className="flex space-x-2">
                    <input
                      type="text"
                      value={manualId}
                      onChange={(e) => setManualId(e.target.value)}
                      placeholder="Enter email or ID"
                      className="flex-1 rounded-md border border-gray-300 shadow-sm px-4 py-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={loading}
                    />
                    <button
                      type="submit"
                      disabled={loading || !manualId.trim()}
                      className={`px-4 py-2 rounded-md ${
                        loading || !manualId.trim()
                          ? 'bg-gray-300 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      Confirm
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-span-1">
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Distribution Settings</h2>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Resource Type
                  </label>
                  <select
                    value={resourceType}
                    onChange={(e) => setResourceType(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    {resourceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <select
                    value={distributionLocation}
                    onChange={(e) => setDistributionLocation(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    {locationOptions.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Date selector for multi-day events */}
                <DateSelector
                  startDate={eventStartDate}
                  endDate={eventEndDate}
                  selectedDate={selectedDate}
                  onDateSelect={handleDateChange}
                />
                
                <div className="flex flex-col space-y-4 mt-4">
                  <button
                    onClick={handleReset}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm"
                  >
                    New Resource Claim
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results area */}
        {(error || successMessage || attendeeInfo) && (
          <div className={`bg-white shadow-sm rounded-lg overflow-hidden border-l-4 ${
            successMessage ? 'border-green-500' : error ? 'border-red-500' : 'border-gray-300'
          }`}>
            <div className="p-6">
              {error && (
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              )}
              
              {successMessage && (
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Success</h3>
                    <p className="text-sm text-green-700 mt-1">{successMessage}</p>
                  </div>
                </div>
              )}
              
              {attendeeInfo && (
                <div className="mt-4 pt-4 border-t">
                  <h3 className="text-md font-medium text-gray-900 mb-2">Attendee Information</h3>
                  <div className="bg-gray-50 rounded-md p-4">
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                      <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-gray-500">Name</dt>
                        <dd className="mt-1 text-sm text-gray-900">{attendeeInfo.name}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Email</dt>
                        <dd className="mt-1 text-sm text-gray-900">{attendeeInfo.email}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Role</dt>
                        <dd className="mt-1 text-sm text-gray-900">{attendeeInfo.role || 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Check-in Status</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {attendeeInfo.registrationStatus.isCheckedIn ? 
                            `Checked in at ${new Date(attendeeInfo.registrationStatus.checkedInAt || '').toLocaleString()}` : 
                            'Not checked in'
                          }
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">
                          {isAlreadyClaimed ? 'Previously Claimed' : 'Resource Status'}
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {attendeeInfo.resourceClaims[resourceType]?.claimed ? 
                            `Claimed at ${new Date(attendeeInfo.resourceClaims[resourceType].claimedAt || '').toLocaleString()}` : 
                            'Not claimed'
                          }
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 