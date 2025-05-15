'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { useAuthSession } from '@/lib/query/auth-hooks';

interface Staff {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  lastLogin?: string;
  createdAt: string;
  emailVerified: boolean;
}

export default function StaffManagement() {
  const router = useRouter();
  const { user, status } = useAuthSession();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [staffMembers, setStaffMembers] = useState<Staff[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<Staff[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    role: 'staff',
    permissions: [] as string[],
    password: ''
  });

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

  // Fetch staff data
  useEffect(() => {
    if (status !== 'loading' && user?.role === 'admin') {
      fetchStaffData();
    }
  }, [status, user]);

  // Apply filters
  useEffect(() => {
    let result = [...staffMembers];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(staff => 
        staff.name.toLowerCase().includes(term) || 
        staff.email.toLowerCase().includes(term)
      );
    }
    
    // Apply role filter
    if (roleFilter !== 'all') {
      result = result.filter(staff => staff.role === roleFilter);
    }
    
    setFilteredStaff(result);
  }, [staffMembers, searchTerm, roleFilter]);

  const fetchStaffData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Call the actual API endpoint
      const response = await fetch('/api/admin/staff', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch staff data');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setStaffMembers(data.data);
        setFilteredStaff(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch staff data');
      }
    } catch (err) {
      console.error('Failed to fetch staff data:', err);
      setError('Failed to load staff data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleRoleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRoleFilter(e.target.value);
  };

  const handleAddStaff = async () => {
    // Validate data
    if (!newStaff.name || !newStaff.email || !newStaff.role || !newStaff.password) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      // Create the user via API
      const response = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newStaff.name,
          email: newStaff.email,
          role: newStaff.role,
          permissions: newStaff.permissions,
          password: newStaff.password
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to add staff member');
      }
      
      if (data.success) {
        // Refresh staff data to include new member
        await fetchStaffData();
        setShowAddModal(false);
        setNewStaff({
          name: '',
          email: '',
          role: 'staff',
          permissions: [],
          password: ''
        });
      } else {
        throw new Error(data.message || 'Failed to add staff member');
      }
    } catch (err) {
      console.error('Failed to add staff member:', err);
      setError((err as Error).message || 'Failed to add staff member. Please try again.');
    }
  };

  const handlePermissionChange = (permission: string) => {
    if (newStaff.permissions.includes(permission)) {
      setNewStaff({
        ...newStaff,
        permissions: newStaff.permissions.filter(p => p !== permission)
      });
    } else {
      setNewStaff({
        ...newStaff,
        permissions: [...newStaff.permissions, permission]
      });
    }
  };

  // Format date for display
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Get badge color based on role
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'staff':
        return 'bg-green-100 text-green-800';
      case 'speaker':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (status === 'loading' || (status === 'authenticated' && user?.role !== 'admin')) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Staff Management</h1>
          <p className="text-gray-600">Manage staff accounts and permissions</p>
        </div>
        <div>
          <Link 
            href="/admin"
            className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-gray-800 mr-2"
          >
            Back to Dashboard
          </Link>
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700 text-white"
          >
            Add Staff
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 p-4 rounded-md text-red-700 mb-8">
          {error}
        </div>
      )}
      
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="w-full md:w-auto">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <input
                id="search"
                type="text"
                placeholder="Search by name or email"
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full md:w-64 px-4 py-2 border rounded-md pr-10"
              />
              <span className="absolute right-3 top-2.5 text-gray-400">🔍</span>
            </div>
          </div>
          
          <div className="w-full md:w-auto">
            <label htmlFor="roleFilter" className="block text-sm font-medium text-gray-700 mb-1">Filter by Role</label>
            <select
              id="roleFilter"
              value={roleFilter}
              onChange={handleRoleFilterChange}
              className="w-full md:w-auto px-4 py-2 border rounded-md"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
              <option value="speaker">Speaker</option>
            </select>
          </div>
          
          <div className="w-full md:w-auto ml-auto">
            <p className="text-sm text-gray-600 mb-1">Total Staff: {filteredStaff.length}</p>
          </div>
        </div>
      </div>
      
      {/* Staff List */}
      {loading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{staff.name}</div>
                      <div className="text-xs text-gray-500">ID: {staff.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {staff.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(staff.role)}`}>
                        {staff.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(staff.lastLogin)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        staff.emailVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {staff.emailVerified ? 'Verified' : 'Pending Verification'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                        onClick={() => console.log('Edit staff', staff.id)}
                      >
                        Edit
                      </button>
                      <button 
                        className="text-red-600 hover:text-red-900"
                        onClick={() => console.log('Delete staff', staff.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                
                {filteredStaff.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No staff members found with the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="relative bg-white rounded-lg max-w-md w-full p-6 mx-4">
            <h2 className="text-xl font-bold mb-4">Add New Staff Member</h2>
            
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={newStaff.name}
                onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                className="w-full px-4 py-2 border rounded-md"
                required
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={newStaff.email}
                onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                className="w-full px-4 py-2 border rounded-md"
                required
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                type="password"
                value={newStaff.password}
                onChange={(e) => setNewStaff({...newStaff, password: e.target.value})}
                className="w-full px-4 py-2 border rounded-md"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Password must be at least 8 characters with uppercase, lowercase, number, and special character.
              </p>
            </div>
            
            <div className="mb-4">
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                id="role"
                value={newStaff.role}
                onChange={(e) => setNewStaff({...newStaff, role: e.target.value})}
                className="w-full px-4 py-2 border rounded-md"
                required
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
                <option value="speaker">Speaker</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permissions
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center">
                  <input
                    id="check_in"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    checked={newStaff.permissions.includes('check_in')}
                    onChange={() => handlePermissionChange('check_in')}
                  />
                  <label htmlFor="check_in" className="ml-2 text-sm text-gray-700">
                    Check-in
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="distribution"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    checked={newStaff.permissions.includes('distribution')}
                    onChange={() => handlePermissionChange('distribution')}
                  />
                  <label htmlFor="distribution" className="ml-2 text-sm text-gray-700">
                    Distribution
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="view_reports"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    checked={newStaff.permissions.includes('view_reports')}
                    onChange={() => handlePermissionChange('view_reports')}
                  />
                  <label htmlFor="view_reports" className="ml-2 text-sm text-gray-700">
                    View Reports
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="manage_resources"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    checked={newStaff.permissions.includes('manage_resources')}
                    onChange={() => handlePermissionChange('manage_resources')}
                  />
                  <label htmlFor="manage_resources" className="ml-2 text-sm text-gray-700">
                    Manage Resources
                  </label>
                </div>
                {newStaff.role === 'admin' && (
                  <>
                    <div className="flex items-center">
                      <input
                        id="manage_users"
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        checked={newStaff.permissions.includes('manage_users')}
                        onChange={() => handlePermissionChange('manage_users')}
                      />
                      <label htmlFor="manage_users" className="ml-2 text-sm text-gray-700">
                        Manage Users
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="manage_events"
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        checked={newStaff.permissions.includes('manage_events')}
                        onChange={() => handlePermissionChange('manage_events')}
                      />
                      <label htmlFor="manage_events" className="ml-2 text-sm text-gray-700">
                        Manage Events
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="emergency"
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        checked={newStaff.permissions.includes('emergency')}
                        onChange={() => handlePermissionChange('emergency')}
                      />
                      <label htmlFor="emergency" className="ml-2 text-sm text-gray-700">
                        Emergency Controls
                      </label>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStaff}
                className="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700 text-white"
              >
                Add Staff
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 