'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { useAuthSession } from '@/lib/query/auth-hooks';
import { useQuery } from '@tanstack/react-query';

interface Event {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  venue?: string;
  status?: string;
  locations: Array<{
    name: string;
    type: string;
    capacity?: number;
  }>;
}

export default function AttendeeEventsPage() {
  const router = useRouter();
  const { data: session, isLoading } = useAuthSession();
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);

  // Use react-query to fetch attendee data including events
  const { data, error, isLoading: eventsLoading } = useQuery({
    queryKey: ['attendee-events'],
    queryFn: async () => {
      const response = await fetch('/api/attendees/me');
      if (!response.ok) {
        throw new Error('Failed to fetch attendee data');
      }
      return response.json();
    },
    enabled: !!session?.isAuthenticated
  });

  // Extract attendee and events from the query result
  const attendee = data?.success ? data.attendee : null;
  const events: Event[] = (attendee?.events && Array.isArray(attendee.events)) ? attendee.events : [];
  const isCheckedIn = attendee?.isCheckedIn || false;

  // Set current event when data loads
  useEffect(() => {
    if (attendee) {
      if (attendee.eventId) {
        setCurrentEventId(attendee.eventId);
      } else if (events.length > 0) {
        setCurrentEventId(events[0].id);
      }
    }
  }, [attendee, events]);

  // Get the current event
  const currentEvent = events.find(event => event.id === currentEventId) || null;

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !session?.isAuthenticated) {
      router.push('/login');
    }
  }, [session, isLoading, router]);

  if (isLoading || eventsLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 p-4">
        <Card className="max-w-4xl mx-auto bg-gray-800">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-white mb-4">Error</h1>
            <p className="text-red-400 mb-4">{(error as Error).message}</p>
            <Link href="/attendee" className="text-green-500 hover:underline">
              Return to Dashboard
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">My Events</h1>
            <Link href="/attendee" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              Dashboard
            </Link>
          </div>
          
          <Card className="bg-gray-800">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">No Events Found</h2>
              <p className="text-gray-300">You are not registered for any events at this time.</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">My Events</h1>
          <div className="flex space-x-2">
            <Link href="/attendee/profile" className="border border-green-500 text-green-500 px-4 py-2 rounded hover:bg-green-900">
              My Profile
            </Link>
            <Link href="/attendee" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              Dashboard
            </Link>
          </div>
        </div>

        {isCheckedIn && (
          <div className="bg-green-900 text-white p-4 rounded-lg mb-6 flex items-center">
            <div className="mr-2 h-3 w-3 bg-green-500 rounded-full"></div>
            <p>You have been checked in successfully!</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Card className="bg-gray-800">
              <div className="p-4">
                <h2 className="text-lg font-semibold text-white mb-3">Event List</h2>
                <div className="space-y-2">
                  {events.map(event => (
                    <button
                      key={event.id}
                      onClick={() => setCurrentEventId(event.id)}
                      className={`w-full text-left p-3 rounded-lg transition ${
                        event.id === currentEventId
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-700 hover:bg-gray-600 text-white'
                      }`}
                    >
                      <div className="font-medium">{event.name}</div>
                      <div className="text-xs mt-1 opacity-80">
                        {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          </div>
          
          <div className="md:col-span-2">
            {currentEvent ? (
              <Card className="bg-gray-800">
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-white mb-4">{currentEvent.name}</h2>
                  
                  <div className="space-y-4">
                    {currentEvent.description && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-300">Description</h3>
                        <p className="text-gray-300 mt-1">{currentEvent.description}</p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-300">Start Date</h3>
                        <p className="text-gray-300 mt-1">{new Date(currentEvent.startDate).toLocaleString()}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-300">End Date</h3>
                        <p className="text-gray-300 mt-1">{new Date(currentEvent.endDate).toLocaleString()}</p>
                      </div>
                    </div>
                    
                    {currentEvent.venue && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-300">Venue</h3>
                        <p className="text-gray-300 mt-1">{currentEvent.venue}</p>
                      </div>
                    )}
                    
                    {currentEvent.status && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-300">Status</h3>
                        <p className="mt-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            currentEvent.status === 'active' ? 'bg-green-700 text-green-100' :
                            currentEvent.status === 'upcoming' ? 'bg-blue-700 text-blue-100' :
                            currentEvent.status === 'completed' ? 'bg-gray-600 text-gray-300' :
                            'bg-yellow-700 text-yellow-100'
                          }`}>
                            {currentEvent.status.charAt(0).toUpperCase() + currentEvent.status.slice(1)}
                          </span>
                        </p>
                      </div>
                    )}
                    
                    {currentEvent.locations && currentEvent.locations.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-300 mb-2">Locations</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {currentEvent.locations.map(location => (
                            <div key={location.name} className="bg-gray-700 p-3 rounded border border-gray-600">
                              <div className="font-medium text-white">{location.name}</div>
                              <div className="text-xs text-gray-300 mt-1">Type: {location.type}</div>
                              {location.capacity && (
                                <div className="text-xs text-gray-300">Capacity: {location.capacity}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="bg-gray-800">
                <div className="p-6 flex items-center justify-center h-full">
                  <p className="text-gray-400">Select an event to view details</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 