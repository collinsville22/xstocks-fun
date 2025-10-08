/**
 * Raydium Trade API Integration
 *
 * Used specifically for xStocks swaps that Jupiter Ultra API can't handle
 * Docs: https://docs.raydium.io/raydium/traders/trade-api
 */

export class RaydiumService {
  constructor(config = {}) {
    this.apiUrl = config.apiUrl || 'https://transaction-v1.raydium.io';
    this.defaultSlippageBps = config.defaultSlippageBps || 50; // 0.5%

    // Rate limiting
    this.lastRequestTime = 0;
    this.minRequestInterval = 100; // 100ms between requests
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
   * Get swap quote from Raydium
   *
   * @param {string} inputMint - Input token mint address
   * @param {string} outputMint - Output token mint address
   * @param {string} amount - Amount in smallest unit (lamports for SOL)
   * @param {number} slippageBps - Slippage in basis points (50 = 0.5%)
   * @returns {Promise<Object>} Quote response
   */
  async getQuote(inputMint, outputMint, amount, slippageBps = null, txVersion = 'V0') {
    await this._rateLimit();

    const slippage = slippageBps || this.defaultSlippageBps;

    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount,
      slippageBps: slippage.toString(),
      txVersion: txVersion
    });

    const url = `${this.apiUrl}/compute/swap-base-in?${params.toString()}`;

 console.log('[SEARCH] Raydium Quote Request:', {
      inputMint,
      outputMint,
      amount,
      slippage
    });

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
 console.error('[ERROR] Raydium Quote Error:', response.status, errorText);
        throw new Error(`Failed to get Raydium quote: ${response.statusText}`);
      }

      const data = await response.json();

 console.log('[SUCCESS] Raydium Quote Response:', {
        success: data.success,
        hasData: !!data.data,
        inputAmount: data.data?.inputAmount,
        outputAmount: data.data?.outputAmount,
        fullResponse: data // Log full response to see error details
      });

      if (!data.success || !data.data) {
        const errorMsg = data.msg || data.error || 'Invalid quote response from Raydium';
 console.error('[ERROR] Raydium API Error:', errorMsg);
        throw new Error(errorMsg);
      }

      return data;
    } catch (error) {
 console.error('[ERROR] Raydium Quote Error:', error);
      throw error;
    }
  }

  /**
   * Get swap transaction from Raydium
   *
   * @param {Object} quoteResponse - Quote response from getQuote()
   * @param {string} walletPublicKey - User's wallet public key
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Transaction response
   */
  async getSwapTransaction(quoteResponse, walletPublicKey, options = {}) {
    await this._rateLimit();

    const requestBody = {
      computeUnitPriceMicroLamports: String(options.priorityFee || 100000), // MUST be a string!
      swapResponse: quoteResponse, // Pass the whole quote response, not just data
      txVersion: options.txVersion || 'V0',
      wallet: walletPublicKey,
      wrapSol: options.wrapSol !== undefined ? options.wrapSol : true,
      unwrapSol: options.unwrapSol !== undefined ? options.unwrapSol : true
    };

    // Only add token accounts if provided (don't send undefined)
    if (options.inputAccount !== undefined && options.inputAccount !== null) {
      requestBody.inputAccount = options.inputAccount;
    }
    if (options.outputAccount !== undefined && options.outputAccount !== null) {
      requestBody.outputAccount = options.outputAccount;
    }

 console.log('[INFO] Raydium Transaction Request:', {
      wallet: walletPublicKey,
      txVersion: requestBody.txVersion,
      wrapSol: requestBody.wrapSol,
      unwrapSol: requestBody.unwrapSol,
      fullRequestBody: requestBody // Log full request to debug
    });

    try {
      const response = await fetch(`${this.apiUrl}/transaction/swap-base-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
 console.error('[ERROR] Raydium Transaction Error:', response.status, errorText);
        throw new Error(`Failed to get Raydium transaction: ${response.statusText}`);
      }

      const data = await response.json();

 console.log('[SUCCESS] Raydium Transaction Response:', {
        success: data.success,
        hasTransaction: !!data.data,
        dataKeys: data.data ? Object.keys(data.data) : [],
        fullResponse: data // Log full response to see error details
      });

      if (!data.success || !data.data) {
        const errorMsg = data.msg || data.error || 'Invalid transaction response from Raydium';
 console.error('[ERROR] Raydium Transaction API Error:', errorMsg, data);
        throw new Error(errorMsg);
      }

      return data;
    } catch (error) {
 console.error('[ERROR] Raydium Transaction Error:', error);
      throw error;
    }
  }

  /**
   * Complete swap flow: quote + transaction
   *
   * @param {string} inputMint - Input token mint address
   * @param {string} outputMint - Output token mint address
   * @param {string} amount - Amount in smallest unit
   * @param {string} walletPublicKey - User's wallet public key
   * @param {number} slippageBps - Slippage in basis points
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Transaction ready to sign
   */
  async prepareSwap(inputMint, outputMint, amount, walletPublicKey, slippageBps = null, options = {}) {
 console.log('[PROCESSING] Raydium Swap Flow Starting...');

    // Step 1: Get quote
    const quoteResponse = await this.getQuote(inputMint, outputMint, amount, slippageBps);

    // Step 2: Get transaction
    const transactionResponse = await this.getSwapTransaction(quoteResponse, walletPublicKey, options);

 console.log('[SUCCESS] Raydium Swap Ready');

    return {
      quote: quoteResponse.data,
      transaction: transactionResponse.data,
      inputAmount: quoteResponse.data.inputAmount,
      outputAmount: quoteResponse.data.outputAmount,
      priceImpactPct: quoteResponse.data.priceImpactPct || '0'
    };
  }
}

// Create singleton instance
export const raydiumService = new RaydiumService();
