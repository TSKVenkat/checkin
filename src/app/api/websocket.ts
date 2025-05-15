import { NextApiRequest, NextApiResponse } from 'next';
import { Server as NetServer } from 'http';
import { Server as ServerIO } from 'socket.io';
import { NextResponse } from 'next/server';
import type { Socket as NetSocket } from 'net';
import { verifyAccessToken } from '@/lib/auth/auth';

interface SocketServer extends ServerIO {
  middlewareImplemented?: boolean;
}

// Define custom NextApiResponse type with socket
interface NextApiResponseSocket extends NextApiResponse {
  socket: NetSocket & {
    server: NetServer & {
      io?: SocketServer;
    };
  };
}

// Define WebSocket event types
export const WebSocketEvents = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  DASHBOARD_UPDATE: 'dashboard-update',
  ATTENDEE_CHECKED_IN: 'attendee-checked-in',
  RESOURCE_CLAIMED: 'resource-claimed',
  EMERGENCY_ACTIVATED: 'emergency-activated',
  EMERGENCY_DEACTIVATED: 'emergency-deactivated',
  SYSTEM_NOTIFICATION: 'system-notification',
  EMERGENCY_SAFETY_CONFIRMATION: 'emergency-safety-confirmation',
  RESOURCE_LOW: 'resource-low',
  RESOURCE_DEPLETED: 'resource-depleted',
};

// Use simple in-memory storage for active connections
// In production, you'd want to use Redis or another distributed store
const connectedClients = new Map();

// Define socket.io server instance
let io: SocketServer;

export default function handler(req: NextApiRequest, res: NextApiResponseSocket) {
  if (!res.socket.server.io) {
    console.log('Setting up socket.io server...');
    
    // Create new server instance
    io = new ServerIO(res.socket.server, {
      path: '/api/websocket',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });
    
    // Authentication middleware for socket connections
    io.use((socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }
        
        // Verify token
        const user = verifyAccessToken(token as string);
        
        if (!user) {
          return next(new Error('Authentication error: Invalid token'));
        }
        
        // Attach user data to socket
        socket.data.user = user;
        return next();
      } catch (error) {
        return next(new Error('Authentication error'));
      }
    });
    
    // Connection handler
    io.on(WebSocketEvents.CONNECTION, (socket) => {
      const user = socket.data.user;
      console.log(`User connected: ${user.email} (${user.role})`);
      
      // Store socket in map
      connectedClients.set(user.id, socket);
      
      // Send welcome message
      socket.emit('welcome', {
        message: `Welcome ${user.email}`,
        userId: user.id,
        role: user.role
      });
      
      // Join role-based room
      socket.join(`role:${user.role}`);
      
      // Handle disconnect
      socket.on(WebSocketEvents.DISCONNECT, () => {
        console.log(`User disconnected: ${user.email}`);
        connectedClients.delete(user.id);
      });
      
      // Handle subscribing to specific attendee events
      socket.on('subscribe:attendee', (attendeeId: string) => {
        // Check if user has permission to subscribe to this attendee
        if (user.role === 'admin' || user.role === 'manager' || user.role === 'staff') {
          socket.join(`attendee:${attendeeId}`);
          socket.emit('subscribed', { entity: 'attendee', id: attendeeId });
        } else if (user.role === 'attendee' && user.id === attendeeId) {
          socket.join(`attendee:${attendeeId}`);
          socket.emit('subscribed', { entity: 'attendee', id: attendeeId });
        } else {
          socket.emit('error', { message: 'Unauthorized subscription request' });
        }
      });
    });
    
    // Store io server instance
    res.socket.server.io = io;
  }
  
  // Send success response
  res.status(200).json({ success: true });
}

// Functions to broadcast events
export function broadcastDashboardUpdate(data: any) {
  if (io) {
    io.to('role:admin').to('role:manager').emit(WebSocketEvents.DASHBOARD_UPDATE, data);
  }
}

export function notifyAttendeeCheckedIn(attendeeId: string, data: any) {
  if (io) {
    io.to(`attendee:${attendeeId}`).emit(WebSocketEvents.ATTENDEE_CHECKED_IN, data);
    io.to('role:admin').to('role:manager').to('role:staff').emit(WebSocketEvents.ATTENDEE_CHECKED_IN, data);
  }
}

// Broadcast a check-in event to all relevant users
export function broadcastAttendeeCheckedIn(data: {
  attendeeId: string;
  name: string;
  checkedInAt: Date;
  location?: string;
  eventId?: string;
}) {
  if (io) {
    // Send event to dashboard users
    io.to('role:admin').to('role:manager').to('role:staff').emit(WebSocketEvents.ATTENDEE_CHECKED_IN, data);
    
    // Also send to the specific attendee room if applicable
    io.to(`attendee:${data.attendeeId}`).emit(WebSocketEvents.ATTENDEE_CHECKED_IN, data);
    
    // Update dashboard metrics for admin and managers
    broadcastDashboardUpdate({
      type: 'attendee-checked-in',
      data: {
        time: new Date(),
        attendeeId: data.attendeeId,
        attendeeName: data.name,
        location: data.location
      }
    });
  }
}

export function notifyResourceClaimed(attendeeId: string, data: any) {
  if (io) {
    io.to(`attendee:${attendeeId}`).emit(WebSocketEvents.RESOURCE_CLAIMED, data);
    io.to('role:admin').to('role:manager').emit(WebSocketEvents.RESOURCE_CLAIMED, data);
  }
}

export function broadcastEmergencyActivation(data: any) {
  if (io) {
    // Send to everyone
    io.emit(WebSocketEvents.EMERGENCY_ACTIVATED, data);
  }
}

export function broadcastEmergencyDeactivation(data: any) {
  if (io) {
    // Send to everyone
    io.emit(WebSocketEvents.EMERGENCY_DEACTIVATED, data);
  }
}

export function sendSystemNotification(roles: string[], data: any) {
  if (io) {
    // Send to specified roles
    roles.forEach(role => {
      io.to(`role:${role}`).emit(WebSocketEvents.SYSTEM_NOTIFICATION, data);
    });
  }
}

export function notifySafetyConfirmation(attendeeId: string, data: any) {
  if (io) {
    io.to('role:admin').emit(WebSocketEvents.EMERGENCY_SAFETY_CONFIRMATION, {
      attendeeId,
      ...data
    });
  }
}

export function notifyResourceLevel(resourceType: string, level: 'low' | 'depleted', data: any) {
  if (io) {
    const eventType = level === 'low' ? WebSocketEvents.RESOURCE_LOW : WebSocketEvents.RESOURCE_DEPLETED;
    io.to('role:admin').to('role:manager').emit(eventType, {
      resourceType,
      ...data
    });
  }
} 