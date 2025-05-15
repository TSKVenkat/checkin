'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { useAuthSession } from '@/lib/query/auth-hooks';
import { useQuery } from '@tanstack/react-query';

export default function AttendeeProfilePage() {
  const router = useRouter();
  const { data: session, isLoading } = useAuthSession();

  // Use react-query to fetch attendee data
  const { data, error, isLoading: profileLoading } = useQuery({
    queryKey: ['attendee-profile'],
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

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !session?.isAuthenticated) {
      router.push('/login');
    }
  }, [session, isLoading, router]);

  if (isLoading || profileLoading) {
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

  if (!attendee) {
    return (
      <div className="min-h-screen bg-gray-900 p-4">
        <Card className="max-w-4xl mx-auto bg-gray-800">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-white mb-4">Profile Not Found</h1>
            <p className="text-gray-300 mb-4">We couldn't find your attendee profile.</p>
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
          <h1 className="text-2xl font-bold text-white">My Profile</h1>
          <div className="flex space-x-2">
            <Link href="/attendee/events" className="border border-green-500 text-green-500 px-4 py-2 rounded hover:bg-green-900">
              My Events
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
            <h2 className="text-xl font-semibold text-white mb-4">Personal Information</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <dt className="text-sm font-medium text-gray-400">Full Name</dt>
                <dd className="mt-1 text-lg text-white">{attendee.name || 'Not provided'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-400">Email</dt>
                <dd className="mt-1 text-lg text-white">{attendee.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-400">Phone</dt>
                <dd className="mt-1 text-lg text-white">{attendee.phone || 'Not provided'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-400">Role</dt>
                <dd className="mt-1 text-lg text-white">{attendee.role || 'Attendee'}</dd>
              </div>
            </dl>
          </div>
        </Card>

        <Card className="mb-6 bg-gray-800">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Check-in Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm font-medium text-gray-400 mb-1">Status</div>
                <div className="flex items-center">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    attendee.isCheckedIn ? 'bg-green-700 text-green-100' : 'bg-gray-600 text-gray-300'
                  }`}>
                    {attendee.isCheckedIn ? 'Checked In' : 'Not Checked In'}
                  </span>
                </div>
              </div>
              {attendee.isCheckedIn && attendee.checkedInAt && (
                <div>
                  <div className="text-sm font-medium text-gray-400 mb-1">Check-in Time</div>
                  <div className="text-white">{new Date(attendee.checkedInAt).toLocaleString()}</div>
                </div>
              )}
              {attendee.checkedInLocation && (
                <div>
                  <div className="text-sm font-medium text-gray-400 mb-1">Location</div>
                  <div className="text-white">{attendee.checkedInLocation}</div>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="mb-6 bg-gray-800">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Resources</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm font-medium text-gray-400 mb-1">Welcome Kit</div>
                <div className="flex items-center">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    attendee.kitClaimed ? 'bg-green-700 text-green-100' : 'bg-gray-600 text-gray-300'
                  }`}>
                    {attendee.kitClaimed ? 'Collected' : 'Not Collected'}
                  </span>
                </div>
                {attendee.kitClaimed && attendee.kitClaimedAt && (
                  <div className="mt-1 text-sm text-gray-300">
                    Collected on {new Date(attendee.kitClaimedAt).toLocaleString()}
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-400 mb-1">Lunch Voucher</div>
                <div className="flex items-center">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    attendee.lunchClaimed ? 'bg-green-700 text-green-100' : 'bg-gray-600 text-gray-300'
                  }`}>
                    {attendee.lunchClaimed ? 'Collected' : 'Not Collected'}
                  </span>
                </div>
                {attendee.lunchClaimed && attendee.lunchClaimedAt && (
                  <div className="mt-1 text-sm text-gray-300">
                    Collected on {new Date(attendee.lunchClaimedAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {attendee.events && attendee.events.length > 0 && (
          <Card className="bg-gray-800">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">My Events</h2>
              
              <div className="space-y-4">
                {attendee.events.map((event) => (
                  <div key={event.id} className="border border-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-white">{event.name}</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <div className="text-sm text-gray-300">
                        <span className="font-medium">Start:</span> {new Date(event.startDate).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-300">
                        <span className="font-medium">End:</span> {new Date(event.endDate).toLocaleDateString()}
                      </div>
                    </div>
                    {event.locations && event.locations.length > 0 && (
                      <div className="mt-2">
                        <span className="text-sm font-medium text-gray-300">Locations:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {event.locations.map((loc) => (
                            <span key={loc.name} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-300">
                              {loc.name} ({loc.type})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
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