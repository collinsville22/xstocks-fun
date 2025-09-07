'use client';

import React from 'react';
import { Card, Stack, Button, TokenSelector, AmountInput } from '@xstocks/ui';
import { useSwapStore } from '@xstocks/stores';
import { useJupiterQuote } from '@xstocks/hooks';
import { AVAILABLE_XSTOCKS } from '@xstocks/config';

export const SwapInterface: React.FC = () => {
  const {
    inputAmount,
    selectedStock,
    quote,
    quoteLoading,
    transactionLoading,
    error,
    setInputAmount,
    setSelectedStock,
  } = useSwapStore();

  const { fetchQuote } = useJupiterQuote();

  const handleSwap = async () => {
    if (!quote) {
      await fetchQuote();
      return;
    }

    // TODO: Implement actual swap execution
    console.log('Executing swap with quote:', quote);
  };

  const isValidAmount = inputAmount && parseFloat(inputAmount) > 0;
  const canSwap = isValidAmount && quote && !transactionLoading;

  return (
    <Card className="w-full max-w-md mx-auto">
      <Stack spacing="lg">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Buy Real xStocks
          </h2>
          <p className="text-gray-600 text-sm">
            Swap USDC for tokenized stocks on Solana
          </p>
        </div>

        <Stack spacing="md">
          <AmountInput
            label="Amount"
            value={inputAmount}
            onChange={setInputAmount}
            currency="USDC"
            placeholder="0.00"
            error={error.hasError ? error.message : undefined}
            min={1}
          />

          <TokenSelector
            label="Select xStock"
            value={selectedStock}
            onChange={setSelectedStock}
            tokens={AVAILABLE_XSTOCKS}
          />

          {quote && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>You'll receive:</span>
                  <span className="font-medium">
                    ~{(quote.outputAmount / 1_000_000).toFixed(6)} {selectedStock}
                  </span>
                </div>
                {quote.platformFee && (
                  <div className="flex justify-between">
                    <span>Platform fee:</span>
                    <span>${(quote.platformFee / 1_000_000).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <Button
            onClick={handleSwap}
            disabled={!canSwap}
            loading={quoteLoading || transactionLoading}
            fullWidth
            size="lg"
          >
            {transactionLoading 
              ? 'Swapping...' 
              : quote 
                ? `Buy ${selectedStock}` 
                : 'Get Quote'
            }
          </Button>

          <p className="text-xs text-gray-500 text-center">
            Powered by Jupiter DEX • Connect wallet to continue
          </p>
        </Stack>
      </Stack>
    </Card>
  );
};