'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { useAuthSession } from '@/lib/query/auth-hooks';
import { useQuery } from '@tanstack/react-query';

interface Resource {
  id: string;
  name: string;
  type: string;
  description: string;
  claimable: boolean;
  claimed: boolean;
  claimedAt?: string;
  eventId: string;
}

interface Event {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export default function AttendeeResourcesPage() {
  const router = useRouter();
  const { data: session, isLoading } = useAuthSession();

  // Use react-query to fetch attendee data
  const { data, error, isLoading: resourcesLoading } = useQuery({
    queryKey: ['attendee-resources'],
    queryFn: async () => {
      const response = await fetch('/api/attendees/me');
      if (!response.ok) {
        throw new Error('Failed to fetch attendee data');
      }
      return response.json();
    },
    enabled: !!session?.isAuthenticated
  });

  // Extract attendee data
  const attendee = data?.success ? data.attendee : null;
  const isCheckedIn = attendee?.isCheckedIn || false;
  
  // Create resources from attendee data
  const resources: Resource[] = attendee ? [
    {
      id: 'welcome-kit',
      name: 'Welcome Kit',
      type: 'kit',
      description: 'Conference welcome kit with notebook, pen, and branded swag',
      claimable: attendee.isCheckedIn,
      claimed: attendee.kitClaimed || false,
      claimedAt: attendee.kitClaimedAt,
      eventId: attendee.eventId
    },
    {
      id: 'lunch-voucher',
      name: 'Lunch Voucher',
      type: 'lunch',
      description: 'Meal voucher valid for lunch each day of the event',
      claimable: attendee.isCheckedIn,
      claimed: attendee.lunchClaimed || false,
      claimedAt: attendee.lunchClaimedAt,
      eventId: attendee.eventId
    }
  ] : [];
  
  // Extract events from attendee data
  const events: Event[] = (attendee?.events && Array.isArray(attendee.events)) ? attendee.events : [];

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !session?.isAuthenticated) {
      router.push('/login');
    }
  }, [session, isLoading, router]);

  if (isLoading || resourcesLoading) {
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

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">My Resources</h1>
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

        <Card className="mb-6 bg-gray-800">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Available Resources</h2>
            
            {resources.length === 0 ? (
              <p className="text-gray-300">No resources available at this time.</p>
            ) : (
              <div className="space-y-6">
                {resources.map(resource => (
                  <div key={resource.id} className="border border-gray-700 rounded-lg overflow-hidden">
                    <div className={`p-4 ${resource.claimed ? 'bg-green-900/30' : 'bg-gray-700'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-medium text-white">{resource.name}</h3>
                          <p className="text-sm text-gray-300 mt-1">{resource.description}</p>
                        </div>
                        <div>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            resource.claimed ? 'bg-green-700 text-green-100' : 
                            resource.claimable ? 'bg-blue-700 text-blue-100' : 'bg-gray-600 text-gray-300'
                          }`}>
                            {resource.claimed ? 'Collected' : resource.claimable ? 'Available' : 'Not Available'}
                          </span>
                        </div>
                      </div>
                      
                      {resource.claimed && resource.claimedAt && (
                        <div className="mt-3 text-sm text-green-400">
                          Collected on {new Date(resource.claimedAt).toLocaleString()}
                        </div>
                      )}
                      
                      {!resource.claimed && !resource.claimable && (
                        <div className="mt-3 text-sm text-yellow-400">
                          You need to check in first to collect this resource
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {events.length > 0 && (
          <Card className="bg-gray-800">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">My Events</h2>
              
              <div className="space-y-4">
                {events.map((event) => (
                  <div key={event.id} className="border border-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-white">{event.name}</h3>
                    <div className="mt-2 grid grid-cols-2 gap-4">
                      <div className="text-sm text-gray-300">
                        <span className="font-medium">Start:</span> {new Date(event.startDate).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-300">
                        <span className="font-medium">End:</span> {new Date(event.endDate).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
} 