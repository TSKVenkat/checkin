'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthSession, tokenStorage } from '@/lib/query/auth-hooks';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';

export default function AttendeeDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Check authentication
  const { data: sessionData, isLoading: authLoading } = useAuthSession({
    onUnauthenticated: () => {
      router.push('/login');
    }
  });
  
  // Set user and load attendee data
  useEffect(() => {
    if (sessionData?.isAuthenticated) {
      const currentUser = tokenStorage.getUser();
      setUser(currentUser);
      
      // Verify the user has attendee or speaker role
      if (currentUser && currentUser.role !== 'attendee' && currentUser.role !== 'speaker') {
        // Redirect based on role
        if (currentUser.role === 'admin') {
          router.push('/admin/dashboard');
        } else if (currentUser.role === 'manager') {
          router.push('/manager/dashboard');
        } else {
          router.push('/dashboard');
        }
      }
      
      setLoading(false);
    }
  }, [sessionData, router]);
  
  if (loading || authLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  // Create a QR code value that includes attendee ID for verification
  const qrValue = user ? `CHECKIN:${user.id}:${user.email}` : '';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl shadow-lg overflow-hidden mb-8">
        <div className="px-6 py-8">
          <h1 className="text-3xl font-bold mb-2">
            {user?.role === 'speaker' ? 'Speaker Dashboard' : 'Attendee Dashboard'}
          </h1>
          <p className="text-blue-100 text-lg">
            Welcome back, {user?.email?.split('@')[0] || 'Attendee'}
          </p>
          {user?.role === 'speaker' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-200 text-yellow-800 mt-2">
              Speaker
                        </span>
                      )}
                    </div>
                  </div>
                  
      {/* QR Code Card */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
        <div className="px-6 py-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Your Check-In QR Code</h2>
          <p className="text-gray-500 text-sm mt-1">
            Show this code to staff for quick check-in
          </p>
        </div>
        <div className="px-6 py-8 flex flex-col items-center justify-center bg-gray-50">
          <div className="bg-white p-4 rounded-lg shadow-md mb-6">
            {qrValue && (
              <QRCodeSVG 
                value={qrValue}
                size={200}
                level="H"
                includeMargin={true}
              />
                      )}
                    </div>
          <p className="text-sm text-gray-500 mb-4 text-center max-w-md">
            Staff will scan this QR code to verify your attendance and provide access to event resources.
          </p>
          
          <div className="w-full max-w-md">
            <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-700 p-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                  </svg>
                  </div>
                <div className="ml-3">
                  <p className="text-sm">
                    Your QR code is unique and tied to your account. Do not share it with others.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
                </div>
                
      {/* Attendee Details */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
        <div className="px-6 py-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Your Information</h2>
        </div>
        <div className="px-6 py-6">
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                      <div>
              <dt className="text-sm font-medium text-gray-500">Full Name</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900">{user?.name || user?.email?.split('@')[0] || 'N/A'}</dd>
                      </div>
                      <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900">{user?.email || 'N/A'}</dd>
                      </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Attendee ID</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900">{user?.id || 'N/A'}</dd>
                                </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Registration Date</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900">{new Date().toLocaleDateString()}</dd>
                      </div>
                    </dl>
                  </div>
              </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link href="/attendee/schedule" className="bg-white hover:bg-blue-50 border border-gray-200 rounded-xl p-6 transition-colors duration-200 flex flex-col items-center text-center">
          <svg className="w-10 h-10 text-blue-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Event Schedule</h3>
          <p className="text-sm text-gray-500">View the full event schedule</p>
        </Link>
        
        <Link href="/attendee/resources" className="bg-white hover:bg-green-50 border border-gray-200 rounded-xl p-6 transition-colors duration-200 flex flex-col items-center text-center">
          <svg className="w-10 h-10 text-green-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Resources</h3>
          <p className="text-sm text-gray-500">Access event materials</p>
        </Link>
        
        <Link href="/attendee/profile" className="bg-white hover:bg-purple-50 border border-gray-200 rounded-xl p-6 transition-colors duration-200 flex flex-col items-center text-center">
          <svg className="w-10 h-10 text-purple-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Your Profile</h3>
          <p className="text-sm text-gray-500">Update your information</p>
        </Link>
            </div>
      
      {/* Help Section */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Need Help?</h2>
            </div>
        <div className="px-6 py-6">
          <p className="text-gray-600 mb-4">
            If you have any questions or need assistance during the event, please contact our support team:
          </p>
          <div className="flex items-center text-blue-600 font-medium">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
            <span>support@example.com</span>
          </div>
        </div>
      </div>
    </div>
  );
} 