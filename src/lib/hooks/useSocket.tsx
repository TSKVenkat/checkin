'use client';

import { useState, useEffect, useContext, createContext } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthSession } from '@/lib/query/auth-hooks';
import { tokenStorage } from '@/lib/query/auth-hooks';

// Create socket context for provider pattern
const SocketContext = createContext<Socket | null>(null);

// Socket provider component
export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { user } = useAuthSession();
  
  useEffect(() => {
    // Don't initialize if we don't have authentication
    if (!user) return;
    
    // Create socket connection with auth token
    const token = tokenStorage.getToken();
    if (!token) return;
    
    const socketInstance = io({
      path: '/api/websocket',
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: {
        token
      }
    });
    
    // Connect event handlers
    socketInstance.on('connect', () => {
      console.log('Socket connected');
    });
    
    socketInstance.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${reason}`);
    });
    
    socketInstance.on('error', (error) => {
      console.error('Socket error:', error);
    });
    
    socketInstance.on('reconnect_attempt', (attempt) => {
      console.log(`Socket reconnection attempt ${attempt}`);
    });
    
    // Store socket instance
    setSocket(socketInstance);
    
    // Clean up on unmount
    return () => {
      socketInstance.disconnect();
      setSocket(null);
    };
  }, [user]);
  
  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

// Socket hook for components
export function useSocket() {
  return useContext(SocketContext);
}

// Helper hook for subscribing to specific attendee updates
export function useAttendeeSocket(attendeeId: string) {
  const socket = useSocket();
  
  useEffect(() => {
    if (!socket || !attendeeId) return;
    
    // Subscribe to this attendee's events
    socket.emit('subscribe:attendee', attendeeId);
    
    return () => {
      // Unsubscribe when component unmounts
      socket.emit('unsubscribe:attendee', attendeeId);
    };
  }, [socket, attendeeId]);
  
  return socket;
}

// Helper hook for subscribing to event updates
export function useEventSocket(eventId: string) {
  const socket = useSocket();
  
  useEffect(() => {
    if (!socket || !eventId) return;
    
    // Subscribe to this event's updates
    socket.emit('subscribe:event', eventId);
    
    return () => {
      // Unsubscribe when component unmounts
      socket.emit('unsubscribe:event', eventId);
    };
  }, [socket, eventId]);
  
  return socket;
} 