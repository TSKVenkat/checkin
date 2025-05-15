'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLogout, useAuthSession, tokenStorage } from '@/lib/query/auth-hooks';
import { useAttendees, useAdminDashboardStats } from '@/lib/query/hooks';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface Stats {
  totalAttendees: number;
  checkedInCount: number;
  checkedInPercentage: number;
  lunchClaimedCount: number;
  lunchClaimedPercentage: number;
  kitClaimedCount: number;
  kitClaimedPercentage: number;
}

interface Attendee {
  _id: string;
  name: string;
  email: string;
  role: string;
  isCheckedIn: boolean;
  checkedInAt?: string;
  lunchClaimed: boolean;
  lunchClaimedAt?: string;
  kitClaimed: boolean;
  kitClaimedAt?: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const logout = useLogout();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  
  // Check authentication with TanStack Query
  const { data: sessionData, isLoading: sessionLoading } = useAuthSession({
    onUnauthenticated: () => {
      router.push('/login');
    }
  });
  
  // Get user data from token storage
  const user = tokenStorage.getUser();
  
  // Check authorization
  const isAuthorized = useMemo(() => 
    user?.role === 'admin',
    [user?.role]
  );
  
  // Redirect if not admin after auth check completes
  if (!sessionLoading && !isAuthorized) {
    router.push('/dashboard');
    return null;
  }
  
  // Fetch dashboard stats using TanStack Query
  const { 
    data: stats,
    isLoading: statsLoading,
    error: statsError
  } = useAdminDashboardStats({
    enabled: isAuthorized && !sessionLoading
  });
  
  // Fetch attendees using TanStack Query
  const { 
    data: attendees = [],
    isLoading: attendeesLoading,
    error: attendeesError
  } = useAttendees({
    enabled: isAuthorized && !sessionLoading
  });
  
