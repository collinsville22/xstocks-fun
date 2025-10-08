export interface Token {
  symbol: string;
  name: string;
  mint: string;
  logo: string;
  decimals: number;
}

export interface QuoteResponse {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct: string;
  slippageBps: number;
}

export interface SwapResponse {
  transaction: string;
  lastValidBlockHeight: number;
  prioritizationFeeLamports: number;
}

export interface TriggerOrder {
  inputMint: string;
  outputMint: string;
  makingAmount: string;   // EXACT amount you're giving (in base units)
  takingAmount: string;   // EXACT amount you're getting (in base units)
  maker: string;
  expiry?: number;
  executionType: 'automatic' | 'manual';
}

export interface OrderResponse {
  transaction?: string;
  swapTransaction?: string;
  orderId?: string;
  requestId?: string;
  expiredAt?: string;
  status?: 'pending' | 'executed' | 'cancelled' | 'expired';
}

export interface TriggerOrderData {
  orderId: string;
  inputMint: string;
  outputMint: string;
  makingAmount: string;
  takingAmount: string;
  maker: string;
  status: 'pending' | 'executed' | 'cancelled' | 'expired';
  createdAt: number;
  expiredAt?: number;
  executedAt?: number;
}


export interface TransactionStatus {
  signature: string;
  status: 'pending' | 'confirmed' | 'failed';
  slot?: number;
  timestamp?: number;
  error?: string;
}

export interface WalletBalance {
  mint: string;
  amount: number;
  uiAmount: number;
}

export interface TradeState {
  fromToken: Token | null;
  toToken: Token | null;
  fromAmount: string;
  toAmount: string;
  loading: boolean;
  error: string | null;
  quote: QuoteResponse | null;
}

export interface LimitOrderState {
  inputToken: Token | null;
  outputToken: Token | null;
  amount: string;
  targetPrice: string;
  expiry: string;
  loading: boolean;
  error: string | null;
}

