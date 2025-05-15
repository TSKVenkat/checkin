// WebSocket client implementation for browser
let socket: WebSocket | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL = 3000; // 3 seconds

// Event handlers
const messageHandlers: Record<string, ((data: any) => void)[]> = {};
const connectionHandlers: ((status: boolean) => void)[] = [];

/**
 * Initialize WebSocket connection
 */
export function initWebSocket(token: string) {
  if (socket) {
    // Close existing connection
    socket.close();
  }
  
  // Reset reconnect attempts
  reconnectAttempts = 0;
  
  // Determine WebSocket URL based on environment
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const wsUrl = `${protocol}://${window.location.host}/api/ws?token=${token}`;
  
  // Create new WebSocket connection
  connectWebSocket(wsUrl);
}

/**
 * Connect to WebSocket server
 */
function connectWebSocket(url: string) {
  try {
    socket = new WebSocket(url);
    
    // Connection opened
    socket.addEventListener('open', () => {
      console.log('WebSocket connection established');
      reconnectAttempts = 0;
      
      // Clear any pending reconnect timers
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      
      // Notify connection handlers
      connectionHandlers.forEach(handler => handler(true));
    });
    
    // Listen for messages
    socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Handle different message types
        if (message.type === 'message' && message.channel) {
          // Invoke handlers for this channel
          const handlers = messageHandlers[message.channel] || [];
          handlers.forEach(handler => handler(message.data));
          
          // Also invoke handlers for wildcard channel '*'
          const wildcardHandlers = messageHandlers['*'] || [];
          wildcardHandlers.forEach(handler => handler(message));
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    });
    
    // Handle closing
    socket.addEventListener('close', (event) => {
      console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
      
      // Notify connection handlers
      connectionHandlers.forEach(handler => handler(false));
      
      // Attempt to reconnect
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        
        console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
        
        reconnectTimer = setTimeout(() => {
          connectWebSocket(url);
        }, RECONNECT_INTERVAL);
      } else {
        console.log('Maximum reconnect attempts reached, giving up');
      }
    });
    
    // Handle connection error
    socket.addEventListener('error', (error) => {
      console.error('WebSocket connection error:', error);
    });
  } catch (e) {
    console.error('Error creating WebSocket connection:', e);
  }
}

/**
 * Subscribe to a channel
 */
export function subscribe(channel: string) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.warn('WebSocket not connected, cannot subscribe');
    return false;
  }
  
  socket.send(JSON.stringify({
    type: 'subscribe',
    channel
  }));
  
  return true;
}

/**
 * Unsubscribe from a channel
 */
export function unsubscribe(channel: string) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.warn('WebSocket not connected, cannot unsubscribe');
    return false;
  }
  
  socket.send(JSON.stringify({
    type: 'unsubscribe',
    channel
  }));
  
  return true;
}

/**
 * Add a message handler for a specific channel
 */
export function onMessage(channel: string, handler: (data: any) => void) {
  if (!messageHandlers[channel]) {
    messageHandlers[channel] = [];
  }
  
  messageHandlers[channel].push(handler);
  
  // Return a function to remove this handler
  return () => {
    messageHandlers[channel] = messageHandlers[channel].filter(h => h !== handler);
  };
}

/**
 * Add a connection status handler
 */
export function onConnectionChange(handler: (connected: boolean) => void) {
  connectionHandlers.push(handler);
  
  // Return a function to remove this handler
  return () => {
    const index = connectionHandlers.indexOf(handler);
    if (index !== -1) {
      connectionHandlers.splice(index, 1);
    }
  };
}

/**
 * Close the WebSocket connection
 */
export function closeConnection() {
  if (socket) {
    socket.close();
    socket = null;
  }
  
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  
  // Clear all handlers
  Object.keys(messageHandlers).forEach(channel => {
    messageHandlers[channel] = [];
  });
  
  connectionHandlers.length = 0;
} 