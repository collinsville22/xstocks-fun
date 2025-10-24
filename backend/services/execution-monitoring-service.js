import { EventEmitter } from 'events';

/**
 * Backend Execution Monitoring Service
 * Monitors Jupiter trigger orders for execution status and provides real-time updates
 */
export class ExecutionMonitoringService extends EventEmitter {
  constructor() {
    super();
    this.activeOrders = new Map(); // orderId -> order data
    this.orderMonitors = new Map(); // orderId -> monitor interval
    this.monitorInterval = 10000; // Check every 10 seconds
    this.jupiterService = null; // Will be injected
  }

  /**
   * Initialize the monitoring service
   * @param {Object} jupiterService - Jupiter service instance
   */
  initialize(jupiterService) {
    this.jupiterService = jupiterService;
    console.log('Execution Monitoring Service initialized');
  }

  /**
   * Start monitoring an order
   * @param {string} orderId - The order ID to monitor
   * @param {string} maker - The maker's wallet address
   * @param {Object} orderData - Additional order data
   */
  async startMonitoring(orderId, maker, orderData = {}) {
    try {
      // Stop existing monitor if any
      this.stopMonitoring(orderId);

      // Store order data
      this.activeOrders.set(orderId, {
        orderId,
        maker,
        ...orderData,
        status: 'monitoring',
        createdAt: new Date(),
        lastChecked: new Date(),
        executionAttempts: 0,
        maxAttempts: 360 // 6 hours at 10s intervals
      });

      console.log(`Started monitoring order: ${orderId}`);

      // Start monitoring interval
      const monitorInterval = setInterval(async () => {
        await this.checkOrderStatus(orderId);
      }, this.monitorInterval);

      this.orderMonitors.set(orderId, monitorInterval);

      // Emit monitoring started event
      this.emit('monitoringStarted', { orderId, maker, orderData });

      // Initial status check
      await this.checkOrderStatus(orderId);

    } catch (error) {
      console.error(`Failed to start monitoring order ${orderId}:`, error);
      this.emit('monitoringError', { orderId, error: error.message });
    }
  }

  /**
   * Stop monitoring an order
   * @param {string} orderId - The order ID to stop monitoring
   */
  stopMonitoring(orderId) {
    const monitor = this.orderMonitors.get(orderId);
    if (monitor) {
      clearInterval(monitor);
      this.orderMonitors.delete(orderId);
      console.log(`Stopped monitoring order: ${orderId}`);

      // Update order status
      const order = this.activeOrders.get(orderId);
      if (order) {
        order.status = 'stopped';
        order.stoppedAt = new Date();
        this.emit('monitoringStopped', { orderId });
      }
    }
  }

  /**
   * Check the status of a specific order
   * @param {string} orderId - The order ID to check
   */
  async checkOrderStatus(orderId) {
    try {
      const order = this.activeOrders.get(orderId);
      if (!order) {
        console.warn(`Order ${orderId} not found in active orders`);
        return;
      }

      // Update last checked time
      order.lastChecked = new Date();
      order.executionAttempts++;

      // Check if we've exceeded max attempts
      if (order.executionAttempts >= order.maxAttempts) {
        this.stopMonitoring(orderId);
        order.status = 'expired';
        this.emit('orderExpired', { orderId, order });
        return;
      }

      // Get current order status from Jupiter
      if (this.jupiterService) {
        try {
          const orderStatus = await this.jupiterService.getTriggerOrderStatus(orderId);

          // Update order data with latest status
          order.lastStatus = orderStatus;
          order.lastStatusUpdate = new Date();

          // Emit status update event
          this.emit('statusUpdate', { orderId, status: orderStatus, order });

          // Check if order has been executed
          if (orderStatus.status === 'executed' || orderStatus.executedAt) {
            order.status = 'executed';
            order.executedAt = new Date(orderStatus.executedAt || Date.now());
            this.stopMonitoring(orderId);
            this.emit('orderExecuted', { orderId, orderStatus, order });
            return;
          }

          // Check if order has been cancelled
          if (orderStatus.status === 'cancelled' || orderStatus.cancelledAt) {
            order.status = 'cancelled';
            order.cancelledAt = new Date(orderStatus.cancelledAt || Date.now());
            this.stopMonitoring(orderId);
            this.emit('orderCancelled', { orderId, orderStatus, order });
            return;
          }

          // Check if order is still pending/active
          if (orderStatus.status === 'pending' || orderStatus.status === 'active') {
            // Check if market conditions would trigger execution
            await this.checkExecutionConditions(orderId, order);
          }

        } catch (error) {
          console.warn(`Failed to get status for order ${orderId}:`, error);
          order.lastError = error.message;

          // Emit error event but continue monitoring
          this.emit('statusCheckError', { orderId, error: error.message });
        }
      }

    } catch (error) {
      console.error(`Error checking order status ${orderId}:`, error);
      this.emit('monitoringError', { orderId, error: error.message });
    }
  }

