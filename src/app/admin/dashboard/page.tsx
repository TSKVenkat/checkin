'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAdminStats } from '@/lib/query/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthSession, tokenStorage } from '@/lib/query/auth-hooks';
import Card from '@/components/ui/Card';

interface AdminStats {
  totalEvents: number;
  activeEvents: number;
  totalAttendees: number;
  totalStaff: number;
  staffByRole: {
    admin: number;
    'check-in': number;
    distribution: number;
  };
  recentActivity: {
    id: string;
    type: string;
    description: string;
    timestamp: string;
    user: string;
  }[];
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const queryClient = useQueryClient();
  
  // Check authentication using the auth hook
  const { data: sessionData, isLoading: authLoading } = useAuthSession({
    onUnauthenticated: () => {
      router.push('/login');
    }
  });
  
  // Use React Query hook for data fetching with modern syntax
  const { 
    data: adminStats, 
    isLoading: statsLoading, 
    isError,
    error: queryError,
    refetch 
  } = useAdminStats({
    enabled: !!sessionData?.isAuthenticated // Only fetch if authenticated
  });
  
  // Combined loading state
  const loading = authLoading || statsLoading;
  
  // Format error message
  const error = isError ? (queryError as Error).message || 'Failed to load data' : null;

  // Format timestamp to relative time
  const formatRelativeTime = useCallback((timestamp: string): string => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMins > 0) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }, []);

  // Manual refresh function
  const refreshData = () => {
    refetch();
  };

  // Set user once authenticated
  useEffect(() => {
    if (sessionData?.isAuthenticated) {
      const currentUser = tokenStorage.getUser();
      setUser(currentUser);
      
      // Verify the user has admin role
      if (currentUser && currentUser.role !== 'admin') {
        console.error('Unauthorized: Admin access required');
        router.push('/');
      }
    }
    
    // Update date display
    const dateElement = document.getElementById('admin-current-date');
    if (dateElement) {
      dateElement.textContent = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  }, [sessionData, router]);

  // Handle refresh button click
  const handleRefreshClick = () => {
    refreshData();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with gradient background */}
      <div className="bg-gradient-to-r from-primary to-blue-700 rounded-xl shadow-lg overflow-hidden">
        <div className="px-8 py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Admin Dashboard
              </h1>
              <p className="text-blue-100 text-lg max-w-2xl">
                Manage your events, staff, and system settings with real-time analytics.
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <div className="inline-flex items-center px-4 py-2 bg-dark-bg-secondary bg-opacity-20 rounded-lg text-white">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span id="admin-current-date">Today's Date</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Stats Overview */}
      {adminStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Events Card */}
          <Card>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-primary/20 text-primary">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
              </div>
              <div className="ml-5">
                <h2 className="text-sm uppercase tracking-wider font-semibold text-gray-400">Total Events</h2>
                <div className="flex items-baseline">
                  <p className="text-3xl font-bold text-white">{adminStats.totalEvents}</p>
                  <span className="ml-2 text-xs font-medium text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">Active</span>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <Link href="/admin/events" className="inline-flex items-center text-sm font-medium text-primary hover:text-primary-dark group">
                <span>View all events</span>
                <svg className="w-4 h-4 ml-1 transition-transform duration-200 transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </Link>
            </div>
          </Card>

          {/* Active Events Card */}
          <Card>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-900/20 text-green-400">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div className="ml-5">
                <h2 className="text-sm uppercase tracking-wider font-semibold text-gray-400">Active Events</h2>
                <div className="flex items-baseline">
                  <p className="text-3xl font-bold text-white">{adminStats.activeEvents}</p>
                  <span className="ml-2 text-xs font-medium text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded-full">Live</span>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <Link href="/admin/events?filter=active" className="inline-flex items-center text-sm font-medium text-green-400 hover:text-green-300 group">
                <span>View active events</span>
                <svg className="w-4 h-4 ml-1 transition-transform duration-200 transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </Link>
            </div>
          </Card>

          {/* Total Attendees Card */}
          <Card>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-900/20 text-purple-400">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
              </div>
              <div className="ml-5">
                <h2 className="text-sm uppercase tracking-wider font-semibold text-gray-400">Total Attendees</h2>
                <div className="flex items-baseline">
                  <p className="text-3xl font-bold text-white">{adminStats.totalAttendees}</p>
                  <span className="ml-2 text-xs font-medium text-purple-400 bg-purple-900/20 px-2 py-0.5 rounded-full">Registered</span>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <Link href="/admin/attendees" className="inline-flex items-center text-sm font-medium text-purple-400 hover:text-purple-300 group">
                <span>Manage attendees</span>
                <svg className="w-4 h-4 ml-1 transition-transform duration-200 transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </Link>
            </div>
          </Card>

          {/* Staff Members Card */}
          <Card>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-amber-900/20 text-amber-400">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                </svg>
              </div>
              <div className="ml-5">
                <h2 className="text-sm uppercase tracking-wider font-semibold text-gray-400">Staff Members</h2>
                <div className="flex items-baseline">
                  <p className="text-3xl font-bold text-white">{adminStats.totalStaff}</p>
                  <span className="ml-2 text-xs font-medium text-amber-400 bg-amber-900/20 px-2 py-0.5 rounded-full">Active</span>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <Link href="/admin/staff" className="inline-flex items-center text-sm font-medium text-amber-400 hover:text-amber-300 group">
                <span>Manage staff</span>
                <svg className="w-4 h-4 ml-1 transition-transform duration-200 transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </Link>
            </div>
          </Card>
        </div>
      )}

      {/* Staff Breakdown */}
      {adminStats && (
        <Card title="Staff by Role" className="w-full">
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs font-medium bg-primary/20 text-primary px-2.5 py-1 rounded-full">
              {adminStats.totalStaff} Total Members
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-dark-bg-tertiary p-5 rounded-xl border border-dark-border transition-all duration-200 hover:bg-dark-bg-tertiary/70">
              <div className="flex items-center mb-3">
                <div className="p-2 rounded-lg bg-indigo-600/30 text-indigo-400 mr-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Admins</h3>
              </div>
              <div className="flex items-baseline">
                <p className="text-3xl font-bold text-indigo-400">
                  {adminStats.staffByRole?.admin || 0}
                </p>
                <span className="ml-2 text-sm text-gray-500">users</span>
              </div>
            </div>
            
            <div className="bg-dark-bg-tertiary p-5 rounded-xl border border-dark-border transition-all duration-200 hover:bg-dark-bg-tertiary/70">
              <div className="flex items-center mb-3">
                <div className="p-2 rounded-lg bg-green-600/30 text-green-400 mr-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Check-In Staff</h3>
              </div>
              <div className="flex items-baseline">
                <p className="text-3xl font-bold text-green-400">
                  {adminStats.staffByRole?.['check-in'] || 0}
                </p>
                <span className="ml-2 text-sm text-gray-500">users</span>
              </div>
            </div>
            
            <div className="bg-dark-bg-tertiary p-5 rounded-xl border border-dark-border transition-all duration-200 hover:bg-dark-bg-tertiary/70">
              <div className="flex items-center mb-3">
                <div className="p-2 rounded-lg bg-amber-600/30 text-amber-400 mr-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8 4m0 0l-8-4m8 4v10" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Distribution Staff</h3>
              </div>
              <div className="flex items-baseline">
                <p className="text-3xl font-bold text-amber-400">
                  {adminStats.staffByRole?.distribution || 0}
                </p>
                <span className="ml-2 text-sm text-gray-500">users</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Recent Activity */}
      {adminStats && adminStats.recentActivity && adminStats.recentActivity.length > 0 && (
        <Card title="Recent Activity" className="w-full">
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs font-medium bg-blue-900/20 text-blue-400 px-2.5 py-1 rounded-full">
              Last 24 hours
            </span>
          </div>
          <div className="flow-root">
            <ul className="-mb-8">
              {adminStats.recentActivity.map((activity: {
                id: string;
                type: string;
                description: string;
                timestamp: string;
                user: string;
              }, index: number) => (
                <li key={activity.id}>
                  <div className="relative pb-8">
                    {index !== adminStats.recentActivity.length - 1 ? (
                      <span className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gradient-to-b from-blue-400 to-indigo-500 opacity-20" aria-hidden="true"></span>
                    ) : null}
                    <div className="relative flex items-start space-x-3">
                      <div className="relative">
                        <span className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          activity.type === 'check-in' ? 'bg-green-900/30 text-green-400' :
                          activity.type === 'distribution' ? 'bg-blue-900/30 text-blue-400' :
                          activity.type === 'admin' ? 'bg-purple-900/30 text-purple-400' : 'bg-gray-800/30 text-gray-400'
                        }`}>
                          {activity.type === 'check-in' && (
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {activity.type === 'distribution' && (
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8 4m0 0l-8-4m8 4v10" />
                            </svg>
                          )}
                          {activity.type === 'admin' && (
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          )}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 py-1.5">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-white">{activity.description}</p>
                            <p className="mt-1 text-xs text-gray-400 flex items-center">
                              <span className="font-medium text-gray-300">By {activity.user}</span>
                              <span className="mx-2">•</span>
                              <time dateTime={activity.timestamp} className="text-gray-500">{formatRelativeTime(activity.timestamp)}</time>
                            </p>
                          </div>
                          <div className="ml-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              activity.type === 'check-in' ? 'bg-green-900/30 text-green-400' :
                              activity.type === 'distribution' ? 'bg-blue-900/30 text-blue-400' :
                              activity.type === 'admin' ? 'bg-purple-900/30 text-purple-400' : 'bg-gray-800/30 text-gray-400'
                            }`}>
                              {activity.type}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-8 text-center">
            <Link href="/admin/activity" className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary-dark shadow-sm transition-all duration-200 transform hover:-translate-y-0.5">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
              View all activity
            </Link>
          </div>
        </Card>
      )}

      {error && (
        <div className="bg-error/10 border border-error p-5 rounded-xl">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-error/20 rounded-full p-2">
              <svg className="h-6 w-6 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-error">Error Loading Dashboard</h3>
              <p className="mt-1 text-sm text-error/80">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <Card title="Quick Actions" className="w-full">
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs font-medium bg-dark-bg-tertiary text-gray-400 px-2.5 py-1 rounded-full">
            Admin Tools
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Link
            href="/admin/events/create"
            className="flex items-center justify-center px-5 py-3 rounded-xl text-white bg-primary hover:bg-primary-dark shadow-md transition-all duration-200 transform hover:-translate-y-1 font-medium"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            Create New Event
          </Link>
          <Link
            href="/admin/upload"
            className="flex items-center justify-center px-5 py-3 rounded-xl text-white bg-green-600 hover:bg-green-700 shadow-md transition-all duration-200 transform hover:-translate-y-1 font-medium"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            Upload Attendees
          </Link>
          <Link
            href="/admin/staff/invite"
            className="flex items-center justify-center px-5 py-3 rounded-xl text-white bg-purple-600 hover:bg-purple-700 shadow-md transition-all duration-200 transform hover:-translate-y-1 font-medium"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
            </svg>
            Invite Staff Member
          </Link>
        </div>
      </Card>
    </div>
  );
}
