import { Server } from 'socket.io';
import { executionMonitoringService } from './execution-monitoring-service.js';
import {
  isValidSolanaAddress,
  isValidOrderId
} from '../middleware/validation.js';
import { SERVER } from '../config/constants.js';

/**
 * WebSocket Service for Real-time Order Status Updates
 * Provides real-time communication between backend and frontend
 */
export class WebSocketService {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: SERVER.FRONTEND_URL, // Use constants for consistency with server.js
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling']
    });

    this.clients = new Map(); // socketId -> client info
    this.walletConnections = new Map(); // walletAddress -> Set of socketIds
    this.orderSubscriptions = new Map(); // orderId -> Set of socketIds

    this.setupEventHandlers();
    this.setupMonitoringListeners();
  }

  /**
   * Setup WebSocket event handlers
   */
  setupEventHandlers() {
    // Connection handler
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Handle client identification
      socket.on('identify', (data) => {
        this.handleClientIdentify(socket, data);
      });

      // Handle wallet connection
      socket.on('wallet-connect', (data) => {
        this.handleWalletConnect(socket, data);
      });

      // Handle wallet disconnection
      socket.on('wallet-disconnect', (data) => {
        this.handleWalletDisconnect(socket, data);
      });

      // Handle order subscription
      socket.on('subscribe-order', (data) => {
        this.handleOrderSubscription(socket, data);
      });

      // Handle order unsubscription
      socket.on('unsubscribe-order', (data) => {
        this.handleOrderUnsubscription(socket, data);
      });

      // Handle order creation
      socket.on('order-created', (data) => {
        this.handleOrderCreated(socket, data);
      });

      // Handle price subscription
      socket.on('subscribe-prices', (data) => {
        this.handlePriceSubscription(socket, data);
      });

      // Handle price unsubscription
      socket.on('unsubscribe-prices', (data) => {
        this.handlePriceUnsubscription(socket, data);
      });

      // Handle ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });

      // Disconnection handler
      socket.on('disconnect', (reason) => {
        console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
        this.handleDisconnection(socket);
      });
    });
  }

  /**
   * Setup monitoring service event listeners
   */
  setupMonitoringListeners() {
    // Listen for order execution events
    executionMonitoringService.on('orderExecuted', (data) => {
      this.broadcastToOrderSubscribers(data.orderId, 'order-executed', data);
      this.broadcastToWallet(data.order.maker, 'order-executed', data);
    });

    // Listen for order cancellation events
    executionMonitoringService.on('orderCancelled', (data) => {
      this.broadcastToOrderSubscribers(data.orderId, 'order-cancelled', data);
      this.broadcastToWallet(data.order.maker, 'order-cancelled', data);
    });

    // Listen for order expiration events
    executionMonitoringService.on('orderExpired', (data) => {
      this.broadcastToOrderSubscribers(data.orderId, 'order-expired', data);
      this.broadcastToWallet(data.order.maker, 'order-expired', data);
    });

    // Listen for status update events
    executionMonitoringService.on('statusUpdate', (data) => {
      this.broadcastToOrderSubscribers(data.orderId, 'order-status-update', data);
    });

    // Listen for execution condition met events
    executionMonitoringService.on('executionConditionMet', (data) => {
      this.broadcastToOrderSubscribers(data.orderId, 'execution-condition-met', data);
      this.broadcastToWallet(data.order.maker, 'execution-condition-met', data);
    });

    // Listen for monitoring error events
    executionMonitoringService.on('monitoringError', (data) => {
      this.broadcastToOrderSubscribers(data.orderId, 'monitoring-error', data);
      this.broadcastToWallet(data.order.maker, 'monitoring-error', data);
    });
  }

  /**
   * Handle client identification
   */
  handleClientIdentify(socket, data) {
    const { clientType, version, walletAddress } = data;

    this.clients.set(socket.id, {
      socketId: socket.id,
      clientType,
      version,
      connectedAt: new Date(),
      walletAddress
    });

    socket.emit('identified', {
      success: true,
      socketId: socket.id,
      timestamp: Date.now()
    });

    console.log(`Client identified: ${socket.id} (${clientType} v${version})`);
  }

  /**
   * Handle wallet connection
   */
  handleWalletConnect(socket, data) {
    const { walletAddress } = data;

    if (!walletAddress) {
      socket.emit('error', { message: 'Wallet address is required' });
      return;
    }

    // Validate Solana address format
    if (!isValidSolanaAddress(walletAddress)) {
      socket.emit('error', { message: 'Invalid Solana wallet address format' });
      return;
    }

    // Update client info
    const client = this.clients.get(socket.id);
    if (client) {
      client.walletAddress = walletAddress;
    }

    // Add to wallet connections
    if (!this.walletConnections.has(walletAddress)) {
      this.walletConnections.set(walletAddress, new Set());
    }
    this.walletConnections.get(walletAddress).add(socket.id);

    // Join wallet-specific room
    socket.join(`wallet:${walletAddress}`);

    // Send active orders for this wallet
    this.sendActiveOrdersToWallet(socket, walletAddress);

    socket.emit('wallet-connected', {
      success: true,
      walletAddress,
      timestamp: Date.now()
    });

    console.log(`Wallet connected: ${walletAddress} via socket ${socket.id}`);
  }

  /**
   * Handle wallet disconnection
   */
  handleWalletDisconnect(socket, data) {
    const { walletAddress } = data;

    if (walletAddress) {
      // Remove from wallet connections
      const connections = this.walletConnections.get(walletAddress);
      if (connections) {
        connections.delete(socket.id);
        if (connections.size === 0) {
          this.walletConnections.delete(walletAddress);
        }
      }

      // Leave wallet room
      socket.leave(`wallet:${walletAddress}`);

      // Update client info
      const client = this.clients.get(socket.id);
      if (client) {
        client.walletAddress = null;
      }
    }

    socket.emit('wallet-disconnected', {
      success: true,
      timestamp: Date.now()
    });

    console.log(`Wallet disconnected: ${walletAddress} via socket ${socket.id}`);
  }

  /**
   * Handle order subscription
   */
  handleOrderSubscription(socket, data) {
    const { orderId } = data;

    if (!orderId) {
      socket.emit('error', { message: 'Order ID is required' });
      return;
    }

    // Validate orderId format (accepting both UUID and string formats)
    if (typeof orderId !== 'string' || orderId.trim().length === 0) {
      socket.emit('error', { message: 'Order ID must be a non-empty string' });
      return;
    }

    // Add to order subscriptions
    if (!this.orderSubscriptions.has(orderId)) {
      this.orderSubscriptions.set(orderId, new Set());
    }
    this.orderSubscriptions.get(orderId).add(socket.id);

    // Join order-specific room
    socket.join(`order:${orderId}`);

    // Send current order status if available
    const order = executionMonitoringService.getOrder(orderId);
    if (order) {
      socket.emit('order-status', {
        orderId,
        status: order.status,
        order: order,
        timestamp: Date.now()
      });
    }

    socket.emit('order-subscribed', {
      success: true,
      orderId,
      timestamp: Date.now()
    });

    console.log(`Order subscribed: ${orderId} by socket ${socket.id}`);
  }

  /**
   * Handle order unsubscription
   */
  handleOrderUnsubscription(socket, data) {
    const { orderId } = data;

    if (orderId) {
      // Remove from order subscriptions
      const subscriptions = this.orderSubscriptions.get(orderId);
      if (subscriptions) {
        subscriptions.delete(socket.id);
        if (subscriptions.size === 0) {
          this.orderSubscriptions.delete(orderId);
        }
      }

      // Leave order room
      socket.leave(`order:${orderId}`);

      socket.emit('order-unsubscribed', {
        success: true,
        orderId,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle order creation
   */
  handleOrderCreated(socket, data) {
    const { orderId, orderData, maker } = data;

    if (!orderId || !maker) {
      socket.emit('error', { message: 'Order ID and maker are required' });
      return;
    }

    // Validate orderId format
    if (typeof orderId !== 'string' || orderId.trim().length === 0) {
      socket.emit('error', { message: 'Order ID must be a non-empty string' });
      return;
    }

    // Validate maker address
    if (!isValidSolanaAddress(maker)) {
      socket.emit('error', { message: 'Invalid maker Solana address format' });
      return;
    }

    // Start monitoring the order
    executionMonitoringService.startMonitoring(orderId, maker, orderData);

    // Subscribe the client to this order
    this.handleOrderSubscription(socket, { orderId });

    // Broadcast to all clients of this wallet
    this.broadcastToWallet(maker, 'order-created', {
      orderId,
      orderData,
      timestamp: Date.now()
    });

    console.log(`Order created and monitoring started: ${orderId}`);
  }

  /**
   * Handle price subscription
   */
  handlePriceSubscription(socket, data) {
    const { tokenPairs } = data;

    if (!tokenPairs || !Array.isArray(tokenPairs)) {
      socket.emit('error', { message: 'Token pairs array is required' });
      return;
    }

    // Validate array size to prevent DoS attacks
    if (tokenPairs.length > 100) {
      socket.emit('error', { message: 'Cannot subscribe to more than 100 token pairs at once' });
      return;
    }

    // Validate each token pair contains valid mint addresses
    for (const pair of tokenPairs) {
      if (!pair.inputMint || !pair.outputMint) {
        socket.emit('error', { message: 'Each token pair must have inputMint and outputMint' });
        return;
      }
      if (!isValidSolanaAddress(pair.inputMint) || !isValidSolanaAddress(pair.outputMint)) {
        socket.emit('error', { message: 'Invalid token mint address in token pairs' });
        return;
      }
    }

    // Join price rooms for each token pair
    tokenPairs.forEach(pair => {
      const room = `price:${pair.inputMint}:${pair.outputMint}`;
      socket.join(room);
    });

    socket.emit('price-subscribed', {
      success: true,
      tokenPairs,
      timestamp: Date.now()
    });

    console.log(`Price subscription for ${tokenPairs.length} token pairs by socket ${socket.id}`);
  }

  /**
   * Handle price unsubscription
   */
  handlePriceUnsubscription(socket, data) {
    const { tokenPairs } = data;

    if (tokenPairs && Array.isArray(tokenPairs)) {
      tokenPairs.forEach(pair => {
        const room = `price:${pair.inputMint}:${pair.outputMint}`;
        socket.leave(room);
      });
    }

    socket.emit('price-unsubscribed', {
      success: true,
      timestamp: Date.now()
    });
  }

  /**
   * Handle client disconnection
   */
  handleDisconnection(socket) {
    const client = this.clients.get(socket.id);
    if (client) {
      // Remove from wallet connections
      if (client.walletAddress) {
        const connections = this.walletConnections.get(client.walletAddress);
        if (connections) {
          connections.delete(socket.id);
          if (connections.size === 0) {
            this.walletConnections.delete(client.walletAddress);
          }
        }
      }

      // Remove from all order subscriptions
      for (const [orderId, subscriptions] of this.orderSubscriptions.entries()) {
        subscriptions.delete(socket.id);
        if (subscriptions.size === 0) {
          this.orderSubscriptions.delete(orderId);
        }
      }

      // Remove client
      this.clients.delete(socket.id);
    }
  }

  /**
   * Send active orders to a wallet
   */
  sendActiveOrdersToWallet(socket, walletAddress) {
    const activeOrders = executionMonitoringService.getActiveOrders()
      .filter(order => order.maker === walletAddress);

    if (activeOrders.length > 0) {
      socket.emit('active-orders', {
        walletAddress,
        orders: activeOrders,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Broadcast to order subscribers
   */
  broadcastToOrderSubscribers(orderId, event, data) {
    this.io.to(`order:${orderId}`).emit(event, {
      ...data,
      timestamp: Date.now()
    });
  }

  /**
   * Broadcast to wallet
   */
  broadcastToWallet(walletAddress, event, data) {
    this.io.to(`wallet:${walletAddress}`).emit(event, {
      ...data,
      timestamp: Date.now()
    });
  }

  /**
   * Broadcast price update
   */
  broadcastPriceUpdate(inputMint, outputMint, priceData) {
    this.io.to(`price:${inputMint}:${outputMint}`).emit('price-update', {
      inputMint,
      outputMint,
      ...priceData,
      timestamp: Date.now()
    });
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(event, data) {
    this.io.emit(event, {
      ...data,
      timestamp: Date.now()
    });
  }

  /**
   * Get connection statistics
   */
  getStatistics() {
    return {
      totalClients: this.clients.size,
      totalWalletConnections: this.walletConnections.size,
      totalOrderSubscriptions: this.orderSubscriptions.size,
      clientsByType: this.getClientStatsByType(),
      activeOrders: executionMonitoringService.getActiveOrders().length
    };
  }

  /**
   * Get client statistics by type
   */
  getClientStatsByType() {
    const stats = {};
    for (const client of this.clients.values()) {
      const type = client.clientType || 'unknown';
      stats[type] = (stats[type] || 0) + 1;
    }
    return stats;
  }

  /**
   * Send order status to specific wallet
   */
  sendOrderStatus(walletAddress, orderId, status) {
    this.io.to(`wallet:${walletAddress}`).emit('order-status', {
      orderId,
      status,
      timestamp: Date.now()
    });
  }
}

/**
 * Factory function to create and initialize WebSocket service
 */
export function createWebSocketService(server) {
  return new WebSocketService(server);
}