  // Filter attendees based on search term (using memo for performance)
  const filteredAttendees = useMemo(() => 
    attendees.filter((attendee: any) => 
      attendee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      attendee.email?.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [attendees, searchTerm]
  );
  
  // Calculate total pages
  const totalPages = useMemo(() => 
    Math.ceil(filteredAttendees.length / itemsPerPage),
    [filteredAttendees.length, itemsPerPage]
  );
  
  // Paginate attendees (using memo for performance)
  const paginatedAttendees = useMemo(() => 
    filteredAttendees.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    ),
    [filteredAttendees, currentPage, itemsPerPage]
  );
  
  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };
  
  // Check if user has specific permission
  const hasPermission = (permission: string): boolean => {
    return user?.permissions?.includes(permission) || user?.permissions?.includes('admin:all') || false;
  };
  
  // Combined loading state
  const isLoading = sessionLoading || statsLoading || attendeesLoading;
  
  // Combined error state
  const error = statsError || attendeesError;
  
  if (sessionLoading) {
    return <div className="container mx-auto p-8 text-center">Verifying authentication...</div>;
  }
  
  if (!isAuthorized) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card variant="elevated">
          <h1 className="text-2xl font-bold mb-4 text-red-400">Access Restricted</h1>
          <p className="text-gray-300 mb-4">You do not have permission to view this page.</p>
          <p className="text-gray-400">Redirecting to dashboard...</p>
          <div className="mt-4 w-full bg-dark-bg-tertiary rounded-full h-2.5">
            <div className="bg-primary h-2.5 rounded-full animate-pulse" style={{width: '100%'}}></div>
          </div>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-white">Admin Dashboard</h1>
          <p className="text-gray-400">Event Management System</p>
        </div>
        <div className="flex items-center">
          <span className="text-sm text-gray-400 mr-2">Logged in as {user?.email}</span>
          <Button 
            onClick={() => logout.mutate()}
            variant="outline"
            size="sm"
          >
            Logout
          </Button>
        </div>
      </div>
      
      {error ? (
        <div className="bg-error/10 border-l-4 border-error text-red-300 p-4 mb-6" role="alert">
          <p className="font-bold">Error</p>
          <p>Failed to load dashboard data. Please try again later.</p>
        </div>
      ) : null}
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-dark-bg-secondary rounded-lg p-6 animate-pulse">
              <div className="h-4 bg-dark-bg-tertiary rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-dark-bg-tertiary rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <h3 className="text-gray-400 text-sm font-medium mb-1">Total Attendees</h3>
            <div className="text-3xl font-bold text-white">{stats?.totalAttendees || 0}</div>
          </Card>
          
          <Card>
            <h3 className="text-gray-400 text-sm font-medium mb-1">Checked In</h3>
            <div className="text-3xl font-bold text-white">{stats?.checkedInCount || 0}</div>
            <div className="text-sm text-gray-500">{stats?.checkedInPercentage || 0}% of total</div>
          </Card>
          
          <Card>
            <h3 className="text-gray-400 text-sm font-medium mb-1">Lunch Claimed</h3>
            <div className="text-3xl font-bold text-white">{stats?.lunchClaimedCount || 0}</div>
            <div className="text-sm text-gray-500">{stats?.lunchClaimedPercentage || 0}% of total</div>
          </Card>
          
          <Card>
            <h3 className="text-gray-400 text-sm font-medium mb-1">Kits Claimed</h3>
            <div className="text-3xl font-bold text-white">{stats?.kitClaimedCount || 0}</div>
            <div className="text-sm text-gray-500">{stats?.kitClaimedPercentage || 0}% of total</div>
          </Card>
        </div>
      )}
      
      <Card className="w-full mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Attendees</h2>
          <div className="mt-3 md:mt-0">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
              <input
                type="search"
                className="bg-dark-bg-tertiary border border-dark-border text-white pl-10 p-2 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Search attendees..."
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full min-w-full divide-y divide-dark-border">
            <thead className="bg-dark-bg-tertiary">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Resources
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-dark-bg-secondary divide-y divide-dark-border">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-dark-bg-tertiary rounded w-3/4"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-dark-bg-tertiary rounded w-full"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-dark-bg-tertiary rounded w-1/2"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-dark-bg-tertiary rounded w-1/2"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-dark-bg-tertiary rounded w-1/4"></div>
                    </td>
                  </tr>
                ))
              ) : paginatedAttendees.length > 0 ? (
                paginatedAttendees.map((attendee: Attendee) => (
                  <tr key={attendee._id} className="hover:bg-dark-bg-tertiary/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{attendee.name}</div>
                      <div className="text-sm text-gray-400">{attendee.role}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400">{attendee.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {attendee.isCheckedIn ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-900/30 text-green-400">
                          Checked In
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-800/30 text-gray-400">
                          Not Checked In
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${attendee.lunchClaimed ? 'bg-green-400' : 'bg-gray-600'}`}></span>
                        <span className="text-gray-400">Lunch</span>
                        
                        <span className={`ml-2 w-2 h-2 rounded-full ${attendee.kitClaimed ? 'bg-green-400' : 'bg-gray-600'}`}></span>
                        <span className="text-gray-400">Kit</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link 
                        href={`/admin/attendees/${attendee._id}`}
                        className="text-primary hover:text-primary-dark mr-4"
                      >
                        View
                      </Link>
                      <Link 
                        href={`/admin/attendees/${attendee._id}/edit`}
                        className="text-purple-400 hover:text-purple-300"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-400">
                    No attendees found matching your search
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {!isLoading && totalPages > 0 && (
          <div className="border-t border-dark-border px-6 py-4 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Showing <span className="font-medium text-white">{paginatedAttendees.length}</span> of <span className="font-medium text-white">{filteredAttendees.length}</span> attendees
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-md ${
                  currentPage === 1
                    ? 'bg-dark-bg-tertiary/50 text-gray-500 cursor-not-allowed'
                    : 'bg-dark-bg-tertiary text-white hover:bg-dark-bg-tertiary/70'
                }`}
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded-md ${
                  currentPage === totalPages
                    ? 'bg-dark-bg-tertiary/50 text-gray-500 cursor-not-allowed'
                    : 'bg-dark-bg-tertiary text-white hover:bg-dark-bg-tertiary/70'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>
      
      <Card title="Admin Actions" className="w-full mb-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <Link href="/admin/attendees">
            <div className="p-4 bg-dark-bg-tertiary hover:bg-dark-bg-tertiary/80 rounded-lg transition-colors">
              <h3 className="font-medium text-white mb-1">Manage Attendees</h3>
              <p className="text-xs text-gray-400">View and edit attendee information</p>
            </div>
          </Link>
          
          <Link href="/admin/staff">
            <div className="p-4 bg-dark-bg-tertiary hover:bg-dark-bg-tertiary/80 rounded-lg transition-colors">
              <h3 className="font-medium text-white mb-1">Manage Staff</h3>
              <p className="text-xs text-gray-400">Admin staff accounts & roles</p>
            </div>
          </Link>
          
          <Link href="/admin/events">
            <div className="p-4 bg-dark-bg-tertiary hover:bg-dark-bg-tertiary/80 rounded-lg transition-colors">
              <h3 className="font-medium text-white mb-1">Manage Events</h3>
              <p className="text-xs text-gray-400">Create and edit event details</p>
            </div>
          </Link>
          
          <Link href="/admin/emergency">
            <div className="p-4 bg-dark-bg-tertiary hover:bg-dark-bg-tertiary/80 rounded-lg transition-colors border-l-2 border-red-500">
              <h3 className="font-medium text-white mb-1">Emergency</h3>
              <p className="text-xs text-gray-400">Emergency protocols & alerts</p>
            </div>
          </Link>
        </div>
      </Card>
    </div>
  );
}