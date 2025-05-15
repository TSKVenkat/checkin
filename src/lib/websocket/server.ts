// Use a combination of import and require() to correctly reference the types
// eslint-disable-next-line @typescript-eslint/no-var-requires
const WebSocket = require('ws');
import http from 'http';
import { NextApiRequest } from 'next';
import { verifyAccessToken } from '../auth/auth';

interface User {
  id: string;
  email: string;
  role: string;
  permissions: string[];
}

// Custom WebSocket type with user data
interface ExtendedWebSocket {
  user?: User;
  send: (data: any) => void;
  on: (event: string, listener: (...args: any[]) => void) => void;
  readyState: number;
}

// WebSocket server instance
let wsServer: any = null;
let isInitialized = false;

// Initialize WebSocket server
export function initWebSocketServer(server: http.Server): any {
  // Don't initialize twice
  if (isInitialized) {
    return wsServer;
  }

  // Initialize server
  wsServer = new WebSocket.Server({ noServer: true });
  isInitialized = true;

  // Handle verification and upgrade
  server.on('upgrade', async (request, socket, head) => {
    try {
      // Extract token from query parameters
      const url = new URL(request.url as string, `http://${request.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }
      
      // Verify token
      const user = verifyAccessToken(token);

      if (!user) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }
      
      // Authenticate the connection and pass user data
      if (!wsServer) {
        socket.write('HTTP/1.1 500 Server Error\r\n\r\n');
        socket.destroy();
        return;
      }

      wsServer.handleUpgrade(request, socket, head, (ws: any) => {
        wsServer.emit('connection', ws, request, user);
      });
    } catch (error) {
      console.error('WebSocket upgrade error:', error);
      socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
      socket.destroy();
    }
  });

  // Handle connections
  wsServer.on('connection', (ws: any, request: http.IncomingMessage, user: User) => {
    // Store user info on the connection
    (ws as ExtendedWebSocket).user = user;

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection',
      message: `Welcome ${user.email}`,
      timestamp: new Date().toISOString()
    }));

    // Handle messages
    ws.on('message', (message: any) => {
      try {
        // Convert Buffer/ArrayBuffer to string
        const messageString = message.toString();
        console.log(`Received message: ${messageString}`);

        // Parse the message
        const data = JSON.parse(messageString);

        // Handle the message based on type
        handleMessage(ws, data, user);
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
            ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          timestamp: new Date().toISOString()
        }));
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      console.log(`WebSocket closed for user: ${user.email}`);
    });
  });
  
  return wsServer;
}

// Handle different types of messages
function handleMessage(ws: ExtendedWebSocket, data: any, user: User) {
  // Implement your message handling logic here
  switch (data.type) {
    case 'ping':
      ws.send(JSON.stringify({
        type: 'pong',
        timestamp: new Date().toISOString()
      }));
      break;
      
    // Other message types can be handled here
      
    default:
      ws.send(JSON.stringify({
        type: 'error',
        message: `Unknown message type: ${data.type}`,
        timestamp: new Date().toISOString()
      }));
  }
}

// Get the WebSocket server instance
export function getWebSocketServer(): any {
  return wsServer;
}

// Broadcast a message to all connected clients
export function broadcastMessage(data: any): void {
  if (!wsServer) return;
  
  wsServer.clients.forEach((client: ExtendedWebSocket) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Broadcast a message to clients with a specific role
export function broadcastToRole(data: any, role: string): void {
  if (!wsServer) return;
  
  wsServer.clients.forEach((client: ExtendedWebSocket) => {
    if (client.readyState === WebSocket.OPEN && client.user?.role === role) {
      client.send(JSON.stringify(data));
    }
  });
}

// Send a message to a specific user by ID
export function sendToUser(data: any, userId: string): void {
  if (!wsServer) return;
  
  wsServer.clients.forEach((client: ExtendedWebSocket) => {
    if (client.readyState === WebSocket.OPEN && client.user?.id === userId) {
      client.send(JSON.stringify(data));
    }
  });
} 