'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, AlertCircle, X, MessageSquare, Bell } from 'lucide-react';
import { useSocket } from '@/lib/hooks/useSocket';
import { WebSocketEvents } from '@/app/api/websocket';

interface EmergencyData {
  id: string;
  type: string;
  activatedAt: string;
  affectedZones: string[];
  message: string;
  eventName?: string;
}

interface EmergencyAlertProps {
  defaultHidden?: boolean;
  compact?: boolean;
  darkMode?: boolean;
}

export default function EmergencyAlert({
  defaultHidden = false,
  compact = false,
  darkMode = true
}: EmergencyAlertProps) {
  const [emergencyData, setEmergencyData] = useState<EmergencyData | null>(null);
  const [hidden, setHidden] = useState<boolean>(defaultHidden);
  const [hasUnreadAlert, setHasUnreadAlert] = useState<boolean>(false);
  const socket = useSocket();

  // Emergency type icons mapping
  const emergencyIcons = {
    fire: '🔥',
    medical: '🚑',
    security: '🚨',
    weather: '🌪️',
    power: '⚡',
    other: '⚠️',
  };

  // Check for active emergencies on mount and periodically
  useEffect(() => {
    const checkActiveEmergencies = async () => {
      try {
        // Use the attendee-specific emergency endpoint
        console.log('Checking for active emergencies...');
        const response = await fetch('/api/attendees/emergency');
        
        if (!response.ok) {
          console.error('Error fetching emergency status:', response.status);
          return;
        }
        
        const data = await response.json();
        console.log('Emergency status:', data);
        
        if (data.success && data.active && data.emergency) {
          console.log('Active emergency found, updating UI');
          setEmergencyData(data.emergency);
          setHasUnreadAlert(true);
          setHidden(false);
          
          // Play alert sound if available
          const alertSound = document.getElementById('emergency-alert-sound') as HTMLAudioElement;
          if (alertSound) {
            alertSound.play().catch(err => console.log('Audio playback issue (non-critical):', err));
          }
        } else if (data.success && !data.active && emergencyData) {
          // Emergency was just deactivated
          console.log('Emergency deactivated');
          
          // Show all-clear message briefly
          setEmergencyData({
            ...emergencyData,
            message: 'All clear. The emergency has been resolved.',
          });
          
          // Hide alert after 10 seconds
          setTimeout(() => {
            setEmergencyData(null);
            setHidden(true);
          }, 10000);
        }
      } catch (error) {
        console.error('Failed to check active emergencies:', error);
      }
    };
    
    // Initial check
    checkActiveEmergencies();
    
    // Poll for updates every minute
    const interval = setInterval(checkActiveEmergencies, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Listen for emergency events via WebSocket
  useEffect(() => {
    if (!socket) {
      console.log('Socket not available for emergency alerts');
      return;
    }
    
    console.log('Setting up WebSocket listeners for emergency events');
    
    // Handle new emergency activation
    const handleEmergencyActivation = (data: EmergencyData) => {
      console.log('WebSocket: Emergency activated:', data);
      setEmergencyData(data);
      setHasUnreadAlert(true);
      setHidden(false);
      
      // Play alert sound if available
      const alertSound = document.getElementById('emergency-alert-sound') as HTMLAudioElement;
      if (alertSound) {
        alertSound.play().catch(err => console.log('Audio playback issue (non-critical):', err));
      }
    };
    
    // Handle emergency deactivation
    const handleEmergencyDeactivation = (data: any) => {
      console.log('WebSocket: Emergency deactivated:', data);
      
      // Show all-clear message briefly
      setEmergencyData({
        id: data.id,
        type: data.previousType || 'other',
        activatedAt: new Date().toISOString(),
        affectedZones: data.previousZones || [],
        message: data.message || 'All clear. The emergency has been resolved.',
        eventName: data.eventName
      });
      
      // Hide alert after 10 seconds
      setTimeout(() => {
        setEmergencyData(null);
        setHidden(true);
      }, 10000);
    };
    
    // Register event listeners
    socket.on(WebSocketEvents.EMERGENCY_ACTIVATED, handleEmergencyActivation);
    socket.on(WebSocketEvents.EMERGENCY_DEACTIVATED, handleEmergencyDeactivation);
    socket.on('connect', () => {
      console.log('WebSocket connected, can receive emergency alerts');
    });
    
    // Clean up listeners on unmount
    return () => {
      socket.off(WebSocketEvents.EMERGENCY_ACTIVATED, handleEmergencyActivation);
      socket.off(WebSocketEvents.EMERGENCY_DEACTIVATED, handleEmergencyDeactivation);
    };
  }, [socket]);

  // Handle toggle visibility
  const toggleVisibility = () => {
    setHidden(!hidden);
    setHasUnreadAlert(false);
  };

  // Safety confirmation handler
  const confirmSafety = async () => {
    if (!emergencyData) return;
    
    try {
      console.log('Confirming safety for emergency:', emergencyData.id);
      const response = await fetch('/api/attendees/safety-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emergencyId: emergencyData.id
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert('Safety confirmation sent successfully. Thank you for confirming you are safe.');
        }
      }
    } catch (error) {
      console.error('Failed to confirm safety:', error);
    }
  };

  return (
    <>
      {/* Hidden audio element for alert sound */}
      <audio id="emergency-alert-sound" src="/sounds/emergency-alert.mp3" preload="auto" />
      
      {emergencyData && (
        <>
          <AnimatePresence>
            {!hidden && (
              <motion.div
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -100, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={`fixed top-0 left-0 right-0 z-50 ${
                  darkMode ? 'bg-red-900' : 'bg-red-500'
                } text-white shadow-lg`}
              >
                <div className="container mx-auto px-4 py-3">
                  <div className="flex items-start justify-between">
                    <div className={`flex items-center ${compact ? 'space-x-2' : 'space-x-4'}`}>
                      <div className="flex-shrink-0">
                        <AlertTriangle className="h-6 w-6 text-white animate-pulse" />
                      </div>
                      
                      <div className={compact ? 'max-w-md' : 'max-w-2xl'}>
                        <h3 className="text-lg font-bold flex items-center">
                          {emergencyIcons[emergencyData.type as keyof typeof emergencyIcons] || '⚠️'} 
                          <span className="ml-2">Emergency Alert: {emergencyData.type}</span>
                        </h3>
                        
                        {!compact && (
                          <>
                            <p className="mt-1 text-sm opacity-90">
                              <strong>Affected Areas:</strong> {emergencyData.affectedZones.join(', ')}
                            </p>
                            <p className="mt-1 whitespace-pre-line">
                              {emergencyData.message}
                            </p>
                            <div className="mt-2 flex space-x-2">
                              <button 
                                onClick={confirmSafety}
                                className="bg-white text-red-700 hover:bg-gray-200 text-sm py-1 px-3 rounded font-medium"
                              >
                                I am safe
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex ml-4">
                      <button
                        className="text-white p-1 hover:bg-red-800 rounded-full"
                        onClick={toggleVisibility}
                        aria-label="Close emergency alert"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Collapsed notification indicator when alert is hidden but emergency is active */}
          {hidden && (
            <button
              onClick={toggleVisibility}
              className={`fixed top-4 right-4 z-40 rounded-full p-2 ${
                hasUnreadAlert ? 'animate-pulse' : ''
              } ${darkMode ? 'bg-red-900' : 'bg-red-600'} text-white shadow-lg`}
              aria-label="Show emergency alert"
            >
              <div className="relative">
                <AlertCircle className="h-6 w-6" />
                {hasUnreadAlert && (
                  <span className="absolute -top-1 -right-1 rounded-full bg-red-500 h-3 w-3 border border-white"></span>
                )}
              </div>
            </button>
          )}
        </>
      )}
    </>
  );
} 