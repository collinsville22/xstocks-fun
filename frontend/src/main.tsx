// Buffer polyfill for browser compatibility
import { Buffer } from 'buffer';
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
}

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
// Import Solana wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { EnhancedTradePage } from './components/trade/EnhancedTradePage';
import { BridgePage } from './components/bridge/BridgePage';
import IntelPage from './components/Intel/IntelPage';
import { PortfolioPage } from './components/portfolio/PortfolioPage';
import { BuyPage } from './components/buy/BuyPage';
import { LearnPage } from './components/learn/LearnPage';
import { MobileWalletHelper } from './components/wallet/MobileWalletHelper';
import { Token } from './types';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { defaultWalletConfig } from './lib/walletConfig';
import ErrorBoundary from './components/ErrorBoundary';
import { API, validateEnvironment } from './config/env';

interface XStockData {
  [key: string]: {
    symbol: string;
    name: string;
    sector: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    xstockSymbol: string;
    lastUpdate: string | number;
  };
}

interface ApiResponse {
  [key: string]: any;
}


const App: React.FC = () => {
  const [intelTokens, setIntelTokens] = useState<XStockData | null>(null);
  const [tradeTokens, setTradeTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Remember page during session (resets to 'trade' when browser closes)
  const [activePage, setActivePage] = useState<'intel' | 'trade' | 'portfolio' | 'bridge' | 'buy' | 'learn'>(() => {
    const savedPage = sessionStorage.getItem('xstocks_active_page');
    // Type-safe validation instead of 'as any'
    const validPages: Array<'intel' | 'trade' | 'portfolio' | 'bridge' | 'buy' | 'learn'> = ['intel', 'trade', 'portfolio', 'bridge', 'buy', 'learn'];
    return (savedPage && validPages.includes(savedPage as any)) ? savedPage as typeof validPages[number] : 'trade';
  });

  // Save active page to sessionStorage whenever it changes (cleared when browser closes)
  useEffect(() => {
    sessionStorage.setItem('xstocks_active_page', activePage);
  }, [activePage]);

  useEffect(() => {
    // Validate environment on mount
    validateEnvironment();

    // Load both Intel data and token data
    const fetchData = async () => {
      try {
        setLoading(true);

        // PERFORMANCE FIX: Use lightweight realtime/batch endpoint (80-120MB vs 700-900MB)
        // First load tokens.json to get all xStock symbols
        const tokensResponse = await fetch('/tokens.json');

        if (!tokensResponse.ok) {
          throw new Error('Failed to load tokens');
        }

        const tokensData = await tokensResponse.json();
        setTradeTokens(tokensData.xstocks);

        // Get all xStock symbols for batch request
        const allSymbols = tokensData.xstocks.map((token: Token) => token.symbol);

        // Load Intel data using lightweight realtime batch endpoint
        const intelResponse = await fetch(API.intel.realtimeBatch(allSymbols));

        if (intelResponse.ok) {
          const batchData = await intelResponse.json();

          // Transform array response to object format expected by Intel page
          const intelData: XStockData = {};
          batchData.forEach((stock: any) => {
            intelData[stock.symbol] = {
              symbol: stock.symbol,
              name: stock.name || stock.symbol,
              sector: stock.sector || 'Unknown',
              price: stock.price || 0,
              change: stock.change || 0,
              changePercent: stock.changePercent || 0,
              volume: stock.volume || 0,
              xstockSymbol: stock.symbol,
              lastUpdate: stock.timestamp || Date.now()
            };
          });

          setIntelTokens(intelData);
        }

        setError(null);
      } catch (error) {
 console.error('Error loading data:', error);
        setError('Failed to load data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Refresh Intel data every 5 minutes using lightweight endpoint
    const interval = setInterval(async () => {
      try {
        const tokensResponse = await fetch('/tokens.json');
        if (!tokensResponse.ok) return;

        const tokensData = await tokensResponse.json();
        const allSymbols = tokensData.xstocks.map((token: Token) => token.symbol);

        const response = await fetch(API.intel.realtimeBatch(allSymbols));
        if (response.ok) {
          const batchData = await response.json();

          // Transform array to object format
          const intelData: XStockData = {};
          batchData.forEach((stock: any) => {
            intelData[stock.symbol] = {
              symbol: stock.symbol,
              name: stock.name || stock.symbol,
              sector: stock.sector || 'Unknown',
              price: stock.price || 0,
              change: stock.change || 0,
              changePercent: stock.changePercent || 0,
              volume: stock.volume || 0,
              xstockSymbol: stock.symbol,
              lastUpdate: stock.timestamp || Date.now()
            };
          });

          setIntelTokens(intelData);
        }
      } catch (error) {
 console.error('Error refreshing Intel data:', error);
      }
    }, 5 * 60 * 1000);

    // Listen for navigation events from child components (e.g., Buy button from Stock Analysis)
    const handleNavigateToTrade = (event: any) => {
 console.log('[DOWNLOAD] Received navigateToTrade event');
 console.log('Navigate to trade with token:', event.detail?.token);
      setActivePage('trade');
 console.log('[SUCCESS] Changed activePage to trade');
    };

    window.addEventListener('navigateToTrade', handleNavigateToTrade);
 console.log('[SUCCESS] Event listener registered for navigateToTrade');

    return () => {
      clearInterval(interval);
      window.removeEventListener('navigateToTrade', handleNavigateToTrade);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3 bg-white/90 border-4 border-black rounded-[32px] p-3 shadow-2xl">
          <div className="w-14 h-14 border-4 border-playful-green border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-[#2C2C2C] text-xs font-display font-semibold">Loading xStocksFun...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-dark-primary">
        <div className="glass-card p-3 max-w-md text-center space-y-3">
          <div className="w-14 h-14 bg-danger-500/10 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-danger-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="text-neutral-100 text-xs font-medium">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary px-3 py-2"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!intelTokens) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-primary">
        <div className="glass-card p-3 text-center">
          <div className="text-neutral-300 text-xs">No stock data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="App min-h-screen">
      {/* Trugly-Style Header - Responsive */}
      <div className="sticky top-0 z-50 pt-3 px-3">
        {/* Main Header Card */}
        <div className="bg-white border-4 border-black rounded-[32px] shadow-2xl mb-3">
          <div className="px-4 py-3 md:px-3 md:py-2.5">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-3 md:gap-10">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden border-3 border-black shadow-xl bg-white">
                  <img
                    src="/logo.png"
                    alt="xStocksFun"
                    className="w-full h-full object-contain scale-110"
                  />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-base md:text-sm font-display font-extrabold text-[#1a1a1a] leading-tight">xStocksFun</h1>
                  <p className="text-sm md:text-sm text-[#4a4a4a] font-body font-semibold">Trade tokenized stocks on Solana</p>
                </div>
              </div>

              {/* Desktop Navigation - Hidden on mobile */}
              <div className="hidden lg:flex items-center gap-2">
                <button
                  onClick={() => setActivePage('trade')}
                  className={`px-4 py-3 rounded-full font-display font-bold text-base transition-all duration-200 border-3 ${
                    activePage === 'trade'
                      ? 'bg-black text-white border-black shadow-lg'
                      : 'bg-white text-[#1a1a1a] border-black hover:bg-gray-50'
                  }`}
                >
                  Swap
                </button>
                <button
                  onClick={() => setActivePage('intel')}
                  className={`px-4 py-3 rounded-full font-display font-bold text-base transition-all duration-200 border-3 ${
                    activePage === 'intel'
                      ? 'bg-black text-white border-black shadow-lg'
                      : 'bg-white text-[#1a1a1a] border-black hover:bg-gray-50'
                  }`}
                >
                  Intel
                </button>
                <button
                  onClick={() => setActivePage('portfolio')}
                  className={`px-4 py-3 rounded-full font-display font-bold text-base transition-all duration-200 border-3 ${
                    activePage === 'portfolio'
                      ? 'bg-black text-white border-black shadow-lg'
                      : 'bg-white text-[#1a1a1a] border-black hover:bg-gray-50'
                  }`}
                >
                  Portfolio
                </button>
                <button
                  onClick={() => setActivePage('buy')}
                  className={`px-4 py-3 rounded-full font-display font-bold text-base transition-all duration-200 border-3 ${
                    activePage === 'buy'
                      ? 'bg-black text-white border-black shadow-lg'
                      : 'bg-white text-[#1a1a1a] border-black hover:bg-gray-50'
                  }`}
                >
                  Buy
                </button>
                <button
                  onClick={() => setActivePage('bridge')}
                  className={`px-4 py-3 rounded-full font-display font-bold text-base transition-all duration-200 border-3 ${
                    activePage === 'bridge'
                      ? 'bg-black text-white border-black shadow-lg'
                      : 'bg-white text-[#1a1a1a] border-black hover:bg-gray-50'
                  }`}
                >
                  Bridge
                </button>
                <button
                  onClick={() => setActivePage('learn')}
                  className={`px-4 py-3 rounded-full font-display font-bold text-base transition-all duration-200 border-3 ${
                    activePage === 'learn'
                      ? 'bg-black text-white border-black shadow-lg'
                      : 'bg-white text-[#1a1a1a] border-black hover:bg-gray-50'
                  }`}
                >
                  Learn
                </button>
                <WalletMultiButton className="!px-4 !py-3 !bg-playful-green !text-white !rounded-full !font-display !font-bold !text-base !border-3 !border-black !shadow-lg hover:!bg-playful-orange !transition-all !duration-200" />
              </div>

              {/* Mobile Menu Button & Wallet */}
              <div className="flex lg:hidden items-center gap-2">
                <WalletMultiButton className="!px-3 !py-2 !bg-playful-green !text-white !rounded-full !font-display !font-bold !text-sm !border-3 !border-black !shadow-lg hover:!bg-playful-orange !transition-all !duration-200" />
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-3 rounded-full bg-white border-3 border-black hover:bg-gray-50 transition-all duration-200"
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? (
                    <svg className="w-6 h-6 text-[#1a1a1a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-[#1a1a1a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Dropdown Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t-4 border-black bg-white/95 backdrop-blur-sm">
              <div className="px-4 py-3 space-y-2">
                <button
                  onClick={() => {
                    setActivePage('trade');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full px-5 py-4 rounded-2xl font-display font-bold text-base transition-all duration-200 border-3 text-left ${
                    activePage === 'trade'
                      ? 'bg-black text-white border-black shadow-lg'
                      : 'bg-white text-[#1a1a1a] border-black hover:bg-gray-50'
                  }`}
                >
                  Swap
                </button>
                <button
                  onClick={() => {
                    setActivePage('intel');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full px-5 py-4 rounded-2xl font-display font-bold text-base transition-all duration-200 border-3 text-left ${
                    activePage === 'intel'
                      ? 'bg-black text-white border-black shadow-lg'
                      : 'bg-white text-[#1a1a1a] border-black hover:bg-gray-50'
                  }`}
                >
                  Intel
                </button>
                <button
                  onClick={() => {
                    setActivePage('portfolio');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full px-5 py-4 rounded-2xl font-display font-bold text-base transition-all duration-200 border-3 text-left ${
                    activePage === 'portfolio'
                      ? 'bg-black text-white border-black shadow-lg'
                      : 'bg-white text-[#1a1a1a] border-black hover:bg-gray-50'
                  }`}
                >
                  Portfolio
                </button>
                <button
                  onClick={() => {
                    setActivePage('buy');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full px-5 py-4 rounded-2xl font-display font-bold text-base transition-all duration-200 border-3 text-left ${
                    activePage === 'buy'
                      ? 'bg-black text-white border-black shadow-lg'
                      : 'bg-white text-[#1a1a1a] border-black hover:bg-gray-50'
                  }`}
                >
                  Buy
                </button>
                <button
                  onClick={() => {
                    setActivePage('bridge');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full px-5 py-4 rounded-2xl font-display font-bold text-base transition-all duration-200 border-3 text-left ${
                    activePage === 'bridge'
                      ? 'bg-black text-white border-black shadow-lg'
                      : 'bg-white text-[#1a1a1a] border-black hover:bg-gray-50'
                  }`}
                >
                  Bridge
                </button>
                <button
                  onClick={() => {
                    setActivePage('learn');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full px-5 py-4 rounded-2xl font-display font-bold text-base transition-all duration-200 border-3 text-left ${
                    activePage === 'learn'
                      ? 'bg-black text-white border-black shadow-lg'
                      : 'bg-white text-[#1a1a1a] border-black hover:bg-gray-50'
                  }`}
                >
                  Learn
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Page Content */}
      <div className="animate-fade-in">
        {activePage === 'intel' && <IntelPage tokens={intelTokens || {}} />}
        {activePage === 'trade' && <EnhancedTradePage tokens={tradeTokens} onBuyClick={() => setActivePage('buy')} />}
        {activePage === 'buy' && <BuyPage />}
        {activePage === 'portfolio' && <PortfolioPage tokens={tradeTokens} intelData={(intelTokens || {}) as XStockData} />}
        {activePage === 'bridge' && <BridgePage tokens={Object.values(intelTokens || {})} />}
        {activePage === 'learn' && <LearnPage />}
      </div>

      {/* Mobile Wallet Connection Helper */}
      <MobileWalletHelper />
    </div>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ConnectionProvider endpoint={defaultWalletConfig.endpoint}>
        <WalletProvider wallets={defaultWalletConfig.wallets} autoConnect={defaultWalletConfig.autoConnect}>
          <WalletModalProvider>
            <QueryClientProvider client={queryClient}>
              <App />
            </QueryClientProvider>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </ErrorBoundary>
  </React.StrictMode>
);