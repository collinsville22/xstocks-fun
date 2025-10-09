/**
 * WebSocket Client Service
 * Handles real-time communication with the backend WebSocket server
 */

export interface WebSocketClientConfig {
  url?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface OrderStatusEvent {
  orderId: string;
  status: string;
  order?: any;
  timestamp: number;
}

export interface OrderExecutedEvent {
  orderId: string;
  orderStatus: any;
  order: any;
  timestamp: number;
}

export interface OrderCancelledEvent {
  orderId: string;
  orderStatus: any;
  order: any;
  timestamp: number;
}

export interface OrderExpiredEvent {
  orderId: string;
  order: any;
  timestamp: number;
}

export interface ExecutionConditionMetEvent {
  orderId: string;
  marketPrice: number;
  order: any;
  timestamp: number;
}

export interface MonitoringErrorEvent {
  orderId: string;
  error: string;
  timestamp: number;
}

export type WebSocketEventMap = {
  'connect': () => void;
  'disconnect': (reason: string) => void;
  'error': (error: any) => void;
  'order-status': (event: OrderStatusEvent) => void;
  'order-executed': (event: OrderExecutedEvent) => void;
  'order-cancelled': (event: OrderCancelledEvent) => void;
  'order-expired': (event: OrderExpiredEvent) => void;
  'execution-condition-met': (event: ExecutionConditionMetEvent) => void;
  'monitoring-error': (event: MonitoringErrorEvent) => void;
  'active-orders': (event: { walletAddress: string; orders: any[]; timestamp: number }) => void;
  'order-created': (event: { orderId: string; orderData: any; timestamp: number }) => void;
  'price-update': (event: any) => void;
};

export class WebSocketClient {
  private socket: any = null;
  private config: WebSocketClientConfig;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnected = false;
  private eventListeners: Map<keyof WebSocketEventMap, Function[]> = new Map();

  constructor(config: WebSocketClientConfig = {}) {
    this.config = {
      url: config.url || (typeof window !== 'undefined' ? `ws://${window.location.hostname}:3008` : 'ws://localhost:3008'),
      autoReconnect: config.autoReconnect ?? true,
      reconnectInterval: config.reconnectInterval || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10
    };

    // Initialize event listeners
    (Object.keys(WebSocketClient.getEventMap()) as Array<keyof WebSocketEventMap>).forEach(event => {
      this.eventListeners.set(event, []);
    });
  }

  /**
   * Get event map for type safety
   */
  private static getEventMap(): WebSocketEventMap {
    return {
      'connect': () => {},
      'disconnect': (reason: string) => reason,
      'error': (error: any) => error,
      'order-status': (event: OrderStatusEvent) => event,
      'order-executed': (event: OrderExecutedEvent) => event,
      'order-cancelled': (event: OrderCancelledEvent) => event,
      'order-expired': (event: OrderExpiredEvent) => event,
      'execution-condition-met': (event: ExecutionConditionMetEvent) => event,
      'monitoring-error': (event: MonitoringErrorEvent) => event,
      'active-orders': (event: { walletAddress: string; orders: any[]; timestamp: number }) => event,
      'order-created': (event: { orderId: string; orderData: any; timestamp: number }) => event,
      'price-update': (event: any) => event
    };
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected) {
        resolve();
        return;
      }

