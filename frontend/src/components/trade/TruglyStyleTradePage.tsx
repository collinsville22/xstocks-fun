import React, { useState } from 'react';
import { SwapInterface } from './SwapInterface';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { defaultWalletConfig } from '../../lib/walletConfig';
import { Token } from '../../types';
import { LandscapeBackground } from '../shared/LandscapeBackground';

interface TruglyStyleTradePageProps {
  tokens: Token[];
}

export const TruglyStyleTradePage: React.FC<TruglyStyleTradePageProps> = ({ tokens }) => {
  const baseTokens = [
    {
      symbol: 'SOL',
      name: 'Solana',
      mint: 'So11111111111111111111111111111111111111112',
      logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
      decimals: 9
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
      decimals: 6
    },
    {
      symbol: 'USDT',
      name: 'USDt',
      mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png',
      decimals: 6
    }
  ];

  const handleSwapComplete = (signature: string) => {
    console.log('Swap completed:', signature);
  };

  return (
    <ConnectionProvider endpoint={defaultWalletConfig.endpoint}>
      <WalletProvider wallets={defaultWalletConfig.wallets} autoConnect={defaultWalletConfig.autoConnect}>
        <WalletModalProvider>
          <div className="min-h-screen relative overflow-hidden">
            {/* Sky-to-Green Gradient Background */}
            <div className="fixed inset-0 bg-gradient-to-b from-[#87CEEB] via-[#A8D5BA] to-[#7EC850] -z-10" />

            {/* Landscape Background */}
            <LandscapeBackground />

            {/* Bear Mascot */}
            <div className="fixed left-8 top-1/3 -translate-y-1/2 z-10 hidden lg:block">
              <img src="/images/bear-mascot.svg" alt="xStocks Bear" className="w-48 h-64" />
            </div>

            {/* Main Content */}
            <main className="relative z-20 max-w-4xl mx-auto px-3 sm:px-3 lg:px-3 py-2.5">
              {/* Header */}
              <div className="text-center mb-3">
                <h1 className="text-xs font-bold font-display text-[#2C2C2C] mb-2">
                  Swap Responsibly
                </h1>
                <p className="text-xs text-[#3C3C3C] font-body">
                  Trade tokenized stocks instantly on Solana
                </p>
              </div>

              {/* Swap Card - Trugly Style */}
              <div className="bg-playful-cream border-4 border-black rounded-[32px] p-3 shadow-2xl mb-3 relative">
                {/* Dotted border decoration */}
                <div className="absolute inset-0 border-2 border-dashed border-black/20 rounded-[32px] m-2 pointer-events-none" />

                <SwapInterface
                  baseTokens={baseTokens}
                  xstocks={tokens}
                  onSwapComplete={handleSwapComplete}
                />

                {/* Powered By Footer */}
                <div className="mt-3 pt-6 border-t-2 border-dashed border-black/20 text-center">
                  <p className="text-xs font-body text-[#5C5C5C]">
                    Powered by Uniswap V4
                  </p>
                </div>
              </div>

              {/* Info Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-3">
                {/* Marketcap */}
                <div className="bg-white border-4 border-black rounded-2xl p-3 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 bg-playful-orange rounded-full flex items-center justify-center border-2 border-black">
                    <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-xs font-body text-[#5C5C5C] mb-1">Marketcap</div>
                  <div className="text-xs font-bold font-display text-[#2C2C2C]">$134.4M</div>
                </div>

                {/* Holders */}
                <div className="bg-white border-4 border-black rounded-2xl p-3 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 bg-playful-green rounded-full flex items-center justify-center border-2 border-black">
                    <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                  </div>
                  <div className="text-xs font-body text-[#5C5C5C] mb-1">Holders</div>
                  <div className="text-xs font-bold font-display text-[#2C2C2C]">134.4M</div>
                </div>

                {/* 24H Volume */}
                <div className="bg-white border-4 border-black rounded-2xl p-3 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 bg-[#FFD700] rounded-full flex items-center justify-center border-2 border-black">
                    <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-xs font-body text-[#5C5C5C] mb-1">24H Vol</div>
                  <div className="text-xs font-bold font-display text-[#2C2C2C]">$134.4M</div>
                </div>
              </div>
            </main>
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
