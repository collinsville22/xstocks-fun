import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import pkg from '@solana/web3.js';
const { Connection, PublicKey } = pkg;

// Import services
import { TokenService } from './services/token-service.js';
import { JupiterService } from './services/jupiter-service.js';
import { WalletService } from './services/wallet-service.js';
import { executionMonitoringService } from './services/execution-monitoring-service.js';
import { createWebSocketService } from './services/websocket-service.js';

// Import validation middleware
import {
  validateBalanceRequest,
  validateQuoteRequest,
  validateSwapRequest,
  validateLimitOrderRequest,
  validateTransactionRequest,
  validateSignatureParam,
  validateWalletAddressParam,
  validateOrderIdParam,
  validateCraftSendRequest,
  validateExecuteOrderRequest,
  validateMonitoringStartRequest,
  validateMonitoringStopRequest,
  validateCleanupRequest,
  validateTriggerOrderRequest,
  validateTriggerOrderActionRequest,
  validateActiveOrdersQuery
} from './middleware/validation.js';

// Import rate limiting middleware
import { generalLimiter, tradingLimiter, quoteLimiter } from './middleware/rate-limiter.js';

// Import constants
import { SERVER } from './config/constants.js';

// Load environment variables
dotenv.config();

// Validate critical environment variables
const requiredEnvVars = ['HELIUS_RPC_URL'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ ERROR: Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please set these in your .env file or environment');
  console.error('Example: HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY');
  process.exit(1);
}

console.log('✅ All required environment variables are set');

const app = express();
const PORT = SERVER.PORT;

// Create HTTP server for WebSocket support
const server = createServer(app);

// Middleware - CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (SERVER.ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Apply general rate limiting to all routes
app.use(generalLimiter.middleware());

// Initialize services
const tokenService = new TokenService();
const walletService = new WalletService(process.env.HELIUS_RPC_URL);
const jupiterService = new JupiterService(process.env.HELIUS_RPC_URL);

// Initialize execution monitoring service
executionMonitoringService.initialize(jupiterService);

// Initialize WebSocket service
const webSocketService = createWebSocketService(server);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get all tokens
app.get('/api/tokens', (req, res) => {
  try {
    const tokens = tokenService.getAllTokens();
    res.json(tokens);
  } catch (error) {
    console.error('Get tokens error:', error);
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
});

// Get xStocks tokens
app.get('/api/tokens/xstocks', (req, res) => {
  try {
    const xstocks = tokenService.getXStocks();
    res.json(xstocks);
  } catch (error) {
    console.error('Get xStocks error:', error);
    res.status(500).json({ error: 'Failed to fetch xStocks' });
  }
});

// Get base tokens
app.get('/api/tokens/base', (req, res) => {
  try {
    const baseTokens = tokenService.getBaseTokens();
    res.json(baseTokens);
  } catch (error) {
    console.error('Get base tokens error:', error);
    res.status(500).json({ error: 'Failed to fetch base tokens' });
  }
});

// Get wallet balance
app.post('/api/wallet/balance', validateBalanceRequest, async (req, res) => {
  try {
    const { walletAddress } = req.body;
    const balances = await walletService.getWalletBalance(walletAddress);
    res.json(balances);
  } catch (error) {
    console.error('Balance fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet balance' });
  }
});

