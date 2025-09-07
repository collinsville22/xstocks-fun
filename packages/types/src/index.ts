// Core trading types
export interface XStock {
  symbol: string;
  name: string;
  mintAddress: string;
  icon?: string;
  price?: number;
  change24h?: number;
}

export interface SwapQuote {
  inputMint: string;
  outputMint: string;
  inputAmount: number;
  outputAmount: number;
  slippageBps: number;
  platformFee?: number;
  swapFee?: number;
}

export interface SwapTransaction {
  transaction: string;
  signature?: string;
  status: 'pending' | 'confirmed' | 'failed';
}

// Wallet types
export interface WalletBalance {
  mint: string;
  amount: number;
  decimals: number;
  uiAmount: number;
}

// UI State types
export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  code?: string;
}

// Constants
export const TOKENS = {
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
} as const;

export const XSTOCKS: Record<string, XStock> = {
  AAPL: {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    mintAddress: 'XsAppleTokenMintAddress123',
    icon: '🍎'
  },
  GOOGL: {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    mintAddress: 'XsGoogleTokenMintAddress456', 
    icon: '🔍'
  },
  MSFT: {
    symbol: 'MSFT',
    name: 'Microsoft Corp.',
    mintAddress: 'XsMicrosoftTokenMintAddress789',
    icon: '🪟'
  },
  NVDA: {
    symbol: 'NVDA',
    name: 'NVIDIA Corp.',
    mintAddress: 'XsNvidiaTokenMintAddress012',
    icon: '🚀'
  }
} as const;