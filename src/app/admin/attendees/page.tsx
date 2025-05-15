'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { GradientButton } from '@/components/ui/GradientButton';
import { useAttendees } from '@/lib/query/hooks';

interface Attendee {
  id: string;
  uniqueId: string;
  name: string;
  email: string;
  role: string;
  isCheckedIn: boolean;
  checkedInAt?: string;
  resourceClaims?: {
    lunch?: {
      claimed: boolean;
      claimedAt?: string;
    };
    kit?: {
      claimed: boolean;
      claimedAt?: string;
    };
  };
}

export default function AttendeesPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterResource, setFilterResource] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  
  // Fetch attendees data
  const { 
    data: attendeesData = [], 
    isLoading,
    error: queryError
  } = useAttendees();

  // Display error message safely
  const errorMessage = queryError 
    ? (queryError instanceof Error ? queryError.message : 'Failed to load attendees')
    : null;

  // Filter and search attendees with useMemo
  const filteredAttendees = useMemo(() => {
    if (!attendeesData) return [];
    
    let result = [...attendeesData];
    
    // Apply search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        attendee => 
          attendee.name.toLowerCase().includes(term) || 
          attendee.email.toLowerCase().includes(term) ||
          attendee.uniqueId.toLowerCase().includes(term)
      );
    }
    
    // Apply check-in status filter
    if (filterStatus !== 'all') {
      const isCheckedIn = filterStatus === 'checked-in';
      result = result.filter(attendee => attendee.isCheckedIn === isCheckedIn);
    }
    
    // Apply resource filter
    if (filterResource !== 'all') {
      result = result.filter(
        attendee => 
          attendee.resourceClaims?.[filterResource as 'lunch' | 'kit']?.claimed
      );
    }
    
    return result;
  }, [attendeesData, searchTerm, filterStatus, filterResource]);
  
  // Pagination
  const indexOfLastAttendee = currentPage * itemsPerPage;
  const indexOfFirstAttendee = indexOfLastAttendee - itemsPerPage;
  const currentAttendees = filteredAttendees.slice(indexOfFirstAttendee, indexOfLastAttendee);
  const totalPages = Math.ceil(filteredAttendees.length / itemsPerPage);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when search changes
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterStatus(e.target.value as any);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // Download attendee data as CSV
  const downloadCsv = () => {
    const headers = ['Name', 'Email', 'Role', 'Checked In', 'Check-in Time', 'Lunch Claimed', 'Kit Claimed'];
    
    const rows = filteredAttendees.map(attendee => [
      attendee.name,
      attendee.email,
      attendee.role,
      attendee.isCheckedIn ? 'Yes' : 'No',
      attendee.checkedInAt ? new Date(attendee.checkedInAt).toLocaleString() : 'N/A',
      attendee.resourceClaims?.lunch?.claimed ? 'Yes' : 'No',
      attendee.resourceClaims?.kit?.claimed ? 'Yes' : 'No',
    ]);
    
    let csvContent = [headers].concat(rows)
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `attendees_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Upload CSV button handler - redirects to upload page
  const handleUploadClick = () => {
    router.push('/admin/attendees/upload');
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-32">
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-slate-200 dark:bg-slate-700 h-10 w-10"></div>
          <div className="flex-1 space-y-6 py-1">
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded col-span-2"></div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded col-span-1"></div>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Attendees</h1>
        <div className="flex gap-4">
          <GradientButton onClick={handleUploadClick} variant="blue">
            Upload CSV
          </GradientButton>
          <GradientButton onClick={downloadCsv} variant="teal">
            Export CSV
          </GradientButton>
        </div>
      </div>
      
      <SpotlightCard className="mb-8 p-6" gradient="blue">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-white/80 mb-1">
              Search
            </label>
            <input
              type="text"
              id="search"
              placeholder="Search by name, email or ID"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 rounded-lg bg-white/10 border border-white/20 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Status Filter */}
          <div className="md:w-1/4">
            <label htmlFor="status-filter" className="block text-sm font-medium text-white/80 mb-1">
              Check-in Status
            </label>
            <select
              id="status-filter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full p-2 rounded-lg bg-white/10 border border-white/20 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Attendees</option>
              <option value="checked-in">Checked In</option>
              <option value="not-checked-in">Not Checked In</option>
            </select>
          </div>
          
          {/* Resource Filter */}
          <div className="md:w-1/4">
            <label htmlFor="resource-filter" className="block text-sm font-medium text-white/80 mb-1">
              Resource Status
            </label>
            <select
              id="resource-filter"
              value={filterResource}
              onChange={(e) => setFilterResource(e.target.value as any)}
              className="w-full p-2 rounded-lg bg-white/10 border border-white/20 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Resources</option>
              <option value="lunch">Claimed Lunch</option>
              <option value="kit">Claimed Kit</option>
            </select>
          </div>
        </div>
      </SpotlightCard>
      
      {/* Error display */}
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 dark:bg-red-900/30 dark:text-red-300">
          <p>{errorMessage}</p>
        </div>
      )}
      
      {/* Attendee data table */}
      <div className="overflow-x-auto">
        <table className="w-full bg-white dark:bg-slate-900 shadow-md rounded-lg overflow-hidden">
          <thead className="bg-gray-50 dark:bg-slate-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Check-in Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Resources
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {filteredAttendees.map((attendee, index) => (
              <tr 
                key={attendee.id} 
                className={index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-gray-50 dark:bg-slate-800/50'}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {attendee.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  {attendee.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    attendee.role === 'VIP' 
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' 
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                  }`}>
                    {attendee.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    attendee.isCheckedIn 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                  }`}>
                    {attendee.isCheckedIn ? 'Checked In' : 'Not Checked In'}
                  </span>
                  {attendee.isCheckedIn && attendee.checkedInAt && (
                    <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(attendee.checkedInAt).toLocaleString()}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  <div className="flex space-x-2">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      attendee.resourceClaims?.lunch?.claimed 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' 
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                    }`}>
                      {attendee.resourceClaims?.lunch?.claimed ? 'Lunch ✓' : 'Lunch ✗'}
                    </span>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      attendee.resourceClaims?.kit?.claimed 
                        ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300' 
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                    }`}>
                      {attendee.resourceClaims?.kit?.claimed ? 'Kit ✓' : 'Kit ✗'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link href={`/admin/attendees/${attendee.id}`} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200">
                    Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Empty state */}
        {filteredAttendees.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">No attendees found matching your criteria.</p>
          </div>
        )}
      </div>
      
      {/* Pagination - would be implemented in a real app */}
      <div className="mt-6 flex justify-between items-center">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Showing <span className="font-medium">{filteredAttendees.length}</span> of <span className="font-medium">{attendeesData.length}</span> attendees
        </div>
        <div className="flex space-x-2">
          <button className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 disabled:opacity-50">
            Previous
          </button>
          <button className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 disabled:opacity-50">
            Next
          </button>
        </div>
      </div>
    </div>
  );
} 