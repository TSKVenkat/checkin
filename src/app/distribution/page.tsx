'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import QRScanner from '@/components/QRScanner';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuthSession, tokenStorage } from '@/lib/query/auth-hooks';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Loading';

interface AttendeeInfo {
  name: string;
  email: string;
  claimedAt: string;
  location: string;
  claimedLocation?: string;
}

interface ResourceResponse {
  success: boolean;
  message: string;
  warning?: string;
  attendee?: AttendeeInfo;
}

export default function DistributionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResourceResponse | null>(null);
  const [manualId, setManualId] = useState<string>('');
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [resourceType, setResourceType] = useState<'lunch' | 'kit'>('lunch');
  const [staffId, setStaffId] = useState<string>('');
  const [eventId, setEventId] = useState<string>('');
  
  // Check authentication
  const { data: sessionData } = useAuthSession({
    onUnauthenticated: () => {
      router.push('/login');
    }
  });
  
  // Fetch staff/user information and locations from API
  useEffect(() => {
    if (sessionData?.isAuthenticated) {
      // Get user from token storage
      const user = tokenStorage.getUser();
      if (user?.id) {
        setStaffId(user.id);
      }
      
      // Fetch event information and location options
      const fetchEventInfo = async () => {
        try {
          const { data } = await axios.get('/api/events/current');
          if (data.success && data.event) {
            setEventId(data.event.id);
            
            // Get location options from event data
            if (data.event.locations && data.event.locations.length > 0) {
              const locations = data.event.locations.map((loc: any) => loc.name);
              setLocationOptions(locations);
              setSelectedLocation(locations[0] || '');
            } else {
              // Fallback locations if none provided by API
              const defaultLocations = ['Main Entrance', 'Resource Center', 'Registration Desk'];
              setLocationOptions(defaultLocations);
              setSelectedLocation(defaultLocations[0]);
            }
          }
        } catch (err) {
          console.error('Error fetching event information:', err);
          // Fallback locations if API fails
          const defaultLocations = ['Main Entrance', 'Resource Center', 'Registration Desk'];
          setLocationOptions(defaultLocations);
          setSelectedLocation(defaultLocations[0]);
        }
      };
      
      fetchEventInfo();
    }
  }, [sessionData, router]);
  
  // Handle QR code scan
  const handleScan = async (qrData: string) => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      
      // Call API to record resource distribution
      const response = await axios.post<ResourceResponse>('/api/attendees/resource', {
        qrData,
        resourceType,
        location: selectedLocation
      });
      
      setResult(response.data);
      
      // Play success sound
      const audio = new Audio('/sounds/success.mp3');
      audio.play().catch(e => {
        // Silent fail if sound doesn't play
        console.log('Sound playback error (non-critical):', e);
      });
      
    } catch (err) {
      console.error('Distribution error:', err);
      
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.message || 'Failed to record resource distribution');
        setResult(err.response.data);
      } else {
        setError((err as Error).message || 'An unexpected error occurred');
      }
      
      // Play error sound
      const audio = new Audio('/sounds/error.mp3');
      audio.play().catch(e => {
        // Silent fail if sound doesn't play
        console.log('Sound playback error (non-critical):', e);
      });
      
    } finally {
      setLoading(false);
    }
  };
  
  // Handle manual distribution
  const handleManualDistribution = async () => {
    if (!manualId) {
      setError('Please enter an email or ID');
      return;
    }
    
    try {
      console.log('Attempting manual lookup with value:', manualId);
      setLoading(true);
      setError(null);
      setResult(null);
      
      // Call API to record resource distribution
      const response = await axios.post<ResourceResponse>('/api/attendees/resource', {
        manualId,
        resourceType,
        location: selectedLocation
      });
      
      setResult(response.data);
      setManualId('');
      
      // Play success sound
      const audio = new Audio('/sounds/success.mp3');
      audio.play().catch(e => {
        // Silent fail if sound doesn't play
        console.log('Sound playback error (non-critical):', e);
      });
      
    } catch (err) {
      console.error('Manual distribution error:', err);
      
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.message || 'Failed to record resource distribution');
        setResult(err.response.data);
      } else {
        setError((err as Error).message || 'An unexpected error occurred');
      }
      
      // Play error sound
      const audio = new Audio('/sounds/error.mp3');
      audio.play().catch(e => {
        // Silent fail if sound doesn't play
        console.log('Sound playback error (non-critical):', e);
      });
      
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-2/3 space-y-6">
          <Card title="Resource Distribution" variant="default">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Button
                onClick={() => setResourceType('lunch')}
                variant={resourceType === 'lunch' ? 'default' : 'outline'}
                className="py-3 text-base"
                leftIcon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8h1a4 4 0 010 8h-1"></path>
                    <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"></path>
                    <line x1="6" y1="1" x2="6" y2="4"></line>
                    <line x1="10" y1="1" x2="10" y2="4"></line>
                    <line x1="14" y1="1" x2="14" y2="4"></line>
                  </svg>
                }
              >
                Lunch
              </Button>
              <Button
                onClick={() => setResourceType('kit')}
                variant={resourceType === 'kit' ? 'default' : 'outline'}
                className="py-3 text-base"
                leftIcon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                  </svg>
                }
              >
                Welcome Kit
              </Button>
            </div>
            
            <div className="mb-6">
              <Select
                label="Distribution Location"
                id="location"
                value={selectedLocation}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedLocation(e.target.value)}
              >
                {locationOptions.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </Select>
            </div>
            
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 text-white">Scan Attendee QR Code</h3>
              <QRScanner onScanAction={handleScan} onError={(err) => setError(err.message)} />
            </div>
            
            <div className="p-4 bg-dark-bg-tertiary rounded-xl border border-dark-border mb-4">
              <h3 className="text-lg font-semibold mb-3 text-white">Manual Entry</h3>
              <div className="flex gap-3">
                <Input
                  placeholder="Enter email or ID"
                  value={manualId}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setManualId(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleManualDistribution}
                  disabled={loading}
                  leftIcon={loading ? <Spinner size="xs" variant="white" /> : undefined}
                >
                  {loading ? 'Processing...' : 'Submit'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
        
        <div className="w-full md:w-1/3 space-y-6">
          <Card title="Current Status" variant="elevated">
            {error && (
              <div className="mb-4 p-4 rounded-lg bg-error/10 border-l-4 border-error">
                <p className="font-bold text-red-300">Error</p>
                <p className="text-red-200">{error}</p>
              </div>
            )}
            
            {/* Success Message */}
            {result && result.success && (
              <div className="mb-4 p-4 rounded-lg bg-success/10 border-l-4 border-success flex flex-col">
                <div className="flex items-center">
                  <div className="bg-success/20 rounded-full p-2 mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-green-300">Success!</p>
                    <p className="text-green-200">{result.message}</p>
                  </div>
                </div>
                
                {result.attendee && (
                  <div className="mt-4 pt-4 border-t border-success/20">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-gray-400">Name:</div>
                      <div className="text-white font-medium">{result.attendee.name}</div>
                      
                      <div className="text-gray-400">Email:</div>
                      <div className="text-white font-medium">{result.attendee.email}</div>
                      
                      <div className="text-gray-400">Time:</div>
                      <div className="text-white font-medium">{new Date(result.attendee.claimedAt).toLocaleTimeString()}</div>
                      
                      <div className="text-gray-400">Location:</div>
                      <div className="text-white font-medium">{result.attendee.location}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Warning Message (Low Inventory) */}
            {result && result.success && result.warning && (
              <div className="mb-4 p-4 rounded-lg bg-warning/10 border-l-4 border-warning flex items-center">
                <div className="bg-warning/20 rounded-full p-2 mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-orange-300">Warning</p>
                  <p className="text-orange-200">{result.warning}</p>
                </div>
              </div>
            )}
            
            {/* Error with Attendee Info (already claimed) */}
            {result && !result.success && result.attendee && (
              <div className="mb-4 p-4 rounded-lg bg-warning/10 border-l-4 border-warning">
                <div className="flex items-center mb-3">
                  <div className="bg-warning/20 rounded-full p-2 mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-orange-300">Notice</p>
                    <p className="text-orange-200">{result.message}</p>
                  </div>
                </div>
                
                {result.attendee && (
                  <div className="pt-3 border-t border-warning/20">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-gray-400">Name:</div>
                      <div className="text-white font-medium">{result.attendee.name}</div>
                      
                      <div className="text-gray-400">Email:</div>
                      <div className="text-white font-medium">{result.attendee.email}</div>
                      
                      <div className="text-gray-400">Previous Claim:</div>
                      <div className="text-white font-medium">{new Date(result.attendee.claimedAt).toLocaleString()}</div>
                      
                      <div className="text-gray-400">Previous Location:</div>
                      <div className="text-white font-medium">{result.attendee.claimedLocation}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Default state when no result */}
            {!error && !result && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Ready to Distribute</h3>
                <p className="text-gray-400 mb-4">Scan a QR code or enter an attendee email</p>
                
                <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                  <div className="text-center">
                    <Badge variant="primary" size="lg" className="w-full justify-center">
                      {resourceType === 'lunch' ? 'Lunch' : 'Welcome Kit'}
                    </Badge>
                  </div>
                  <div className="text-center">
                    <Badge variant="secondary" size="lg" className="w-full justify-center">
                      {selectedLocation}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </Card>
          
          <Card title="Inventory Status" variant="elevated">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-dark-bg-tertiary p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-400 mb-1">Lunch Packages</h4>
                <div className="flex items-end">
                  <span className="text-2xl font-bold text-white mr-2">--</span>
                  <span className="text-xs text-gray-500">remaining</span>
                </div>
              </div>
              <div className="bg-dark-bg-tertiary p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-400 mb-1">Welcome Kits</h4>
                <div className="flex items-end">
                  <span className="text-2xl font-bold text-white mr-2">--</span>
                  <span className="text-xs text-gray-500">remaining</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-400 mt-4 text-center italic">Real-time inventory tracking coming soon</p>
          </Card>
        </div>
      </div>
    </div>
  );
} 