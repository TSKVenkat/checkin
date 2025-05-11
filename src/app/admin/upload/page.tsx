'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import CSVUploader from '@/components/CSVUploader';

interface UploadResult {
  success: boolean;
  message: string;
  stats: {
    totalProcessed: number;
    successful: number;
    duplicates: number;
    invalid: number;
  };
}

export default function AdminUploadPage() {
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleUploadSuccess = (data: UploadResult) => {
    setUploadResult(data);
    setShowResult(true);
  };

  const handleUploadError = (error: any) => {
    console.error('Upload error:', error);
    setUploadResult({
      success: false,
      message: error.message || 'Failed to upload CSV',
      stats: {
        totalProcessed: 0,
        successful: 0,
        duplicates: 0,
        invalid: 0
      }
    });
    setShowResult(true);
  };

  const handleDismissResult = () => {
    setShowResult(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Upload Attendees</h1>
        </div>

        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="p-6">
            <p className="text-gray-700 mb-4">
              Use this form to upload a CSV file containing attendee information. The system will generate secure identifiers and QR codes for each attendee.
            </p>

            <CSVUploader
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
            />
          </div>
        </div>

        {showResult && uploadResult && (
          <div className={`bg-white shadow-sm rounded-lg overflow-hidden border-l-4 ${
            uploadResult.success ? 'border-green-500' : 'border-red-500'
          }`}>
            <div className="p-6">
              <div className="flex justify-between items-start">
                <h2 className="text-lg font-semibold">
                  {uploadResult.success ? 'Upload Successful' : 'Upload Failed'}
                </h2>
                <button
                  onClick={handleDismissResult}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <p className={`mt-2 ${uploadResult.success ? 'text-green-700' : 'text-red-700'}`}>
                {uploadResult.message}
              </p>
              
              {uploadResult.success && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm text-gray-500">Total Records</p>
                    <p className="text-xl font-semibold">{uploadResult.stats.totalProcessed}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-md">
                    <p className="text-sm text-green-700">Successful</p>
                    <p className="text-xl font-semibold text-green-700">
                      {uploadResult.stats.successful}
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-md">
                    <p className="text-sm text-yellow-700">Duplicates</p>
                    <p className="text-xl font-semibold text-yellow-700">
                      {uploadResult.stats.duplicates}
                    </p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-md">
                    <p className="text-sm text-red-700">Invalid</p>
                    <p className="text-xl font-semibold text-red-700">
                      {uploadResult.stats.invalid}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="mt-4">
                <p className="text-sm text-gray-600">
                  {uploadResult.success
                    ? "The system has generated secure IDs and QR codes for all valid attendees. These can now be viewed in the attendees list."
                    : "There was a problem processing your CSV file. Please check the format and try again."}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">CSV Format Guidelines</h3>
          </div>
          <div className="p-6">
            <p className="text-gray-700 mb-4">
              Your CSV file must include the following columns:
            </p>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Column Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Required
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Example
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">name</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Yes</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Full name of the attendee</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">John Doe</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">email</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Yes</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Email address (must be unique)</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">john.doe@example.com</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">phone</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Yes</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Contact phone number</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">+1234567890</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">role</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Yes</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Role or category of attendee</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">participant</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="mt-6">
              <h4 className="text-md font-medium text-gray-900 mb-2">Example CSV Format:</h4>
              <div className="bg-gray-50 p-4 rounded-md overflow-x-auto">
                <pre className="text-xs text-gray-600">
                  name,email,phone,role<br />
                  John Doe,john.doe@example.com,+1234567890,participant<br />
                  Jane Smith,jane.smith@example.com,+9876543210,speaker<br />
                  Alex Johnson,alex.j@example.com,+5551234567,organizer
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 