// Get Jupiter quote
app.get('/api/jupiter/quote', quoteLimiter.middleware(), validateQuoteRequest, async (req, res) => {
  try {
    const { inputMint, outputMint, amount, slippageBps = 50 } = req.query;

    if (!inputMint || !outputMint || !amount) {
      return res.status(400).json({
        error: 'inputMint, outputMint, and amount are required'
      });
    }

    const quote = await jupiterService.getQuote(
      inputMint,
      outputMint,
      amount.toString(),
      parseInt(slippageBps)
    );

    res.json(quote);
  } catch (error) {
    console.error('Get quote error:', error);
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
});

// Create swap transaction
app.post('/api/jupiter/swap', tradingLimiter.middleware(), validateSwapRequest, async (req, res) => {
  try {
    const { quote, userPublicKey, wrapAndUnwrapSol = true } = req.body;

    const swapResponse = await jupiterService.createSwapTransaction(
      quote,
      userPublicKey,
      wrapAndUnwrapSol
    );

    res.json(swapResponse);
  } catch (error) {
    console.error('Swap error:', error);
    res.status(500).json({ error: 'Failed to create swap transaction' });
  }
});

// Create limit order
app.post('/api/jupiter/limit-order', tradingLimiter.middleware(), validateLimitOrderRequest, async (req, res) => {
  try {
    const { inputMint, outputMint, amount, targetPrice, maker, expiry } = req.body;

    const order = {
      inputMint,
      outputMint,
      amount,
      targetPrice,
      maker,
      expiry
    };

    const orderResponse = await jupiterService.createLimitOrder(order);
    res.json(orderResponse);
  } catch (error) {
    console.error('Limit order error:', error);
    res.status(500).json({ error: 'Failed to create limit order' });
  }
});

// Execute order
app.post('/api/jupiter/execute-order', validateExecuteOrderRequest, async (req, res) => {
  try {
    const { signedTransaction } = req.body;

    const result = await jupiterService.executeOrder(new Uint8Array(signedTransaction));
    res.json(result);
  } catch (error) {
    console.error('Execute order error:', error);
    res.status(500).json({ error: 'Failed to execute order' });
  }
});

// Get user orders
app.get('/api/orders/user/:walletAddress', validateWalletAddressParam, async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const orders = await jupiterService.getUserOrders(walletAddress);
    res.json(orders);
  } catch (error) {
    console.error('User orders error:', error);
    res.status(500).json({ error: 'Failed to fetch user orders' });
  }
});

// Craft send transaction
app.post('/api/jupiter/craft-send', validateCraftSendRequest, async (req, res) => {
  try {
    const { inviteCode, sender, recipient, tokenMint, amount } = req.body;

    const sendData = {
      inviteCode,
      sender,
      recipient,
      tokenMint,
      amount
    };

    const transaction = await jupiterService.craftSendTransaction(sendData);
    res.json({ transaction });
  } catch (error) {
    console.error('Craft send error:', error);
    res.status(500).json({ error: 'Failed to craft send transaction' });
  }
});

// Send raw transaction
app.post('/api/transaction/send', validateTransactionRequest, async (req, res) => {
  try {
    const { signedTransaction } = req.body;

    const signature = await jupiterService.sendRawTransaction(new Uint8Array(signedTransaction));
    res.json({ signature });
  } catch (error) {
    console.error('Transaction send error:', error);
    res.status(500).json({ error: 'Failed to send transaction' });
  }
});

// Get transaction status
app.get('/api/transaction/status/:signature', validateSignatureParam, async (req, res) => {
  try {
    const { signature } = req.params;
    const status = await jupiterService.monitorTransaction(signature);
    res.json(status);
  } catch (error) {
    console.error('Transaction status error:', error);
    res.status(500).json({ error: 'Failed to fetch transaction status' });
  }
});

// ===== EXECUTION MONITORING ENDPOINTS =====

// Start monitoring an order
app.post('/api/monitoring/start', validateMonitoringStartRequest, async (req, res) => {
  try {
    const { orderId, maker, orderData } = req.body;

    await executionMonitoringService.startMonitoring(orderId, maker, orderData);
    res.json({ success: true, orderId, message: 'Monitoring started' });
  } catch (error) {
    console.error('Start monitoring error:', error);
    res.status(500).json({ error: 'Failed to start monitoring' });
  }
});

// Stop monitoring an order
app.post('/api/monitoring/stop', validateMonitoringStopRequest, async (req, res) => {
  try {
    const { orderId } = req.body;

    executionMonitoringService.stopMonitoring(orderId);
    res.json({ success: true, orderId, message: 'Monitoring stopped' });
  } catch (error) {
    console.error('Stop monitoring error:', error);
    res.status(500).json({ error: 'Failed to stop monitoring' });
  }
});

// Get monitoring status for an order
app.get('/api/monitoring/status/:orderId', validateOrderIdParam, async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = executionMonitoringService.getOrder(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found in monitoring' });
    }

    res.json(order);
  } catch (error) {
    console.error('Monitoring status error:', error);
    res.status(500).json({ error: 'Failed to fetch monitoring status' });
  }
});

// Get all active orders being monitored
app.get('/api/monitoring/active-orders', validateActiveOrdersQuery, async (req, res) => {
  try {
    const { walletAddress } = req.query;
    let activeOrders = executionMonitoringService.getActiveOrders();

    // Filter by wallet address if provided
    if (walletAddress) {
      activeOrders = activeOrders.filter(order => order.maker === walletAddress);
    }

    res.json(activeOrders);
  } catch (error) {
    console.error('Active orders error:', error);
    res.status(500).json({ error: 'Failed to fetch active orders' });
  }
});

