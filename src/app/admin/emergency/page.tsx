'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';

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

export default function EmergencyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
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
  
  // Fetch emergency status
  useEffect(() => {
    const fetchEmergencyStatus = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // In a real application, this would be an actual API call
        // For now we'll use mock data
        
        // Mock emergency status for demonstration
        // In a real app, this would come from an API call
        const mockEmergency: EmergencyState = {
          isActive: false,
          type: 'none',
          activatedAt: '',
          affectedZones: [],
          safeAttendees: 0,
          totalAttendees: 250,
          safetyPercentage: 0
        };
        
        // Mock attendees
        const mockAttendees: Attendee[] = Array.from({ length: 20 }, (_, i) => ({
          _id: `att_${i + 1}`,
          name: `Attendee ${i + 1}`,
          email: `attendee${i + 1}@example.com`,
          currentZone: zoneOptions[Math.floor(Math.random() * zoneOptions.length)],
          lastKnownCheckIn: new Date().toISOString(),
          safetyConfirmed: false
        }));
        
        setEmergency(mockEmergency);
        setAttendees(mockAttendees);
        
      } catch (err) {
        console.error('Failed to fetch emergency status:', err);
        setError('Failed to load emergency status. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEmergencyStatus();
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
      
      // In a real application, this would be an API call to activate emergency
      // For this demo, we'll update the local state
      
      const now = new Date().toISOString();
      
      setEmergency({
        isActive: true,
        type: emergencyType,
        activatedAt: now,
        affectedZones,
        safeAttendees: 0,
        totalAttendees: attendees.length,
        safetyPercentage: 0
      });
      
      // Close confirmation dialog
      setConfirmationOpen(false);
      
      // Simulate sending notifications to all attendees
      // In a real app, this would trigger push notifications, SMS, etc.
      console.log(`Emergency notifications sent to ${attendees.length} attendees`);
      
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
      
      // In a real application, this would be an API call to deactivate emergency
      // For this demo, we'll update the local state
      
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
      
      // Reset attendee safety statuses
      setAttendees(prevAttendees => 
        prevAttendees.map(attendee => ({
          ...attendee,
          safetyConfirmed: false,
          safetyConfirmedAt: undefined
        }))
      );
      
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
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Emergency Management</h1>
          <p className="text-gray-600">Control emergency protocols and communications</p>
        </div>
        <Link 
          href="/admin" 
          className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-gray-800"
        >
          Back to Dashboard
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
          {/* Emergency Status */}
          {emergency && emergency.isActive ? (
            <div className="bg-red-100 border-l-4 border-red-500 p-4 mb-8">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">{getEmergencyTypeInfo(emergency.type).icon}</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-red-800">
                    {getEmergencyTypeInfo(emergency.type).name} in Progress
                  </h3>
                  <p className="text-sm text-red-700">
                    Activated at {new Date(emergency.activatedAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-red-700">
                    Affected zones: {emergency.affectedZones.join(', ')}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={deactivateEmergency}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Deactivate Emergency'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-green-100 border-l-4 border-green-500 p-4 mb-8">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-2xl">✓</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-green-800">No Active Emergency</h3>
                  <p className="text-sm text-green-700">
                    The event is currently operating under normal conditions
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Emergency Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Activation Controls - Only show when no emergency is active */}
            {emergency && !emergency.isActive && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Activate Emergency Protocol</h2>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emergency Type
                  </label>
                  <select
                    value={emergencyType}
                    onChange={(e) => setEmergencyType(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    {emergencyTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.icon} {type.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Affected Zones
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {zoneOptions.map((zone) => (
                      <label key={zone} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={affectedZones.includes(zone)}
                          onChange={() => toggleZone(zone)}
                          className="mr-2"
                        />
                        {zone}
                      </label>
                    ))}
                  </div>
                </div>
                
                <button
                  onClick={activateEmergency}
                  className="w-full py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Activate Emergency Protocol'}
                </button>
              </div>
            )}
            
            {/* Communication Controls */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Emergency Communications</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Broadcast Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter message to broadcast to all attendees..."
                  className="w-full p-2 border rounded-md h-32"
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={sendBroadcast}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  disabled={loading || !message}
                >
                  {loading ? 'Sending...' : 'Send Broadcast'}
                </button>
                
                <button
                  className="flex-1 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                  disabled={loading}
                >
                  Send Safety Check Request
                </button>
              </div>
            </div>
            
            {/* Safety Statistics - Only show when emergency is active */}
            {emergency && emergency.isActive && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Safety Status</h2>
                
                <div className="mb-6">
                  <div className="flex justify-between mb-1">
                    <span>Confirmed Safe:</span>
                    <span>{emergency.safeAttendees} of {emergency.totalAttendees}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-green-600 h-4 rounded-full" 
                      style={{ width: `${emergency.safetyPercentage}%` }}
                    ></div>
                  </div>
                  <div className="text-right text-sm text-gray-500 mt-1">
                    {emergency.safetyPercentage}% confirmed safe
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-green-100 rounded-md">
                    <span className="block text-2xl font-bold text-green-800">
                      {emergency.safeAttendees}
                    </span>
                    <span className="text-sm text-green-600">Safe</span>
                  </div>
                  
                  <div className="text-center p-3 bg-yellow-100 rounded-md">
                    <span className="block text-2xl font-bold text-yellow-800">
                      {emergency.totalAttendees - emergency.safeAttendees}
                    </span>
                    <span className="text-sm text-yellow-600">Not Confirmed</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Attendee List - Only show when emergency is active */}
          {emergency && emergency.isActive && (
            <div className="bg-white p-6 rounded-lg shadow mb-8">
              <h2 className="text-xl font-semibold mb-4">Attendee Status</h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Attendee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Known Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Check-In
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Safety Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendees.map((attendee) => (
                      <tr key={attendee._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{attendee.name}</div>
                          <div className="text-sm text-gray-500">{attendee.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            emergency.affectedZones.includes(attendee.currentZone)
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {attendee.currentZone}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {new Date(attendee.lastKnownCheckIn).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {attendee.safetyConfirmed ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                              Safe - {new Date(attendee.safetyConfirmedAt!).toLocaleTimeString()}
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                              Not Confirmed
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {!attendee.safetyConfirmed && (
                            <button
                              onClick={() => simulateSafetyConfirmation(attendee._id)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              Simulate "I'm Safe"
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Confirmation Dialog */}
      {confirmationOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-red-800 mb-4">
              Confirm Emergency Activation
            </h3>
            <p className="text-gray-600 mb-4">
              You are about to activate the {getEmergencyTypeInfo(emergencyType).name} protocol for the following zones:
            </p>
            <ul className="list-disc list-inside mb-4 text-gray-600">
              {affectedZones.map(zone => (
                <li key={zone}>{zone}</li>
              ))}
            </ul>
            <p className="text-gray-600 mb-4">
              This will immediately notify all attendees and staff. Are you sure you want to proceed?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmationOpen(false)}
                className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={confirmActivation}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Activate Emergency
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 