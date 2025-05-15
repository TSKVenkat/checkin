'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSystemHealth, useEventStats } from '@/lib/query/hooks';
import { useQueryClient } from '@tanstack/react-query';

interface ManagerStats {
  totalCheckedIn: number;
  totalResources: number;
  activeEvents: number;
  staffMembers: number;
  pendingIssues: number;
}

export default function ManagerDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const queryClient = useQueryClient();
  const [managerStats, setManagerStats] = useState<ManagerStats>({
    totalCheckedIn: 0,
    totalResources: 0,
    activeEvents: 0,
    staffMembers: 0,
    pendingIssues: 0
  });
  
  // Get system health
  const { 
    data: systemHealth, 
    isLoading: healthLoading, 
    isError: healthError,
    error: healthErrorDetails
  } = useSystemHealth();
  
  // Get event statistics
  const {
    data: eventStats,
    isLoading: statsLoading,
    isError: statsError,
    error: statsErrorDetails
  } = useEventStats();
  
  // Loading state
  const isLoading = healthLoading || statsLoading;
  
  // Get error state
  const hasError = healthError || statsError;
  const errorMessage = useMemo(() => {
    if (healthErrorDetails) return `System health error: ${healthErrorDetails}`;
    if (statsErrorDetails) return `Event stats error: ${statsErrorDetails}`;
    return 'An error occurred while loading dashboard data';
  }, [healthErrorDetails, statsErrorDetails]);
  
  // Verify manager access
  useEffect(() => {
    const checkUser = () => {
      try {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
          router.push('/login');
          return;
        }
        
        const userData = JSON.parse(userStr);
        if (userData.role !== 'manager' && userData.role !== 'admin') {
          if (userData.role === 'admin') {
            router.push('/admin/dashboard');
          } else if (userData.role === 'staff') {
            router.push('/dashboard');
          } else if (userData.role === 'attendee') {
            router.push('/attendee');
          } else {
            router.push('/login');
          }
          return;
        }
        
        setUser(userData);
      } catch (err) {
        console.error('Error checking user:', err);
        router.push('/login');
      }
    };
    
    checkUser();
  }, [router]);
  
  // Update manager stats when event stats are loaded
  useEffect(() => {
    if (eventStats) {
      setManagerStats({
        totalCheckedIn: eventStats.checkedInCount || 0,
        totalResources: eventStats.resourcesDistributed || 0,
        activeEvents: eventStats.activeEvents || 0,
        staffMembers: eventStats.staffOnDuty || 0,
        pendingIssues: eventStats.pendingIssues || 0
      });
    }
  }, [eventStats]);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg overflow-hidden mb-8">
        <div className="px-6 py-8 sm:p-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Manager Dashboard</h1>
              <p className="text-indigo-100 mt-2 max-w-3xl">
                Monitor event activities, manage staff, and track resource distribution
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <div className="inline-flex items-center px-4 py-2 bg-white bg-opacity-20 rounded-lg text-white">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Check-In Stats */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 transition-all duration-300 hover:shadow-lg hover:translate-y-[-2px]">
          <div className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-5">
                <h2 className="text-sm uppercase tracking-wider font-semibold text-gray-500">Checked In</h2>
                <div className="flex items-baseline">
                  <p className="text-3xl font-bold text-gray-900">{managerStats.totalCheckedIn}</p>
                  <span className="ml-2 text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Active</span>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <Link href="/check-in" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 group">
                <span>Go to check-in</span>
                <svg className="w-4 h-4 ml-1 transition-transform duration-200 transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* Resources Stats */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 transition-all duration-300 hover:shadow-lg hover:translate-y-[-2px]">
          <div className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white shadow-md">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <div className="ml-5">
                <h2 className="text-sm uppercase tracking-wider font-semibold text-gray-500">Resources Distributed</h2>
                <div className="flex items-baseline">
                  <p className="text-3xl font-bold text-gray-900">{managerStats.totalResources}</p>
                  <span className="ml-2 text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Active</span>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <Link href="/distribution" className="inline-flex items-center text-sm font-medium text-green-600 hover:text-green-800 group">
                <span>Go to distribution</span>
                <svg className="w-4 h-4 ml-1 transition-transform duration-200 transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* Active Events */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 transition-all duration-300 hover:shadow-lg hover:translate-y-[-2px]">
          <div className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-md">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-5">
                <h2 className="text-sm uppercase tracking-wider font-semibold text-gray-500">Active Events</h2>
                <div className="flex items-baseline">
                  <p className="text-3xl font-bold text-gray-900">{managerStats.activeEvents}</p>
                  <span className="ml-2 text-xs font-medium text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">Live</span>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <Link href="/manager/events" className="inline-flex items-center text-sm font-medium text-purple-600 hover:text-purple-800 group">
                <span>View events</span>
                <svg className="w-4 h-4 ml-1 transition-transform duration-200 transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* Staff Members */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 transition-all duration-300 hover:shadow-lg hover:translate-y-[-2px]">
          <div className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-md">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="ml-5">
                <h2 className="text-sm uppercase tracking-wider font-semibold text-gray-500">Staff on Duty</h2>
                <div className="flex items-baseline">
                  <p className="text-3xl font-bold text-gray-900">{managerStats.staffMembers}</p>
                  <span className="ml-2 text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Active</span>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <Link href="/manager/staff" className="inline-flex items-center text-sm font-medium text-amber-600 hover:text-amber-800 group">
                <span>Manage staff</span>
                <svg className="w-4 h-4 ml-1 transition-transform duration-200 transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-100 mb-8">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Link href="/check-in" className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="p-2 bg-blue-100 rounded-lg mr-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Check-In</h3>
                <p className="text-sm text-gray-500">Process attendee check-ins</p>
              </div>
            </Link>
            
            <Link href="/distribution" className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="p-2 bg-green-100 rounded-lg mr-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Distribution</h3>
                <p className="text-sm text-gray-500">Distribute resources</p>
              </div>
            </Link>
            
            <Link href="/manager/reports" className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="p-2 bg-indigo-100 rounded-lg mr-4">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Reports</h3>
                <p className="text-sm text-gray-500">View event analytics</p>
              </div>
            </Link>
            
            <Link href="/manager/staff-schedule" className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="p-2 bg-amber-100 rounded-lg mr-4">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Staff Schedule</h3>
                <p className="text-sm text-gray-500">Manage staff shifts</p>
              </div>
            </Link>
            
            <Link href="/manager/inventory" className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="p-2 bg-purple-100 rounded-lg mr-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Inventory</h3>
                <p className="text-sm text-gray-500">Track resources</p>
              </div>
            </Link>
            
            <Link href="/manager/issues" className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="p-2 bg-red-100 rounded-lg mr-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Issues</h3>
                <p className="text-sm text-gray-500">{managerStats.pendingIssues} pending issues</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
      
      {/* System Health */}
      {systemHealth && (
        <div className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-100">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">System Status</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center mb-6">
              <div className={`h-3 w-3 rounded-full mr-2 ${
                systemHealth.status === 'healthy' ? 'bg-green-500' : 
                systemHealth.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <span className="font-medium text-gray-900 capitalize">{systemHealth.status}</span>
              <span className="ml-4 text-sm text-gray-500">
                Last updated: {new Date(systemHealth.timestamp).toLocaleTimeString()}
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Server Status</h3>
                <div className="flex items-center">
                  <div className={`h-2 w-2 rounded-full mr-2 ${
                    systemHealth.components.server.status === 'healthy' ? 'bg-green-500' : 
                    systemHealth.components.server.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span className="font-medium text-gray-900 capitalize">{systemHealth.components.server.status}</span>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Database Status</h3>
                <div className="flex items-center">
                  <div className={`h-2 w-2 rounded-full mr-2 ${
                    systemHealth.components.database.status === 'healthy' ? 'bg-green-500' : 
                    systemHealth.components.database.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span className="font-medium text-gray-900 capitalize">{systemHealth.components.database.status}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 