'use client';

import React, { useState, useEffect } from 'react';
import { WebSocketEvents } from '@/app/api/websocket';
import { useQueryClient } from '@tanstack/react-query';

interface ResourceStatus {
  id: string;
  name: string;
  type: string;
  total: number;
  distributed: number;
  remaining: number;
  status: 'depleted' | 'low' | 'available';
}

interface DailyStats {
  date: string;
  registered: number;
  checkedIn: number;
  lunchDistributed: number;
  kitDistributed: number;
  checkInRate: number;
}

interface OverallStats {
  registered: number;
  checkedIn: number;
  lunchDistributed: number;
  kitDistributed: number;
  checkInRate: number;
}

interface EmergencyStats {
  totalPresent: number;
  safetyConfirmed: number;
  unconfirmed: number;
  safetyPercentage: number;
}

interface EventInfo {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isEmergencyActive: boolean;
}

interface DashboardStatsProps {
  stats: {
    eventInfo: EventInfo;
    overallStats: OverallStats;
    resourceStats: ResourceStatus[];
    dailyStats?: DailyStats;
    emergencyStats?: EmergencyStats;
  };
  websocket?: WebSocket;
}

export default function DashboardStats({ stats, websocket }: DashboardStatsProps) {
  const queryClient = useQueryClient();
  const [localStats, setLocalStats] = useState(stats);
  
  // Handle WebSocket updates
  useEffect(() => {
    if (!websocket) return;
    
    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        // Update stats based on websocket event type
        if (data.type === WebSocketEvents.DASHBOARD_UPDATE) {
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        } else if (data.type === WebSocketEvents.EMERGENCY_ACTIVATED || 
                   data.type === WebSocketEvents.EMERGENCY_DEACTIVATED) {
          // Update emergency status immediately
          setLocalStats(prev => ({
            ...prev,
            eventInfo: {
              ...prev.eventInfo,
              isEmergencyActive: data.type === WebSocketEvents.EMERGENCY_ACTIVATED
            }
          }));
          
          // Also refresh data
          queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    websocket.addEventListener('message', handleWebSocketMessage);
    
    return () => {
      websocket.removeEventListener('message', handleWebSocketMessage);
    };
  }, [websocket, queryClient]);
  
  // Use the latest stats (either from props or local state)
  const displayStats = localStats || stats;
  
  if (!displayStats) {
    return <div className="flex justify-center p-8">Loading dashboard statistics...</div>;
  }
  
  return (
    <div className="dashboard-stats">
      {/* Event Info Header */}
      <div className="event-header bg-gray-800 p-4 rounded-lg mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">{displayStats.eventInfo.name}</h2>
          <p className="text-gray-400">
            {new Date(displayStats.eventInfo.startDate).toLocaleDateString()} - 
            {new Date(displayStats.eventInfo.endDate).toLocaleDateString()}
          </p>
        </div>
        
        {displayStats.eventInfo.isEmergencyActive && (
          <div className="emergency-badge bg-red-600 text-white px-4 py-2 rounded-full animate-pulse">
            Emergency Active
          </div>
        )}
      </div>
      
      {/* Main Stats Cards */}
      <div className="stats-cards grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat-card bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Registrations</h3>
          <div className="flex justify-between items-end">
            <span className="text-3xl font-bold">{displayStats.overallStats.registered}</span>
            <span className="text-sm text-gray-400">Total</span>
          </div>
        </div>
        
        <div className="stat-card bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Check-ins</h3>
          <div className="flex justify-between items-end">
            <span className="text-3xl font-bold">{displayStats.overallStats.checkedIn}</span>
            <span className="text-sm text-gray-400">
              {displayStats.overallStats.checkInRate}% Rate
            </span>
          </div>
          <div className="mt-2 w-full bg-gray-700 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${displayStats.overallStats.checkInRate}%` }}
            ></div>
          </div>
        </div>
        
        <div className="stat-card bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Lunch Distributed</h3>
          <div className="flex justify-between items-end">
            <span className="text-3xl font-bold">{displayStats.overallStats.lunchDistributed}</span>
            <span className="text-sm text-gray-400">
              {Math.round((displayStats.overallStats.lunchDistributed / displayStats.overallStats.checkedIn) * 100) || 0}% of Check-ins
            </span>
          </div>
          <div className="mt-2 w-full bg-gray-700 rounded-full h-2.5">
            <div 
              className="bg-yellow-500 h-2.5 rounded-full" 
              style={{ 
                width: `${Math.round((displayStats.overallStats.lunchDistributed / displayStats.overallStats.checkedIn) * 100) || 0}%` 
              }}
            ></div>
          </div>
        </div>
        
        <div className="stat-card bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Kits Distributed</h3>
          <div className="flex justify-between items-end">
            <span className="text-3xl font-bold">{displayStats.overallStats.kitDistributed}</span>
            <span className="text-sm text-gray-400">
              {Math.round((displayStats.overallStats.kitDistributed / displayStats.overallStats.checkedIn) * 100) || 0}% of Check-ins
            </span>
          </div>
          <div className="mt-2 w-full bg-gray-700 rounded-full h-2.5">
            <div 
              className="bg-green-500 h-2.5 rounded-full" 
              style={{ 
                width: `${Math.round((displayStats.overallStats.kitDistributed / displayStats.overallStats.checkedIn) * 100) || 0}%` 
              }}
            ></div>
          </div>
        </div>
      </div>
      
      {/* Daily Stats if available */}
      {displayStats.dailyStats && (
        <div className="daily-stats bg-gray-800 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-medium mb-4">
            Daily Statistics - {new Date(displayStats.dailyStats.date).toLocaleDateString()}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex flex-col">
              <span className="text-sm text-gray-400">Registered</span>
              <span className="text-2xl font-semibold">{displayStats.dailyStats.registered}</span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-sm text-gray-400">Checked In</span>
              <span className="text-2xl font-semibold">{displayStats.dailyStats.checkedIn}</span>
              <span className="text-xs text-gray-500">{displayStats.dailyStats.checkInRate}% Rate</span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-sm text-gray-400">Lunch Distributed</span>
              <span className="text-2xl font-semibold">{displayStats.dailyStats.lunchDistributed}</span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-sm text-gray-400">Kits Distributed</span>
              <span className="text-2xl font-semibold">{displayStats.dailyStats.kitDistributed}</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Resource Status */}
      <div className="resource-stats bg-gray-800 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-medium mb-4">Resource Status</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayStats.resourceStats.map(resource => (
            <div key={resource.id} className="resource-card p-3 bg-gray-700 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">
                  {resource.name} ({resource.type})
                </h4>
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  resource.status === 'depleted' ? 'bg-red-900 text-red-100' :
                  resource.status === 'low' ? 'bg-yellow-800 text-yellow-100' :
                  'bg-green-800 text-green-100'
                }`}>
                  {resource.status.toUpperCase()}
                </span>
              </div>
              
              <div className="flex justify-between text-sm text-gray-300 mb-1">
                <span>Distributed: {resource.distributed}</span>
                <span>Remaining: {resource.remaining}</span>
              </div>
              
              <div className="w-full bg-gray-600 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    resource.status === 'depleted' ? 'bg-red-500' :
                    resource.status === 'low' ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`} 
                  style={{ width: `${Math.min(100, (resource.distributed / resource.total) * 100)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Emergency Stats if active */}
      {displayStats.emergencyStats && (
        <div className="emergency-stats bg-red-900 p-4 rounded-lg mb-6 border border-red-700">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Emergency Status
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <span className="text-sm text-red-300">Total Present</span>
              <span className="text-2xl font-semibold">{displayStats.emergencyStats.totalPresent}</span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-sm text-red-300">Safety Confirmed</span>
              <span className="text-2xl font-semibold">{displayStats.emergencyStats.safetyConfirmed}</span>
              <span className="text-xs text-red-300">{displayStats.emergencyStats.safetyPercentage}%</span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-sm text-red-300">Awaiting Confirmation</span>
              <span className="text-2xl font-semibold text-red-100">{displayStats.emergencyStats.unconfirmed}</span>
            </div>
          </div>
          
          <div className="mt-4 w-full bg-red-800 rounded-full h-3">
            <div 
              className="bg-green-500 h-3 rounded-full" 
              style={{ width: `${displayStats.emergencyStats.safetyPercentage}%` }}
            ></div>
          </div>
          <div className="text-xs text-center mt-1 text-red-300">
            {displayStats.emergencyStats.safetyPercentage}% of attendees confirmed safe
          </div>
        </div>
      )}
    </div>
  );
} 