import { useEffect, useRef, useCallback, useState } from 'react';

interface WebSocketMessage {
  type: string;
  timestamp: string;
  data: any;
}

interface UseWebSocketOptions {
  url: string;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface UseWebSocketReturn {
  connection: {
    isConnected: boolean;
    lastMessage: WebSocketMessage | null;
    connectionAttempts: number;
  };
  send: (message: any) => void;
  subscribe: (subscriptions: string[]) => void;
  unsubscribe: (unsubscriptions: string[]) => void;
  connect: () => void;
  disconnect: () => void;
}

export const useWebSocket = (options: UseWebSocketOptions): UseWebSocketReturn => {
  const {
    url,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const [connection, setConnection] = useState({
    isConnected: false,
    lastMessage: null as WebSocketMessage | null,
    connectionAttempts: 0
  });

  // Create WebSocket connection
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setConnection(prev => ({
          ...prev,
          isConnected: true,
          connectionAttempts: prev.connectionAttempts + 1
        }));
        reconnectAttemptsRef.current = 0;
        onConnect?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setConnection(prev => ({
            ...prev,
            lastMessage: message
          }));
          onMessage?.(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setConnection(prev => ({
          ...prev,
          isConnected: false
        }));
        onDisconnect?.();

        // Attempt to reconnect if not a clean close
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`Attempting to reconnect... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.(new Error(error instanceof Event ? 'WebSocket error' : String(error)));
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      onError?.(error as Error);
    }
  }, [url, onConnect, onDisconnect, onError, reconnectInterval, maxReconnectAttempts]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }

    setConnection(prev => ({
      ...prev,
      isConnected: false
    }));
  }, []);

  // Send message
  const send = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Cannot send message.');
    }
  }, []);

  // Subscribe to data types
  const subscribe = useCallback((subscriptions: string[]) => {
    send({
      type: 'subscribe',
      subscriptions,
      timestamp: new Date().toISOString()
    });
  }, [send]);

  // Unsubscribe from data types
  const unsubscribe = useCallback((unsubscriptions: string[]) => {
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

// Hook for market data WebSocket
export const useMarketDataWebSocket = () => {
  const [marketData, setMarketData] = useState<{
    heatmap: any[] | null;
    indices: any[] | null;
    sectors: any[] | null;
    topMovers: { gainers: any[]; losers: any[] } | null;
    lastUpdate: string | null;
  }>({
    heatmap: null,
    indices: null,
    sectors: null,
    topMovers: null,
    lastUpdate: null
  });

  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'initial_data':
        setMarketData({
          heatmap: message.data.heatmap,
          indices: message.data.indices,
          sectors: message.data.sectors,
          topMovers: message.data.top_movers,
          lastUpdate: message.timestamp
        });
        break;

      case 'heatmap':
        setMarketData(prev => ({
          ...prev,
          heatmap: message.data,
          lastUpdate: message.timestamp
        }));
        break;

      case 'indices':
        setMarketData(prev => ({
          ...prev,
          indices: message.data,
          lastUpdate: message.timestamp
        }));
        break;

      case 'sectors':
        setMarketData(prev => ({
          ...prev,
          sectors: message.data,
          lastUpdate: message.timestamp
        }));
        break;

      case 'top_movers':
        setMarketData(prev => ({
          ...prev,
          topMovers: message.data,
          lastUpdate: message.timestamp
        }));
        break;

      default:
        console.log('Unhandled message type:', message.type);
    }
  }, []);

  const handleConnect = useCallback(() => {
    console.log('Market data WebSocket connected');
  }, []);

  const handleDisconnect = useCallback(() => {
    console.log('Market data WebSocket disconnected');
  }, []);

  const handleError = useCallback((error: Error) => {
    console.error('Market data WebSocket error:', error);
  }, []);

  const ws = useWebSocket({
    url: 'ws://localhost:3008',  // Fixed: Changed from 8006 to actual backend WebSocket port 3008
    onMessage: handleMessage,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
    onError: handleError,
    reconnectInterval: 3000,
    maxReconnectAttempts: 10
  });

  return {
    marketData,
    connection: ws.connection,
    refresh: () => ws.connect()
  };
};