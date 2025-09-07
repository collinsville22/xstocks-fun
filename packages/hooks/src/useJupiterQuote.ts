import { useEffect, useCallback } from 'react';
import { useSwapStore } from '@xstocks/stores';
import { JUPITER_CONFIG, TOKEN_ADDRESSES, AVAILABLE_XSTOCKS } from '@xstocks/config';
import { SwapQuote } from '@xstocks/types';

export const useJupiterQuote = () => {
  const {
    inputAmount,
    selectedStock,
    setQuote,
    setQuoteLoading,
    setError,
    clearError,
  } = useSwapStore();

  const fetchQuote = useCallback(async (amount: string, stock: string) => {
    if (!amount || parseFloat(amount) <= 0) {
      setQuote(null);
      return;
    }

    const stockConfig = AVAILABLE_XSTOCKS[stock];
    if (!stockConfig) {
      setError({
        hasError: true,
        message: 'Selected stock not found',
        code: 'STOCK_NOT_FOUND',
      });
      return;
    }

    setQuoteLoading(true);
    clearError();

    try {
      // Convert USDC amount to lamports (6 decimals)
      const inputAmountLamports = Math.floor(parseFloat(amount) * 1_000_000);
      
      const url = new URL(JUPITER_CONFIG.QUOTE_API);
      url.searchParams.set('inputMint', TOKEN_ADDRESSES.USDC);
      url.searchParams.set('outputMint', stockConfig.mintAddress);
      url.searchParams.set('amount', inputAmountLamports.toString());
      url.searchParams.set('slippageBps', JUPITER_CONFIG.DEFAULT_SLIPPAGE.toString());

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Quote API failed: ${response.status}`);
      }

      const data = await response.json();
      
      const quote: SwapQuote = {
        inputMint: TOKEN_ADDRESSES.USDC,
        outputMint: stockConfig.mintAddress,
        inputAmount: inputAmountLamports,
        outputAmount: parseInt(data.outAmount),
        slippageBps: JUPITER_CONFIG.DEFAULT_SLIPPAGE,
        platformFee: data.platformFee?.amount ? parseInt(data.platformFee.amount) : undefined,
        swapFee: data.swapFee?.amount ? parseInt(data.swapFee.amount) : undefined,
      };

      setQuote(quote);
    } catch (error) {
      console.error('Quote fetch failed:', error);
      setError({
        hasError: true,
        message: error instanceof Error ? error.message : 'Failed to fetch quote',
        code: 'QUOTE_FAILED',
      });
      setQuote(null);
    } finally {
      setQuoteLoading(false);
    }
  }, [setQuote, setQuoteLoading, setError, clearError]);

  // Auto-fetch quote when inputs change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchQuote(inputAmount, selectedStock);
    }, 500); // Debounce

    return () => clearTimeout(timeoutId);
  }, [inputAmount, selectedStock, fetchQuote]);

  return {
    fetchQuote: () => fetchQuote(inputAmount, selectedStock),
  };
};