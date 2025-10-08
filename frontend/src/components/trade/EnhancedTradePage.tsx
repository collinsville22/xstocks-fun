import React from 'react';
import { SwapInterface } from './SwapInterface';
import { LowBalancePrompt } from './LowBalancePrompt';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { defaultWalletConfig } from '../../lib/walletConfig';
import { Token } from '../../types';

interface EnhancedTradePageProps {
  tokens: Token[];
  onBuyClick?: () => void;
}

export const EnhancedTradePage: React.FC<EnhancedTradePageProps> = ({ tokens, onBuyClick }) => {
  // Check for preselected buy token from Stock Analysis
  const preselectedToken = typeof window !== 'undefined' ? sessionStorage.getItem('preselectedBuyToken') : null;
 console.log('[SEARCH] EnhancedTradePage - Preselected token from sessionStorage:', preselectedToken);

  // Clear the preselected token after reading it
  if (preselectedToken && typeof window !== 'undefined') {
    sessionStorage.removeItem('preselectedBuyToken');
 console.log(' Cleared preselectedBuyToken from sessionStorage');
  }

  // Extract base tokens
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
      logo: 'https://coin-images.coingecko.com/coins/images/325/large/Tether.png',
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
          <div className="min-h-screen relative">
            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-3 sm:px-3 lg:px-3 py-2.5 relative z-10">

              {/* Trading Interface */}
              <div className="bg-playful-cream border-4 border-black rounded-[32px] shadow-2xl overflow-hidden mb-3">
                {/* Header */}
                <div className="border-b-4 border-black bg-white/80 py-2.5 px-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-playful-green rounded-2xl border-2 border-black flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-xs font-display font-bold text-[#2C2C2C]">Instant Swap</h2>
                        <p className="text-xs text-[#5C5C5C]">Trade tokenized stocks instantly</p>
                      </div>
                    </div>
                    <WalletMultiButton className="bg-playful-green hover:bg-playful-orange text-white border-2 border-black px-3 py-2 rounded-2xl font-display font-semibold transition-all duration-200 shadow-lg hover:shadow-2xl" />
                  </div>
                </div>

                {/* Swap Interface */}
                <div className="p-3">
                  <SwapInterface
                    baseTokens={baseTokens}
                    xstocks={tokens}
                    onSwapComplete={handleSwapComplete}
                    preselectedBuyToken={preselectedToken || undefined}
                  />
                </div>
              </div>

              {/* Low Balance Prompt */}
              {onBuyClick && (
                <LowBalancePrompt onBuyClick={onBuyClick} />
              )}
            </main>

            {/* Footer */}
            <footer className="mt-16 pb-8">
              <div className="max-w-7xl mx-auto px-3 sm:px-3 lg:px-3 pt-8">
                <div className="text-center text-xs text-[#5C5C5C] font-body">
                  <p>Trading powered by Jupiter & Raydium • Backed Finance tokenized stocks</p>
                </div>
              </div>
            </footer>
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};