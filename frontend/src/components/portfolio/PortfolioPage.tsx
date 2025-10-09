import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createWalletService, TokenBalance } from '../../lib/walletService';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart,
  BarChart3,
  Activity,
  DollarSign,
  Target,
  Shield,
  Zap,
  Clock,
  Globe,
  Coins,
  Gauge,
  Users,
  Signal,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  ExternalLink,
  Info,
  History
} from 'lucide-react';
import { Token, WalletBalance } from '../../types';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { TransactionHistory } from './TransactionHistory';
import { PortfolioOptimization } from './PortfolioOptimization';
import { PortfolioAPI } from '../../services/portfolioApi';

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

interface PortfolioPageProps {
  tokens: Token[];
  intelData: XStockData;
}

interface TokenHolding {
  token: Token;
  balance: number;
  usdValue: number;
  marketData: any;
  change24h: number;
  changePercent24h: number;
  weight: number;
}

interface PortfolioAnalytics {
  totalValue: number;
  totalChange24h: number;
  totalChangePercent24h: number;
  profitLoss: number;
  sharpeRatio: number;
  volatility: number;
  beta: number;
  maxDrawdown: number;
  diversificationScore: number;
  sectorAllocation: { [sector: string]: number };
  riskMetrics: {
    var95: number;
    var99: number;
    cvar95: number;
    maximumDrawdown: number;
    volOfVol: number;
    downside_deviation: number;
  };
}

