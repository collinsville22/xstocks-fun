import { useEffect, useRef, useCallback, useState } from 'react';

interface WebSocketMessage {
  type: string;
  timestamp: string;
  data: any;
}

interface UseRobustWebSocketOptions {
  url: string;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  baseReconnectInterval?: number;
  maxReconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
  enableHeartbeat?: boolean;
  enableMessageQueue?: boolean;
  subscriptions?: string[]; // Initial subscriptions (dashboard types)
}

interface UseRobustWebSocketReturn {
  connection: {
    isConnected: boolean;
    lastMessage: WebSocketMessage | null;
    connectionAttempts: number;
    queuedMessages: number;
    lastHeartbeat: number | null;
  };
  send: (message: any) => void;
  subscribe: (subscriptions: string[]) => void;
  unsubscribe: (unsubscriptions: string[]) => void;
  connect: () => void;
  disconnect: () => void;
}

/**
 * Robust WebSocket Hook with:
 * - Exponential backoff reconnection
 * - Heartbeat/ping-pong mechanism
 * - Message queue during disconnect
 * - Selective dashboard subscriptions
 * - Connection state management
 */
export const useRobustWebSocket = (options: UseRobustWebSocketOptions): UseRobustWebSocketReturn => {
  const {
    url,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    baseReconnectInterval = 1000, // Start at 1s
    maxReconnectInterval = 30000, // Max 30s
    maxReconnectAttempts = Infinity, // Infinite retries
    heartbeatInterval = 30000, // 30s heartbeat
    heartbeatTimeout = 5000, // 5s timeout for pong
    enableHeartbeat = true,
    enableMessageQueue = true,
    subscriptions = []
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const messageQueueRef = useRef<any[]>([]);
  const subscriptionsRef = useRef<Set<string>>(new Set(subscriptions));

  const [connection, setConnection] = useState({
    isConnected: false,
    lastMessage: null as WebSocketMessage | null,
    connectionAttempts: 0,
    queuedMessages: 0,
    lastHeartbeat: null as number | null
  });

  // Calculate exponential backoff delay
  const getReconnectDelay = useCallback(() => {
    const exponentialDelay = Math.min(
      baseReconnectInterval * Math.pow(2, reconnectAttemptsRef.current),
      maxReconnectInterval
    );
    // Add jitter (±20%) to prevent thundering herd
    const jitter = exponentialDelay * (0.8 + Math.random() * 0.4);
    return Math.floor(jitter);
  }, [baseReconnectInterval, maxReconnectInterval]);

  // Clear heartbeat timers
  const clearHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  // Send heartbeat ping
  const sendHeartbeat = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'ping',
        timestamp: new Date().toISOString()
      }));

      // Set timeout to detect dead connection
      heartbeatTimeoutRef.current = setTimeout(() => {
 console.warn('Heartbeat timeout - connection appears dead');
        wsRef.current?.close();
      }, heartbeatTimeout);
    }
  }, [heartbeatTimeout]);

  // Start heartbeat mechanism
  const startHeartbeat = useCallback(() => {
    if (!enableHeartbeat) return;

    clearHeartbeat();
    heartbeatIntervalRef.current = setInterval(() => {
      sendHeartbeat();
    }, heartbeatInterval);
  }, [enableHeartbeat, heartbeatInterval, clearHeartbeat, sendHeartbeat]);

  // Process queued messages
  const processQueue = useCallback(() => {
    if (!enableMessageQueue) return;

    while (messageQueueRef.current.length > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
      const message = messageQueueRef.current.shift();
      wsRef.current.send(JSON.stringify(message));
    }

    setConnection(prev => ({
      ...prev,
      queuedMessages: messageQueueRef.current.length
    }));
  }, [enableMessageQueue]);

  // Create WebSocket connection
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
 console.log(`[PLUGIN] Attempting WebSocket connection... (attempt ${reconnectAttemptsRef.current + 1})`);
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
 console.log('[SUCCESS] WebSocket connected');
        setConnection(prev => ({
          ...prev,
          isConnected: true,
          connectionAttempts: prev.connectionAttempts + 1,
          lastHeartbeat: Date.now()
        }));
        reconnectAttemptsRef.current = 0;

        // Send initial subscriptions
        if (subscriptionsRef.current.size > 0) {
          const subs = Array.from(subscriptionsRef.current);
 console.log('[API] Subscribing to:', subs);
          wsRef.current?.send(JSON.stringify({
            type: 'subscribe',
            subscriptions: subs,
            timestamp: new Date().toISOString()
          }));
        }

        // Start heartbeat
        startHeartbeat();

        // Process queued messages
        processQueue();

        onConnect?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          // Handle pong response
          if (message.type === 'pong') {
            setConnection(prev => ({
              ...prev,
              lastHeartbeat: Date.now()
            }));
            // Clear timeout - connection is alive
            if (heartbeatTimeoutRef.current) {
              clearTimeout(heartbeatTimeoutRef.current);
              heartbeatTimeoutRef.current = null;
            }
            return;
          }

          setConnection(prev => ({
            ...prev,
            lastMessage: message
          }));
          onMessage?.(message);
        } catch (error) {
 console.error('[ERROR] Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
 console.log('[PLUGIN] WebSocket disconnected:', event.code, event.reason);
        setConnection(prev => ({
          ...prev,
          isConnected: false
        }));

        clearHeartbeat();
        onDisconnect?.();

        // Attempt to reconnect (unless clean close)
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = getReconnectDelay();
 console.log(`⏱ Reconnecting in ${delay}ms... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
 console.error('[ERROR] Max reconnection attempts reached');
          onError?.(new Error('Max reconnection attempts reached'));
        }
      };

      wsRef.current.onerror = (error) => {
 console.error('[ERROR] WebSocket error:', error);
        onError?.(new Error(error instanceof Event ? 'WebSocket error' : String(error)));
      };

    } catch (error) {
 console.error('[ERROR] Failed to create WebSocket connection:', error);
      onError?.(error as Error);
    }
  }, [url, onConnect, onDisconnect, onError, maxReconnectAttempts, getReconnectDelay, startHeartbeat, processQueue, clearHeartbeat, onMessage]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    clearHeartbeat();

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }

    setConnection(prev => ({
      ...prev,
      isConnected: false
    }));
  }, [clearHeartbeat]);

  // Send message (with queue fallback)
  const send = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else if (enableMessageQueue) {
 console.warn('⏸ WebSocket not connected. Queueing message...');
      messageQueueRef.current.push(message);
      setConnection(prev => ({
        ...prev,
        queuedMessages: messageQueueRef.current.length
      }));
    } else {
 console.warn('[ERROR] WebSocket not connected. Message dropped.');
    }
  }, [enableMessageQueue]);

  // Subscribe to dashboard types
  const subscribe = useCallback((newSubscriptions: string[]) => {
    newSubscriptions.forEach(sub => subscriptionsRef.current.add(sub));

    send({
      type: 'subscribe',
      subscriptions: newSubscriptions,
      timestamp: new Date().toISOString()
    });
  }, [send]);

  // Unsubscribe from dashboard types
  const unsubscribe = useCallback((unsubscriptions: string[]) => {
    unsubscriptions.forEach(sub => subscriptionsRef.current.delete(sub));

    send({
      type: 'unsubscribe',
      unsubscriptions,
      timestamp: new Date().toISOString()
    });
  }, [send]);

  // Cleanup on unmount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connection,
    send,
    subscribe,
    unsubscribe,
    connect,
    disconnect
  };
};

/**
 * Hook for market data WebSocket with robust connection management
 * Supports ALL 6 Intel dashboards with selective subscriptions
 */
export const useMarketDataWebSocket = (dashboardTypes: string[] = ['market']) => {
  const [marketData, setMarketData] = useState<{
    heatmap: any[] | null;
    indices: any[] | null;
    sectors: any[] | null;
    topMovers: { gainers: any[]; losers: any[] } | null;
    pulse: any | null;
    lastUpdate: string | null;
  }>({
    heatmap: null,
    indices: null,
    sectors: null,
    topMovers: null,
    pulse: null,
    lastUpdate: null
  });

  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'initial_data':
      case 'market_update':
        setMarketData({
          heatmap: message.data.heatmap || null,
          indices: message.data.indices || null,
          sectors: message.data.sectors || null,
          topMovers: message.data.topMovers || null,
          pulse: message.data.pulse || null,
          lastUpdate: message.timestamp
        });
        break;

      case 'heatmap_delta':
        setMarketData(prev => ({
          ...prev,
          heatmap: message.data,
          lastUpdate: message.timestamp
        }));
        break;

      case 'indices_delta':
        setMarketData(prev => ({
          ...prev,
          indices: message.data,
          lastUpdate: message.timestamp
        }));
        break;

      case 'sectors_delta':
        setMarketData(prev => ({
          ...prev,
          sectors: message.data,
          lastUpdate: message.timestamp
        }));
        break;

      case 'movers_delta':
        setMarketData(prev => ({
          ...prev,
          topMovers: message.data,
          lastUpdate: message.timestamp
        }));
        break;

      case 'pulse_delta':
        setMarketData(prev => ({
          ...prev,
          pulse: message.data,
          lastUpdate: message.timestamp
        }));
        break;

      default:
 console.log('Unhandled message type:', message.type);
    }
  }, []);

  const handleConnect = useCallback(() => {
 console.log('[API] Market data WebSocket connected');
  }, []);

  const handleDisconnect = useCallback(() => {
 console.log('[PLUGIN] Market data WebSocket disconnected');
  }, []);

  const handleError = useCallback((error: Error) => {
 console.error('[ERROR] Market data WebSocket error:', error);
  }, []);

  const ws = useRobustWebSocket({
    url: import.meta.env.VITE_WS_URL || 'ws://localhost:3008', // Fixed: Changed from wrong port 8006 to correct port 3008
    onMessage: handleMessage,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
    onError: handleError,
    baseReconnectInterval: 1000,
    maxReconnectInterval: 30000,
    maxReconnectAttempts: Infinity,
    heartbeatInterval: 30000,
    heartbeatTimeout: 5000,
    enableHeartbeat: true,
    enableMessageQueue: true,
    subscriptions: dashboardTypes
  });

  return {
    marketData,
    connection: ws.connection,
    subscribe: ws.subscribe,
    unsubscribe: ws.unsubscribe,
    refresh: () => ws.connect()
  };
};