import React, { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { Token, QuoteResponse, SwapResponse } from '../../types';
// Wallet service removed - using wallet adapter directly
import { jupiterService } from '../../lib/jupiter.js';
import { raydiumService } from '../../lib/raydium.js';
import { TokenSelector } from './TokenSelector';
import { useTokenBalances } from '../../hooks/useTokenBalances';
import { useTokenPrices } from '../../hooks/useTokenPrices';
import { TokenInfoPanel } from './TokenInfoPanel';

interface SwapInterfaceProps {
  baseTokens: Token[];
  xstocks: Token[];
  onSwapComplete?: (signature: string) => void;
  preselectedBuyToken?: string;
}

export const SwapInterface: React.FC<SwapInterfaceProps> = ({ baseTokens, xstocks, onSwapComplete, preselectedBuyToken }) => {
  const { connected, publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');

  // Find the preselected token if provided
 console.log('[DEBUG] SwapInterface - Preselected buy token:', preselectedBuyToken);
  const initialToToken = preselectedBuyToken
    ? xstocks.find(t => t.symbol === preselectedBuyToken) || null
    : null;
 console.log('[DEBUG] SwapInterface - Initial toToken:', initialToToken?.symbol || 'null');

  const [state, setState] = useState({
    fromToken: null as Token | null,
    toToken: initialToToken as Token | null,
    fromAmount: '',
    toAmount: '',
    loading: false,
    error: null as string | null,
    success: null as string | null,
    quote: null as QuoteResponse | null
  });

  // Get all tokens for balance/price fetching
  const allTokens = [...baseTokens, ...xstocks];
  const { balances } = useTokenBalances(allTokens);
  const { prices } = useTokenPrices(allTokens);

  const updateState = useCallback((updates: Partial<typeof state>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Helper to check if token is an xStock (needs Raydium)
  const isXStock = useCallback((token: Token | null) => {
    if (!token) return false;
    return xstocks.some(xs => xs.mint === token.mint);
  }, [xstocks]);

  // Handle preselected buy token from Stock Analysis
  useEffect(() => {
    if (preselectedBuyToken && xstocks.length > 0) {
      const selectedToken = xstocks.find(t => t.symbol === preselectedBuyToken);
      if (selectedToken) {
 console.log('[SUCCESS] Setting preselected token in SwapInterface:', selectedToken.symbol);
        setState(prev => ({
          ...prev,
          toToken: selectedToken,
          fromToken: baseTokens.find(t => t.symbol === 'SOL') || null
        }));
      }
    }
  }, [preselectedBuyToken, xstocks, baseTokens]);

  useEffect(() => {
    // Reset form when trade type changes and set default tokens
    const defaultFromToken = tradeType === 'buy'
      ? baseTokens.find(t => t.symbol === 'SOL') || null
      : xstocks.find(t => t.symbol === 'AAPLx') || null;

    const defaultToToken = tradeType === 'buy'
      ? xstocks.find(t => t.symbol === 'AAPLx') || null
      : baseTokens.find(t => t.symbol === 'SOL') || null;

    setState({
      fromToken: defaultFromToken,
      toToken: defaultToToken,
      fromAmount: '',
      toAmount: '',
      loading: false,
      error: null,
      quote: null
    });
  }, [tradeType, baseTokens, xstocks]);

  const getAvailableFromTokens = useCallback(() => {
    return tradeType === 'buy' ? baseTokens : xstocks;
  }, [tradeType, baseTokens, xstocks]);

  const getAvailableToTokens = useCallback(() => {
    return tradeType === 'buy' ? xstocks : baseTokens;
  }, [tradeType, xstocks, baseTokens]);

  const handleFromTokenChange = useCallback((tokenSymbol: string) => {
    const token = getAvailableFromTokens().find(t => t.symbol === tokenSymbol);
    if (token) {
      updateState({
        fromToken: token,
        toAmount: '',
        quote: null,
        toToken: null // Reset to token when from token changes
      });
    }
  }, [getAvailableFromTokens, updateState]);

  const handleToTokenChange = useCallback((tokenSymbol: string) => {
    const token = getAvailableToTokens().find(t => t.symbol === tokenSymbol);
    if (token) {
      updateState({ toToken: token, toAmount: '', quote: null });
    }
  }, [getAvailableToTokens, updateState]);

  const handleFromAmountChange = useCallback((amount: string) => {
    updateState({ fromAmount: amount, toAmount: '', quote: null });
  }, [updateState]);

  const fetchQuote = useCallback(async (amount: string) => {
    if (!state.fromToken || !state.toToken) return;

    try {
      updateState({ loading: true, error: null });

      const rawAmount = parseFloat(amount);

      // Validation
      if (isNaN(rawAmount) || rawAmount <= 0) {
        updateState({ loading: false });
        return;
      }

      const adjustedAmount = Math.floor(rawAmount * Math.pow(10, state.fromToken.decimals)).toString();

      // Detect if we need to use Raydium for xStocks
      const needsRaydium = isXStock(state.fromToken) || isXStock(state.toToken);

 console.log('Quote Request Details:', {
        fromToken: state.fromToken,
        toToken: state.toToken,
        rawAmount,
        adjustedAmount,
        decimals: state.fromToken.decimals,
        walletConnected: !!publicKey,
        taker: publicKey?.toString(),
        useRaydium: needsRaydium
      });

      if (needsRaydium) {
        // Use Raydium for xStocks swaps
 console.log('[PROCESSING] Using Raydium for xStock swap');
        const raydiumQuote = await raydiumService.getQuote(
          state.fromToken.mint,
          state.toToken.mint,
          adjustedAmount,
          50 // 0.5% slippage
        );

        const toAmount = (parseInt(raydiumQuote.data.outputAmount) / Math.pow(10, state.toToken.decimals)).toFixed(6);

        updateState({
          quote: {
            ...raydiumQuote.data,
            outAmount: raydiumQuote.data.outputAmount,
            inAmount: raydiumQuote.data.inputAmount,
            priceImpactPct: raydiumQuote.data.priceImpactPct || '0',
            _isRaydium: true, // Flag to identify Raydium quote
            _raydiumQuoteResponse: raydiumQuote // Store the original response for transaction API
          } as any,
          toAmount,
          loading: false
        });
      } else {
        // Use Jupiter for regular swaps
 console.log('[PROCESSING] Using Jupiter Ultra API');
        const quote = await jupiterService.getQuote(
          state.fromToken.mint,
          state.toToken.mint,
          adjustedAmount,
          50, // 0.5% slippage
          publicKey?.toString() // Pass taker address for Ultra API - REQUIRED for transaction
        );

        const toAmount = (parseInt(quote.outAmount) / Math.pow(10, state.toToken.decimals)).toFixed(6);

        updateState({
          quote,
          toAmount,
          loading: false
        });
      }
    } catch (error) {
      updateState({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch quote'
      });
    }
  }, [state.fromToken, state.toToken, publicKey, updateState, isXStock]);

  // Debounced quote fetching - only fetch after user stops typing for 500ms
  useEffect(() => {
    if (!state.fromToken || !state.toToken || !state.fromAmount || isNaN(parseFloat(state.fromAmount))) {
      return;
    }

    const timer = setTimeout(() => {
      fetchQuote(state.fromAmount);
    }, 500);

    return () => clearTimeout(timer);
  }, [state.fromAmount, state.fromToken, state.toToken, fetchQuote]);

  const handleSwap = useCallback(async () => {
    if (!connected || !state.quote || !publicKey || !sendTransaction) {
      updateState({ error: 'Please connect your wallet first' });
      return;
    }

    try {
      updateState({ loading: true, error: null });

      const isRaydiumSwap = (state.quote as any)._isRaydium;

      if (isRaydiumSwap) {
        // Raydium swap flow
 console.log('[START] Using Raydium Trade API swap flow...');

        // Determine if we're using SOL
        const isInputSol = state.fromToken?.mint === 'So11111111111111111111111111111111111111112';
        const isOutputSol = state.toToken?.mint === 'So11111111111111111111111111111111111111112';

        // Get token accounts for non-SOL tokens
        let inputAccount = undefined;
        let outputAccount = undefined;

        if (!isInputSol) {
          // Get input token account
          const accounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
            mint: new PublicKey(state.fromToken!.mint)
          });
          if (accounts.value.length > 0) {
            inputAccount = accounts.value[0].pubkey.toBase58();
          }
        }

        if (!isOutputSol) {
          // Get output token account
          const accounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
            mint: new PublicKey(state.toToken!.mint)
          });
          if (accounts.value.length > 0) {
            outputAccount = accounts.value[0].pubkey.toBase58();
          }
        }

 console.log('Token accounts:', { isInputSol, isOutputSol, inputAccount, outputAccount });

        // Get transaction from Raydium using the original quote response
        const raydiumTx = await raydiumService.getSwapTransaction(
          (state.quote as any)._raydiumQuoteResponse,
          publicKey.toString(),
          {
            txVersion: 'V0',
            wrapSol: isInputSol,
            unwrapSol: isOutputSol,
            inputAccount,
            outputAccount
          }
        );

 console.log('[SUCCESS] Transaction received from Raydium API');
 console.log('Transaction data type:', typeof raydiumTx.data[0]);
 console.log('Transaction data:', raydiumTx.data[0]);

        // Deserialize transaction - Raydium returns array with transaction at index 0
        const txData = raydiumTx.data[0];
        const transactionBuffer = Buffer.from(txData.transaction || txData, 'base64');
        const transaction = VersionedTransaction.deserialize(transactionBuffer);
 console.log('[SUCCESS] Deserialized transaction');

 console.log('[INFO] Sending transaction to wallet for signature...');

        // Sign and send transaction
        const signature = await sendTransaction(transaction, connection);

 console.log('[SUCCESS] Transaction sent:', signature);

        updateState({
          success: `Swap successful! ${signature.slice(0, 8)}...${signature.slice(-8)}`,
          fromAmount: '',
          toAmount: '',
          quote: null,
          loading: false,
          error: null
        });

        if (onSwapComplete) {
          onSwapComplete(signature);
        }
      } else {
        // Jupiter Ultra API swap flow
 console.log('[START] Using Jupiter Ultra API swap flow...');

        // Ultra API returns transaction directly in order response
        const transactionData = state.quote.transaction;
        if (!transactionData) {
 console.error('[ERROR] No transaction in order response!', state.quote);
          throw new Error('No transaction in order response - wallet may not be connected');
        }

 console.log('[SUCCESS] Transaction received from Ultra API order');

        // Convert base64 transaction to buffer
        const transactionBuffer = Buffer.from(transactionData, 'base64');

        // Deserialize transaction (Ultra API uses VersionedTransaction)
        let transaction;
        try {
          transaction = VersionedTransaction.deserialize(transactionBuffer);
 console.log('[SUCCESS] Deserialized transaction');
        } catch (deserializeError) {
 console.error('[ERROR] Failed to deserialize transaction:', deserializeError);
          throw new Error('Failed to deserialize transaction');
        }

 console.log('[INFO] Sending transaction to wallet for signature...');

        // Sign and send transaction using wallet adapter
        const signature = await sendTransaction(transaction, connection);

 console.log('[SUCCESS] Transaction signed:', signature);

        // Execute via Ultra API
        updateState({
          success: `Executing swap on Jupiter...`,
          loading: true
        });

        try {
          const executeResponse = await jupiterService.executeUltraOrder({
            requestId: state.quote.requestId,
            signedTransaction: signature
          });

 console.log('[SUCCESS] Ultra API execute response:', executeResponse);

          if (executeResponse.status === 'Success') {
            if (onSwapComplete) {
              onSwapComplete(executeResponse.signature);
            }

            updateState({
              success: `Swap successful! ${executeResponse.signature.slice(0, 8)}...${executeResponse.signature.slice(-8)}`,
              fromAmount: '',
              toAmount: '',
              quote: null,
              loading: false,
              error: null
            });
          } else {
            throw new Error(`Swap failed: ${executeResponse.error || 'Unknown error'}`);
          }
        } catch (executeError) {
 console.error('[ERROR] Ultra API execute failed:', executeError);
          throw executeError;
        }
      }

      // Auto-clear success message after 10 seconds
      setTimeout(() => {
        updateState({ success: null });
      }, 10000);

    } catch (error) {
 console.error('Swap error:', error);
 console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
        logs: error.logs
      });

      let errorMessage = 'Swap failed';
      if (error.message.includes('insufficient')) {
        errorMessage = 'Insufficient funds for this transaction';
      } else if (error.message.includes('blockhash')) {
        errorMessage = 'Transaction expired, please try again';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error, please check your connection';
      } else if (error.message) {
        errorMessage = error.message;
      }

      updateState({
        loading: false,
        error: errorMessage
      });

      // Auto-clear error after 8 seconds
      setTimeout(() => {
        updateState({ error: null });
      }, 8000);
    }
  }, [connected, state.quote, publicKey, sendTransaction, connection, onSwapComplete, updateState]);

  const handleSwapDirection = useCallback(() => {
    // Toggle between buy and sell mode
    setTradeType(prev => prev === 'buy' ? 'sell' : 'buy');
  }, []);

  const handleHalf = useCallback(() => {
    if (!state.fromToken || !balances[state.fromToken.mint]) return;
    const halfAmount = (balances[state.fromToken.mint].uiAmount / 2).toString();
    updateState({ fromAmount: halfAmount, toAmount: '', quote: null });
  }, [state.fromToken, balances, updateState]);

  const handleMax = useCallback(() => {
    if (!state.fromToken || !balances[state.fromToken.mint]) return;
    const maxAmount = balances[state.fromToken.mint].uiAmount.toString();
    updateState({ fromAmount: maxAmount, toAmount: '', quote: null });
  }, [state.fromToken, balances, updateState]);

  const canSwap = useCallback(() => {
    return connected &&
           state.fromToken &&
           state.toToken &&
           state.fromAmount &&
           state.toAmount &&
           !state.loading &&
           state.quote !== null;
  }, [connected, state.fromToken, state.toToken, state.fromAmount, state.toAmount, state.loading, state.quote]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      {/* Left Column - Swap Interface */}
      <div className="space-y-3">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xs font-display font-semibold text-[#2C2C2C]">Swap</h3>

          {/* Trade Type Toggle */}
          <div className="flex bg-white/50 rounded-2xl p-1 gap-2.5 border-2 border-black/10">
            <button
              onClick={() => setTradeType('buy')}
              className={`px-3 py-2.5 rounded-2xl text-xs font-display font-semibold transition-all duration-200 border-2 ${
                tradeType === 'buy'
                  ? 'bg-playful-green text-white border-black shadow-lg'
                  : 'bg-white/80 text-[#5C5C5C] border-black/20 hover:bg-white'
              }`}
              aria-pressed={tradeType === 'buy'}
            >
              Buy xStocks
            </button>
            <button
              onClick={() => setTradeType('sell')}
              className={`px-3 py-2.5 rounded-2xl text-xs font-display font-semibold transition-all duration-200 border-2 ${
                tradeType === 'sell'
                  ? 'bg-red-500 text-white border-black shadow-lg'
                  : 'bg-white/80 text-[#5C5C5C] border-black/20 hover:bg-white'
              }`}
              aria-pressed={tradeType === 'sell'}
            >
              Sell xStocks
            </button>
          </div>
        </div>

        {state.error && (
          <div className="p-3 bg-red-50 border-2 border-red-500 text-red-700 rounded-2xl flex items-center animate-slide-up" role="alert">
            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-xs font-body">{state.error}</span>
          </div>
        )}

        {state.success && (
          <div className="p-3 bg-playful-green/10 border-2 border-playful-green text-playful-green rounded-2xl flex items-center animate-slide-up" role="status">
            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-body">{state.success}</span>
          </div>
        )}

        <div className="space-y-1">
        {/* From Token - Jupiter Style Card */}
        <div className="bg-white/90 border-2 border-black/20 rounded-2xl p-3 focus-within:bg-white focus-within:border-playful-green transition-all duration-200">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-medium text-[#5C5C5C] font-body">
              {tradeType === 'buy' ? 'You Pay' : 'You Sell'}
            </label>
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-[#7C7C7C] font-body">
                {state.fromToken && balances[state.fromToken.mint]
                  ? `${balances[state.fromToken.mint].uiAmount.toFixed(4)} ${state.fromToken.symbol}`
                  : '0.00'}
              </span>
              <button
                onClick={handleHalf}
                className="text-xs font-semibold text-[#5C5C5C] px-2 py-1 bg-white/50 rounded-lg border border-black/10 hover:bg-white transition-colors"
                type="button"
              >
                HALF
              </button>
              <button
                onClick={handleMax}
                className="text-xs font-semibold text-[#5C5C5C] px-2 py-1 bg-white/50 rounded-lg border border-black/10 hover:bg-white transition-colors"
                type="button"
              >
                MAX
              </button>
            </div>
          </div>
          <div className="flex items-center gap-10">
            <TokenSelector
              tokens={getAvailableFromTokens()}
              selectedToken={state.fromToken}
              onSelect={(token) => handleFromTokenChange(token.symbol)}
              label={tradeType === 'buy' ? 'Select token to pay with' : 'Select token to sell'}
              balances={balances}
              prices={prices}
            />
            <div className="flex-1 text-right">
              <input
                type="number"
                value={state.fromAmount}
                onChange={(e) => handleFromAmountChange(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent text-[#2C2C2C] text-xs font-display font-bold placeholder-[#ACACAC] focus:outline-none tabular-nums text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                disabled={!state.fromToken}
                aria-label="Amount to swap"
                step="any"
              />
              <div className="text-xs text-[#7C7C7C] font-body mt-1">
                ${state.fromToken && state.fromAmount && prices[state.fromToken.mint]
                  ? (parseFloat(state.fromAmount) * prices[state.fromToken.mint]).toFixed(2)
                  : '0'}
              </div>
            </div>
          </div>
        </div>

        {/* Swap Direction Icon */}
        <div className="flex justify-center -my-2 relative z-10">
          <button
            onClick={handleSwapDirection}
            className="w-10 h-10 bg-white border-2 border-black rounded-full flex items-center justify-center hover:bg-playful-orange hover:scale-110 transition-all duration-200 cursor-pointer group"
            aria-label="Swap token direction"
            type="button"
          >
            <svg className="w-5 h-5 text-[#2C2C2C] group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* To Token - Jupiter Style Card */}
        <div className="bg-white/90 border-2 border-black/20 rounded-2xl p-3 focus-within:bg-white focus-within:border-playful-green transition-all duration-200">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-medium text-[#5C5C5C] font-body">
              {tradeType === 'buy' ? 'You Receive' : 'You Get'}
            </label>
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-[#7C7C7C] font-body">
                {state.toToken && balances[state.toToken.mint]
                  ? `${balances[state.toToken.mint].uiAmount.toFixed(4)} ${state.toToken.symbol}`
                  : '0.00'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-10">
            <TokenSelector
              tokens={getAvailableToTokens()}
              selectedToken={state.toToken}
              onSelect={(token) => handleToTokenChange(token.symbol)}
              label={tradeType === 'buy' ? 'Select token to receive' : 'Select token to get'}
              balances={balances}
              prices={prices}
            />
            <div className="flex-1 text-right">
              <div className="text-[#2C2C2C] text-xs font-display font-bold tabular-nums">
                {state.loading ? (
                  <span className="text-[#ACACAC]">...</span>
                ) : (
                  state.toAmount || <span className="text-[#ACACAC]">0.00</span>
                )}
              </div>
              <div className="text-xs text-[#7C7C7C] font-body mt-1">
                ${state.toToken && state.toAmount && prices[state.toToken.mint]
                  ? (parseFloat(state.toAmount) * prices[state.toToken.mint]).toFixed(2)
                  : '0'}
              </div>
            </div>
          </div>
        </div>

        {/* Quote Info - Playful Design */}
        {state.quote && (
          <div className="bg-white/70 border-2 border-black/10 rounded-2xl p-3 animate-slide-up">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <span className="text-[#5C5C5C] font-body">Price Impact</span>
                <span className={`font-display font-semibold tabular-nums ${
                  parseFloat(state.quote.priceImpactPct) > 5
                    ? 'text-red-600'
                    : parseFloat(state.quote.priceImpactPct) > 1
                    ? 'text-playful-orange'
                    : 'text-playful-green'
                }`}>
                  {parseFloat(state.quote.priceImpactPct).toFixed(4)}%
                </span>
              </div>
              <div className="text-[#7C7C7C] font-body text-xs tabular-nums">
                1 {state.fromToken?.symbol} = {
                  (parseFloat(state.quote.outAmount) / parseFloat(state.quote.inAmount)).toFixed(6)
                } {state.toToken?.symbol}
              </div>
            </div>
          </div>
        )}

        {/* Swap Button - Playful CTA */}
        <button
          onClick={handleSwap}
          disabled={!canSwap()}
          className={`w-full py-2.5 px-3 rounded-2xl font-display font-semibold text-xs transition-all duration-200 ${
            canSwap()
              ? 'btn-primary'
              : 'bg-[#E5E5E5] text-[#ACACAC] cursor-not-allowed border-2 border-black/10'
          }`}
          aria-label={state.loading ? 'Swap in progress' : 'Execute swap'}
        >
          {state.loading ? (
            <div className="flex items-center justify-center gap-2.5">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Swapping...
            </div>
          ) : !connected ? (
            'Connect Wallet'
          ) : !state.fromToken || !state.toToken ? (
            'Select Tokens'
          ) : !state.fromAmount || !state.toAmount ? (
            'Enter Amount'
          ) : (
            <span className="flex items-center justify-center gap-2.5">
              Swap
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          )}
        </button>
        </div>
      </div>

      {/* Right Column - Token Info Panel */}
      <div>
        <TokenInfoPanel
          token={tradeType === 'buy' ? state.toToken : state.fromToken}
          currentPrice={
            tradeType === 'buy'
              ? (state.toToken ? prices[state.toToken.mint] : null)
              : (state.fromToken ? prices[state.fromToken.mint] : null)
          }
        />
      </div>
    </div>
  );
};