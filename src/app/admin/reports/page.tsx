'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Download, Filter, RefreshCw, Upload } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Helper for date formatting
const formatDate = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

// Interface for check-in data
interface CheckInData {
  id: string;
  name: string;
  email: string;
  checkedInAt: string;
  location: string;
  checkedInBy: {
    id: string;
    name: string;
    role: string;
  } | null;
  event: {
    id: string;
    name: string;
  } | null;
}

// Stats interface
interface CheckInStats {
  checkedInToday: number;
  totalExpected: number;
  completionRate: number;
}

// Distribution interfaces
interface HourlyDistribution {
  hour: number;
  count: number;
}

interface LocationDistribution {
  location: string;
  count: number;
}

// Report data interface
interface ReportData {
  success: boolean;
  message?: string;
  error?: string;
  day?: string;
  attendees?: CheckInData[];
  stats?: CheckInStats;
  hourlyDistribution?: HourlyDistribution[];
  locationDistribution?: LocationDistribution[];
}

// Main page component
export default function ReportsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isExporting, setIsExporting] = useState(false);

  // Build query key based on selected date and event
  const reportQueryKey = ['report', selectedDate, selectedEvent];

  // Fetcher functions for React Query
  const fetchEvents = async () => {
    const response = await axios.get('/api/events');
    if (response.data.success) {
      return response.data.events;
    }
    throw new Error('Failed to fetch events');
  };

  const fetchReportData = async ({ queryKey }: any) => {
    const [_key, date, eventId] = queryKey;
    
    // Build the API URL with parameters
    let url = `/api/attendees/recent-checkins?day=${date}&limit=100`;
    if (eventId) {
      url += `&eventId=${eventId}`;
    }
    
    const response = await axios.get<ReportData>(url);
    
    // Check for error in response
    if (!response.data) {
      throw new Error('Failed to fetch report data');
    }
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to fetch report data');
    }
    
    return response.data;
  };

  // React Query hooks
  const { 
    data: events = [],
    isError: isEventsError,
    error: eventsError
  } = useQuery({
    queryKey: ['events'],
    queryFn: fetchEvents,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });

  const {
    data: reportData,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: reportQueryKey,
    queryFn: fetchReportData,
    staleTime: 60 * 1000, // 1 minute
    retry: 2,
    refetchOnWindowFocus: false,
  });

  // Authentication check
  useEffect(() => {
    const checkUser = async () => {
      try {
        const userString = localStorage.getItem('user');
        if (!userString) {
          router.push('/login');
          return;
        }

        const user = JSON.parse(userString);
        if (!['admin', 'manager'].includes(user.role)) {
          router.push('/dashboard');
          return;
        }

        setIsAdmin(user.role === 'admin');
      } catch (err) {
        console.error('Error checking user:', err);
        router.push('/login');
      }
    };

    checkUser();
  }, [router]);

  // Extract data from query results
  const checkInData = reportData?.attendees || [];
  const stats = reportData?.stats || { checkedInToday: 0, totalExpected: 0, completionRate: 0 };
  const hourlyDistribution = reportData?.hourlyDistribution || [];
  const locationDistribution = reportData?.locationDistribution || [];

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    const formattedDate = formatDate(date);
    setSelectedDate(formattedDate);
    // React Query will automatically refetch with the new query key
  };

  // Handle event selection
  const handleEventChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const eventId = e.target.value || null;
    setSelectedEvent(eventId);
    // React Query will automatically refetch with the new query key
  };

  // Export the current report as CSV
  const exportAsCSV = async () => {
    if (!checkInData.length) return;
    
    setIsExporting(true);
    
    try {
      // Create CSV content
      const headers = ['Name', 'Email', 'Check-in Time', 'Location', 'Checked In By', 'Event'];
      const rows = checkInData.map(item => [
        item.name,
        item.email,
        new Date(item.checkedInAt).toLocaleString(),
        item.location,
        item.checkedInBy?.name || 'N/A',
        item.event?.name || 'N/A'
      ]);
      
      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      // Create downloadable link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `checkin-report-${selectedDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting CSV:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Navigation for calendar
  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Calendar days for the current month
  const monthDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  // Loading state UI
  if (isLoading && !reportData) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Reports</h1>
          <div className="bg-slate-800 rounded-lg p-8 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="ml-4 text-xl">Loading report data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <h1 className="text-3xl font-bold">Check-in Reports</h1>
          <div className="mt-4 md:mt-0 flex items-center space-x-2">
            <Link href="/dashboard" className="bg-slate-700 text-white px-4 py-2 rounded-md hover:bg-slate-600">
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="bg-slate-800 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Event Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Event</label>
              <div className="relative">
                <select
                  value={selectedEvent || ''}
                  onChange={handleEventChange}
                  className="w-full bg-slate-700 border border-slate-600 rounded-md px-4 py-2 appearance-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Events</option>
                  {events.map((event: { id: string; name: string }) => (
                    <option key={event.id} value={event.id}>{event.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
              </div>
            </div>
            
            {/* Date Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Date</label>
              <div className="flex">
                <button
                  type="button"
                  onClick={() => {
                    const yesterday = new Date(selectedDate);
                    yesterday.setDate(yesterday.getDate() - 1);
                    handleDateSelect(yesterday);
                  }}
                  className="bg-slate-700 px-3 py-2 rounded-l-md border-r border-slate-600 hover:bg-slate-600"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentDate(new Date(selectedDate))}
                  className="flex-1 flex items-center justify-center bg-slate-700 px-4 py-2 hover:bg-slate-600"
                >
                  <Calendar size={16} className="mr-2" />
                  <span>{format(new Date(selectedDate), 'MMM dd, yyyy')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const tomorrow = new Date(selectedDate);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    handleDateSelect(tomorrow);
                  }}
                  className="bg-slate-700 px-3 py-2 rounded-r-md border-l border-slate-600 hover:bg-slate-600"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            
            {/* Export and Refresh */}
            <div className="flex space-x-2 items-end">
              <button
                onClick={() => refetch()}
                className="flex-1 bg-blue-600 text-white rounded-md px-4 py-2 flex items-center justify-center hover:bg-blue-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <RefreshCw size={16} className="animate-spin mr-2" />
                    Loading...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <RefreshCw size={16} className="mr-2" />
                    Refresh
                  </span>
                )}
              </button>
              <button
                onClick={exportAsCSV}
                className="flex-1 bg-green-600 text-white rounded-md px-4 py-2 flex items-center justify-center hover:bg-green-700"
                disabled={isExporting || checkInData.length === 0}
              >
                {isExporting ? (
                  <span className="flex items-center">
                    <Download size={16} className="animate-spin mr-2" />
                    Exporting...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Download size={16} className="mr-2" />
                    Export CSV
                  </span>
                )}
              </button>
            </div>
          </div>
          
          {/* Calendar popup */}
          {currentDate && (
            <div className="mt-4 bg-slate-700 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <button onClick={goToPreviousMonth} className="p-1 hover:bg-slate-600 rounded-full">
                  <ChevronLeft size={20} />
                </button>
                <h3 className="text-lg font-medium">
                  {format(currentMonth, 'MMMM yyyy')}
                </h3>
                <button onClick={goToNextMonth} className="p-1 hover:bg-slate-600 rounded-full">
                  <ChevronRight size={20} />
                </button>
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm text-gray-400 font-medium py-1">
                    {day}
                  </div>
                ))}
                
                {monthDays.map(day => {
                  const isSelected = isSameDay(day, new Date(selectedDate));
                  const isToday = isSameDay(day, new Date());
                  
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => handleDateSelect(day)}
                      className={`
                        h-10 w-full rounded-md flex items-center justify-center text-sm
                        ${isSelected ? 'bg-blue-600 text-white' : ''}
                        ${!isSelected && isToday ? 'border border-blue-500' : ''}
                        ${!isSelected && !isToday ? 'hover:bg-slate-600' : ''}
                      `}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {isError && (
          <div className="bg-red-900/30 border border-red-700 text-white p-4 rounded-lg mb-6">
            <h3 className="text-lg font-medium mb-2">Error</h3>
            <p>{(error as Error)?.message || 'An error occurred while fetching report data'}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-medium mb-2">Check-ins Today</h3>
            <p className="text-4xl font-bold">{stats?.checkedInToday || 0}</p>
            <p className="text-sm text-gray-400 mt-2">Out of {stats?.totalExpected || 0} expected attendees</p>
          </div>
          
          <div className="bg-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-medium mb-2">Completion Rate</h3>
            <p className="text-4xl font-bold">{stats?.completionRate || 0}%</p>
            <div className="w-full bg-slate-700 rounded-full h-2.5 mt-4">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${stats?.completionRate || 0}%` }}
              ></div>
            </div>
          </div>
          
          <div className="bg-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-medium mb-2">Top Location</h3>
            {locationDistribution && locationDistribution.length > 0 ? (
              <>
                <p className="text-2xl font-bold">{locationDistribution[0]?.location || 'N/A'}</p>
                <p className="text-sm text-gray-400 mt-2">
                  {locationDistribution[0]?.count || 0} check-ins ({Math.round(((locationDistribution[0]?.count || 0) / (stats?.checkedInToday || 1)) * 100)}%)
                </p>
              </>
            ) : (
              <p className="text-xl">No data available</p>
            )}
          </div>
        </div>

        {/* Distribution Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Hourly Distribution */}
          <div className="bg-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-medium mb-4">Hourly Distribution</h3>
            {hourlyDistribution && hourlyDistribution.length > 0 ? (
              <div className="h-64">
                <div className="flex h-full items-end space-x-2">
                  {hourlyDistribution.map((item) => {
                    const maxCount = Math.max(...hourlyDistribution.map(h => h.count));
                    const heightPercentage = (item.count / maxCount) * 100;
                    
                    return (
                      <div key={item.hour} className="flex-1 flex flex-col items-center">
                        <div className="w-full flex justify-center">
                          <div 
                            className="bg-blue-600 w-full rounded-t-sm hover:bg-blue-500 transition-all"
                            style={{ height: `${heightPercentage}%` }}
                          ></div>
                        </div>
                        <div className="text-xs mt-2 text-gray-400">
                          {item.hour}:00
                        </div>
                        <div className="text-xs font-medium">{item.count}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <p className="text-gray-400">No hourly data available for this date</p>
              </div>
            )}
          </div>
          
          {/* Location Distribution */}
          <div className="bg-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-medium mb-4">Location Distribution</h3>
            {locationDistribution && locationDistribution.length > 0 ? (
              <div className="space-y-4">
                {locationDistribution.map((item) => {
                  const percentage = Math.round((item.count / (stats?.checkedInToday || 1)) * 100);
                  
                  return (
                    <div key={item.location} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">{item.location || 'Unknown'}</span>
                        <span className="text-sm font-medium">{item.count} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <p className="text-gray-400">No location data available for this date</p>
              </div>
            )}
          </div>
        </div>

        {/* Check-in Data Table */}
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-medium mb-4">Check-in Details</h3>
            
            {checkInData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left bg-slate-700">
                      <th className="px-4 py-2 rounded-tl-md">Name</th>
                      <th className="px-4 py-2">Email</th>
                      <th className="px-4 py-2">Time</th>
                      <th className="px-4 py-2">Location</th>
                      <th className="px-4 py-2">Checked In By</th>
                      <th className="px-4 py-2 rounded-tr-md">Event</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {checkInData.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-700/50">
                        <td className="px-4 py-3">{item.name}</td>
                        <td className="px-4 py-3">{item.email}</td>
                        <td className="px-4 py-3">{new Date(item.checkedInAt).toLocaleTimeString()}</td>
                        <td className="px-4 py-3">{item.location}</td>
                        <td className="px-4 py-3">{item.checkedInBy?.name || 'N/A'}</td>
                        <td className="px-4 py-3">{item.event?.name || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-400">No check-in data available for the selected date</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 