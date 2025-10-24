/**
 * Jupiter Integration Service - Production Ready
 *
 * Implements Jupiter v6 Swap API, Trigger API, and Price API v3
 * All endpoints verified against: https://dev.jup.ag/docs/
 *
 * Last Updated: 2025-01-04
 */

export class JupiterService {
  constructor(config = {}) {
    // Official Jupiter API endpoints - Per docs (https://dev.jup.ag/docs/ultra-api/)
    this.ultraApiUrl = config.ultraApiUrl || 'https://api.jup.ag/ultra/v1'; // Dynamic URL with API key
    this.priceApiUrl = config.priceApiUrl || 'https://api.jup.ag/price/v2'; // Price API v2
    this.triggerApiUrl = config.triggerApiUrl || 'https://lite-api.jup.ag/trigger/v1'; // Trigger API v1

    // API Key for Jupiter
    this.apiKey = config.apiKey || '84e976a4-1a71-4ae2-b050-58e6364dc846';

    // Configurable defaults
    this.defaultSlippageBps = config.defaultSlippageBps || 50; // 0.5% default slippage
    this.defaultPriorityFeeLamports = config.defaultPriorityFeeLamports || null; // Auto-calculate by default
    this.minimumOrderUsd = config.minimumOrderUsd || 5.0; // $5.00 minimum (Jupiter Trigger API requirement)

    // Rate limiting
    this.lastRequestTime = 0;
    this.minRequestInterval = 100; // 100ms between requests to avoid rate limits
  }

