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

export interface LimitOrder {
  inputMint: string;
  outputMint: string;
  amount: string;
  targetPrice: number;
  maker: string;
  expiry?: number;
}

export interface OrderResponse {
  transaction: string;
  requestId: string;
  expiredAt?: string;
}

export interface SendTransaction {
  inviteCode: string;
  sender: string;
  recipient: string;
  tokenMint: string;
  amount: number;
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

export interface TradeInterfaceProps {
  onSwap?: (data: any) => void;
  onLimitOrder?: (data: any) => void;
  onSend?: (data: any) => void;
}

export interface PriceData {
  mint: string;
  price: number;
  change24h: number;
  volume24h: number;
}