export class Token {
  constructor(symbol, name, mint, logo, decimals) {
    this.symbol = symbol;
    this.name = name;
    this.mint = mint;
    this.logo = logo;
    this.decimals = decimals;
  }
}

export class QuoteResponse {
  constructor(inputMint, outputMint, inAmount, outAmount, priceImpactPct, slippageBps) {
    this.inputMint = inputMint;
    this.outputMint = outputMint;
    this.inAmount = inAmount;
    this.outAmount = outAmount;
    this.priceImpactPct = priceImpactPct;
    this.slippageBps = slippageBps;
  }
}

export class SwapResponse {
  constructor(transaction, lastValidBlockHeight, prioritizationFeeLamports) {
    this.transaction = transaction;
    this.lastValidBlockHeight = lastValidBlockHeight;
    this.prioritizationFeeLamports = prioritizationFeeLamports;
  }
}

export class LimitOrder {
  constructor(inputMint, outputMint, amount, targetPrice, maker, expiry) {
    this.inputMint = inputMint;
    this.outputMint = outputMint;
    this.amount = amount;
    this.targetPrice = targetPrice;
    this.maker = maker;
    this.expiry = expiry;
  }
}

export class OrderResponse {
  constructor(transaction, requestId, expiredAt) {
    this.transaction = transaction;
    this.requestId = requestId;
    this.expiredAt = expiredAt;
  }
}


export class TransactionStatus {
  constructor(signature, status, slot, timestamp, error) {
    this.signature = signature;
    this.status = status;
    this.slot = slot;
    this.timestamp = timestamp;
    this.error = error;
  }
}

export class WalletBalance {
  constructor(mint, amount, uiAmount) {
    this.mint = mint;
    this.amount = amount;
    this.uiAmount = uiAmount;
  }
}

export class TradeInterfaceProps {
  constructor(onSwap, onLimitOrder) {
    this.onSwap = onSwap;
    this.onLimitOrder = onLimitOrder;
  }
}

export class PriceData {
  constructor(mint, price, change24h, volume24h) {
    this.mint = mint;
    this.price = price;
    this.change24h = change24h;
    this.volume24h = volume24h;
  }
}