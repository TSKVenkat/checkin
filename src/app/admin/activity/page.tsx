'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { useActivityLogs } from '@/lib/query/admin-hooks';
import { useAuthSession } from '@/lib/query/auth-hooks';
import Button from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Loading';
import { SessionStatus } from '@/lib/auth/types';

interface Staff {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ActivityLog {
  id: string;
  type: string;
  action: string;
  description: string;
  entityType: string;
  entityId: string;
  metadata: any;
  ipAddress: string;
  createdAt: string;
  staffId: string;
  staff?: Staff;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function ActivityTrackingPage() {
  const router = useRouter();
  const { user, status } = useAuthSession();
  
  // Filters
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStaff, setSelectedStaff] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(20);

  // Check authorization
  useEffect(() => {
    if (status === 'loading') {
      return;
    } else if (!user) {
      router.push('/login');
    } else if (user && !['admin', 'manager'].includes(user.role)) {
      router.push('/dashboard');
    }
  }, [status, user, router]);

  // Fetch activities using the custom hook with filters
  const { 
    data: activityData, 
    isLoading, 
    isError, 
    error 
  } = useActivityLogs({
    type: selectedType !== 'all' ? selectedType : undefined,
    staffId: selectedStaff !== 'all' ? selectedStaff : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    page,
    limit
  }, {
    enabled: status === 'authenticated' && !!user && ['admin', 'manager'].includes(user.role)
  });
      
  // Extract activities, pagination and staff list from response
  const activities: ActivityLog[] = activityData?.data || [];
  const pagination: Pagination = activityData?.pagination || {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  };
  const staffList: Staff[] = activityData?.staffList || [];

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedType(e.target.value);
    setPage(1); // Reset to first page
  };

  const handleStaffChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStaff(e.target.value);
    setPage(1); // Reset to first page
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
    setPage(1); // Reset to first page
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
    setPage(1); // Reset to first page
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  // Get badge color based on activity type
  const getActivityTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'check-in':
        return 'bg-green-900/30 text-green-400';
      case 'distribution':
        return 'bg-blue-900/30 text-blue-400';
      case 'admin':
        return 'bg-purple-900/30 text-purple-400';
      case 'security':
        return 'bg-yellow-900/30 text-yellow-400';
      case 'emergency':
        return 'bg-red-900/30 text-red-400';
      case 'system':
        return 'bg-gray-800/30 text-gray-400';
      default:
        return 'bg-gray-800/30 text-gray-400';
    }
  };

  // Get badge color based on action
  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-900/30 text-green-400';
      case 'update':
        return 'bg-blue-900/30 text-blue-400';
      case 'delete':
        return 'bg-red-900/30 text-red-400';
      case 'login':
      case 'logout':
        return 'bg-yellow-900/30 text-yellow-400';
      case 'activate':
        return 'bg-purple-900/30 text-purple-400';
      case 'deactivate':
        return 'bg-gray-800/30 text-gray-400';
      case 'claim':
        return 'bg-indigo-900/30 text-indigo-400';
      case 'export':
      case 'import':
        return 'bg-cyan-900/30 text-cyan-400';
      default:
        return 'bg-gray-800/30 text-gray-400';
    }
  };

  if (status === 'loading' || (status === 'authenticated' && !['admin', 'manager'].includes(user?.role || ''))) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Activity Tracking</h1>
          <p className="text-gray-400">Monitor and audit system activities</p>
        </div>
        <div>
          <Link href="/admin/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
      
      {isError && (
        <Card className="w-full">
          <div className="p-4 border-l-4 border-red-500 bg-dark-bg-tertiary">
            <p className="text-red-400">
              Error loading activity logs: {error?.message || 'Unknown error'}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2" 
              onClick={() => router.refresh()}
            >
              Retry
            </Button>
        </div>
        </Card>
      )}
      
      {/* Filters */}
      <Card className="w-full">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Filter Activities</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
              <label htmlFor="type-filter" className="block text-sm font-medium text-gray-300 mb-1">
              Activity Type
            </label>
            <select
              id="type-filter"
                className="bg-dark-bg-tertiary border border-dark-border text-white w-full rounded-md"
              value={selectedType}
              onChange={handleTypeChange}
            >
                <option value="all">All Activity Types</option>
              <option value="check-in">Check-in</option>
              <option value="distribution">Distribution</option>
              <option value="admin">Admin</option>
              <option value="security">Security</option>
              <option value="emergency">Emergency</option>
              <option value="system">System</option>
            </select>
          </div>
          
          <div>
              <label htmlFor="staff-filter" className="block text-sm font-medium text-gray-300 mb-1">
              Staff Member
            </label>
            <select
              id="staff-filter"
                className="bg-dark-bg-tertiary border border-dark-border text-white w-full rounded-md"
              value={selectedStaff}
              onChange={handleStaffChange}
            >
                <option value="all">All Staff Members</option>
              {staffList.map(staff => (
                <option key={staff.id} value={staff.id}>
                  {staff.name} ({staff.role})
                </option>
              ))}
            </select>
          </div>
          
          <div>
              <label htmlFor="start-date" className="block text-sm font-medium text-gray-300 mb-1">
              Start Date
            </label>
            <input
                type="date"
              id="start-date"
                className="bg-dark-bg-tertiary border border-dark-border text-white w-full rounded-md"
              value={startDate}
              onChange={handleStartDateChange}
            />
          </div>
          
          <div>
              <label htmlFor="end-date" className="block text-sm font-medium text-gray-300 mb-1">
              End Date
            </label>
            <input
                type="date"
              id="end-date"
                className="bg-dark-bg-tertiary border border-dark-border text-white w-full rounded-md"
              value={endDate}
              onChange={handleEndDateChange}
            />
          </div>
        </div>
      </div>
      </Card>
      
      {/* Activity Logs */}
      <Card className="w-full">
        {isLoading ? (
        <div className="flex justify-center my-12">
            <Spinner size="lg" />
        </div>
      ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-dark-border">
              <thead className="bg-dark-bg-tertiary">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Time
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Action
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-dark-bg-secondary divide-y divide-dark-border">
                {activities.length > 0 ? activities.map((activity) => (
                  <tr key={activity.id} className="hover:bg-dark-bg-tertiary/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {formatDate(activity.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getActivityTypeBadgeColor(activity.type)}`}>
                        {activity.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionBadgeColor(activity.action)}`}>
                        {activity.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-white">
                      {activity.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{activity.staff?.name}</div>
                      <div className="text-xs text-gray-400">{activity.staff?.role}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Button 
                        variant="link" 
                        size="sm"
                        onClick={() => console.log('View details for activity:', activity.id)}
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-400">
                      No activities found with the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
          
          {/* Pagination */}
        {!isLoading && pagination.totalPages > 0 && (
          <div className="px-6 py-4 bg-dark-bg-secondary border-t border-dark-border flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Showing <span className="font-medium text-white">{activities.length}</span> of{' '}
              <span className="font-medium text-white">{pagination.total}</span> activities
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => handlePageChange(page - 1)}
              >
                Previous
              </Button>
              
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                // Show pagination context around current page
                let pageNum = page;
                if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                
                // Ensure page number is within valid range
                if (pageNum <= 0) pageNum = 1;
                if (pageNum > pagination.totalPages) return null;
                
                return (
                  <Button
                    key={i}
                    variant={pageNum === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              
              <Button
                variant="outline"
                size="sm"
                disabled={page === pagination.totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
} 