      try {
        // Dynamic import for browser compatibility
        const IO = (global as any).IO || require('socket.io-client');
        this.socket = IO(this.config.url, {
          transports: ['websocket', 'polling'],
          upgrade: true,
          rememberUpgrade: true
        });

        this.setupSocketListeners(resolve, reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Setup socket event listeners
   */
  private setupSocketListeners(resolve: Function, reject: Function) {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connect');
      resolve();
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('WebSocket disconnected:', reason);
      this.isConnected = false;
      this.emit('disconnect', reason);

      if (this.config.autoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('WebSocket connection error:', error);
      this.emit('error', error);
      reject(error);
    });

    // Order monitoring events
    this.socket.on('order-status', (event: OrderStatusEvent) => {
      this.emit('order-status', event);
    });

    this.socket.on('order-executed', (event: OrderExecutedEvent) => {
      console.log('Order executed:', event.orderId);
      this.emit('order-executed', event);
    });

    this.socket.on('order-cancelled', (event: OrderCancelledEvent) => {
      console.log('Order cancelled:', event.orderId);
      this.emit('order-cancelled', event);
    });

    this.socket.on('order-expired', (event: OrderExpiredEvent) => {
      console.log('Order expired:', event.orderId);
      this.emit('order-expired', event);
    });

    this.socket.on('execution-condition-met', (event: ExecutionConditionMetEvent) => {
      console.log('Execution condition met for order:', event.orderId);
      this.emit('execution-condition-met', event);
    });

    this.socket.on('monitoring-error', (event: MonitoringErrorEvent) => {
      console.warn('Monitoring error for order:', event.orderId, event.error);
      this.emit('monitoring-error', event);
    });

    // Wallet events
    this.socket.on('active-orders', (event: { walletAddress: string; orders: any[]; timestamp: number }) => {
      this.emit('active-orders', event);
    });

    this.socket.on('order-created', (event: { orderId: string; orderData: any; timestamp: number }) => {
      console.log('Order created:', event.orderId);
      this.emit('order-created', event);
    });

    // Price events
    this.socket.on('price-update', (event: any) => {
      this.emit('price-update', event);
    });

    // Error handling
    this.socket.on('error', (error: any) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    });
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts}`);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error('Reconnection failed:', error);

        if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
          console.error('Max reconnection attempts reached');
          this.emit('error', new Error('Max reconnection attempts reached'));
        }
      }
    }, this.config.reconnectInterval);
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnected = false;
    this.reconnectAttempts = 0;
  }

  /**
   * Identify client to server
   */
  identify(clientType: string = 'frontend', version: string = '1.0.0', walletAddress?: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('identify', { clientType, version, walletAddress });
    }
  }

  /**
   * Connect wallet to receive updates
   */
  connectWallet(walletAddress: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('wallet-connect', { walletAddress });
    }
  }

  /**
   * Disconnect wallet
   */
  disconnectWallet(walletAddress: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('wallet-disconnect', { walletAddress });
    }
  }

  /**
   * Subscribe to order updates
   */
  subscribeOrder(orderId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe-order', { orderId });
    }
  }

  /**
   * Unsubscribe from order updates
   */
  unsubscribeOrder(orderId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('unsubscribe-order', { orderId });
    }
  }

  /**
   * Notify server about order creation
   */
  notifyOrderCreated(orderId: string, orderData: any, maker: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('order-created', { orderId, orderData, maker });
    }
  }

  /**
   * Subscribe to price updates
   */
  subscribePrices(tokenPairs: Array<{ inputMint: string; outputMint: string }>) {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe-prices', { tokenPairs });
    }
  }

  /**
   * Unsubscribe from price updates
   */
  unsubscribePrices(tokenPairs: Array<{ inputMint: string; outputMint: string }>) {
    if (this.socket && this.isConnected) {
      this.socket.emit('unsubscribe-prices', { tokenPairs });
    }
  }

  /**
   * Add event listener
   */
  on<K extends keyof WebSocketEventMap>(event: K, listener: WebSocketEventMap[K]) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.push(listener);
    }
  }

  /**
   * Remove event listener
   */
  off<K extends keyof WebSocketEventMap>(event: K, listener: WebSocketEventMap[K]) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   */
  private emit<K extends keyof WebSocketEventMap>(event: K, ...args: any[]) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in WebSocket event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get connection status
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Get reconnection attempts count
   */
  get reconnectCount(): number {
    return this.reconnectAttempts;
  }
}

// Global singleton instance
export const webSocketClient = new WebSocketClient();

// Auto-connect on module load in browser environment
if (typeof window !== 'undefined') {
  // Connect when page loads
  if (document.readyState === 'complete') {
    webSocketClient.connect().catch(console.error);
  } else {
    window.addEventListener('load', () => {
      webSocketClient.connect().catch(console.error);
    });
  }
}