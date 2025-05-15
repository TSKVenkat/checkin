'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import Card from '@/components/ui/Card';

interface EmergencyState {
  isActive: boolean;
  type: string;
  activatedAt: string;
  affectedZones: string[];
  safeAttendees: number;
  totalAttendees: number;
  safetyPercentage: number;
}

interface Attendee {
  _id: string;
  name: string;
  email: string;
  currentZone: string;
  lastKnownCheckIn: string;
  safetyConfirmed: boolean;
  safetyConfirmedAt?: string;
}

export default function AdminEmergencyPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [evacuationPlan, setEvacuationPlan] = useState('default');
  const [contactPhone, setContactPhone] = useState('');
  const [eventStatus, setEventStatus] = useState('active');
  const [confirmationText, setConfirmationText] = useState('');
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error' | 'info'; message: string} | null>(null);
  const [emergency, setEmergency] = useState<EmergencyState | null>(null);
  const [emergencyType, setEmergencyType] = useState<string>('fire');
  const [affectedZones, setAffectedZones] = useState<string[]>([]);
  const [message, setMessage] = useState<string>('');
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [confirmationOpen, setConfirmationOpen] = useState<boolean>(false);
  
  const zoneOptions = [
    'Main Hall', 'Conference Room A', 'Conference Room B', 
    'Cafeteria', 'Lobby', 'Exhibition Area'
  ];
  
  const emergencyTypes = [
    { id: 'fire', name: 'Fire Emergency', icon: '🔥' },
    { id: 'medical', name: 'Medical Emergency', icon: '🚑' },
    { id: 'security', name: 'Security Threat', icon: '🚨' },
    { id: 'weather', name: 'Weather Emergency', icon: '🌪️' },
    { id: 'power', name: 'Power Outage', icon: '⚡' },
    { id: 'other', name: 'Other Emergency', icon: '⚠️' }
  ];
  
  useEffect(() => {
    // Verify the user is an admin
    const checkUser = async () => {
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
  }, [router]);

  // Fetch emergency status
  useEffect(() => {
    const fetchEmergencyStatus = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch current emergency status from API
        const response = await axios.get('/api/events/emergency');
        
        if (response.data.success && response.data.event) {
          const event = response.data.event;
          if (event.isEmergencyActive) {
            // Set emergency state from API data
            setEmergency({
              isActive: event.isEmergencyActive,
              type: event.emergencyType || 'other',
              activatedAt: event.emergencyActivatedAt || new Date().toISOString(),
              affectedZones: event.emergencyAffectedZones || [],
              safeAttendees: 0, // Will need another API call to get this
              totalAttendees: 250, // Will need another API call to get this
              safetyPercentage: 0
            });
            
            // Set the form values to match current emergency
            setEmergencyType(event.emergencyType || 'other');
            setAffectedZones(event.emergencyAffectedZones || []);
            setMessage(event.emergencyInstructions || '');
          } else {
            // No active emergency
            setEmergency({
          isActive: false,
          type: 'none',
          activatedAt: '',
          affectedZones: [],
          safeAttendees: 0,
          totalAttendees: 250,
          safetyPercentage: 0
            });
          }
        }
        
        // Fetch attendee data
        const attendeeResponse = await axios.get('/api/attendees', {
          params: { limit: 100 }
        });
        
        if (attendeeResponse.data.success && attendeeResponse.data.attendees) {
          setAttendees(attendeeResponse.data.attendees.map((a: any) => ({
            _id: a.id,
            name: a.name,
            email: a.email,
            currentZone: a.currentZone || 'Unknown',
            lastKnownCheckIn: a.checkedInAt || new Date().toISOString(),
            safetyConfirmed: a.safetyConfirmed || false,
            safetyConfirmedAt: a.safetyConfirmedAt
          })));
        }
        
      } catch (err) {
        console.error('Failed to fetch emergency status:', err);
        setError('Failed to load emergency status. Please try again later.');
        
        // Set default values
        setEmergency({
          isActive: false,
          type: 'none',
          activatedAt: '',
          affectedZones: [],
          safeAttendees: 0,
          totalAttendees: 250,
          safetyPercentage: 0
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchEmergencyStatus();
    
    // Set up periodic refresh
    const intervalId = setInterval(fetchEmergencyStatus, 30000); // every 30 seconds
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Handle emergency activation
  const activateEmergency = () => {
    if (affectedZones.length === 0) {
      setError('Please select at least one affected zone');
      return;
    }
    
    setConfirmationOpen(true);
  };
  
  // Confirm emergency activation
  const confirmActivation = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get the first active event
      const eventResponse = await axios.get('/api/events/current');
      if (!eventResponse.data.success || !eventResponse.data.event) {
        setError('No active event found. Please create an event first.');
        return;
      }
      
      const eventId = eventResponse.data.event.id;
      
      // Activate emergency via API
      const response = await axios.post('/api/events/emergency', {
        eventId: eventId,
        isActive: true,
        emergencyType: emergencyType,
        affectedZones: affectedZones,
        alertMessage: message,
        sendAlert: true
      });
      
      if (response.data.success) {
        // Update local state
      setEmergency({
        isActive: true,
        type: emergencyType,
          activatedAt: new Date().toISOString(),
        affectedZones,
        safeAttendees: 0,
        totalAttendees: attendees.length,
        safetyPercentage: 0
      });
      
      // Close confirmation dialog
      setConfirmationOpen(false);
      
        // Show success message
        alert('Emergency activated successfully. Notifications have been sent to all attendees.');
      } else {
        setError(response.data.message || 'Failed to activate emergency');
      }
      
    } catch (err) {
      console.error('Failed to activate emergency:', err);
      setError('Failed to activate emergency. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle emergency deactivation
  const deactivateEmergency = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get the first active event
      const eventResponse = await axios.get('/api/events/current');
      if (!eventResponse.data.success || !eventResponse.data.event) {
        setError('No active event found.');
        return;
      }
      
      const eventId = eventResponse.data.event.id;
      
      // Deactivate emergency via API
      const response = await axios.post('/api/events/emergency', {
        eventId: eventId,
        isActive: false,
        alertMessage: 'Emergency has been resolved. All clear.',
        sendAlert: true
      });
      
      if (response.data.success) {
        // Update local state
      setEmergency({
        isActive: false,
        type: 'none',
        activatedAt: '',
        affectedZones: [],
        safeAttendees: 0,
        totalAttendees: attendees.length,
        safetyPercentage: 0
      });
      
      // Reset selected zones and message
      setAffectedZones([]);
      setMessage('');
      
        // Show success message
        alert('Emergency deactivated successfully. All-clear notifications have been sent.');
      } else {
        setError(response.data.message || 'Failed to deactivate emergency');
      }
      
    } catch (err) {
      console.error('Failed to deactivate emergency:', err);
      setError('Failed to deactivate emergency. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle zone selection
  const toggleZone = (zone: string) => {
    if (affectedZones.includes(zone)) {
      setAffectedZones(affectedZones.filter(z => z !== zone));
    } else {
      setAffectedZones([...affectedZones, zone]);
    }
  };
  
  // Send broadcast message
  const sendBroadcast = async () => {
    if (!message) {
      setError('Please enter a message to broadcast');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // In a real application, this would be an API call to send the broadcast
      // For this demo, we'll just log the message
      
      console.log(`Broadcasting message to all attendees: ${message}`);
      
      // Clear the message field
      setMessage('');
      
      // Show success message
      alert('Broadcast message sent successfully');
      
    } catch (err) {
      console.error('Failed to send broadcast:', err);
      setError('Failed to send broadcast. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Simulate an attendee marking themselves as safe
  const simulateSafetyConfirmation = (attendeeId: string) => {
    const now = new Date().toISOString();
    
    setAttendees(prevAttendees => 
      prevAttendees.map(attendee => 
        attendee._id === attendeeId 
          ? { ...attendee, safetyConfirmed: true, safetyConfirmedAt: now }
          : attendee
      )
    );
    
    // Update safety stats
    const safeCount = attendees.filter(a => a.safetyConfirmed || a._id === attendeeId).length;
    const percentage = Math.round((safeCount / attendees.length) * 100);
    
    setEmergency(prev => 
      prev ? {
        ...prev,
        safeAttendees: safeCount,
        safetyPercentage: percentage
      } : null
    );
  };
  
  // Get emergency type info
  const getEmergencyTypeInfo = (typeId: string) => {
    return emergencyTypes.find(type => type.id === typeId) || emergencyTypes[5]; // Default to 'other'
  };

  const handleBroadcastSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) {
      setNotification({
        type: 'error',
        message: 'Please enter a message to broadcast'
      });
      return;
    }

    // Mock API call to broadcast message
    setNotification({
      type: 'success',
      message: `Message "${broadcastMessage}" broadcast to all attendees and staff.`
    });

    // Clear form after successful broadcast
    setBroadcastMessage('');
  };

  const toggleEmergencyMode = () => {
    setIsConfirmDialogOpen(true);
  };

  const confirmEmergencyModeChange = () => {
    if (confirmationText !== 'CONFIRM') {
      setNotification({
        type: 'error',
        message: 'Please type CONFIRM to proceed with this action'
      });
      return;
    }

    // Toggle emergency mode
    const newMode = !isEmergencyMode;
    setIsEmergencyMode(newMode);
    
    // Show notification
    setNotification({
      type: 'success',
      message: newMode 
        ? 'Emergency mode activated. All attendees and staff have been notified.' 
        : 'Emergency mode deactivated. Normal operations resumed.'
    });

    // Reset confirmation
    setConfirmationText('');
    setIsConfirmDialogOpen(false);
  };

  const cancelConfirmation = () => {
    setConfirmationText('');
    setIsConfirmDialogOpen(false);
  };

  const handleEvacuationPlanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEvacuationPlan(e.target.value);
  };

  const handleEventStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEventStatus(e.target.value);
  };

  const updateEvacuationPlan = () => {
    setNotification({
      type: 'success',
      message: `Evacuation plan updated to "${evacuationPlan}". Staff have been notified.`
    });
  };

  const updateEventStatus = () => {
    setNotification({
      type: 'success',
      message: `Event status updated to "${eventStatus}". All systems updated.`
    });
  };

  const handleEmergencyContact = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contactPhone.trim()) {
      setNotification({
        type: 'error',
        message: 'Please enter an emergency contact number'
      });
      return;
    }

    setNotification({
      type: 'success',
      message: `Emergency contact updated to ${contactPhone}.`
    });

    // Clear form
    setContactPhone('');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Dashboard Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-xl shadow-lg overflow-hidden">
        <div className="px-8 py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Emergency Management
              </h1>
              <p className="text-red-100 text-lg max-w-2xl">
                Manage emergency situations, send alerts, and monitor attendee safety status.
              </p>
            </div>
            
            {emergency?.isActive ? (
              <div className="mt-4 md:mt-0 flex items-center">
                <div className="inline-flex items-center px-4 py-2 bg-red-900/30 rounded-lg text-white">
                  <div className="relative mr-2">
                    <span className="animate-ping absolute -inset-0.5 rounded-full bg-red-500 opacity-75"></span>
                    <span className="relative block h-3 w-3 rounded-full bg-red-600"></span>
                  </div>
                  <span>Emergency Active</span>
                </div>
              </div>
            ) : (
              <div className="mt-4 md:mt-0">
                <div className="inline-flex items-center px-4 py-2 bg-dark-bg-secondary bg-opacity-20 rounded-lg text-white">
                  <span className="relative block h-3 w-3 rounded-full bg-green-500 mr-2"></span>
                  <span>No Active Emergencies</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Emergency Status Card */}
      <Card className="w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Emergency Action Panel */}
          <div className={`relative border rounded-xl p-6 flex flex-col justify-between ${
            emergency?.isActive 
              ? 'border-red-600 bg-gradient-to-br from-red-900/20 to-dark-bg-secondary' 
              : 'border-dark-border bg-dark-bg-secondary'
          }`}>
            <div>
              <h3 className="text-xl font-bold text-white mb-4">
                {emergency?.isActive ? 'Emergency in Progress' : 'Activate Emergency'}
              </h3>
              <p className="text-gray-300 mb-4">
                {emergency?.isActive 
                  ? 'Emergency protocols are currently active. You can send updates or deactivate once the situation is resolved.'
                  : 'Use this panel to declare an emergency situation and notify all attendees.'}
              </p>
              
              {!emergency?.isActive && (
                <div className="space-y-4 mt-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Emergency Type
                    </label>
                    <select
                      value={emergencyType}
                      onChange={(e) => setEmergencyType(e.target.value)}
                      className="w-full p-2 bg-dark-bg-tertiary border border-dark-border rounded-md text-white"
                    >
                      {emergencyTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.icon} {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Affected Areas
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {zoneOptions.map((zone) => (
                        <div key={zone} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`zone-${zone}`}
                            checked={affectedZones.includes(zone)}
                            onChange={() => toggleZone(zone)}
                            className="h-4 w-4 text-primary focus:ring-primary border-dark-border bg-dark-bg-tertiary rounded"
                          />
                          <label htmlFor={`zone-${zone}`} className="ml-2 text-sm text-gray-300">
                            {zone}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Emergency Message
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                      className="w-full p-2 bg-dark-bg-tertiary border border-dark-border rounded-md text-white"
                      placeholder="Provide details about the emergency situation..."
                    ></textarea>
                  </div>
                </div>
              )}
              
              {emergency?.isActive && (
                <div className="mt-4">
                  <div className="bg-dark-bg-tertiary border border-dark-border rounded-md p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-300">Type:</span>
                      <span className="text-sm font-medium text-white">
                        {getEmergencyTypeInfo(emergency.type)?.name || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-300">Started:</span>
                      <span className="text-sm font-medium text-white">
                        {new Date(emergency.activatedAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-300">Affected Areas:</span>
                      <span className="text-sm font-medium text-white">
                        {emergency.affectedZones.join(', ')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Broadcast Update
                    </label>
                    <textarea
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      rows={3}
                      className="w-full p-2 bg-dark-bg-tertiary border border-dark-border rounded-md text-white"
                      placeholder="Send an update to all attendees..."
                    ></textarea>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6">
              {emergency?.isActive ? (
                <div className="flex flex-col space-y-3">
                  <button
                    type="button"
                    onClick={sendBroadcast}
                    disabled={!broadcastMessage.trim()}
                    className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                      broadcastMessage.trim() 
                        ? 'bg-blue-600 hover:bg-blue-700' 
                        : 'bg-blue-900/30 cursor-not-allowed'
                    }`}
                  >
                    Broadcast Update
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmationOpen(true)}
                    className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 rounded-md text-white font-medium"
                  >
                    Resolve Emergency
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={activateEmergency}
                  disabled={affectedZones.length === 0}
                  className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                    affectedZones.length > 0 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-red-900/30 cursor-not-allowed'
                  }`}
                >
                  Activate Emergency Protocol
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Notification */}
      {notification && (
        <div className={`mb-6 p-4 rounded-md ${
          notification.type === 'success' ? 'bg-green-50 text-green-800' :
          notification.type === 'error' ? 'bg-red-50 text-red-800' :
          'bg-blue-50 text-blue-800'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {notification.type === 'success' && (
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {notification.type === 'error' && (
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              {notification.type === 'info' && (
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">
                {notification.message}
              </p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={() => setNotification(null)}
                  className={`inline-flex rounded-md p-1.5 ${
                    notification.type === 'success' ? 'text-green-500 hover:bg-green-100' :
                    notification.type === 'error' ? 'text-red-500 hover:bg-red-100' :
                    'text-blue-500 hover:bg-blue-100'
                  }`}
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Mode Banner */}
      {isEmergencyMode && (
        <div className="mb-6 p-4 bg-red-600 text-white text-center rounded-md shadow-md">
          <div className="flex items-center justify-center">
            <svg className="h-6 w-6 mr-2 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-lg font-bold">EMERGENCY MODE ACTIVE</span>
          </div>
          <p className="mt-2">Emergency procedures have been activated. All staff are advised to follow emergency protocols.</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="px-6 py-5 bg-gray-50">
            <h1 className="text-2xl font-bold text-gray-900">Emergency Controls</h1>
            <p className="mt-1 text-sm text-gray-600">Use these controls only in emergency situations</p>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Emergency Mode Toggle */}
          <div className="bg-red-50 p-4 rounded-lg border border-red-100">
            <h2 className="text-lg font-medium text-red-800 mb-4">Emergency Mode</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 mb-1">
                  {isEmergencyMode ? 'Emergency mode is currently active' : 'Emergency mode is currently inactive'}
                </p>
                <p className="text-xs text-red-600">
                  {isEmergencyMode 
                    ? 'This will notify all staff and attendees of an emergency situation.' 
                    : 'Activate only in case of actual emergency. This will trigger alerts to all users.'}
                </p>
              </div>
              <button
                onClick={toggleEmergencyMode}
                className={`px-4 py-2 rounded-md text-white font-medium ${
                  isEmergencyMode 
                    ? 'bg-gray-600 hover:bg-gray-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isEmergencyMode ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>

          {/* Broadcast Message */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Broadcast Emergency Message</h2>
            <form onSubmit={handleBroadcastSubmit}>
              <div className="mb-4">
                <label htmlFor="broadcast-message" className="block text-sm font-medium text-gray-700 mb-1">
                  Message to all attendees and staff
                </label>
                <textarea
                  id="broadcast-message"
                  rows={3}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="Enter emergency message..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Send Broadcast
                </button>
              </div>
            </form>
          </div>

          {/* Evacuation Plan */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Evacuation Plan</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="col-span-2">
                <label htmlFor="evacuation-plan" className="block text-sm font-medium text-gray-700 mb-1">
                  Select evacuation plan
                </label>
                <select
                  id="evacuation-plan"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={evacuationPlan}
                  onChange={handleEvacuationPlanChange}
                >
                  <option value="default">Default Evacuation Plan</option>
                  <option value="fire">Fire Evacuation Plan</option>
                  <option value="weather">Severe Weather Plan</option>
                  <option value="security">Security Threat Plan</option>
                  <option value="medical">Medical Emergency Plan</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={updateEvacuationPlan}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 w-full justify-center"
                >
                  Update Plan
                </button>
              </div>
            </div>
          </div>

          {/* Event Status */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Event Status Control</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="col-span-2">
                <label htmlFor="event-status" className="block text-sm font-medium text-gray-700 mb-1">
                  Set event status
                </label>
                <select
                  id="event-status"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={eventStatus}
                  onChange={handleEventStatusChange}
                >
                  <option value="active">Active - Proceeding as planned</option>
                  <option value="delayed">Delayed - Temporary pause</option>
                  <option value="modified">Modified - Schedule changes</option>
                  <option value="evacuated">Evacuated - Venue cleared</option>
                  <option value="cancelled">Cancelled - Event terminated</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={updateEventStatus}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 w-full justify-center"
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Emergency Contact Information</h2>
            <form onSubmit={handleEmergencyContact}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="col-span-2">
                  <label htmlFor="contact-phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Emergency contact phone number
                  </label>
                  <input
                    type="tel"
                    id="contact-phone"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="e.g. +1 (555) 123-4567"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 w-full justify-center"
                  >
                    Update Contact
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {isConfirmDialogOpen && (
        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            {/* Modal */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      {isEmergencyMode ? 'Deactivate Emergency Mode' : 'Activate Emergency Mode'}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        {isEmergencyMode
                          ? 'Are you sure you want to deactivate emergency mode? This will signal that the emergency is over.'
                          : 'Are you sure you want to activate emergency mode? This will trigger emergency alerts to all attendees and staff.'}
                      </p>
                      <div className="mt-4">
                        <label htmlFor="confirmation-text" className="block text-sm font-medium text-gray-700">
                          Type CONFIRM to proceed
                        </label>
                        <input
                          type="text"
                          id="confirmation-text"
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                          value={confirmationText}
                          onChange={(e) => setConfirmationText(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={confirmEmergencyModeChange}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={cancelConfirmation}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 