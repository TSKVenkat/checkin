'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import DashboardLayout from '@/components/DashboardLayout';
import axios from 'axios';

interface SystemHealth {
  status: string;
  components: {
    server: {
      status: string;
      uptime: number;
    };
    database: {
      status: string;
    };
  };
  memory: {
    rss: string;
    heapTotal: string;
    heapUsed: string;
  };
  timestamp: string;
}

interface EventStats {
  totalAttendees: number;
  checkedInCount: number;
  checkInPercentage: number;
  resourceDistribution: {
    lunch: {
      claimed: number;
      percentage: number;
    };
    kit: {
      claimed: number;
      percentage: number;
    };
  };
  emergencyStatus: {
    isActive: boolean;
    type?: string;
    affectedZones?: string[];
    activatedAt?: string;
    lastUpdated?: string;
  } | null;
}

export default function HomePage() {
  const [user, setUser] = useState<any | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [eventStats, setEventStats] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get user from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse user from localStorage');
      }
    }

    // Fetch system health and event stats
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = localStorage.getItem('token');
        if (!token) {
          return;
        }
        
        const headers = {
          Authorization: `Bearer ${token}`
        };
        
        // Get system health
        const healthResponse = await axios.get('/api/system/health');
        setSystemHealth(healthResponse.data.data);
        
        // Get event stats if user is authorized
        if (user) {
          const statsResponse = await axios.get('/api/events/stats', { headers });
          setEventStats(statsResponse.data.data);
        }
        
      } catch (err: any) {
        console.error('Data fetch error:', err);
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Set up interval to refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000);
    
    return () => clearInterval(interval);
  }, [user]);

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    return `${days}d ${hours}h ${minutes}m`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome to CheckIn{user ? `, ${user.name}` : ''}
            </h1>
            <p className="text-gray-600">
              Secure event management system for hackathons and conferences.
            </p>
          </div>
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(user?.role === 'admin' || user?.role === 'check-in') && (
            <Link 
              href="/check-in"
              className="bg-white shadow-sm rounded-lg overflow-hidden border border-transparent hover:border-blue-300 transition-colors"
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">Attendee Check-In</h2>
                  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                  </svg>
                </div>
                <p className="mt-2 text-sm text-gray-500">Scan QR codes to check-in attendees</p>
              </div>
            </Link>
          )}
          
          {(user?.role === 'admin' || user?.role === 'distribution') && (
            <Link 
              href="/distribution"
              className="bg-white shadow-sm rounded-lg overflow-hidden border border-transparent hover:border-blue-300 transition-colors"
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">Resource Distribution</h2>
                  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                  </svg>
                </div>
                <p className="mt-2 text-sm text-gray-500">Manage lunch, welcome kits, and swag distribution</p>
              </div>
            </Link>
          )}
          
          {user?.role === 'admin' && (
            <Link 
              href="/admin/dashboard"
              className="bg-white shadow-sm rounded-lg overflow-hidden border border-transparent hover:border-blue-300 transition-colors"
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">Admin Dashboard</h2>
                  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                </div>
                <p className="mt-2 text-sm text-gray-500">View statistics and manage event settings</p>
              </div>
            </Link>
          )}
          
          {user?.role === 'admin' && (
            <Link 
              href="/admin/upload"
              className="bg-white shadow-sm rounded-lg overflow-hidden border border-transparent hover:border-blue-300 transition-colors"
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">Upload Attendees</h2>
                  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3-3m0 0l3 3m-3-3v12"></path>
                  </svg>
                </div>
                <p className="mt-2 text-sm text-gray-500">Import attendees from CSV files</p>
              </div>
            </Link>
          )}
          
          {user?.role === 'admin' && (
            <Link 
              href="/admin/emergency"
              className="bg-white shadow-sm rounded-lg overflow-hidden border border-transparent hover:border-blue-300 transition-colors"
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">Emergency Controls</h2>
                  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                  </svg>
                </div>
                <p className="mt-2 text-sm text-gray-500">Manage emergency protocols and broadcasts</p>
              </div>
            </Link>
          )}
        </div>

        {/* System Health */}
        {systemHealth && (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">System Health</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`p-4 rounded-lg ${
                  systemHealth.status === 'healthy' ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <h4 className="text-sm font-medium text-gray-500">Status</h4>
                  <p className={`text-lg font-semibold ${
                    systemHealth.status === 'healthy' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {systemHealth.status.toUpperCase()}
                  </p>
                </div>
                
                <div className="p-4 rounded-lg bg-blue-50">
                  <h4 className="text-sm font-medium text-gray-500">Server</h4>
                  <p className="text-lg font-semibold text-blue-600">
                    {systemHealth.components.server.status}
                  </p>
                  <p className="text-xs text-gray-500">
                    Uptime: {formatUptime(systemHealth.components.server.uptime)}
                  </p>
                </div>
                
                <div className={`p-4 rounded-lg ${
                  systemHealth.components.database.status === 'connected' ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <h4 className="text-sm font-medium text-gray-500">Database</h4>
                  <p className={`text-lg font-semibold ${
                    systemHealth.components.database.status === 'connected' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {systemHealth.components.database.status}
                  </p>
                </div>
                
                <div className="p-4 rounded-lg bg-gray-50">
                  <h4 className="text-sm font-medium text-gray-500">Memory</h4>
                  <p className="text-lg font-semibold text-gray-600">
                    {systemHealth.memory.heapUsed} / {systemHealth.memory.heapTotal}
                  </p>
                  <p className="text-xs text-gray-500">
                    RSS: {systemHealth.memory.rss}
                  </p>
                </div>
              </div>
              
              <p className="text-xs text-gray-500 mt-4">
                Last updated: {new Date(systemHealth.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Event Stats Summary */}
        {user && eventStats && (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Event Overview</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-blue-50">
                  <h4 className="text-sm font-medium text-gray-500">Total Attendees</h4>
                  <p className="text-2xl font-semibold text-blue-600">
                    {eventStats.totalAttendees}
                  </p>
                </div>
                
                <div className="p-4 rounded-lg bg-green-50">
                  <h4 className="text-sm font-medium text-gray-500">Checked In</h4>
                  <p className="text-2xl font-semibold text-green-600">
                    {eventStats.checkedInCount}
                  </p>
                  <p className="text-sm text-gray-600">
                    {eventStats.checkInPercentage.toFixed(1)}%
                  </p>
                </div>
                
                <div className="p-4 rounded-lg bg-yellow-50">
                  <h4 className="text-sm font-medium text-gray-500">Lunch Claimed</h4>
                  <p className="text-2xl font-semibold text-yellow-600">
                    {eventStats.resourceDistribution.lunch.claimed}
                  </p>
                  <p className="text-sm text-gray-600">
                    {eventStats.resourceDistribution.lunch.percentage.toFixed(1)}%
                  </p>
                </div>
                
                <div className="p-4 rounded-lg bg-purple-50">
                  <h4 className="text-sm font-medium text-gray-500">Kits Claimed</h4>
                  <p className="text-2xl font-semibold text-purple-600">
                    {eventStats.resourceDistribution.kit.claimed}
                  </p>
                  <p className="text-sm text-gray-600">
                    {eventStats.resourceDistribution.kit.percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
              
              {/* Emergency status banner */}
              {eventStats.emergencyStatus?.isActive && (
                <div className="mt-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        Emergency Mode Active - {eventStats.emergencyStatus.type}
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        {eventStats.emergencyStatus.affectedZones && eventStats.emergencyStatus.affectedZones.length > 0 && (
                          <p>Affected areas: {eventStats.emergencyStatus.affectedZones.join(', ')}</p>
                        )}
                        <p className="text-xs mt-1">
                          Activated: {new Date(eventStats.emergencyStatus.activatedAt || '').toLocaleString()}
                        </p>
                      </div>
                      {user?.role === 'admin' && (
                        <div className="mt-4">
                          <Link
                            href="/admin/emergency"
                            className="text-sm font-medium text-red-800 hover:text-red-900"
                          >
                            Manage Emergency Response →
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!user && !loading && (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="p-6 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Sign in to access all features
              </h3>
              <Link
                href="/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
