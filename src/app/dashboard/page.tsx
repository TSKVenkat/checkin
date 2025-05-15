'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSystemHealth, useEventStats } from '@/lib/query/hooks';
import { useAuthSession, tokenStorage } from '@/lib/query/auth-hooks';
import { useQueryClient } from '@tanstack/react-query';
import DashboardStats from '@/components/DashboardStats';

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

interface ResourceItem {
  claimed: number;
  percentage: number;
  total: number;
}

interface EventStats {
  totalAttendees: number;
  checkedInCount: number;
  checkInPercentage: number;
  resourceDistribution: {
    lunch: ResourceItem;
    kit: ResourceItem;
    badge: ResourceItem;
    swag: ResourceItem;
  };
  emergencyStatus: {
    isActive: boolean;
    type?: string;
    affectedZones?: string[];
    activatedAt?: string;
    lastUpdated?: string;
    severity?: 'low' | 'medium' | 'high';
  } | null;
  recentActivity: {
    timestamp: string;
    action: string;
    user: string;
    details: string;
  }[];
}

interface DashboardCard {
  title: string;
  description?: string;
  icon: string;
  link: string;
  color: string;
  metric?: number | string;
  metricLabel?: string;
  roles: string[];
}

export default function StaffDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [chartData, setChartData] = useState<{labels: string[], datasets: any[]}>({ labels: [], datasets: [] });
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<{ message: string; level: string; timestamp: Date }[]>([]);
  
  // React Query client
  const queryClient = useQueryClient();
  
  // Check authentication
  const { data: sessionData, isLoading: authLoading } = useAuthSession({
    onUnauthenticated: () => {
      router.push('/login');
    }
  });
  
  // Get event statistics
  const {
    data: eventStats,
    isLoading: statsLoading,
    isError: statsError,
    error: statsErrorDetails
  } = useEventStats();
  
  // Get system health
  const { 
    data: systemHealth, 
    isLoading: healthLoading, 
    isError: healthError,
    error: healthErrorDetails
  } = useSystemHealth();
  
  // Loading state
  const isLoading = authLoading || statsLoading || healthLoading;
  
  // Get error state
  const hasError = healthError || statsError;
  const errorMessage = hasError 
    ? String(healthErrorDetails || statsErrorDetails || 'An error occurred loading dashboard data')
    : null;
  
  // Set user once authenticated
  useEffect(() => {
    if (sessionData?.isAuthenticated) {
      const currentUser = tokenStorage.getUser();
      setUser(currentUser);
      
      // Redirect to appropriate dashboard if user is not staff
      if (currentUser && currentUser.role !== 'staff') {
        if (currentUser.role === 'admin') {
          router.push('/admin/dashboard');
        } else if (currentUser.role === 'manager') {
          router.push('/manager/dashboard');
        } else if (currentUser.role === 'attendee') {
          router.push('/attendee');
        }
      }
    }
  }, [sessionData, router]);

  // Dashboard quick action cards
  const allQuickActionCards: DashboardCard[] = [
    {
      title: 'Check-In',
      description: 'Process attendee check-ins',
      icon: 'check',
      link: '/check-in',
      color: 'blue',
      metric: eventStats?.checkedInCount || 0,
      metricLabel: 'Checked In',
      roles: ['admin', 'staff'], // Both admin and regular staff can access
    },
    {
      title: 'Distribution',
      description: 'Manage resource allocation',
      icon: 'inventory',
      link: '/distribution',
      color: 'green',
      metric: eventStats?.resourceDistribution?.lunch.claimed || 0,
      metricLabel: 'Resources Claimed',
      roles: ['admin', 'staff'], // Both admin and regular staff can access
    },
    {
      title: 'Attendees',
      description: 'View and manage attendees',
      icon: 'people',
      link: '/admin/attendees',
      color: 'purple',
      metric: eventStats?.totalAttendees || 0,
      metricLabel: 'Total Registered',
      roles: ['admin'], // Only admins can access attendee management
    },
    {
      title: 'Emergency',
      description: 'Emergency response system',
      icon: 'warning',
      link: '/admin/emergency',
      color: 'red',
      metric: eventStats?.emergencyStatus?.isActive ? 'Active' : 'Inactive',
      metricLabel: 'Status',
      roles: ['admin'], // Only admins can access emergency controls
    },
    {
      title: 'Events',
      description: 'Manage event settings',
      icon: 'event',
      link: '/admin/events',
      color: 'amber',
      metric: '1', // Placeholder - would come from actual event count
      metricLabel: 'Active Events',
      roles: ['admin'], // Only admins can manage events
    },
    {
      title: 'Analytics',
      description: 'View detailed analytics',
      icon: 'analytics',
      link: '/admin/analytics',
      color: 'indigo',
      metric: eventStats?.checkedInCount || 0,
      metricLabel: 'Data Points',
      roles: ['admin'], // Only admins can access analytics
    }
  ];

  // Filter cards based on user role
  const quickActionCards = useMemo(() => {
    if (!user) return [];
    
    return allQuickActionCards.filter(card => card.roles.includes(user.role));
  }, [user]);

  // Function to manually refresh data
  const refreshData = () => {
    // Implementation of refreshData function
  };
        
  // Update chart data when event stats change
  useEffect(() => {
    if (eventStats) {
        setChartData({
          labels: ['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM'],
          datasets: [
            {
              label: 'Check-ins',
              data: [12, 25, 41, 30, 18, 22, 16],
              borderColor: '#3B82F6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.3,
              fill: true
            }
          ]
        });
      }
  }, [eventStats]);

  // Update date/time display function
  const updateClock = () => {
    const dateElement = document.getElementById('current-date');
    const timeElement = document.getElementById('current-time');
  
    if (dateElement) {
      dateElement.textContent = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      }
  
    if (timeElement) {
      timeElement.textContent = new Date().toLocaleTimeString();
    }
  };

  // Format uptime from seconds to days, hours, minutes
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    return `${days}d ${hours}h ${minutes}m`;
  };

  // Get status color based on status string
  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'active':
      case 'online':
        return 'bg-green-500';
      case 'warning':
      case 'degraded':
        return 'bg-yellow-500';
      case 'critical':
      case 'offline':
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Navigate to a specific page
  const navigateTo = (path: string) => {
    router.push(path);
  };

  // Render dashboard card
  const renderDashboardCard = (card: DashboardCard) => {
    const colorClasses = {
      blue: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300',
      green: 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300',
      red: 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300',
      purple: 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-300',
      yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-300',
    };

    return (
      <div 
        key={card.title}
        className={`card cursor-pointer transform transition-all duration-300 hover:scale-105 border-l-4 ${colorClasses[card.color as keyof typeof colorClasses]}`}
        onClick={() => navigateTo(card.link)}
      >
        <div className="p-5">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold mb-1">{card.title}</h3>
              <p className="text-sm opacity-80">{card.description}</p>
            </div>
            <div className={`p-2 rounded-full ${card.color === 'blue' ? 'bg-blue-100 text-blue-600 dark:bg-blue-800/50 dark:text-blue-300' : 
                              card.color === 'green' ? 'bg-green-100 text-green-600 dark:bg-green-800/50 dark:text-green-300' : 
                              card.color === 'red' ? 'bg-red-100 text-red-600 dark:bg-red-800/50 dark:text-red-300' : 
                              card.color === 'purple' ? 'bg-purple-100 text-purple-600 dark:bg-purple-800/50 dark:text-purple-300' : 
                              'bg-yellow-100 text-yellow-600 dark:bg-yellow-800/50 dark:text-yellow-300'}`}>
              {card.icon === 'check' && (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              )}
              {card.icon === 'inventory' && (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                </svg>
              )}
              {card.icon === 'people' && (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
              )}
              {card.icon === 'warning' && (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              )}
            </div>
          </div>
          {card.metric !== undefined && (
            <div className="mt-4">
              <div className="text-2xl font-bold">{card.metric}</div>
              <div className="text-xs opacity-70">{card.metricLabel}</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Handle refresh button click
  const handleRefreshClick = () => {
    refreshData();
  };

  // Setup WebSocket connection
  useEffect(() => {
    // Implementation of WebSocket setup
  }, []);

  // Handle event filter change
  const handleEventChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEventId(e.target.value || null);
  };
  
  // Handle date filter change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateFilter(e.target.value || null);
  };
  
  // Clear all filters
  const clearFilters = () => {
    setEventId(null);
    setDateFilter(null);
  };
  
  // Format relative time for notifications
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

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
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg overflow-hidden mb-8">
        <div className="px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
              <h1 className="text-3xl font-bold text-white">Staff Dashboard</h1>
              <p className="text-indigo-100 mt-2">
                Welcome back, {user?.email?.split('@')[0] || 'Staff'}
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
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-medium text-gray-900">Check-ins</h2>
                <p className="flex items-baseline text-gray-600">
                  <span className="text-2xl font-semibold text-gray-900">{eventStats?.checkedInCount || 0}</span>
                  <span className="ml-2">Attendees</span>
                </p>
                </div>
                      </div>
            <div className="mt-4">
              <Link href="/check-in" className="inline-flex items-center text-blue-600 hover:text-blue-800">
                Go to Check-in
                <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                </svg>
              </Link>
                      </div>
                      </div>
                    </div>

        {/* Distribution Stats */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8 4m0 0l-8-4m8 4v10"></path>
                </svg>
                          </div>
              <div className="ml-4">
                <h2 className="text-lg font-medium text-gray-900">Distribution</h2>
                <p className="flex items-baseline text-gray-600">
                  <span className="text-2xl font-semibold text-gray-900">{eventStats?.resourcesDistributed || 0}</span>
                  <span className="ml-2">Resources</span>
                </p>
                        </div>
                      </div>
            <div className="mt-4">
              <Link href="/distribution" className="inline-flex items-center text-green-600 hover:text-green-800">
                Go to Distribution
                <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                </svg>
              </Link>
                          </div>
                        </div>
                      </div>
        
        {/* Active Events */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                          </div>
              <div className="ml-4">
                <h2 className="text-lg font-medium text-gray-900">Events</h2>
                <p className="flex items-baseline text-gray-600">
                  <span className="text-2xl font-semibold text-gray-900">{eventStats?.activeEvents || 0}</span>
                  <span className="ml-2">Active</span>
                </p>
                        </div>
                      </div>
            <div className="mt-4">
              <Link href="/events" className="inline-flex items-center text-purple-600 hover:text-purple-800">
                View Events
                <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                </svg>
              </Link>
                        </div>
                      </div>
                    </div>
        
        {/* System Health */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-full ${
                systemHealth?.status === 'healthy' ? 'bg-green-100 text-green-600' :
                systemHealth?.status === 'degraded' ? 'bg-yellow-100 text-yellow-600' :
                'bg-red-100 text-red-600'
              }`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-medium text-gray-900">System</h2>
                <p className="flex items-baseline text-gray-600">
                  <span className="text-lg font-semibold text-gray-900 capitalize">{systemHealth?.status || 'Unknown'}</span>
                        </p>
                      </div>
                    </div>
            <div className="mt-4">
              <button className="inline-flex items-center text-blue-600 hover:text-blue-800" onClick={() => window.location.reload()}>
                Refresh Status
                <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
              </button>
                      </div>
                    </div>
                  </div>
                </div>
      
      {/* Quick Actions */}
      <div className="bg-white shadow-md rounded-xl overflow-hidden mb-8">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/check-in" className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition duration-200">
            <div className="flex-shrink-0 bg-blue-100 rounded-md p-3 text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
              </svg>
              </div>
            <div className="ml-4">
              <h3 className="text-md font-medium text-gray-900">Check-in Attendees</h3>
              <p className="text-sm text-gray-500">Process arrivals</p>
          </div>
          </Link>
          
          <Link href="/distribution" className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition duration-200">
            <div className="flex-shrink-0 bg-green-100 rounded-md p-3 text-green-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8 4m0 0l-8-4m8 4v10"></path>
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-md font-medium text-gray-900">Distribute Resources</h3>
              <p className="text-sm text-gray-500">Handle resource claims</p>
            </div>
          </Link>
          
          <Link href="/attendees" className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition duration-200">
            <div className="flex-shrink-0 bg-purple-100 rounded-md p-3 text-purple-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-md font-medium text-gray-900">View Attendees</h3>
              <p className="text-sm text-gray-500">Search and filter</p>
                </div>
          </Link>
          
          <Link href="/help" className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition duration-200">
            <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3 text-yellow-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-md font-medium text-gray-900">Help & Resources</h3>
              <p className="text-sm text-gray-500">Staff documentation</p>
                    </div>
          </Link>
          
          <Link href="/scan" className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition duration-200">
            <div className="flex-shrink-0 bg-indigo-100 rounded-md p-3 text-indigo-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
              </svg>
                  </div>
            <div className="ml-4">
              <h3 className="text-md font-medium text-gray-900">QR Scanner</h3>
              <p className="text-sm text-gray-500">Scan attendee codes</p>
                </div>
          </Link>
          
          <Link href="/reports" className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition duration-200">
            <div className="flex-shrink-0 bg-red-100 rounded-md p-3 text-red-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
                    </div>
            <div className="ml-4">
              <h3 className="text-md font-medium text-gray-900">Daily Reports</h3>
              <p className="text-sm text-gray-500">View statistics</p>
                    </div>
          </Link>
                </div>
              </div>
              
      {/* System Messages */}
      <div className="bg-white shadow-md rounded-xl overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-medium text-gray-900">System Messages</h2>
        </div>
        <div className="p-6">
          {hasError ? (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                  <p className="text-sm text-red-700">
                    {errorMessage}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border-l-4 border-green-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-3">
                  <p className="text-sm text-green-700">
                    All systems operational. You are ready to process check-ins and distribute resources.
                  </p>
            </div>
          </div>
        </div>
      )}

          <div className="mt-4 text-gray-500 text-sm">
            <p>Last updated: {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </div>
      </div>
  );
}
