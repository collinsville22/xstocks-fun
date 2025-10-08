/**
 * Jupiter API Configuration
 *
 * Centralized configuration for Jupiter integration
 * Last Updated: 2025-01-05
 */

export const jupiterConfig = {
  // API Endpoints (Using Ultra API for instant swaps)
  endpoints: {
    ultraApi: process.env.NEXT_PUBLIC_JUPITER_ULTRA_API || 'https://lite-api.jup.ag/ultra/v1',
    priceApi: process.env.NEXT_PUBLIC_JUPITER_PRICE_API || 'https://api.jup.ag/price/v2'
  },

  // Default Trading Parameters
  defaults: {
    slippageBps: parseInt(process.env.NEXT_PUBLIC_DEFAULT_SLIPPAGE_BPS || '50'), // 0.5%
    priorityFeeLamports: null, // Auto-calculate (set to number to override)
    confirmationTimeout: 60000, // 60 seconds
    confirmationPollInterval: 1000 // 1 second
  },

  // Slippage Presets (in basis points)
  slippagePresets: [
    { label: '0.1%', value: 10 },
    { label: '0.5%', value: 50 },
    { label: '1%', value: 100 },
    { label: '3%', value: 300 },
    { label: '5%', value: 500 }
  ],

  // Known Token Mints
  knownTokens: {
    SOL: 'So11111111111111111111111111111111111111112',
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
  },

  // Rate Limiting
  rateLimit: {
    minRequestInterval: 100 // 100ms between requests
  }
};
