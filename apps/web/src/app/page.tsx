'use client';

import React from 'react';
import { Container, Stack } from '@xstocks/ui';
import { SwapInterface } from '../components/SwapInterface';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Container size="lg" className="py-8">
        <Stack spacing="xl" align="center">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
              <span className="text-blue-600">xStocks</span>
              <span className="text-green-600">.fun</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Buy real tokenized stocks with USDC on Solana. 
              Start investing with as little as $1.
            </p>
          </div>

          {/* Main Interface */}
          <SwapInterface />

          {/* Features Grid */}
          <div className="w-full max-w-4xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                Available xStocks
              </h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { symbol: 'AAPL', name: 'Apple', icon: '🍎' },
                { symbol: 'GOOGL', name: 'Google', icon: '🔍' },
                { symbol: 'MSFT', name: 'Microsoft', icon: '🪟' },
                { symbol: 'NVDA', name: 'NVIDIA', icon: '🚀' },
                { symbol: 'TSLA', name: 'Tesla', icon: '⚡' },
                { symbol: 'AMZN', name: 'Amazon', icon: '📦' },
                { symbol: 'META', name: 'Meta', icon: '📘' },
                { symbol: 'COIN', name: 'Coinbase', icon: '₿' },
              ].map((stock) => (
                <div 
                  key={stock.symbol}
                  className="bg-white rounded-lg p-4 text-center shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="text-2xl mb-1">{stock.icon}</div>
                  <div className="font-semibold text-sm">{stock.symbol}</div>
                  <div className="text-xs text-gray-600">{stock.name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div className="w-full max-w-2xl text-center">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              How It Works
            </h3>
            <div className="grid md:grid-cols-3 gap-6 text-sm">
              <div className="p-4">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                  1
                </div>
                <p className="text-gray-600">
                  Connect your Solana wallet and ensure you have USDC
                </p>
              </div>
              <div className="p-4">
                <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                  2
                </div>
                <p className="text-gray-600">
                  Choose your amount and select the xStock you want to buy
                </p>
              </div>
              <div className="p-4">
                <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                  3
                </div>
                <p className="text-gray-600">
                  Execute the swap and start building your portfolio
                </p>
              </div>
            </div>
          </div>
        </Stack>
      </Container>
    </main>
  );
}