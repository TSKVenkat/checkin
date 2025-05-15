'use client';

import { useState, useEffect, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import QRScanner from '@/components/QRScanner';
import Link from 'next/link';
import { useRecentCheckins } from '@/lib/query/hooks';
import { useAuthSession, tokenStorage } from '@/lib/query/auth-hooks';
import axios from 'axios';

interface CheckInResponse {
  success: boolean;
  message: string;
  attendee?: {
    id: string;
    name: string;
    email: string;
    checkedInAt: string;
    checkedInLocation?: string;
  };
  checkInStatus?: 'success' | 'duplicate';
}

// Add a proper interface for checkin data
interface CheckInRecord {
  id: string;
  name: string;
  email: string;
  checkedInAt: string;
  location?: string;
}

export default function CheckInPage() {
  const [scanning, setScanning] = useState<boolean>(true);
  const [manualId, setManualId] = useState<string>('');
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [location, setLocation] = useState<string>('');
  const [checkInResult, setCheckInResult] = useState<CheckInResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState<number>(0);
  const [staffId, setStaffId] = useState<string>('');

  // Get day parameter for multi-day events
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [day, setDay] = useState<string>(today);
  
  // Check authentication
  const { data: sessionData } = useAuthSession();
  
  // Setup user ID from auth session
  useEffect(() => {
    if (sessionData?.isAuthenticated) {
      const user = tokenStorage.getUser();
      if (user?.id) {
        setStaffId(user.id);
      }
    }
  }, [sessionData]);

  // Fetch event locations from API
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const { data } = await axios.get('/api/events/current');
        if (data.success && data.event) {
          if (data.event.locations && data.event.locations.length > 0) {
            const locations = data.event.locations.map((loc: any) => loc.name);
            setLocationOptions(locations);
            setLocation(locations[0] || '');
          } else {
            // Fallback locations if none provided by API
            const defaultLocations = ['Main Entrance', 'VIP Entrance', 'Side Entrance', 'Workshop Area'];
            setLocationOptions(defaultLocations);
            setLocation(defaultLocations[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching event information:', err);
        // Fallback locations if API fails
        const defaultLocations = ['Main Entrance', 'VIP Entrance', 'Side Entrance', 'Workshop Area'];
        setLocationOptions(defaultLocations);
        setLocation(defaultLocations[0]);
      }
    };
    
    fetchLocations();
  }, []);

  useEffect(() => {
    // Check if the day parameter is in the URL
    const params = new URLSearchParams(window.location.search);
    const dayParam = params.get('day');
    if (dayParam) {
      setDay(dayParam);
    } else {
      // Update URL with today's date as default
      const newUrl = `${window.location.pathname}?day=${today}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [today]);

  // Fetch recent check-ins using our custom hook
  const { 
    data: recentData,
    isLoading: recentLoading 
  } = useRecentCheckins(day, 5);

  // Get recent checkins from query data
  const recentCheckins = useMemo<CheckInRecord[]>(() => 
    recentData?.attendees || [], 
    [recentData]
  );

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async (attendeeData: { id: string; location: string; eventId?: string }) => {
      if (!staffId) {
        throw new Error('Staff identification missing');
      }
      
      const response = await fetch('/api/attendees/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendeeId: attendeeData.id,
          location: attendeeData.location,
          staffId,
          day: attendeeData.eventId || day,
          eventId: attendeeData.eventId
        }),
      });
      
      if (!response.ok) {
        throw new Error('Check-in failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setCheckInResult(data);
      setIsProcessing(false);
      setScanCount(prev => prev + 1);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Check-in failed');
      setIsProcessing(false);
    }
  });

  const handleQRScan = async (data: string) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      setError(null);
      setCheckInResult(null);
      
      // Log the scanned data for debugging
      console.log('Scanned QR data:', data);
      
      // Process the scanned QR code
      // Format should be: attendee_id or a JSON with at least id field
      let attendeeId = data;
      
      // If the QR contains JSON data
      if (data.startsWith('{') && data.endsWith('}')) {
        try {
          const parsedData = JSON.parse(data);
          attendeeId = parsedData.id || parsedData.attendeeId;
          console.log('Parsed attendee ID from JSON:', attendeeId);
        } catch (e) {
          // If JSON parsing fails, use the raw data
          console.error('Failed to parse QR data:', e);
        }
      }
      
      if (!attendeeId) {
        throw new Error('Invalid QR code data');
      }
      
      // Get event ID if available
      const eventId = localStorage.getItem('currentEventId');
      
      // Use the mutation to handle the check-in request
      checkInMutation.mutate({ 
        id: attendeeId, 
        location,
        eventId: eventId || undefined
      });
      
    } catch (err) {
      console.error('QR scan error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process QR code');
      setIsProcessing(false);
    }
  };

  const handleManualCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing || !manualId.trim()) return;
    
    try {
      setIsProcessing(true);
      setError(null);
      setCheckInResult(null);
      
      // Get event ID if available
      const eventId = localStorage.getItem('currentEventId');
      
      // Use the mutation to handle the check-in request
      checkInMutation.mutate({ 
        id: manualId.trim(), 
        location,
        eventId: eventId || undefined
      });
      
    } catch (err) {
      console.error('Manual check-in error:', err);
      setError(err instanceof Error ? err.message : 'Failed to check in attendee');
      setIsProcessing(false);
    }
  };

  const resetScan = () => {
    setCheckInResult(null);
    setError(null);
    setManualId('');
    setScanning(true);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Attendee Check-In</h1>
          <Link href="/dashboard" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
            Back to Dashboard
          </Link>
        </div>
        
        {error && (
          <div className="bg-red-900/50 border-l-4 border-red-500 text-red-100 p-4 mb-6" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-slate-800 rounded-lg shadow-xl overflow-hidden">
              <div className="p-4 bg-slate-700 border-b border-slate-600">
                <h2 className="text-xl font-medium">Scan QR Code</h2>
              </div>
              
              <div className="p-6">
                <div className="mb-6">
                  <label className="block mb-2">Check-in Location</label>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-4 py-2 rounded-md bg-slate-700 border border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    {locationOptions.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
                
                {scanning && !checkInResult ? (
                  <div className="aspect-video rounded-lg overflow-hidden bg-slate-900 relative">
                    {/* Add notification for the camera permissions */}
                    <p className="absolute top-2 left-2 right-2 z-20 bg-blue-900/80 text-white p-3 rounded text-sm font-medium border border-blue-500 shadow-lg">
                      Please allow camera access when prompted. If you don't see a permission prompt, check your browser settings.
                    </p>
                    
                    <QRScanner onScanAction={handleQRScan} />
                    
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                      <button
                        onClick={() => setScanning(false)}
                        className="bg-white text-slate-900 px-4 py-2 rounded-md font-medium hover:bg-gray-200"
                      >
                        Manual Entry
                      </button>
                    </div>
                  </div>
                ) : !scanning && !checkInResult ? (
                  <div className="bg-slate-900 rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">Manual Check-in</h3>
                    <form onSubmit={handleManualCheckIn}>
                      <div className="mb-4">
                        <label htmlFor="manualId" className="block mb-1">Attendee ID</label>
                        <input
                          type="text"
                          id="manualId"
                          value={manualId}
                          onChange={(e) => setManualId(e.target.value)}
                          className="w-full px-4 py-2 rounded-md bg-slate-700 border border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="Enter attendee ID or scan code"
                          required
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={isProcessing}
                          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-70"
                        >
                          {isProcessing ? 'Processing...' : 'Check In'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setScanning(true)}
                          className="bg-slate-700 text-white px-4 py-2 rounded-md font-medium hover:bg-slate-600"
                        >
                          Scan QR
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="bg-slate-900 rounded-lg p-6">
                    <div className={`mb-6 p-4 rounded-md ${
                      checkInResult?.success 
                        ? 'bg-green-900/30 border border-green-700' 
                        : 'bg-red-900/30 border border-red-700'
                    }`}>
                      <h3 className="text-lg font-medium mb-2">
                        {checkInResult?.success ? 'Check-in Successful' : 'Check-in Failed'}
                      </h3>
                      <p>{checkInResult?.message}</p>
                      
                      {checkInResult?.attendee && (
                        <div className="mt-4 bg-slate-800/50 p-3 rounded-md">
                          <p><strong>Name:</strong> {checkInResult.attendee.name}</p>
                          <p><strong>Email:</strong> {checkInResult.attendee.email}</p>
                          <p><strong>Time:</strong> {formatDate(checkInResult.attendee.checkedInAt)}</p>
                          {checkInResult.attendee.checkedInLocation && (
                            <p><strong>Location:</strong> {checkInResult.attendee.checkedInLocation}</p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={resetScan}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700"
                      >
                        Check In Another
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div>
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-gray-700">
                <h2 className="text-lg font-medium">Recent Check-ins</h2>
              </div>
              <div>
                {recentLoading ? (
                  <div className="p-8 text-center text-gray-400">
                    <p>Loading recent check-ins...</p>
                  </div>
                ) : recentCheckins.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <p>No recent check-ins</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-700">
                    {recentCheckins.map((checkin) => (
                      <li key={checkin.id} className="px-4 py-3">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-medium text-white">{checkin.name}</p>
                            <p className="text-sm text-gray-400">{checkin.email}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-300">{formatDate(checkin.checkedInAt)}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            
            {/* Stats Card */}
            <div className="bg-gray-800 rounded-lg overflow-hidden mt-6">
              <div className="p-4 border-b border-gray-700">
                <h2 className="text-lg font-medium">Today's Stats</h2>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <h3 className="text-sm text-gray-400 mb-1">Checked In</h3>
                    <p className="text-2xl font-semibold">{recentData?.stats?.checkedInToday || 0}</p>
                  </div>
                  
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <h3 className="text-sm text-gray-400 mb-1">Total Expected</h3>
                    <p className="text-2xl font-semibold">{recentData?.stats?.totalExpected || 0}</p>
                  </div>
                  
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <h3 className="text-sm text-gray-400 mb-1">Your Check-ins</h3>
                    <p className="text-2xl font-semibold">{scanCount}</p>
                  </div>
                  
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <h3 className="text-sm text-gray-400 mb-1">Completion</h3>
                    <p className="text-2xl font-semibold">
                      {recentData?.stats?.totalExpected
                        ? Math.round((recentData.stats.checkedInToday / recentData.stats.totalExpected) * 100)
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function for formatting dates
function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
} 