// Internal component that uses wallet context
const PortfolioPageContent: React.FC<PortfolioPageProps> = ({ tokens, intelData }) => {
  // Wallet states - with error boundary
  let connected, publicKey, connecting, connection;

  try {
    const walletContext = useWallet();
    const connectionContext = useConnection();
    connected = walletContext.connected;
    publicKey = walletContext.publicKey;
    connecting = walletContext.connecting;
    connection = connectionContext.connection;
  } catch (error) {
 console.error('Error accessing wallet context:', error);
    // Fallback values
    connected = false;
    publicKey = null;
    connecting = false;
    connection = null;
  }

  // Portfolio states - ALL useState hooks must be at the top
  const [holdings, setHoldings] = useState<TokenHolding[]>([]);
  const [analytics, setAnalytics] = useState<PortfolioAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [solBalance, setSolBalance] = useState<number>(0);
  const [activeView, setActiveView] = useState<'overview' | 'holdings' | 'analytics' | 'allocation' | 'optimization' | 'history'>('overview');

  // Fetch real token balances using wallet service
  const fetchTokenBalances = useCallback(async () => {
    if (!connected || !publicKey) return;

    try {
      setLoading(true);
      setError(null);

      // Create wallet service instance
      const walletService = createWalletService(connection);
      const wallet = { connected, publicKey } as any;

      // Get wallet balances using wallet service
      const walletBalances = await walletService.fetchWalletBalances(wallet, tokens);

      // Update SOL balance
      setSolBalance(walletBalances.sol);

      const tokenHoldings: TokenHolding[] = [];

      // Process token balances
      for (const tokenBalance of walletBalances.tokens) {
        // Find matching token from our xStocks list
        const matchingToken = tokens.find(token => token.mint === tokenBalance.mint);

        if (matchingToken && tokenBalance.uiAmount > 0) {
          // Get market data for this token - with defensive programming
          const marketData = intelData && typeof intelData === 'object'
            ? Object.values(intelData).find(
                data => data && data.xstockSymbol === matchingToken.symbol
              )
            : null;

          if (marketData) {
            const usdValue = tokenBalance.uiAmount * marketData.price;

            tokenHoldings.push({
              token: matchingToken,
              balance: tokenBalance.uiAmount,
              usdValue,
              marketData,
              change24h: marketData.change,
              changePercent24h: marketData.changePercent,
              weight: 0 // Will be calculated after all holdings are gathered
            });
          }
        }
      }

      // Calculate portfolio weights
      const totalValue = tokenHoldings.reduce((sum, holding) => sum + holding.usdValue, 0);
      tokenHoldings.forEach(holding => {
        holding.weight = totalValue > 0 ? (holding.usdValue / totalValue) * 100 : 0;
      });

      setHoldings(tokenHoldings);
      calculatePortfolioAnalytics(tokenHoldings);

    } catch (error) {
 console.error('Error fetching token balances:', error);
      setError(`Failed to fetch portfolio data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [connected, publicKey, connection, tokens, intelData]);

  // Calculate basic portfolio analytics (REAL data only)
  const calculatePortfolioAnalytics = useCallback(async (holdings: TokenHolding[]) => {
    if (holdings.length === 0) {
      setAnalytics(null);
      return;
    }

    const totalValue = holdings.reduce((sum, holding) => sum + holding.usdValue, 0);
    const totalChange24h = holdings.reduce((sum, holding) => sum + (holding.usdValue * holding.changePercent24h / 100), 0);
    const totalChangePercent24h = totalValue > 0 ? (totalChange24h / totalValue) * 100 : 0;

    // Sector allocation - REAL calculation based on current holdings
    const sectorAllocation: { [sector: string]: number } = {};
    holdings.forEach(holding => {
      const sector = holding.marketData.sector || 'Unknown';
      sectorAllocation[sector] = (sectorAllocation[sector] || 0) + holding.weight;
    });

    // Diversification score based on sector allocation - REAL calculation
    const sectorValues = Object.values(sectorAllocation);
    const herfindahlIndex = sectorValues.reduce((sum, allocation) => sum + Math.pow(allocation / 100, 2), 0);
    const diversificationScore = Math.max(0, (1 - herfindahlIndex) * 100);

    // Set basic analytics first
    setAnalytics({
      totalValue,
      totalChange24h,
      totalChangePercent24h,
      profitLoss: totalChange24h,
      sharpeRatio: null,
      volatility: null,
      beta: null,
      maxDrawdown: null,
      diversificationScore,
      sectorAllocation,
      riskMetrics: {
        var95: null,
        var99: null,
        cvar95: null,
        maximumDrawdown: null,
        volOfVol: null,
        downside_deviation: null
      }
    });

    // Fetch REAL backend analytics if we have enough holdings
    if (holdings.length >= 2) {
      try {
 console.log('[DATA] Fetching backend portfolio analytics...');

        const symbols = holdings.map(h => h.token.symbol);
        const weights: { [key: string]: number } = {};
        holdings.forEach(h => {
          weights[h.token.symbol] = h.weight / 100; // Convert to decimal
        });

        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 1 year ago

        const backendMetrics = await PortfolioAPI.analyzePortfolio(
          symbols,
          startDate,
          endDate,
          weights,
          'SPY' // S&P 500 benchmark
        );

 console.log('[SUCCESS] Backend analytics received:', backendMetrics);

        // Update analytics with backend data
        setAnalytics(prev => ({
          ...prev!,
          sharpeRatio: backendMetrics.sharpeRatio,
          volatility: backendMetrics.volatility,
          beta: backendMetrics.beta,
          maxDrawdown: backendMetrics.maxDrawdown,
          riskMetrics: {
            var95: backendMetrics.var95,
            var99: backendMetrics.var99,
            cvar95: backendMetrics.cvar95,
            maximumDrawdown: backendMetrics.maxDrawdown,
            volOfVol: null, // Not yet implemented in backend
            downside_deviation: backendMetrics.downsideVolatility
          }
        }));

      } catch (error) {
 console.error('[ERROR] Failed to fetch backend analytics:', error);
        // Keep the basic analytics without backend metrics
      }
    }
  }, []);

  // Auto-refresh on wallet connection
  useEffect(() => {
    if (connected && publicKey) {
      fetchTokenBalances();
    } else {
      setHoldings([]);
      setAnalytics(null);
      setSolBalance(0);
    }
  }, [connected, publicKey, fetchTokenBalances]);

  // Manual refresh function
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTokenBalances();
    setRefreshing(false);
  }, [fetchTokenBalances]);

  // Memoized calculations for performance
  const topGainers = useMemo(() => {
    return holdings
      .filter(holding => holding.changePercent24h > 0)
      .sort((a, b) => b.changePercent24h - a.changePercent24h)
      .slice(0, 5);
  }, [holdings]);

  const topLosers = useMemo(() => {
    return holdings
      .filter(holding => holding.changePercent24h < 0)
      .sort((a, b) => a.changePercent24h - b.changePercent24h)
      .slice(0, 5);
  }, [holdings]);

  // Conditional rendering - AFTER all hooks are called
  if (!connected) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-3 py-2.5">
          <div className="text-center mb-3">
            <h1 className="text-xs md:text-xs font-bold font-display text-[#2C2C2C] mb-3">
              Portfolio
            </h1>
            <p className="text-xs text-[#3C3C3C] font-body max-w-2xl mx-auto">
              Real-time portfolio tracking with advanced analytics and risk management
            </p>
          </div>

          <div className="text-center">
            <div className="w-24 h-24 bg-white border-4 border-black rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Wallet className="w-12 h-12 text-playful-green" />
            </div>

            <h2 className="text-xs font-bold font-display text-[#2C2C2C] mb-3">Connect Your Wallet</h2>
            <p className="text-[#3C3C3C] font-body mb-3 max-w-md mx-auto">
              Connect any Solana wallet to view your real xStock portfolio, holdings, and advanced analytics
            </p>

            <WalletMultiButton className="bg-playful-green hover:bg-playful-orange text-white border-2 border-black px-3 py-2.5 rounded-2xl font-display font-semibold transition-all duration-200 shadow-lg hover:shadow-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (loading && holdings.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-white/90 border-4 border-black rounded-[32px] p-3 shadow-2xl">
          <div className="w-14 h-14 border-4 border-playful-green border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-[#2C2C2C] font-display font-semibold">Fetching your holdings from the blockchain...</p>
        </div>
      </div>
    );
  }

  const WalletConnectionComponent = () => (
    <div className="text-center py-16">
      <div>
        <div className="w-24 h-24 bg-gradient-to-br from-primary-500/20 to-primary-600/20 backdrop-blur-md border border-primary-500/30 rounded-full flex items-center justify-center mx-auto mb-3">
          <Wallet className="w-12 h-12 text-primary-400" />
        </div>

        <h2 className="text-xs font-bold font-display text-[#2C2C2C] mb-3">Connect Your Wallet</h2>
        <p className="text-[#5C5C5C] mb-3 max-w-md mx-auto">
          Connect any Solana wallet to view your real xStock portfolio, holdings, and advanced analytics
        </p>

        <WalletMultiButton className="bg-gradient-to-r from-primary-500/20 to-primary-600/20 backdrop-blur-md border border-primary-500/30 hover:from-primary-500/30 hover:to-primary-600/30 text-[#2C2C2C] px-3 py-2.5 rounded-lg font-semibold transition-all duration-200" />
      </div>
    </div>
  );

  const OverviewTab = () => {
    // Get top 5 holdings by value
    const topHoldings = [...holdings]
      .sort((a, b) => b.usdValue - a.usdValue)
      .slice(0, 5);

    // Get sector allocation
    const sectorAllocation = Object.entries(analytics?.sectorAllocation || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return (
      <div className="space-y-3">
        {/* Portfolio Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <Card variant="glass" className="p-3 glass-card-hover group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#5C5C5C] mb-1">Total Value</p>
                <p className="text-xs font-bold font-display text-[#2C2C2C] tabular-nums">
                  ${analytics?.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center group-hover:bg-primary-500/20 transition-colors">
                <DollarSign className="w-6 h-6 text-primary-400" />
              </div>
            </div>
          </Card>

          <Card variant="glass" className="p-3 glass-card-hover group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#5C5C5C] mb-1">24h Change</p>
                <p className={`text-xs font-bold font-display tabular-nums ${(analytics?.totalChangePercent24h || 0) >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                  {(analytics?.totalChangePercent24h || 0) >= 0 ? '+' : ''}
                  {analytics?.totalChangePercent24h.toFixed(2) || '0.00'}%
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${(analytics?.totalChangePercent24h || 0) >= 0 ? 'bg-success-500/10 group-hover:bg-success-500/20' : 'bg-danger-500/10 group-hover:bg-danger-500/20'}`}>
                {(analytics?.totalChangePercent24h || 0) >= 0 ?
                  <TrendingUp className="w-6 h-6 text-success-400" /> :
                  <TrendingDown className="w-6 h-6 text-danger-400" />
                }
              </div>
            </div>
          </Card>

          <Card variant="glass" className="p-3 glass-card-hover group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#5C5C5C] mb-1">Diversification</p>
                <p className="text-xs font-bold font-display text-[#2C2C2C] tabular-nums">
                  {analytics?.diversificationScore.toFixed(1) || '0.0'}%
                </p>
              </div>
              <div className="w-12 h-12 bg-info-500/10 rounded-xl flex items-center justify-center group-hover:bg-info-500/20 transition-colors">
                <Target className="w-6 h-6 text-info-400" />
              </div>
            </div>
          </Card>

          <Card variant="glass" className="p-3 glass-card-hover group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#5C5C5C] mb-1">Holdings</p>
                <p className="text-xs font-bold font-display text-[#2C2C2C] tabular-nums">{holdings.length}</p>
              </div>
              <div className="w-12 h-12 bg-warning-500/10 rounded-xl flex items-center justify-center group-hover:bg-warning-500/20 transition-colors">
                <Coins className="w-6 h-6 text-warning-400" />
              </div>
            </div>
          </Card>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Top Holdings */}
          <div className="bg-white/95 border-4 border-black rounded-[32px] p-3 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-display font-bold text-[#2C2C2C] flex items-center gap-10">
                <Wallet className="w-6 h-6 text-playful-green" />
                Top Holdings
              </h3>
              <button
                onClick={() => setActiveView('holdings')}
                className="text-xs font-body font-semibold text-playful-green hover:text-playful-orange transition-colors"
              >
                View All →
              </button>
            </div>
            <div className="space-y-3">
              {topHoldings.map(holding => (
                <div key={holding.token.symbol} className="flex items-center justify-between p-3 bg-playful-cream/30 rounded-2xl border-2 border-black/10 hover:border-playful-green/50 hover:bg-playful-cream/50 transition-all group">
                  <div className="flex items-center gap-10">
                    <img
                      src={holding.token.logo}
                      alt={holding.token.symbol}
                      className="w-10 h-10 rounded-full border-2 border-black shadow-md group-hover:scale-110 transition-transform"
                    />
                    <div>
                      <p className="font-display font-bold text-[#2C2C2C]">{holding.token.symbol}</p>
                      <p className="text-xs text-[#5C5C5C] font-body">{holding.weight.toFixed(1)}% of portfolio</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold text-[#2C2C2C]">${holding.usdValue.toFixed(2)}</p>
                    <p className={`text-xs font-body font-semibold ${holding.changePercent24h >= 0 ? 'text-playful-green' : 'text-playful-orange'}`}>
                      {holding.changePercent24h >= 0 ? '+' : ''}{holding.changePercent24h.toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
              {topHoldings.length === 0 && (
                <p className="text-[#5C5C5C] text-center py-2.5 text-xs font-body">No holdings found</p>
              )}
            </div>
          </div>

          {/* Sector Allocation */}
          <div className="bg-white/95 border-4 border-black rounded-[32px] p-3 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-display font-bold text-[#2C2C2C] flex items-center gap-10">
                <PieChart className="w-6 h-6 text-playful-orange" />
                Sector Allocation
              </h3>
              <button
                onClick={() => setActiveView('allocation')}
                className="text-xs font-body font-semibold text-playful-green hover:text-playful-orange transition-colors"
              >
                View All →
              </button>
            </div>
            <div className="space-y-3">
              {sectorAllocation.map(([sector, percentage]) => (
                <div key={sector} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#5C5C5C] font-body">{sector}</span>
                    <span className="font-display font-bold text-[#2C2C2C]">{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 bg-playful-cream/50 rounded-full overflow-hidden border-2 border-black/10">
                    <div
                      className="h-full bg-playful-green rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              ))}
              {sectorAllocation.length === 0 && (
                <p className="text-[#5C5C5C] text-center py-2.5 text-xs font-body">No allocation data</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const HoldingsTab = () => (
    <div className="bg-white/95 border-4 border-black rounded-[32px] p-3 shadow-2xl">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xs font-display font-bold text-[#2C2C2C] flex items-center gap-10">
          <Wallet className="w-6 h-6 text-playful-green" />
          Portfolio Holdings
        </h3>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2.5 px-3 py-2.5 bg-white border-3 border-black rounded-2xl font-display font-semibold text-[#2C2C2C] hover:bg-gray-50 transition-all duration-200 shadow-lg disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-3 border-black">
              <th className="text-left py-2.5 px-3 font-display font-bold text-[#2C2C2C]">Asset</th>
              <th className="text-right py-2.5 px-3 font-display font-bold text-[#2C2C2C]">Balance</th>
              <th className="text-right py-2.5 px-3 font-display font-bold text-[#2C2C2C]">USD Value</th>
              <th className="text-right py-2.5 px-3 font-display font-bold text-[#2C2C2C]">24h Change</th>
              <th className="text-right py-2.5 px-3 font-display font-bold text-[#2C2C2C]">Weight</th>
              <th className="text-right py-2.5 px-3 font-display font-bold text-[#2C2C2C]">Sector</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map(holding => (
              <tr key={holding.token.symbol} className="border-b-2 border-black/10 hover:bg-playful-cream/30 transition-colors">
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-10">
                    <img
                      src={holding.token.logo}
                      alt={holding.token.symbol}
                      className="w-12 h-12 rounded-full border-2 border-black shadow-md"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNFNUU3RUIiLz4KPHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeD0iMTAiIHk9IjEwIj4KPHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHRleHQgeD0iMTAiIHk9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjEwIiBmaWxsPSIjNjM2NkY2Ij57eyBob2xkaW5nLnRva2VuLnN5bWJvbC5jaGFyQXQoMCkgfX08L3RleHQ+Cjwvc3ZnPgo8L3N2Zz4KPC9zdmc+Cjwvc3ZnPgo8L3N2Zz4=';
                      }}
                    />
                    <div>
                      <p className="font-display font-bold text-[#2C2C2C]">{holding.token.symbol}</p>
                      <p className="text-xs text-[#5C5C5C] font-body">{holding.token.name}</p>
                    </div>
                  </div>
                </td>
                <td className="text-right py-2.5 px-3">
                  <p className="font-display font-semibold text-[#2C2C2C]">{holding.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</p>
                </td>
                <td className="text-right py-2.5 px-3">
                  <p className="font-display font-bold text-[#2C2C2C]">${holding.usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </td>
                <td className="text-right py-2.5 px-3">
                  <p className={`font-display font-bold ${holding.changePercent24h >= 0 ? 'text-playful-green' : 'text-playful-orange'}`}>
                    {holding.changePercent24h >= 0 ? '+' : ''}{holding.changePercent24h.toFixed(2)}%
                  </p>
                </td>
                <td className="text-right py-2.5 px-3">
                  <p className="font-display font-semibold text-[#2C2C2C]">{holding.weight.toFixed(1)}%</p>
                </td>
                <td className="text-right py-2.5 px-3">
                  <span className="inline-block px-3 py-1 bg-playful-green/10 text-playful-green rounded-full text-xs font-body font-medium border-2 border-playful-green/20">
                    {holding.marketData.sector}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {holdings.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-playful-orange/10 rounded-2xl border-2 border-black flex items-center justify-center mx-auto mb-3">
              <Coins className="w-10 h-10 text-playful-orange" />
            </div>
            <p className="text-[#2C2C2C] text-xs font-display font-bold mb-2">No xStock holdings found</p>
            <p className="text-[#5C5C5C] text-xs font-body">Start trading to build your portfolio</p>
          </div>
        )}
      </div>
    </div>
  );

  const AnalyticsTab = () => (
    <div className="space-y-3">
      {/* Info Banner */}
      {analytics?.sharpeRatio !== null ? (
        <div className="bg-playful-green/10 border-4 border-playful-green rounded-[32px] p-3 shadow-lg">
          <div className="flex items-center gap-10">
            <div className="w-12 h-12 bg-playful-green rounded-2xl border-2 border-black flex items-center justify-center shadow-lg">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xs font-display font-bold text-[#2C2C2C]">
                Backend Analytics Active
              </h3>
              <p className="mt-1 text-xs text-[#5C5C5C] font-body">
                Risk metrics calculated from 1 year of historical data using Modern Portfolio Theory
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-playful-orange/10 border-4 border-playful-orange rounded-[32px] p-3 shadow-lg">
          <div className="flex items-center gap-10">
            <div className="w-12 h-12 bg-playful-orange rounded-2xl border-2 border-black flex items-center justify-center shadow-lg">
              <Info className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xs font-display font-bold text-[#2C2C2C]">
                Loading Advanced Analytics
              </h3>
              <p className="mt-1 text-xs text-[#5C5C5C] font-body">
                Fetching historical data to calculate risk metrics (Sharpe, Beta, VaR, etc.)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Available Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="bg-white/95 border-4 border-black rounded-[32px] p-3 shadow-2xl">
          <h4 className="text-xs font-display font-bold text-[#2C2C2C] mb-3 flex items-center gap-10">
            <PieChart className="w-6 h-6 text-playful-green" />
            Portfolio Composition
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-playful-cream/30 rounded-2xl">
              <span className="text-[#5C5C5C] font-body">Total Holdings</span>
              <span className="font-display font-bold text-[#2C2C2C]">{holdings.length}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-playful-cream/30 rounded-2xl">
              <span className="text-[#5C5C5C] font-body">Sectors</span>
              <span className="font-display font-bold text-[#2C2C2C]">{Object.keys(analytics?.sectorAllocation || {}).length}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-playful-cream/30 rounded-2xl">
              <span className="text-[#5C5C5C] font-body">Diversification Score</span>
              <span className="font-display font-bold text-[#2C2C2C]">{analytics?.diversificationScore.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-playful-cream/30 rounded-2xl">
              <span className="text-[#5C5C5C] font-body">24h Portfolio Change</span>
              <span className={`font-display font-bold ${(analytics?.totalChangePercent24h || 0) >= 0 ? 'text-playful-green' : 'text-playful-orange'}`}>
                {(analytics?.totalChangePercent24h || 0) >= 0 ? '+' : ''}
                {analytics?.totalChangePercent24h.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white/95 border-4 border-black rounded-[32px] p-3 shadow-2xl">
          <h4 className="text-xs font-display font-bold text-[#2C2C2C] mb-3 flex items-center gap-10">
            <Activity className="w-6 h-6 text-playful-orange" />
            Risk Metrics
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-playful-cream/30 rounded-2xl">
              <span className="text-[#5C5C5C] font-body">Sharpe Ratio</span>
              <span className="font-display font-bold text-[#2C2C2C]">
                {analytics?.sharpeRatio !== null ? analytics?.sharpeRatio.toFixed(2) : 'undefined%'}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-playful-cream/30 rounded-2xl">
              <span className="text-[#5C5C5C] font-body">Beta vs SPY</span>
              <span className="font-display font-bold text-[#2C2C2C]">
                {analytics?.beta !== null ? analytics?.beta?.toFixed(2) : 'undefined%'}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-playful-cream/30 rounded-2xl">
              <span className="text-[#5C5C5C] font-body">VaR (95%)</span>
              <span className="font-display font-bold text-playful-orange">
                {analytics?.riskMetrics?.var95 !== null ? `${analytics?.riskMetrics?.var95?.toFixed(2)}%` : 'undefined%'}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-playful-cream/30 rounded-2xl">
              <span className="text-[#5C5C5C] font-body">Max Drawdown</span>
              <span className="font-display font-bold text-playful-orange">
                {analytics?.maxDrawdown !== null ? `${analytics?.maxDrawdown?.toFixed(2)}%` : 'undefined%'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const AllocationTab = () => (
    <div className="space-y-3">
      <div className="bg-white/95 border-4 border-black rounded-[32px] p-3 shadow-2xl">
        <h4 className="text-xs font-display font-bold text-[#2C2C2C] mb-3 flex items-center gap-10">
          <PieChart className="w-7 h-7 text-playful-orange" />
          Sector Allocation
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Sector List */}
          <div className="space-y-3">
            {Object.entries(analytics?.sectorAllocation || {})
              .sort(([,a], [,b]) => b - a)
              .map(([sector, allocation], index) => (
                <div key={sector} className="flex items-center justify-between p-3 bg-playful-cream/40 rounded-2xl border-2 border-black/10 hover:border-playful-orange/50 transition-all">
                  <div className="flex items-center gap-10">
                    <div
                      className="w-6 h-6 rounded-full border-2 border-black shadow-sm"
                      style={{
                        backgroundColor: `hsl(${(index * 360) / Object.keys(analytics?.sectorAllocation || {}).length}, 70%, 50%)`
                      }}
                    />
                    <span className="font-display font-bold text-[#2C2C2C]">{sector}</span>
                  </div>
                  <span className="font-display font-bold text-playful-orange">{allocation.toFixed(1)}%</span>
                </div>
              ))}
          </div>

          {/* Visual representation */}
          <div className="flex items-center justify-center">
            <div className="relative w-56 h-56">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                {Object.entries(analytics?.sectorAllocation || {})
                  .sort(([,a], [,b]) => b - a)
                  .reduce((acc, [sector, allocation], index) => {
                    const startAngle = acc.totalAngle;
                    const endAngle = startAngle + (allocation / 100) * 360;
                    const largeArcFlag = allocation > 50 ? 1 : 0;

                    const x1 = 100 + 80 * Math.cos((startAngle * Math.PI) / 180);
                    const y1 = 100 + 80 * Math.sin((startAngle * Math.PI) / 180);
                    const x2 = 100 + 80 * Math.cos((endAngle * Math.PI) / 180);
                    const y2 = 100 + 80 * Math.sin((endAngle * Math.PI) / 180);

                    const pathData = `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

                    acc.paths.push(
                      <path
                        key={sector}
                        d={pathData}
                        fill={`hsl(${(index * 360) / Object.keys(analytics?.sectorAllocation || {}).length}, 70%, 50%)`}
                        stroke="#000000"
                        strokeWidth="3"
                      />
                    );

                    acc.totalAngle = endAngle;
                    return acc;
                  }, { paths: [] as React.ReactNode[], totalAngle: 0 }).paths}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const OptimizationTab = () => (
    <PortfolioOptimization
      holdings={holdings}
      analytics={analytics}
      intelData={intelData}
      tokens={tokens}
      totalPortfolioValue={analytics?.totalValue || 0}
    />
  );

  return (
    <div className="min-h-screen relative">
      <div className="container mx-auto px-3 py-2.5 relative z-10">
        {/* Header */}
        <div className="text-center mb-3">
          <h1 className="text-xs md:text-xs font-bold font-display text-[#2C2C2C] mb-3">
            Portfolio
          </h1>
          <p className="text-xs text-[#3C3C3C] font-body max-w-2xl mx-auto mb-3">
            Real-time portfolio tracking with advanced analytics and risk management
          </p>

          {/* Navigation Tabs */}
          <div className="flex justify-center gap-10 flex-wrap">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'holdings', label: 'Holdings', icon: Coins },
              { id: 'analytics', label: 'Analytics', icon: Activity },
              { id: 'allocation', label: 'Allocation', icon: PieChart },
              { id: 'optimization', label: 'Optimization', icon: Target },
              { id: 'history', label: 'History', icon: History }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                className={`h-auto px-3 py-2.5 flex items-center gap-2.5 min-w-[140px] rounded-2xl transition-all duration-300 border-2 font-display font-semibold ${
                  activeView === tab.id
                    ? 'bg-playful-green text-white border-black shadow-lg scale-105'
                    : 'bg-white/80 text-[#2C2C2C] border-black/20 hover:bg-white hover:scale-105'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Wallet Info Bar */}
        <div className="bg-white/95 border-4 border-black rounded-[32px] p-3 shadow-2xl mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-10">
              <div className="w-14 h-14 bg-playful-green rounded-2xl border-2 border-black flex items-center justify-center shadow-lg">
                <Wallet className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-[#2C2C2C] font-semibold font-display text-xs">
                  {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}
                </p>
                <p className="text-[#5C5C5C] text-xs font-body">
                  SOL Balance: {solBalance.toFixed(4)} SOL
                </p>
              </div>
            </div>
            <div className="flex items-center gap-10">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2.5 px-3 py-2.5 bg-white border-3 border-black rounded-2xl font-display font-semibold text-[#2C2C2C] hover:bg-gray-50 transition-all duration-200 shadow-lg disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <WalletMultiButton className="!px-3 !py-2.5 !bg-playful-green !text-white !rounded-2xl !font-display !font-bold !border-3 !border-black !shadow-lg hover:!bg-playful-orange !transition-all !duration-200" />
            </div>
          </div>
        </div>

        {/* Content */}
          <div>
            {activeView === 'overview' && <OverviewTab />}
            {activeView === 'holdings' && <HoldingsTab />}
            {activeView === 'analytics' && <AnalyticsTab />}
            {activeView === 'allocation' && <AllocationTab />}
            {activeView === 'optimization' && <OptimizationTab />}
            {activeView === 'history' && <TransactionHistory tokens={tokens} />}
          </div>

        {error && (
          <div className="mt-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

// Main export component - use shared wallet context from main.tsx
export const PortfolioPage: React.FC<PortfolioPageProps> = ({ tokens, intelData }) => {
  return <PortfolioPageContent tokens={tokens} intelData={intelData} />;
};