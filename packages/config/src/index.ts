import { XStock } from '@xstocks/types';

// Network configuration
export const NETWORK_CONFIG = {
  MAINNET: 'https://api.mainnet-beta.solana.com',
  DEVNET: 'https://api.devnet.solana.com',
  TESTNET: 'https://api.testnet.solana.com',
} as const;

// Jupiter API configuration
export const JUPITER_CONFIG = {
  QUOTE_API: 'https://quote-api.jup.ag/v6/quote',
  SWAP_API: 'https://quote-api.jup.ag/v6/swap',
  DEFAULT_SLIPPAGE: 100, // 1%
} as const;

// Token addresses (real backed.fi xStocks)
export const TOKEN_ADDRESSES = {
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  XSTOCKS: {
    AAPL: 'XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp',
    GOOGL: 'XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN', 
    MSFT: 'XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX',
    NVDA: 'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh',
    TSLA: 'XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB',
    AMZN: 'Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg',
    META: 'Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu',
    COIN: 'Xs7ZdzSHLU9ftNJsii5fCeJhoRWSC32SQGzGQtePxNu',
  }
} as const;

// Available xStocks with metadata
export const AVAILABLE_XSTOCKS: Record<string, XStock> = {
  AAPL: {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    mintAddress: TOKEN_ADDRESSES.XSTOCKS.AAPL,
    icon: '🍎'
  },
  GOOGL: {
    symbol: 'GOOGL', 
    name: 'Alphabet Inc.',
    mintAddress: TOKEN_ADDRESSES.XSTOCKS.GOOGL,
    icon: '🔍'
  },
  MSFT: {
    symbol: 'MSFT',
    name: 'Microsoft Corp.',
    mintAddress: TOKEN_ADDRESSES.XSTOCKS.MSFT,
    icon: '🪟'
  },
  NVDA: {
    symbol: 'NVDA',
    name: 'NVIDIA Corp.',
    mintAddress: TOKEN_ADDRESSES.XSTOCKS.NVDA,
    icon: '🚀'
  },
  TSLA: {
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    mintAddress: TOKEN_ADDRESSES.XSTOCKS.TSLA,
    icon: '⚡'
  },
  AMZN: {
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    mintAddress: TOKEN_ADDRESSES.XSTOCKS.AMZN,
    icon: '📦'
  },
  META: {
    symbol: 'META',
    name: 'Meta Platforms Inc.',
    mintAddress: TOKEN_ADDRESSES.XSTOCKS.META,
    icon: '📘'
  },
  COIN: {
    symbol: 'COIN',
    name: 'Coinbase Global Inc.',
    mintAddress: TOKEN_ADDRESSES.XSTOCKS.COIN,
    icon: '₿'
  }
} as const;