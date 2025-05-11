'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';

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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  
  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // In a real application, these would be actual API calls
        // For now we'll use mock data
        
        // Mock statistics
        const mockStats: Stats = {
          totalAttendees: 250,
          checkedInCount: 175,
          checkedInPercentage: 70,
          lunchClaimedCount: 150,
          lunchClaimedPercentage: 60,
          kitClaimedCount: 140,
          kitClaimedPercentage: 56
        };
        
        // Mock attendees
        const mockAttendees: Attendee[] = Array.from({ length: 50 }, (_, i) => ({
          _id: `att_${i + 1}`,
          name: `Attendee ${i + 1}`,
          email: `attendee${i + 1}@example.com`,
          role: i % 5 === 0 ? 'VIP' : 'Participant',
          isCheckedIn: i % 3 === 0,
          checkedInAt: i % 3 === 0 ? new Date().toISOString() : undefined,
          lunchClaimed: i % 4 === 0,
          lunchClaimedAt: i % 4 === 0 ? new Date().toISOString() : undefined,
          kitClaimed: i % 5 === 0,
          kitClaimedAt: i % 5 === 0 ? new Date().toISOString() : undefined
        }));
        
        setStats(mockStats);
        setAttendees(mockAttendees);
        setTotalPages(Math.ceil(mockAttendees.length / itemsPerPage));
        
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [itemsPerPage]);
  
  // Filter attendees based on search term
  const filteredAttendees = attendees.filter(attendee => 
    attendee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    attendee.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Paginate attendees
  const paginatedAttendees = filteredAttendees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2 text-center">Admin Dashboard</h1>
      <p className="text-gray-600 mb-8 text-center">Event Management System</p>
      
      {/* Admin Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link 
          href="/admin/upload" 
          className="flex flex-col items-center justify-center p-6 bg-blue-100 rounded-lg hover:bg-blue-200 transition"
        >
          <span className="text-2xl mb-2">📝</span>
          <h3 className="font-semibold">Upload Attendees</h3>
          <p className="text-sm text-center text-gray-600">Import attendees from CSV</p>
        </Link>
        
        <Link 
          href="/admin/events" 
          className="flex flex-col items-center justify-center p-6 bg-green-100 rounded-lg hover:bg-green-200 transition"
        >
          <span className="text-2xl mb-2">🗓️</span>
          <h3 className="font-semibold">Manage Events</h3>
          <p className="text-sm text-center text-gray-600">Configure event settings</p>
        </Link>
        
        <Link 
          href="/admin/emergency" 
          className="flex flex-col items-center justify-center p-6 bg-red-100 rounded-lg hover:bg-red-200 transition"
        >
          <span className="text-2xl mb-2">🚨</span>
          <h3 className="font-semibold">Emergency Controls</h3>
          <p className="text-sm text-center text-gray-600">Manage emergency protocols</p>
        </Link>
      </div>
      
      {loading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 p-4 rounded-md text-red-700 mb-8">
          {error}
        </div>
      ) : (
        <>
          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-gray-500 text-sm font-medium">Total Attendees</h3>
                <p className="text-3xl font-bold">{stats.totalAttendees}</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-gray-500 text-sm font-medium">Checked In</h3>
                <p className="text-3xl font-bold">{stats.checkedInCount}</p>
                <p className="text-sm text-gray-500">{stats.checkedInPercentage}% of total</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-gray-500 text-sm font-medium">Lunch Claimed</h3>
                <p className="text-3xl font-bold">{stats.lunchClaimedCount}</p>
                <p className="text-sm text-gray-500">{stats.lunchClaimedPercentage}% of total</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-gray-500 text-sm font-medium">Kits Distributed</h3>
                <p className="text-3xl font-bold">{stats.kitClaimedCount}</p>
                <p className="text-sm text-gray-500">{stats.kitClaimedPercentage}% of total</p>
              </div>
            </div>
          )}
          
          {/* Attendee List */}
          <div className="bg-white p-4 rounded-lg shadow mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Attendees</h2>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search attendees..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="px-4 py-2 border rounded-md w-64"
                />
                <span className="absolute right-3 top-2.5 text-gray-400">🔍</span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check-In
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lunch
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedAttendees.map((attendee) => (
                    <tr key={attendee._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{attendee.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{attendee.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          attendee.role === 'VIP' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {attendee.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {attendee.isCheckedIn ? (
                          <span className="text-green-600">✓ {new Date(attendee.checkedInAt!).toLocaleTimeString()}</span>
                        ) : (
                          <span className="text-red-600">✗</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {attendee.lunchClaimed ? (
                          <span className="text-green-600">✓ {new Date(attendee.lunchClaimedAt!).toLocaleTimeString()}</span>
                        ) : (
                          <span className="text-red-600">✗</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {attendee.kitClaimed ? (
                          <span className="text-green-600">✓ {new Date(attendee.kitClaimedAt!).toLocaleTimeString()}</span>
                        ) : (
                          <span className="text-red-600">✗</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <a href={`/admin/attendees/${attendee._id}`} className="text-blue-600 hover:text-blue-900 mr-4">View</a>
                        <a href={`/admin/attendees/${attendee._id}/edit`} className="text-indigo-600 hover:text-indigo-900">Edit</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-4">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-gray-200 rounded-md disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-gray-200 rounded-md disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}