// Get monitoring statistics
app.get('/api/monitoring/statistics', async (req, res) => {
  try {
    const stats = executionMonitoringService.getStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Clean up old orders
app.post('/api/monitoring/cleanup', validateCleanupRequest, async (req, res) => {
  try {
    const { olderThanDays = 7 } = req.body;
    const cleanedCount = executionMonitoringService.cleanupOldOrders(olderThanDays);
    res.json({ success: true, cleanedCount, message: `Cleaned up ${cleanedCount} old orders` });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Failed to cleanup old orders' });
  }
});


// ===== TRIGGER ORDER ENDPOINTS (Updated) =====

// Create trigger order with monitoring
app.post('/api/jupiter/trigger-order', validateTriggerOrderRequest, async (req, res) => {
  try {
    const {
      inputMint,
      outputMint,
      makingAmount,
      takingAmount,
      maker,
      expiry,
      orderType = 'buy',
      targetPrice
    } = req.body;

    // Create the trigger order
    const orderData = {
      inputMint,
      outputMint,
      makingAmount,
      takingAmount,
      maker,
      expiry: expiry ? Math.floor(new Date(expiry).getTime() / 1000) : undefined,
      computeUnitPrice: "100000",
      slippageBps: 50
    };

    const orderResponse = await jupiterService.createTriggerOrder(orderData);

    // Start monitoring the order
    const orderId = orderResponse.orderId || orderResponse.requestId;
    if (orderId) {
      await executionMonitoringService.startMonitoring(orderId, maker, {
        ...orderData,
        orderType,
        targetPrice,
        createdAt: new Date()
      });
    }

    res.json({
      ...orderResponse,
      monitoring: orderId ? 'started' : 'failed',
      orderId
    });
  } catch (error) {
    console.error('Create trigger order error:', error);
    res.status(500).json({ error: 'Failed to create trigger order' });
  }
});

// Get trigger order status
app.get('/api/jupiter/trigger-order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const status = await jupiterService.getTriggerOrderStatus(orderId);
    res.json(status);
  } catch (error) {
    console.error('Get trigger order status error:', error);
    res.status(500).json({ error: 'Failed to fetch trigger order status' });
  }
});

// Get user's trigger orders
app.get('/api/jupiter/trigger-orders/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const orders = await jupiterService.getTriggerOrders(walletAddress);
    res.json(orders);
  } catch (error) {
    console.error('Get trigger orders error:', error);
    res.status(500).json({ error: 'Failed to fetch trigger orders' });
  }
});

// Execute trigger order
app.post('/api/jupiter/execute-trigger/:orderId', validateTriggerOrderActionRequest, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { maker } = req.body;

    const result = await jupiterService.executeTriggerOrder(orderId, maker);
    res.json(result);
  } catch (error) {
    console.error('Execute trigger order error:', error);
    res.status(500).json({ error: 'Failed to execute trigger order' });
  }
});

// Cancel trigger order
app.post('/api/jupiter/cancel-trigger/:orderId', validateTriggerOrderActionRequest, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { maker } = req.body;

    const result = await jupiterService.cancelTriggerOrder(orderId, maker);

    // Stop monitoring this order
    executionMonitoringService.stopMonitoring(orderId);

    res.json(result);
  } catch (error) {
    console.error('Cancel trigger order error:', error);
    res.status(500).json({ error: 'Failed to cancel trigger order' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});


// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const httpServer = server.listen(PORT, () => {
  console.log(`xStocksFun backend running on port ${PORT}`);
  console.log(`WebSocket server enabled`);
  console.log(`Helius RPC: ${process.env.HELIUS_RPC_URL}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');

  httpServer.close(() => {
    console.log('HTTP server closed');

    // Shutdown monitoring service
    executionMonitoringService.shutdown();

    console.log('Backend shutdown complete');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');

  httpServer.close(() => {
    console.log('HTTP server closed');

    // Shutdown monitoring service
    executionMonitoringService.shutdown();

    console.log('Backend shutdown complete');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);

  // Graceful shutdown on critical errors
  httpServer.close(() => {
    executionMonitoringService.shutdown();
    process.exit(1);
  });
});