  /**
   * Check if market conditions would trigger order execution
   * @param {string} orderId - The order ID
   * @param {Object} order - The order data
   */
  async checkExecutionConditions(orderId, order) {
    try {
      // For buy orders: check if market price <= target price
      // For sell orders: check if market price >= target price
      const { inputMint, outputMint, makingAmount, takingAmount, targetPrice, orderType } = order;

      // Get current market price
      const marketPrice = await this.getCurrentMarketPrice(inputMint, outputMint);

      if (marketPrice === null) {
        return; // Couldn't get market price
      }

      let shouldExecute = false;

      if (orderType === 'buy') {
        shouldExecute = marketPrice <= parseFloat(targetPrice);
      } else if (orderType === 'sell') {
        shouldExecute = marketPrice >= parseFloat(targetPrice);
      }

      // Emit market condition event
      this.emit('marketConditionCheck', {
        orderId,
        marketPrice,
        targetPrice: parseFloat(targetPrice),
        shouldExecute,
        orderType
      });

      // If conditions are met, this indicates the order should execute soon
      if (shouldExecute) {
        order.pendingExecution = true;
        order.executionConditionMetAt = new Date();
        this.emit('executionConditionMet', { orderId, marketPrice, order });
      } else {
        order.pendingExecution = false;
      }

    } catch (error) {
      console.warn(`Failed to check execution conditions for order ${orderId}:`, error);
    }
  }

  /**
   * Get current market price for a token pair
   * @param {string} inputMint - Input token mint
   * @param {string} outputMint - Output token mint
   */
  async getCurrentMarketPrice(inputMint, outputMint) {
    try {
      if (!this.jupiterService) {
        return null;
      }

      // Use a small amount for price check
      const testAmount = '1000000'; // 1 USDC equivalent
      const quote = await this.jupiterService.getQuote(inputMint, outputMint, testAmount, 50);

      // Calculate price
      const baseAmount = parseFloat(testAmount) / Math.pow(10, 6); // Assuming USDC decimals
      const targetAmount = parseFloat(quote.outAmount) / Math.pow(10, 6); // Assuming output has 6 decimals
      const price = baseAmount / targetAmount;

      return price;

    } catch (error) {
      console.warn('Failed to get current market price:', error);
      return null;
    }
  }

  /**
   * Get all active orders being monitored
   */
  getActiveOrders() {
    return Array.from(this.activeOrders.values());
  }

  /**
   * Get specific order data
   * @param {string} orderId - The order ID
   */
  getOrder(orderId) {
    return this.activeOrders.get(orderId);
  }

  /**
   * Get monitoring statistics
   */
  getStatistics() {
    const activeOrders = this.getActiveOrders();
    const totalOrders = activeOrders.length;
    const executedOrders = activeOrders.filter(o => o.status === 'executed').length;
    const cancelledOrders = activeOrders.filter(o => o.status === 'cancelled').length;
    const expiredOrders = activeOrders.filter(o => o.status === 'expired').length;
    const pendingOrders = activeOrders.filter(o => o.status === 'monitoring').length;

    return {
      totalOrders,
      executedOrders,
      cancelledOrders,
      expiredOrders,
      pendingOrders,
      averageMonitorTime: this.calculateAverageMonitorTime(activeOrders)
    };
  }

  /**
   * Calculate average monitoring time for executed orders
   * @param {Array} orders - Array of orders
   */
  calculateAverageMonitorTime(orders) {
    const executedOrders = orders.filter(o => o.status === 'executed' && o.executedAt && o.createdAt);
    if (executedOrders.length === 0) return 0;

    const totalTime = executedOrders.reduce((sum, order) => {
      return sum + (order.executedAt - order.createdAt);
    }, 0);

    return totalTime / executedOrders.length / 1000 / 60; // Convert to minutes
  }

  /**
   * Clean up old completed orders
   * @param {number} olderThanDays - Remove orders older than this many days
   */
  cleanupOldOrders(olderThanDays = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    let cleanedCount = 0;

    for (const [orderId, order] of this.activeOrders.entries()) {
      if ((order.status === 'executed' && order.executedAt < cutoffDate) ||
          (order.status === 'cancelled' && order.cancelledAt < cutoffDate) ||
          (order.status === 'expired' && order.stoppedAt < cutoffDate)) {

        this.activeOrders.delete(orderId);
        cleanedCount++;
      }
    }

    console.log(`Cleaned up ${cleanedCount} old orders`);
    return cleanedCount;
  }

  /**
   * Stop all monitoring and clean up
   */
  shutdown() {
    console.log('Shutting down Execution Monitoring Service');

    // Stop all monitoring intervals
    for (const [orderId, monitor] of this.orderMonitors.entries()) {
      clearInterval(monitor);
    }

    this.orderMonitors.clear();
    this.activeOrders.clear();

    console.log('Execution Monitoring Service shut down');
  }
}

// Export singleton instance
export const executionMonitoringService = new ExecutionMonitoringService();