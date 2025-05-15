'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { useAdminEvents, useDeleteEvent } from '@/lib/query/admin-hooks';
import { useAuthSession } from '@/lib/query/auth-hooks';
import Button from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Loading';

export default function AdminEventsPage() {
  const router = useRouter();
  const { user, status } = useAuthSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Check authorization
  useEffect(() => {
    if (status === 'loading') {
      return;
    } else if (!user) {
      router.push('/login');
    } else if (user && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [status, user, router]);

  // Fetch events using the custom hook with filters
  const { 
    data: events = [], 
    isLoading, 
    isError,
    error
  } = useAdminEvents({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    search: searchTerm || undefined
  }, {
    enabled: status === 'authenticated' && user?.role === 'admin'
  });
  
  // Delete event mutation
  const deleteEventMutation = useDeleteEvent();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  };

  // Event deletion handler
  const handleDeleteEvent = (id: string) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      deleteEventMutation.mutate(id);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-900/30 text-green-400';
      case 'upcoming':
        return 'bg-blue-900/30 text-blue-400';
      case 'completed':
        return 'bg-gray-800/30 text-gray-400';
      default:
        return 'bg-gray-800/30 text-gray-400';
    }
  };

  // Check if loading or unauthorized
  if (status === 'loading' || (status === 'authenticated' && !user)) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  // Check if authorized
  if (status === 'authenticated' && user?.role !== 'admin') {
    return (
      <Card className="w-full">
        <div className="p-6 text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400 mb-4">
            You do not have permission to view this page.
          </p>
          <Button onClick={() => router.push('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Events Management</h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage all your events in one place
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button
            onClick={() => router.push('/admin/events/create')}
            className="inline-flex items-center"
          >
            <svg
              className="-ml-1 mr-2 h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            Create Event
          </Button>
        </div>
      </div>

      <Card className="w-full">
        <div className="border-b border-dark-border px-6 py-4 flex flex-col sm:flex-row justify-between space-y-4 sm:space-y-0">
          <div className="relative rounded-md w-full sm:max-w-xs">
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="bg-dark-bg-tertiary border-dark-border text-white shadow-sm focus:ring-primary/50 focus:border-primary/50 block w-full sm:text-sm rounded-md"
            />
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className="bg-dark-bg-tertiary border-dark-border text-white mt-1 block w-full pl-3 pr-10 py-2 text-base focus:outline-none focus:ring-primary/50 focus:border-primary/50 sm:text-sm rounded-md"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center items-center p-12">
              <Spinner size="lg" />
            </div>
          ) : isError ? (
            <div className="p-6 text-center">
              <p className="text-red-400 mb-4">
                Error loading events: {error?.message || 'Unknown error'}
              </p>
              <Button onClick={() => router.refresh()}>Retry</Button>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-dark-border">
              <thead className="bg-dark-bg-tertiary">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Event Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Date & Location
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Attendees
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-dark-bg-secondary divide-y divide-dark-border">
                {events.length > 0 ? (
                  events.map((event: any) => (
                    <tr key={event.id} className="hover:bg-dark-bg-tertiary/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-white">{event.name}</div>
                            <div className="text-sm text-gray-400">{event.description?.slice(0, 60)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">
                          {new Date(event.startDate).toLocaleDateString()}
                          {event.endDate !== event.startDate && 
                            ` - ${new Date(event.endDate).toLocaleDateString()}`}
                        </div>
                        <div className="text-sm text-gray-400">{event.location}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(event.status)}`}>
                          {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {event.attendeeCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            className="text-primary hover:text-primary-dark"
                            onClick={() => router.push(`/admin/events/${event.id}`)}
                          >
                            View
                          </button>
                          <span className="text-gray-500">|</span>
                          <button
                            className="text-purple-400 hover:text-purple-300"
                            onClick={() => router.push(`/admin/events/${event.id}/edit`)}
                          >
                            Edit
                          </button>
                          <span className="text-gray-500">|</span>
                          <button
                            className="text-red-400 hover:text-red-300"
                            onClick={() => handleDeleteEvent(event.id)}
                            disabled={deleteEventMutation.isPending}
                          >
                            {deleteEventMutation.isPending && deleteEventMutation.variables === event.id 
                              ? 'Deleting...' 
                              : 'Delete'
                            }
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-400">
                      No events found matching your filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        
        <div className="px-6 py-4 flex items-center justify-between border-t border-dark-border">
          <div className="text-sm text-gray-400">
            Showing <span className="font-medium text-white">{events?.length || 0}</span> events
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="px-3 py-1 rounded-md"
              disabled={true}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="px-3 py-1 rounded-md"
              disabled={true}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
} 