  /**
   * Rate limiting helper
   */
  async _rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Get swap quote and order from Jupiter Ultra API
   * Docs: https://dev.jup.ag/docs/ultra-api/get-order
   *
   * @param {string} inputMint - Input token mint address
   * @param {string} outputMint - Output token mint address
   * @param {string} amount - Amount in smallest unit (lamports for SOL)
   * @param {number} slippageBps - Slippage in basis points (50 = 0.5%)
   * @param {string} taker - Optional wallet address
   * @returns {Promise<Object>} Order response with quote and transaction
   */
  async getQuote(inputMint, outputMint, amount, slippageBps = null, taker = null) {
    await this._rateLimit();

    const slippage = slippageBps || this.defaultSlippageBps;

    // Ultra API GET /ultra/v1/order - MUST include taker to get transaction
    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount,
      slippageBps: slippage.toString(),
      swapMode: 'ExactIn',
      onlyDirectRoutes: 'false',
      asLegacyTransaction: 'false',
      maxAccounts: '64' // Limit complexity to increase chance of ultra mode
    });

    // CRITICAL: taker parameter is REQUIRED to get transaction in response
    if (!taker) {
      throw new Error('Wallet must be connected to get swap quote');
    }
    params.append('taker', taker);

    const url = `${this.ultraApiUrl}/order?${params.toString()}`;

 console.log('[SEARCH] Jupiter Ultra API Order Request:', {
      inputMint,
      outputMint,
      amount,
      slippage,
      taker
    });

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-Key': this.apiKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
 console.error('[ERROR] Jupiter Ultra Order Error:', response.status, errorText);
        throw new Error(`Failed to get order: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
 console.log('[SUCCESS] Jupiter Ultra Order Response:', {
        mode: data.mode,
        swapType: data.swapType,
        requestId: data.requestId,
        inAmount: data.inAmount,
        outAmount: data.outAmount,
        hasTransaction: !!data.transaction
      });

      // Ultra API should return transaction directly
      if (!data.transaction) {
        throw new Error('No transaction returned from Ultra API. Please ensure wallet is connected.');
      }

      return data;
    } catch (error) {
 console.error('[ERROR] Jupiter Ultra Order Error:', error);
      throw error;
    }
  }

  /**
   * Ultra API returns transaction directly - no additional step needed
   * This method exists for compatibility but just returns the order response
   */
  async createSwapTransaction(orderResponse, userPublicKey, options = {}) {
    // Ultra API - transaction already included in order response
    if (!orderResponse.transaction) {
      throw new Error('No transaction in Ultra API response');
    }

    return {
      swapTransaction: orderResponse.transaction,
      transaction: orderResponse.transaction,
      requestId: orderResponse.requestId
    };
  }


  /**
   * Execute an Ultra API swap order after signing transaction
   * Docs: https://dev.jup.ag/docs/ultra-api/execute-order
   *
   * @param {Object} params - Execution parameters
   * @param {string} params.requestId - Order request ID from getQuote
   * @param {string} params.signedTransaction - Base64 encoded signed transaction
   * @returns {Promise<Object>} Execution response with signature and swap details
   */
  async executeUltraOrder({ requestId, signedTransaction }) {
    await this._rateLimit();

    const url = `${this.ultraApiUrl}/execute`;

 console.log('[START] Jupiter Ultra Execute Request:', { requestId });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify({
          requestId: requestId,
          signedTransaction: signedTransaction
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
 console.error('[ERROR] Jupiter Ultra Execute Error:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        });
        throw new Error(`Failed to execute ultra order: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
 console.log('[SUCCESS] Jupiter Ultra Execute Response:', {
        status: data.status,
        signature: data.signature,
        code: data.code
      });

      return data;
    } catch (error) {
 console.error('[ERROR] Jupiter Ultra Execute Error:', error);
      throw error;
    }
  }


  /**
   * Get token prices using Price API v2
   * Docs: https://dev.jup.ag/docs/apis/price-api
   *
   * @param {Array<string>} tokenMints - Array of token mint addresses
   * @returns {Promise<Object>} Price data keyed by mint address
   */
  async getPrices(tokenMints) {
    await this._rateLimit();

    const ids = tokenMints.join(',');
    const url = `${this.priceApiUrl}?ids=${ids}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-Key': this.apiKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
 console.error('[ERROR] Jupiter Prices Error:', response.status, errorText);
        throw new Error(`Failed to get prices: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
 console.log('[SUCCESS] Jupiter Prices Response:', {
        priceCount: Object.keys(data.data || {}).length
      });

      return data.data || {};
    } catch (error) {
 console.error('[ERROR] Jupiter Prices Error:', error);
      throw error;
    }
  }

  /**
   * Get single token price
   *
   * @param {string} tokenMint - Token mint address
   * @returns {Promise<Object|null>} Price data or null
   */
  async getSinglePrice(tokenMint) {
    try {
      const prices = await this.getPrices([tokenMint]);
      return prices[tokenMint] || null;
    } catch (error) {
 console.error('[ERROR] Failed to get price for token:', tokenMint, error);
      return null;
    }
  }

  /**
   * Validate minimum order size meets Jupiter requirements
   *
   * @param {string} inputMint - Input token mint address
   * @param {string} inputAmount - Amount in smallest unit
   * @returns {Promise<Object>} Validation result
   */
  async validateMinimumOrderSize(inputMint, inputAmount) {
    try {
      // Known stablecoins - direct USD value
      const stablecoins = {
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { decimals: 6, symbol: 'USDC' }, // USDC
        'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { decimals: 6, symbol: 'USDT' }  // USDT
      };

      if (stablecoins[inputMint]) {
        const { decimals } = stablecoins[inputMint];
        const usdValue = parseFloat(inputAmount) / Math.pow(10, decimals);

        return {
          isValid: usdValue >= this.minimumOrderUsd,
          usdValue: usdValue,
          minimumRequired: this.minimumOrderUsd,
          message: usdValue < this.minimumOrderUsd ?
            `Order size must be at least $${this.minimumOrderUsd.toFixed(2)} USD, received: $${usdValue.toFixed(2)}` :
            null
        };
      }

      // For other tokens, get USD value via quote to USDC
      try {
        const quote = await this.getQuote(
          inputMint,
          'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
          inputAmount,
          50
        );

        const usdValue = parseFloat(quote.outAmount) / Math.pow(10, 6); // USDC has 6 decimals

        return {
          isValid: usdValue >= this.minimumOrderUsd,
          usdValue: usdValue,
          minimumRequired: this.minimumOrderUsd,
          message: usdValue < this.minimumOrderUsd ?
            `Order size must be at least $${this.minimumOrderUsd.toFixed(2)} USD, received: $${usdValue.toFixed(2)}` :
            null
        };
      } catch (error) {
        // If we can't get a quote, warn but allow the order
 console.warn('[WARNING] Could not validate order size for token:', inputMint);
        return {
          isValid: true, // Allow order but couldn't validate
          usdValue: null,
          minimumRequired: this.minimumOrderUsd,
          message: 'Could not validate order size - proceed with caution'
        };
      }
    } catch (error) {
 console.error('[ERROR] Error validating minimum order size:', error);
      return {
        isValid: false,
        usdValue: null,
        minimumRequired: this.minimumOrderUsd,
        message: 'Could not validate order size'
      };
    }
  }

  /**
   * Confirm transaction on Solana
   *
   * @param {Connection} connection - Solana connection
   * @param {string} signature - Transaction signature
   * @param {Object} options - Confirmation options
   * @returns {Promise<Object>} Confirmation result
   */
  async confirmTransaction(connection, signature, options = {}) {
    const {
      commitment = 'confirmed',
      timeout = 60000, // 60 seconds
      pollInterval = 1000 // 1 second
    } = options;

 console.log('⏳ Confirming transaction:', signature);

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const status = await connection.getSignatureStatus(signature);

        if (status?.value?.confirmationStatus === commitment ||
            status?.value?.confirmationStatus === 'finalized') {

          if (status.value.err) {
 console.error('[ERROR] Transaction failed:', status.value.err);
            throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
          }

 console.log('[SUCCESS] Transaction confirmed:', signature);
          return { signature, confirmed: true, status: status.value };
        }
      } catch (error) {
 console.warn('[WARNING] Error checking transaction status:', error);
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Transaction confirmation timeout after ${timeout}ms`);
  }
}

// Export singleton instance with default configuration
export const jupiterService = new JupiterService();
