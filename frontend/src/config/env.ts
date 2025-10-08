/**
 * Environment Configuration
 * Centralized environment variable access for the frontend application
 *
 * IMPORTANT: All environment variables must be prefixed with VITE_ to be accessible in Vite
 *
 * For development, these will use localhost defaults
 * For production, set these in your .env file or deployment environment
 */

interface EnvironmentConfig {
  // API endpoints
  INTEL_API_URL: string;
  BACKEND_URL: string;
  WS_URL: string;

  // Feature flags
  IS_DEVELOPMENT: boolean;
  IS_PRODUCTION: boolean;
}

/**
 * Environment configuration object
 * Uses import.meta.env for Vite environment variables
 */
export const ENV: EnvironmentConfig = {
  // Intel Service API (Python yfinance service)
  INTEL_API_URL: import.meta.env.VITE_INTEL_API_URL || 'http://localhost:8002',

  // Backend API (Node.js Express server)
  BACKEND_URL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3008',

  // WebSocket URL (Socket.IO connection)
  WS_URL: import.meta.env.VITE_WS_URL || 'ws://localhost:3008',

  // Environment flags
  IS_DEVELOPMENT: import.meta.env.DEV,
  IS_PRODUCTION: import.meta.env.PROD,
} as const;

/**
 * Validate that all required environment variables are present
 * Called on application startup
 */
export function validateEnvironment(): void {
  const required = ['INTEL_API_URL', 'BACKEND_URL', 'WS_URL'] as const;

  const missing = required.filter(key => !ENV[key]);

  if (missing.length > 0) {
 console.warn(
      '⚠️ Missing environment configuration:',
      missing,
      '\nUsing default localhost URLs for development'
    );
  }

  if (ENV.IS_DEVELOPMENT) {
 console.log('[TOOL] Development Environment Configuration:', {
      INTEL_API_URL: ENV.INTEL_API_URL,
      BACKEND_URL: ENV.BACKEND_URL,
      WS_URL: ENV.WS_URL,
    });
  }
}

/**
 * Helper to construct API URLs
 */
export const API = {
  // Intel Service endpoints
  intel: {
    allXStocks: `${ENV.INTEL_API_URL}/api/intel/all-xstocks`,
    stockData: (symbol: string) => `${ENV.INTEL_API_URL}/api/intel/stock/${symbol}`,
    historical: (symbol: string) => `${ENV.INTEL_API_URL}/api/intel/historical/${symbol}`,
  },

  // Backend endpoints
  backend: {
    base: ENV.BACKEND_URL,
    tokens: `${ENV.BACKEND_URL}/api/tokens`,
    wallet: {
      balance: `${ENV.BACKEND_URL}/api/wallet/balance`,
    },
    jupiter: {
      quote: `${ENV.BACKEND_URL}/api/jupiter/quote`,
      swap: `${ENV.BACKEND_URL}/api/jupiter/swap`,
    },
    portfolio: {
      analyze: `${ENV.BACKEND_URL}/api/portfolio/analyze`,
    },
    orders: {
      limit: `${ENV.BACKEND_URL}/api/orders/limit`,
      user: `${ENV.BACKEND_URL}/api/orders/user`,
      cancel: (orderId: string) => `${ENV.BACKEND_URL}/api/orders/${orderId}`,
    },
  },

  // WebSocket connection
  websocket: ENV.WS_URL,
} as const;

export default ENV;
