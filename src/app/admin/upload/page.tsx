'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';

export default function AdminUploadPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<string>('attendees');
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [templates, setTemplates] = useState<Record<string, string> | null>(null);
  const [errorDetails, setErrorDetails] = useState<Array<{record: string, error: string}>>([]);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [events, setEvents] = useState<Array<{id: string, name: string, status: string}>>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [showEvents, setShowEvents] = useState(false);

  useEffect(() => {
    // Verify the user is an admin
    const checkUser = () => {
      try {
        const userString = localStorage.getItem('user');
        if (!userString) {
          router.push('/login');
          return;
        }

        const user = JSON.parse(userString);
        if (user.role !== 'admin') {
          router.push('/dashboard');
          return;
        }

        setIsAdmin(true);
      } catch (err) {
        console.error('Error checking user:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkUser();
    
    // Fetch templates
    const fetchTemplates = async () => {
      try {
        const response = await fetch('/api/admin/upload');
        if (response.ok) {
          const data = await response.json();
          setTemplates(data.templates);
        }
      } catch (err) {
        console.error('Error fetching templates:', err);
      }
    };
    
    fetchTemplates();
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    
    // Clear previous messages
    setMessage(null);
  };

  const handleUploadTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setUploadType(e.target.value);
  };
  
  const handleDownloadTemplate = () => {
    if (templates && templates[uploadType]) {
      window.open(templates[uploadType], '_blank');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setMessage({ type: 'error', text: 'Please select a file to upload' });
      return;
    }

    // Check file type
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      setMessage({ type: 'error', text: 'Only CSV and Excel files are supported' });
      return;
    }

    setLoading(true);
    setMessage(null);
    setErrorDetails([]);
    setShowErrorDetails(false);

    try {
      // Create form data for the upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', uploadType);
      
      // Send the request to the API
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }
      
      // Display success message with results
      setMessage({ 
        type: 'success', 
        text: `${result.message}. Processed ${result.results.total} records (${result.results.created} created, ${result.results.updated} updated, ${result.results.errors} errors).` 
      });
      
      // Set error details if there are any
      if (result.results.errorDetails && result.results.errorDetails.length > 0) {
        setErrorDetails(result.results.errorDetails);
      }
      
      setFile(null);

      // Reset the file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (err) {
      console.error('Upload error:', err);
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'An error occurred during upload. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    setLoadingEvents(true);
    try {
      const response = await fetch('/api/admin/events?simple=true');
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      const data = await response.json();
      setEvents(data.data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    if (showEvents && events.length === 0) {
      fetchEvents();
    }
  }, [showEvents]);

  if (loading && !isAdmin) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="w-full">
        <div className="px-6 py-8">
          <h1 className="text-2xl font-bold text-white mb-6">Upload Data</h1>
          
          {message && (
            <div className={`p-4 mb-6 rounded-md ${
              message.type === 'success' 
                ? 'bg-green-900/20 text-green-400 border border-green-800/30' 
                : 'bg-red-900/20 text-red-400 border border-red-800/30'
            }`}>
              {message.text}
            </div>
          )}
          
          {message && message.type === 'error' && errorDetails.length > 0 && (
            <div className="mt-4">
              <button 
                onClick={() => setShowErrorDetails(!showErrorDetails)}
                className="text-primary hover:underline flex items-center"
              >
                <span>{showErrorDetails ? 'Hide' : 'Show'} error details</span>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-4 w-4 ml-1 transition-transform ${showErrorDetails ? 'rotate-180' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showErrorDetails && (
                <div className="mt-2 max-h-40 overflow-y-auto border border-dark-border rounded-md">
                  <table className="min-w-full">
                    <thead className="bg-dark-bg-tertiary">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs text-gray-400">Record</th>
                        <th className="px-4 py-2 text-left text-xs text-gray-400">Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-border">
                      {errorDetails.map((detail, index) => (
                        <tr key={index} className="bg-dark-bg-secondary hover:bg-dark-bg-tertiary">
                          <td className="px-4 py-2 text-sm text-white">{detail.record}</td>
                          <td className="px-4 py-2 text-sm text-red-400">{detail.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="upload-type" className="block text-sm font-medium text-gray-300 mb-1">
                Upload Type
              </label>
              <div className="flex space-x-4">
                <select
                  id="upload-type"
                  value={uploadType}
                  onChange={handleUploadTypeChange}
                  className="block w-full px-3 py-2 bg-dark-bg-tertiary border border-dark-border text-white rounded-md shadow-sm focus:outline-none focus:ring-primary/50 focus:border-primary/50"
                >
                  <option value="attendees">Attendees</option>
                  <option value="events">Events</option>
                  <option value="staff">Staff Members</option>
                  <option value="resources">Resources</option>
                </select>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-4 py-2 bg-dark-bg-tertiary text-primary border border-primary/30 rounded-md hover:bg-primary/10 transition-colors"
                >
                  Download Template
                </button>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Select the type of data you want to upload
              </p>
            </div>
            
            <div className="border-2 border-dashed border-dark-border rounded-md p-6">
              <div className="space-y-1 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex text-sm text-gray-400">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-dark-bg-tertiary rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary/50"
                  >
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept=".csv,.xlsx"
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">CSV or Excel files only</p>
              </div>
              
              {file && (
                <div className="mt-4 p-3 bg-dark-bg-tertiary rounded-md border border-dark-border">
                  <div className="flex items-center">
                    <svg
                      className="h-6 w-6 text-primary mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <div className="ml-2 flex-1">
                      <p className="text-sm font-medium text-white truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="ml-4 text-sm font-medium text-primary hover:text-primary-dark"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <h3 className="text-md font-medium text-white mb-2">Validation Options</h3>
              <div className="bg-dark-bg-tertiary p-4 rounded-md">
                <div className="flex items-center mb-3">
                  <input
                    id="validate-data"
                    name="validate-data"
                    type="checkbox"
                    className="h-4 w-4 text-primary focus:ring-primary/50 rounded"
                    defaultChecked
                  />
                  <label htmlFor="validate-data" className="ml-2 block text-sm text-gray-300">
                    Validate data before import
                  </label>
                </div>
                
                <div className="flex items-center mb-3">
                  <input
                    id="check-duplicates"
                    name="check-duplicates"
                    type="checkbox"
                    className="h-4 w-4 text-primary focus:ring-primary/50 rounded"
                    defaultChecked
                  />
                  <label htmlFor="check-duplicates" className="ml-2 block text-sm text-gray-300">
                    Check for duplicates
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="update-existing"
                    name="update-existing"
                    type="checkbox"
                    className="h-4 w-4 text-primary focus:ring-primary/50 rounded"
                    defaultChecked
                  />
                  <label htmlFor="update-existing" className="ml-2 block text-sm text-gray-300">
                    Update existing records
                  </label>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex items-center justify-end">
              <button
                type="submit"
                className="ml-3 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                disabled={loading || !file}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Upload Data'
                )}
              </button>
            </div>
          </form>
          
          <div className="mt-8 border-t border-dark-border pt-6">
            <h3 className="text-lg font-medium text-white mb-4">Upload Guidelines</h3>
            <ul className="text-sm text-gray-300 space-y-2 list-disc pl-5">
              <li>Only CSV files are supported</li>
              <li>The first row must contain column headers</li>
              <li>Required fields must be included for each record type</li>
              <li>For attendees, a unique QR code will be generated automatically</li>
              <li>For staff, temporary passwords will be created for new users</li>
              <li>For resources and attendees, make sure to use valid event IDs</li>
              <li>The eventId field must reference an existing event in the system</li>
              <li className="font-semibold text-primary">To view existing event IDs, go to the Events page</li>
            </ul>
            
            <div className="mt-4">
              <h4 className="text-md font-medium text-white">Sample CSV Templates</h4>
              <div className="mt-2 p-4 bg-dark-bg-tertiary rounded border border-dark-border">
                <h5 className="font-medium text-white mb-2">Attendees (attendees.csv)</h5>
                <div className="overflow-x-auto text-xs">
                  <pre className="text-gray-300">
                    name,email,phone,role,eventId,tags,notes<br/>
                    John Doe,john@example.com,(555) 123-4567,attendee,[event-id-here],VIP,Prefers vegetarian<br/>
                    Jane Smith,jane@example.com,(555) 987-6543,speaker,[event-id-here],Speaker;Technical,Has special equipment
                  </pre>
                </div>
                
                <h5 className="font-medium text-white mb-2 mt-4">Events (events.csv)</h5>
                <div className="overflow-x-auto text-xs">
                  <pre className="text-gray-300">
                    name,startDate,endDate,location,capacity,status,description<br/>
                    Tech Conference 2024,2024-06-15,2024-06-17,Convention Center,500,published,Annual tech conference<br/>
                    Developer Workshop,2024-07-10,2024-07-12,Innovation Hub,150,upcoming,Hands-on workshop for developers
                  </pre>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowEvents(!showEvents)}
              className="flex items-center text-primary hover:underline"
            >
              <span>{showEvents ? 'Hide' : 'Show'} available event IDs</span>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className={`h-4 w-4 ml-1 transition-transform ${showEvents ? 'rotate-180' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showEvents && (
              <div className="mt-2">
                {loadingEvents ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : events.length > 0 ? (
                  <div className="bg-dark-bg-tertiary rounded-md border border-dark-border p-4 mt-2 max-h-60 overflow-y-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Event ID</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Name</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-border">
                        {events.map((event) => (
                          <tr key={event.id} className="hover:bg-dark-bg-secondary">
                            <td className="px-4 py-2 text-sm font-medium text-primary">{event.id}</td>
                            <td className="px-4 py-2 text-sm text-white">{event.name}</td>
                            <td className="px-4 py-2 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                event.status === 'published' ? 'bg-green-900/30 text-green-400' :
                                event.status === 'draft' ? 'bg-gray-900/30 text-gray-400' :
                                event.status === 'upcoming' ? 'bg-blue-900/30 text-blue-400' :
                                'bg-gray-900/30 text-gray-400'
                              }`}>
                                {event.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-dark-bg-tertiary rounded-md border border-dark-border p-4 mt-2 text-center">
                    <p className="text-gray-400">No events found. Please create events first.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
} 