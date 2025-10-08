/**
 * Backend Configuration Constants
 * Centralized configuration for magic numbers and constants
 */

// Server Configuration
export const SERVER = {
  PORT: process.env.PORT || 3008,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  SHUTDOWN_TIMEOUT_MS: 5000
};

// Rate Limiting
export const RATE_LIMITS = {
  GENERAL: {
    WINDOW_MS: 60000, // 1 minute
    MAX_REQUESTS: 100
  },
  TRADING: {
    WINDOW_MS: 60000, // 1 minute
    MAX_REQUESTS: 30 // More restrictive for trading operations
  },
  QUOTES: {
    WINDOW_MS: 60000, // 1 minute
    MAX_REQUESTS: 60
  }
};

// Timeouts
export const TIMEOUTS = {
  DEFAULT_REQUEST_MS: 30000, // 30 seconds
  CONNECTION_MS: 10000, // 10 seconds
  TRANSACTION_CONFIRMATION_MS: 60000 // 1 minute for blockchain confirmations
};

// Slippage Configuration
export const SLIPPAGE = {
  DEFAULT_BPS: 50, // 0.5%
  MIN_BPS: 0,
  MAX_BPS: 10000 // 100%
};

// Order Configuration
export const ORDERS = {
  DEFAULT_CLEANUP_DAYS: 7,
  MAX_CLEANUP_DAYS: 90
};

// Response Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500
};

// Error Messages
export const ERRORS = {
  VALIDATION: 'Validation Error',
  RATE_LIMIT: 'Too Many Requests',
  NOT_FOUND: 'Resource not found',
  INTERNAL: 'Internal Server Error'
};
