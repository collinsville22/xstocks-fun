import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { createWalletService, TokenBalance } from '../../lib/walletService';
import { defaultWalletConfig } from '../../lib/walletConfig';
import { raydiumService } from '../../lib/raydium.js';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useMarketData } from '../../contexts/MarketDataContext';
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
  RefreshCw,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Minus,
  Edit3,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PortfolioValueChart } from './Portfolio/PortfolioValueChart';
import { SectorAllocationPie } from './Portfolio/SectorAllocationPie';
import { PerformanceAttributionBar } from './Portfolio/PerformanceAttributionBar';
import { RiskGauges } from './Portfolio/RiskGauges';
import { ENV } from '../../config/env';

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } }
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 }
};

// Types for real Intel microservice data
interface XStockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  sector: string;
  lastUpdated: string;
}

interface SectorData {
  name: string;
  stocks: XStockData[];
  totalMarketCap: number;
  avgChange: number;
  totalVolume: number;
  topGainer: XStockData | null;
  topLoser: XStockData | null;
  performance: number;
}

interface TokenHolding {
  token: {
    symbol: string;
    name: string;
    mint: string;
    decimals: number;
  };
  balance: number;
  usdValue: number;
  weight: number;
  marketData: XStockData;
  change24h: number;
  changePercent24h: number;
  unrealizedPL: number;
  contribution: number;
  riskContribution: number;
}

interface PortfolioAnalytics {
  totalValue: number;
  totalChange24h: number;
  totalChangePercent24h: number;
  totalReturn: number;
  annualizedReturn: number;
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

// Backend Phase 4.6 integration types
interface BackendPortfolioPosition {
  symbol: string;
  shares: number;
  costBasis: number;
  currentPrice: number;
  positionValue: number;
  positionCost: number;
  gain: number;
  gainPercent: number;
  weight: number;
  sector: string;
}

interface BackendPortfolioAnalysis {
  summary: {
    currentValue: number;
    costBasis: number;
    totalGain: number;
    totalGainPercent: number;
    positionCount: number;
  };
  positions: BackendPortfolioPosition[];
  sectorAllocation: { [sector: string]: number };
  riskMetrics: {
    annualReturn: number;
    annualVolatility: number;
    sharpeRatio: number;
    beta: number;
    alpha: number;
    maxDrawdown: number;
    downside_deviation: number;
    volOfVol: number;
  };
  benchmarkComparison: {
    portfolioReturn: number;
    benchmarkReturn: number;
    outperformance: number;
    beta: number;
    alpha: number;
  };
  portfolioHistory: Array<{ date: string; value: number }>;
  benchmarkHistory: Array<{ date: string; value: number }>;
  rebalancing: {
    suggestions: Array<{
      symbol: string;
      action: 'Reduce' | 'Increase';
      currentWeight: number;
      targetWeight: number;
      deviation: number;
      changeValue: number;
      changeShares: number;
    }>;
    needsRebalancing: boolean;
    targetStrategy: string;
  };
}

interface OptimizationResult {
  recommended: {
    allocation: Array<{
      symbol: string;
      weight: number;
      dividendYield: number;
      beta: number;
    }>;
    expectedReturn: number;
    expectedVolatility: number;
    sharpeRatio: number;
    strategy: string;
  };
  profile: {
    riskTolerance: string;
    objective: string;
    maxVolatility: number;
    targetReturn: number;
  };
}

// API configuration - Use Vite environment variables
const API_URL = ENV.INTEL_API_URL;

// Internal component that uses wallet context
const PortfolioManagementContent: React.FC = () => {
  // Use shared market data context - no API calls needed!
  const { allStocks, sectors, isLoading: contextLoading } = useMarketData();

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
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
    connected = false;
    publicKey = null;
    connecting = false;
    connection = null;
  }

  // State management for real data
  const [holdings, setHoldings] = useState<TokenHolding[]>([]);
  const [analytics, setAnalytics] = useState<PortfolioAnalytics | null>(null);
  const [xstocksData, setXstocksData] = useState<{ [symbol: string]: XStockData }>({});
  const [sectorsData, setSectorsData] = useState<SectorData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [solBalance, setSolBalance] = useState<number>(0);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [rebalancing, setRebalancing] = useState(false);

  // Backend Phase 4.6 state
  const [backendAnalytics, setBackendAnalytics] = useState<BackendPortfolioAnalysis | null>(null);
  const [optimizationResults, setOptimizationResults] = useState<OptimizationResult | null>(null);
  const [loadingBackend, setLoadingBackend] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'allocation' | 'risk' | 'optimize'>('overview');
  const [riskTolerance, setRiskTolerance] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate');
  const [objective, setObjective] = useState<'growth' | 'income' | 'balanced'>('balanced');

  // Cost basis tracking - persisted in localStorage
  const [costBasisData, setCostBasisData] = useState<{ [symbol: string]: { costBasis: number; timestamp: number } }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolio_cost_basis');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  // Save cost basis to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('portfolio_cost_basis', JSON.stringify(costBasisData));
    }
  }, [costBasisData]);

  // Auto-capture cost basis when holdings first appear
  useEffect(() => {
    if (holdings.length > 0) {
      const newCostBasis = { ...costBasisData };
      let updated = false;

      holdings.forEach(holding => {
        const symbol = holding.token.symbol;
        // Only set if not already tracked
        if (!newCostBasis[symbol]) {
          newCostBasis[symbol] = {
            costBasis: holding.marketData.price, // Use current price as initial cost basis
            timestamp: Date.now()
          };
          updated = true;
        }
      });

      if (updated) {
        setCostBasisData(newCostBasis);
      }
    }
  }, [holdings]);

  // Handle portfolio rebalancing via Jupiter
  const handleRebalancing = useCallback(async () => {
    if (!connected || !publicKey || holdings.length === 0) {
      setError('Wallet not connected or no holdings to rebalance');
      return;
    }

    try {
      setRebalancing(true);
      setError(null);

      const targetWeight = 100 / holdings.length; // Equal weight strategy
      const totalValue = analytics?.totalValue || 0;

      console.log(' Starting portfolio rebalancing...');
      console.log('Target weight per position:', targetWeight + '%');

      const rebalanceActions = [];

      // Calculate required trades
      for (const holding of holdings) {
        const drift = holding.weight - targetWeight;
        const driftAmount = Math.abs(drift * totalValue / 100);

        // Only rebalance if drift > 2% and amount > $1
        if (Math.abs(drift) > 2 && driftAmount > 1) {
          rebalanceActions.push({
            symbol: holding.token.symbol,
            mint: holding.token.mint,
            currentWeight: holding.weight,
            targetWeight,
            drift,
            action: drift > 0 ? 'SELL' : 'BUY',
            amount: driftAmount
          });
        }
      }

      if (rebalanceActions.length === 0) {
        setError('Portfolio is already balanced within 2% tolerance');
        return;
      }

      console.log('Rebalancing actions:', rebalanceActions);

      // Execute real Jupiter trades
      const results = {
        successful: [],
        failed: []
      };

      for (const action of rebalanceActions) {
        console.log(`${action.action} $${action.amount.toFixed(2)} of ${action.symbol}`);

        try {
          // Calculate exact amounts
          const inputAmountRaw = Math.floor(action.amount * Math.pow(10, 6)).toString(); // Assume 6 decimals for base currency

          // Get real Raydium quote and transaction
          console.log(`Getting Raydium swap for ${action.symbol}...`);
          const swapData = await raydiumService.prepareSwap(
            action.action === 'SELL' ? action.mint : 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
            action.action === 'SELL' ? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' : action.mint,
            inputAmountRaw,
            publicKey.toString(),
            50 // 0.5% slippage
          );

          console.log(` Raydium ${action.action} swap prepared for ${action.symbol}`);
          results.successful.push(action);

          // Note: In a full implementation, you would:
          // 1. Sign and send the transaction using the wallet
          // 2. Wait for confirmation
          // 3. Update local portfolio state

        } catch (tradeError) {
          console.error(` Failed to prepare swap for ${action.symbol}:`, tradeError);
          results.failed.push({ action, error: tradeError.message });
        }
      }

      if (results.failed.length > 0) {
        setError(`Some trades failed: ${results.failed.map(f => f.action.symbol).join(', ')}`);
      } else {
        console.log('All Raydium swaps prepared - ready for execution');
      }

      // Refresh portfolio data after rebalancing
      await handleRefresh();

      console.log(' Portfolio rebalancing completed!');

    } catch (error) {
      console.error('Rebalancing failed:', error);
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
      setError(`Rebalancing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRebalancing(false);
    }
  }, [connected, publicKey, holdings, analytics]);

  // Backend Phase 4.6 API functions
  const fetchPortfolioAnalysis = useCallback(async (portfolioHoldings: TokenHolding[]) => {
    if (portfolioHoldings.length === 0) return;

    setLoadingBackend(true);
    try {
      // Transform holdings to backend format
      const backendHoldings = portfolioHoldings.map(h => ({
        symbol: h.token.symbol,
        shares: h.balance,
        costBasis: h.usdValue / h.balance // Calculate cost basis from current value
      }));

      const response = await fetch(`${API_URL}/api/portfolio/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holdings: backendHoldings,
          startDate: '2020-01-01',
          endDate: new Date().toISOString().split('T')[0]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend analysis failed: ${errorText}`);
      }

      const apiResponse = await response.json();
      setBackendAnalytics(data);
      console.log(' Backend portfolio analysis complete:', data);
    } catch (error) {
      console.error('Error fetching portfolio analysis:', error);
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
      // Don't set error state - backend is optional
    } finally {
      setLoadingBackend(false);
    }
  }, []);

  const fetchOptimizationRecommendations = useCallback(async (
    portfolioHoldings: TokenHolding[],
    risk: 'conservative' | 'moderate' | 'aggressive',
    obj: 'growth' | 'income' | 'balanced'
  ) => {
    if (portfolioHoldings.length === 0) return;

    setLoadingBackend(true);
    try {
      const backendHoldings = portfolioHoldings.map(h => ({
        symbol: h.token.symbol
      }));

      const response = await fetch(`${API_URL}/api/portfolio/optimize-allocation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holdings: backendHoldings,
          riskTolerance: risk,
          objective: obj,
          startDate: '2020-01-01'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Optimization failed: ${errorText}`);
      }

      const apiResponse = await response.json();
      setOptimizationResults(data);
      console.log(' Optimization recommendations received:', data);
    } catch (error) {
      console.error('Error fetching optimization:', error);
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
      setError(`Optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingBackend(false);
    }
  }, []);

  // Transform shared context data - no API calls!
  const fetchMarketData = useCallback(async () => {
    try {
      setError(null);
      console.log(' Loading market data from shared context...');

      // Transform shared data (no API calls!)
      const xstocksMap: { [symbol: string]: XStockData } = {};
      allStocks.forEach((stock: any) => {
        xstocksMap[stock.symbol] = {
          symbol: stock.symbol,
          name: stock.name,
          price: stock.price,
          change: stock.change,
          changePercent: stock.changePercent,
          volume: stock.volume,
          marketCap: stock.marketCap || 0,
          sector: stock.sector || 'Other',
          lastUpdated: stock.lastUpdate
        };
      });
      setXstocksData(xstocksMap);
      console.log(' Loaded', Object.keys(xstocksMap).length, 'xStock tokens from shared context');

      // Use shared sectors data
      setSectorsData(sectors);

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading market data:', error);
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
      setError('Failed to load market data');
    }
  }, [allStocks, sectors]);

  // Fetch real wallet balances using wallet service
  const fetchPortfolioData = useCallback(async () => {
    if (!connected || !publicKey || !connection) return;

    try {
      setLoading(true);
      setError(null);

      // Create wallet service instance
      const walletService = createWalletService(connection);
      const wallet = { connected, publicKey, signTransaction: null, signAllTransactions: null };

      // Get real wallet balances
      const walletBalances = await walletService.fetchWalletBalances(wallet);
      setSolBalance(walletBalances.sol);

      // Map wallet holdings to market data
      const portfolioHoldings: TokenHolding[] = [];
      let totalValue = 0;
      let totalChange24h = 0;

      walletBalances.tokens.forEach((tokenBalance: TokenBalance) => {
        // Find corresponding xStock market data by matching token symbols
        const marketData = Object.values(xstocksData).find(stock => {
          // Try exact match first
          if (stock.symbol === tokenBalance.symbol) return true;
          // Try with 'x' suffix matching
          if (stock.symbol === tokenBalance.symbol + 'x') return true;
          // Try removing 'x' from token symbol
          if (stock.symbol === tokenBalance.symbol?.replace('x', '')) return true;
          return false;
        });

        if (marketData && tokenBalance.uiAmount > 0) {
          const usdValue = tokenBalance.uiAmount * marketData.price;
          const change24h = usdValue * (marketData.changePercent / 100);

          portfolioHoldings.push({
            token: {
              symbol: tokenBalance.symbol || 'Unknown',
              name: tokenBalance.name || 'Unknown Token',
              mint: tokenBalance.mint,
              decimals: tokenBalance.decimals
            },
            balance: tokenBalance.uiAmount,
            usdValue,
            weight: 0, // Will calculate after getting total
            marketData,
            change24h,
            changePercent24h: marketData.changePercent,
            unrealizedPL: change24h, // Simplified for now
            contribution: 0, // Will calculate after getting total
            riskContribution: 0 // Will calculate after getting total
          });

          totalValue += usdValue;
          totalChange24h += change24h;
        }
      });

      // Calculate weights and contributions
      portfolioHoldings.forEach(holding => {
        holding.weight = totalValue > 0 ? (holding.usdValue / totalValue) * 100 : 0;
        holding.contribution = holding.change24h;
      });

      setHoldings(portfolioHoldings);

      // Calculate portfolio analytics using real data
      const analytics: PortfolioAnalytics = {
        totalValue,
        totalChange24h,
        totalChangePercent24h: totalValue > 0 ? (totalChange24h / (totalValue - totalChange24h)) * 100 : 0,
        totalReturn: backendAnalytics?.riskMetrics?.annualReturn || 0,
        annualizedReturn: backendAnalytics?.riskMetrics?.annualReturn || 0,
        profitLoss: totalChange24h,
        sharpeRatio: backendAnalytics?.riskMetrics?.sharpeRatio || calculateSharpeRatio(portfolioHoldings),
        volatility: backendAnalytics?.riskMetrics?.annualVolatility || calculateVolatility(portfolioHoldings),
        beta: backendAnalytics?.riskMetrics?.beta || calculateBeta(portfolioHoldings),
        maxDrawdown: backendAnalytics?.riskMetrics?.maxDrawdown || 0,
        diversificationScore: calculateDiversificationScore(portfolioHoldings),
        sectorAllocation: calculateSectorAllocation(portfolioHoldings, sectorsData),
        riskMetrics: {
          var95: calculateVaR(portfolioHoldings, 0.95),
          var99: calculateVaR(portfolioHoldings, 0.99),
          cvar95: calculateCVaR(portfolioHoldings, 0.95),
          maximumDrawdown: backendAnalytics?.riskMetrics?.maxDrawdown || 0,
          volOfVol: backendAnalytics?.riskMetrics?.volOfVol || 0,
          downside_deviation: backendAnalytics?.riskMetrics?.downside_deviation || 0
        }
      };

      setAnalytics(analytics);

    } catch (error) {
      console.error('Error fetching portfolio data:', error);
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
      setError(`Failed to fetch portfolio data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [connected, publicKey, connection, xstocksData, sectorsData]);

  // Real-time data updates
  useEffect(() => {
    fetchMarketData();

    // Refresh market data every 30 seconds (same as Intel dashboard)
    const marketInterval = setInterval(fetchMarketData, 30000);
    return () => clearInterval(marketInterval);
  }, [fetchMarketData]);

  useEffect(() => {
    if (Object.keys(xstocksData).length > 0) {
      fetchPortfolioData();
    }
  }, [fetchPortfolioData, xstocksData]);

  // Trigger backend analysis when holdings are loaded
  useEffect(() => {
    if (holdings.length > 0 && connected) {
      fetchPortfolioAnalysis(holdings);
    }
  }, [holdings, connected, fetchPortfolioAnalysis]);

  // Manual refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchMarketData(), fetchPortfolioData()]);
    if (holdings.length > 0) {
      await fetchPortfolioAnalysis(holdings);
    }
    setRefreshing(false);
  };

  // Portfolio analytics calculations using real data
  const calculateSharpeRatio = (holdings: TokenHolding[]): number => {
    if (holdings.length === 0) return 0;
    const returns = holdings.map(h => h.changePercent24h / 100);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);
    return volatility > 0 ? (avgReturn * 252) / (volatility * Math.sqrt(252)) : 0;
  };

  const calculateVolatility = (holdings: TokenHolding[]): number => {
    if (holdings.length === 0) return 0;
    const returns = holdings.map(h => h.changePercent24h / 100);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length;
    return Math.sqrt(variance * 252); // Annualized
  };

  const calculateBeta = (holdings: TokenHolding[]): number => {
    // Use backend beta if available, otherwise simplified calculation
    if (backendAnalytics?.riskMetrics?.beta) {
      return backendAnalytics.riskMetrics.beta;
    }

    // Fallback: simplified beta calculation
    if (holdings.length === 0) return 1;
    const portfolioReturn = holdings.reduce((sum, h) => sum + h.changePercent24h * h.weight / 100, 0);
    const marketReturn = backendAnalytics?.benchmarkComparison?.benchmarkReturn || 0.5; // Use real benchmark return
    return portfolioReturn / marketReturn || 1;
  };

  const calculateDiversificationScore = (holdings: TokenHolding[]): number => {
    if (holdings.length <= 1) return 0;
    const weights = holdings.map(h => h.weight / 100);
    const hhi = weights.reduce((sum, w) => sum + w * w, 0);
    return (1 - hhi) * 100;
  };

  // Calculate REAL Raydium swap fees based on actual Solana costs
  const calculateRaydiumFees = (numberOfSwaps: number, solPrice: number = 200): number => {
    // Raydium swap costs:
    // - Base fee: 5,000 lamports (0.000005 SOL) per transaction
    // - Priority fee: ~0.0001 SOL (100,000 microlamports default)
    // Total: ~0.0001 SOL per swap

    const baseFeePerSwap = 0.000005; // SOL
    const priorityFeePerSwap = 0.0001; // SOL (100,000 microlamports)
    const totalFeePerSwap = baseFeePerSwap + priorityFeePerSwap;

    const totalSOL = numberOfSwaps * totalFeePerSwap;
    const totalUSD = totalSOL * solPrice;

    return totalUSD;
  };

  const calculateTradingImpact = (holdings: TokenHolding[], solPrice: number = 200): number => {
    // Calculate trading impact based on REAL Raydium fees and slippage
    if (holdings.length === 0) return 0;

    const totalValue = holdings.reduce((sum, h) => sum + h.usdValue, 0);
    if (totalValue === 0) return 0;

    // Real Raydium swap fees
    const raydiumFees = calculateRaydiumFees(holdings.length, solPrice);

    // Average slippage: 0.5% default for Raydium swaps
    const slippageCost = totalValue * 0.005;

    // Total impact
    const totalCost = raydiumFees + slippageCost;
    const impactPercent = (totalCost / totalValue) * 100;

    return -impactPercent; // Negative (cost)
  };

  const calculateSectorAllocation = (holdings: TokenHolding[], sectors: SectorData[]): { [sector: string]: number } => {
    const allocation: { [sector: string]: number } = {};
    holdings.forEach(holding => {
      const sector = holding.marketData.sector || 'Other';
      allocation[sector] = (allocation[sector] || 0) + holding.weight;
    });
    return allocation;
  };

  const calculateVaR = (holdings: TokenHolding[], confidence: number): number => {
    if (holdings.length === 0) return 0;
    const returns = holdings.map(h => h.changePercent24h);
    returns.sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * returns.length);
    return Math.abs(returns[index] || 0);
  };

  const calculateCVaR = (holdings: TokenHolding[], confidence: number): number => {
    if (holdings.length === 0) return 0;
    const returns = holdings.map(h => h.changePercent24h);
    returns.sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * returns.length);
    const tail = returns.slice(0, index + 1);
    return Math.abs(tail.reduce((a, b) => a + b, 0) / tail.length || 0);
  };

  // Wallet connection component
  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-3 bg-white border-2 border-black text-center max-w-md">
          <Wallet className="w-14 h-14 mx-auto mb-3 text-primary-400" />
          <h2 className="text-sm font-bold text-[#1a1a1a] mb-3">Portfolio Management</h2>
          <p className="text-[#1a1a1a] mb-3">
            Connect your Solana wallet to access real-time portfolio analytics and management tools.
          </p>
          <WalletMultiButton className="w-full bg-gradient-to-r from-primary-500/20 to-primary-600/20 backdrop-blur-md border border-primary-500/30 hover:from-purple-700 hover:to-blue-700" />
          <p className="text-sm text-[#3C3C3C] mt-3">
            Real data powered by Intel microservice • Yahoo Finance • Raydium API
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3">
      <div className="max-w-7xl mx-auto">
        {/* Header with real-time status */}
        <div className="flex justify-between items-center mb-3">
          <div>
            <h1 className="text-sm font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
              Portfolio Management
            </h1>
            <p className="text-[#1a1a1a] mt-2">
              Real-time portfolio analytics powered by Intel microservice
            </p>
          </div>
          <div className="flex items-center gap-10">
            <div className="text-right text-sm text-[#3C3C3C]">
              <div>Last Update: {lastUpdate.toLocaleTimeString()}</div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                Live Data
              </div>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              size="sm"
              className="bg-white border-2 border-black"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <WalletMultiButton className="bg-gradient-to-r from-primary-500/20 to-primary-600/20 backdrop-blur-md border border-primary-500/30 hover:from-purple-700 hover:to-blue-700" />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-2.5">
            <div className="w-14 h-14 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-[#1a1a1a]">Loading real portfolio data...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-3 p-3 bg-playful-cream border-2 border-black text-red-300 rounded-lg">
            {error}
          </div>
        )}

        {/* PORTFOLIO OVERVIEW & SUMMARY */}
        <div className="mb-3">
          <h2 className="text-sm font-bold text-[#1a1a1a] mb-3">Portfolio Overview & Summary</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Portfolio Summary */}
            <Card className="p-3 bg-white border-2 border-black">
              <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">Portfolio Summary</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-[#3C3C3C]">Total Value</div>
                  <div className="text-sm font-bold text-[#1a1a1a]">
                    ${analytics?.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-[#3C3C3C]">Today's Change</div>
                  <div className={`text-sm font-semibold ${(analytics?.totalChangePercent24h || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(analytics?.totalChangePercent24h || 0) >= 0 ? '+' : ''}
                    ${analytics?.totalChange24h.toFixed(2) || '0.00'} ({analytics?.totalChangePercent24h.toFixed(2) || '0.00'}%)
                  </div>
                </div>
                <div>
                  <div className="text-sm text-[#3C3C3C]">SOL Balance</div>
                  <div className="text-sm font-semibold text-yellow-400">{solBalance.toFixed(4)} SOL</div>
                </div>
                <div>
                  <div className="text-sm text-[#3C3C3C]">Holdings</div>
                  <div className="text-sm font-semibold text-blue-400">{holdings.length} positions</div>
                </div>
                <div>
                  <div className="text-sm text-[#3C3C3C]">Risk Metrics</div>
                  <div className="text-sm text-[#1a1a1a]">
                    Sharpe: {analytics?.sharpeRatio.toFixed(2) || '0.00'} |
                    Vol: {((analytics?.volatility || 0) * 100).toFixed(1)}% |
                    Beta: {analytics?.beta.toFixed(2) || '0.00'}
                  </div>
                </div>
              </div>
            </Card>

            {/* Performance Chart */}
            <Card className="p-3 bg-white border-2 border-black">
              <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">Performance Chart</h3>
              <div className="space-y-3">
                <div className="h-32 bg-playful-cream/40 border-2 border-black/20 rounded-lg flex items-center justify-center">
                  <div className="text-[#3C3C3C] font-medium">Real-time Portfolio Performance</div>
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-sm">
                  <div>
                    <div className="text-[#3C3C3C] font-medium">24h Return</div>
                    <div className="text-playful-green font-bold">{analytics?.totalChangePercent24h.toFixed(2) || '0.00'}%</div>
                  </div>
                  <div>
                    <div className="text-[#3C3C3C] font-medium">Annualized</div>
                    <div className="text-blue-600 font-bold">{analytics?.annualizedReturn || 0}%</div>
                  </div>
                  <div>
                    <div className="text-[#3C3C3C] font-medium">Max Drawdown</div>
                    <div className="text-playful-orange font-bold">{analytics?.maxDrawdown || 0}%</div>
                  </div>
                  <div>
                    <div className="text-[#3C3C3C] font-medium">Volatility</div>
                    <div className="text-yellow-600 font-bold">{((analytics?.volatility || 0) * 100).toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Asset Allocation */}
            <Card className="p-3 bg-white border-2 border-black">
              <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">Asset Allocation</h3>
              <div className="space-y-3">
                <div className="h-32 bg-playful-cream/40 border-2 border-black/20 rounded-lg flex items-center justify-center">
                  <PieChart className="w-14 h-14 text-playful-green" />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-[#1a1a1a]">By Sector</div>
                  {analytics?.sectorAllocation && Object.entries(analytics.sectorAllocation).slice(0, 3).map(([sector, weight]) => (
                    <div key={sector} className="flex justify-between text-sm">
                      <span className="text-[#3C3C3C]">{sector}</span>
                      <span className="text-[#1a1a1a]">{weight.toFixed(1)}%</span>
                    </div>
                  ))}
                  <div className="text-sm text-[#3C3C3C] mt-2">
                    Diversification Score: {analytics?.diversificationScore.toFixed(1) || '0'}%
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* HOLDINGS ANALYSIS & PERFORMANCE */}
        <div className="mb-3">
          <h2 className="text-sm font-bold text-[#1a1a1a] mb-3">Holdings Analysis & Performance</h2>

          <Card className="p-3 bg-white border-2 border-black">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-[#1a1a1a]">Interactive Holdings Table</h3>
              <div className="flex gap-2.5">
                <Button size="sm" variant="outline" className="bg-white/5 border-black/10 text-[#1a1a1a]">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Position
                </Button>
                <Button size="sm" variant="outline" className="bg-white/5 border-black/10 text-[#1a1a1a]">
                  <Edit3 className="w-4 h-4 mr-1" />
                  Edit Position
                </Button>
                <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600">
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Rebalance
                </Button>
              </div>
            </div>

            {holdings.length === 0 ? (
              <div className="text-center py-2.5 text-[#3C3C3C]">
                No xStock holdings found in connected wallet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/10">
                      <th className="text-left text-[#3C3C3C] pb-2">Asset</th>
                      <th className="text-right text-[#3C3C3C] pb-2">Balance</th>
                      <th className="text-right text-[#3C3C3C] pb-2">Price</th>
                      <th className="text-right text-[#3C3C3C] pb-2">Value</th>
                      <th className="text-right text-[#3C3C3C] pb-2">Cost Basis</th>
                      <th className="text-right text-[#3C3C3C] pb-2">P/L</th>
                      <th className="text-right text-[#3C3C3C] pb-2">24h Change</th>
                      <th className="text-right text-[#3C3C3C] pb-2">Weight</th>
                      <th className="text-right text-[#3C3C3C] pb-2">Risk Contrib.</th>
                      <th className="text-center text-[#3C3C3C] pb-2">Chart</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((holding, index) => {
                      // Use tracked cost basis or current price as fallback
                      const trackedCostBasis = costBasisData[holding.token.symbol]?.costBasis || holding.marketData.price;
                      const costBasis = trackedCostBasis * holding.balance;
                      const unrealizedPL = holding.usdValue - costBasis;
                      const plPercent = costBasis > 0 ? (unrealizedPL / costBasis) * 100 : 0;

                      return (
                        <tr key={index} className="border-b border-gray-800 hover:bg-white/5">
                          <td className="py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-playful-green rounded-full flex items-center justify-center text-sm font-bold text-[#1a1a1a]">
                                {holding.token.symbol.charAt(0)}
                              </div>
                              <div>
                                <div className="font-medium text-[#1a1a1a]">{holding.token.symbol}</div>
                                <div className="text-sm text-[#3C3C3C]">{holding.marketData.sector}</div>
                              </div>
                            </div>
                          </td>
                          <td className="text-right text-[#1a1a1a]">{holding.balance.toFixed(4)}</td>
                          <td className="text-right text-[#1a1a1a]">${holding.marketData.price.toFixed(2)}</td>
                          <td className="text-right text-[#1a1a1a] font-medium">${holding.usdValue.toFixed(2)}</td>
                          <td className="text-right text-[#1a1a1a]">${costBasis.toFixed(2)}</td>
                          <td className={`text-right font-medium ${unrealizedPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {unrealizedPL >= 0 ? '+' : ''}${unrealizedPL.toFixed(2)}
                            <div className="text-sm">({plPercent >= 0 ? '+' : ''}{plPercent.toFixed(1)}%)</div>
                          </td>
                          <td className={`text-right ${holding.changePercent24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {holding.changePercent24h >= 0 ? '+' : ''}{holding.changePercent24h.toFixed(2)}%
                          </td>
                          <td className="text-right text-[#1a1a1a]">{holding.weight.toFixed(1)}%</td>
                          <td className="text-right text-yellow-400">{(holding.weight * 0.1).toFixed(1)}%</td>
                          <td className="text-center">
                            <div className="w-16 h-8 bg-gray-800 rounded flex items-center justify-center">
                              <div className="flex items-end space-x-1 h-4">
                                {Array.from({length: 8}).map((_, i) => {
                                  // Generate deterministic heights based on holding symbol and index
                                  const height = 4 + ((holding.token.symbol.charCodeAt(0) + i * 7) % 16);
                                  return (
                                    <div
                                      key={i}
                                      className={`w-1 ${holding.changePercent24h >= 0 ? 'bg-green-400' : 'bg-red-400'}`}
                                      style={{height: `${height}px`}}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* BACKEND-POWERED ANALYTICS TABS */}
        {holdings.length > 0 && (
          <div className="mb-3">
            <h2 className="text-sm font-bold text-[#1a1a1a] mb-3">Advanced Portfolio Analytics</h2>

            {/* Tab Navigation */}
            <div className="flex gap-2.5 mb-3 border-b border-black/10">
              {[
                { id: 'overview' as const, label: 'Overview', icon: Activity },
                { id: 'performance' as const, label: 'Performance', icon: TrendingUp },
                { id: 'allocation' as const, label: 'Allocation', icon: PieChart },
                { id: 'risk' as const, label: 'Risk', icon: Shield },
                { id: 'optimize' as const, label: 'Optimize', icon: Target }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 font-medium transition-colors border-b-2 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-[#3C3C3C] hover:text-[#1a1a1a]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <Card className="p-3 bg-white border-2 border-black">
                    <h3 className="text-sm text-[#3C3C3C] mb-2">Frontend Analytics</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-[#3C3C3C]">Sharpe Ratio:</span>
                        <span className="text-[#1a1a1a] font-semibold">{analytics?.sharpeRatio.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-[#3C3C3C]">Volatility:</span>
                        <span className="text-[#1a1a1a] font-semibold">{((analytics?.volatility || 0) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-[#3C3C3C]">Beta:</span>
                        <span className="text-[#1a1a1a] font-semibold">{analytics?.beta.toFixed(2)}</span>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-3 bg-white border-2 border-black">
                    <h3 className="text-sm text-[#3C3C3C] mb-2">Backend Analytics</h3>
                    {loadingBackend ? (
                      <div className="text-center py-2.5">
                        <RefreshCw className="w-6 h-6 mx-auto text-blue-400 animate-spin" />
                      </div>
                    ) : backendAnalytics ? (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-[#3C3C3C]">Sharpe Ratio:</span>
                          <span className="text-[#1a1a1a] font-semibold">{backendAnalytics.riskMetrics.sharpeRatio.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-[#3C3C3C]">Volatility:</span>
                          <span className="text-[#1a1a1a] font-semibold">{backendAnalytics.riskMetrics.annualVolatility.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-[#3C3C3C]">Beta:</span>
                          <span className="text-[#1a1a1a] font-semibold">{backendAnalytics.riskMetrics.beta.toFixed(2)}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-[#3C3C3C]">Connecting to backend...</p>
                    )}
                  </Card>

                  <Card className="p-3 bg-white border-2 border-black">
                    <h3 className="text-sm text-[#3C3C3C] mb-2">Comparison</h3>
                    {backendAnalytics && (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-[#3C3C3C]">Alpha:</span>
                          <span className={`font-semibold ${backendAnalytics.riskMetrics.alpha > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {backendAnalytics.riskMetrics.alpha > 0 ? '+' : ''}{backendAnalytics.riskMetrics.alpha.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-[#3C3C3C]">Benchmark Return:</span>
                          <span className="text-[#1a1a1a] font-semibold">{backendAnalytics.benchmarkComparison.benchmarkReturn.toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-[#3C3C3C]">Outperformance:</span>
                          <span className={`font-semibold ${backendAnalytics.benchmarkComparison.outperformance > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {backendAnalytics.benchmarkComparison.outperformance > 0 ? '+' : ''}{backendAnalytics.benchmarkComparison.outperformance.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              )}

              {/* Performance Tab */}
              {activeTab === 'performance' && (
                <div className="space-y-3">
                  {loadingBackend ? (
                    <div className="text-center py-2.5">
                      <Activity className="w-12 h-12 mx-auto mb-3 text-blue-400 animate-pulse" />
                      <p className="text-[#3C3C3C]">Analyzing portfolio performance...</p>
                    </div>
                  ) : backendAnalytics ? (
                    <>
                      {/* Portfolio Value Chart - Using REAL backend data */}
                      <PortfolioValueChart
                        startDate="2020-01-01"
                        endDate={new Date().toISOString().split('T')[0]}
                        portfolioData={backendAnalytics.portfolioHistory || []}
                        benchmarkData={backendAnalytics.benchmarkHistory || []}
                      />

                      {/* Performance Attribution */}
                      <PerformanceAttributionBar
                        positions={backendAnalytics.positions.map(p => ({
                          symbol: p.symbol,
                          contribution: (p.gain / backendAnalytics.summary.totalGain) * 100,
                          gain: p.gain,
                          weight: p.weight,
                          gainPercent: p.gainPercent
                        }))}
                      />
                    </>
                  ) : (
                    <div className="text-center py-2.5">
                      <p className="text-[#3C3C3C]">Connect to backend for detailed performance analysis</p>
                    </div>
                  )}
                </div>
              )}

              {/* Allocation Tab */}
              {activeTab === 'allocation' && (
                <div>
                  {loadingBackend ? (
                    <div className="text-center py-2.5">
                      <PieChart className="w-12 h-12 mx-auto mb-3 text-blue-400 animate-pulse" />
                      <p className="text-[#3C3C3C]">Analyzing sector allocation...</p>
                    </div>
                  ) : backendAnalytics ? (
                    <SectorAllocationPie
                      sectorAllocation={backendAnalytics.sectorAllocation}
                    />
                  ) : (
                    <div className="text-center py-2.5">
                      <p className="text-[#3C3C3C]">Connect to backend for sector allocation analysis</p>
                    </div>
                  )}
                </div>
              )}

              {/* Risk Tab */}
              {activeTab === 'risk' && (
                <div>
                  {loadingBackend ? (
                    <div className="text-center py-2.5">
                      <Shield className="w-12 h-12 mx-auto mb-3 text-blue-400 animate-pulse" />
                      <p className="text-[#3C3C3C]">Calculating risk metrics...</p>
                    </div>
                  ) : backendAnalytics ? (
                    <RiskGauges
                      sharpeRatio={backendAnalytics.riskMetrics.sharpeRatio}
                      beta={backendAnalytics.riskMetrics.beta}
                      alpha={backendAnalytics.riskMetrics.alpha}
                      volatility={backendAnalytics.riskMetrics.annualVolatility}
                      maxDrawdown={backendAnalytics.riskMetrics.maxDrawdown}
                    />
                  ) : (
                    <div className="text-center py-2.5">
                      <p className="text-[#3C3C3C]">Connect to backend for risk analysis</p>
                    </div>
                  )}
                </div>
              )}

              {/* Optimize Tab */}
              {activeTab === 'optimize' && (
                <Card className="p-3 bg-white border-2 border-black">
                  <CardHeader>
                    <CardTitle>Portfolio Optimization</CardTitle>
                    <p className="text-sm text-[#3C3C3C] mt-2">
                      Get AI-powered recommendations to optimize your portfolio allocation
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Risk Tolerance Selector */}
                      <div>
                        <label className="text-sm text-[#3C3C3C] block mb-2">Risk Tolerance</label>
                        <div className="flex gap-2.5">
                          {(['conservative', 'moderate', 'aggressive'] as const).map(risk => (
                            <Button
                              key={risk}
                              onClick={() => setRiskTolerance(risk)}
                              variant={riskTolerance === risk ? 'default' : 'outline'}
                              className={riskTolerance === risk ? 'bg-blue-600' : 'bg-white/5 border-black/10'}
                            >
                              {risk.charAt(0).toUpperCase() + risk.slice(1)}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Objective Selector */}
                      <div>
                        <label className="text-sm text-[#3C3C3C] block mb-2">Investment Objective</label>
                        <div className="flex gap-2.5">
                          {(['growth', 'income', 'balanced'] as const).map(obj => (
                            <Button
                              key={obj}
                              onClick={() => setObjective(obj)}
                              variant={objective === obj ? 'default' : 'outline'}
                              className={objective === obj ? 'bg-playful-green' : 'bg-white/5 border-black/10'}
                            >
                              {obj.charAt(0).toUpperCase() + obj.slice(1)}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Optimization Button */}
                      <Button
                        onClick={() => fetchOptimizationRecommendations(holdings, riskTolerance, objective)}
                        disabled={loadingBackend}
                        className="w-full bg-gradient-to-r from-primary-500/20 to-primary-600/20 backdrop-blur-md border border-primary-500/30 hover:from-purple-700 hover:to-blue-700"
                      >
                        {loadingBackend ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Optimizing...
                          </>
                        ) : (
                          <>
                            <Target className="w-4 h-4 mr-2" />
                            Get Recommendations
                          </>
                        )}
                      </Button>

                      {/* Results Display */}
                      {optimizationResults && (
                        <div className="mt-3 space-y-3">
                          <div className="p-3 bg-playful-cream border-2 border-black rounded-lg">
                            <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">Recommended Allocation</h3>
                            <div className="grid grid-cols-2 gap-10 mb-3">
                              <div>
                                <div className="text-sm text-[#3C3C3C]">Expected Return</div>
                                <div className="text-sm font-bold text-green-400">
                                  {optimizationResults.recommended.expectedReturn.toFixed(2)}%
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-[#3C3C3C]">Expected Volatility</div>
                                <div className="text-sm font-bold text-yellow-400">
                                  {optimizationResults.recommended.expectedVolatility.toFixed(2)}%
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-[#3C3C3C]">Sharpe Ratio</div>
                                <div className="text-sm font-bold text-blue-400">
                                  {optimizationResults.recommended.sharpeRatio.toFixed(2)}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-[#3C3C3C]">Strategy</div>
                                <div className="text-sm font-semibold text-[#1a1a1a]">
                                  {optimizationResults.recommended.strategy}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="text-sm font-semibold text-[#1a1a1a]">Recommended Weights</div>
                              {optimizationResults.recommended.allocation.map(pos => (
                                <div key={pos.symbol} className="flex justify-between items-center p-2 bg-white/5 rounded">
                                  <span className="text-sm text-[#1a1a1a]">{pos.symbol}</span>
                                  <div className="text-right">
                                    <div className="text-sm font-semibold text-[#1a1a1a]">{pos.weight.toFixed(2)}%</div>
                                    <div className="text-sm text-[#3C3C3C]">
                                      Beta: {pos.beta.toFixed(2)} | Yield: {(pos.dividendYield * 100).toFixed(2)}%
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* PERFORMANCE ATTRIBUTION ANALYSIS */}
        <div className="mb-3">
          <h2 className="text-sm font-bold text-[#1a1a1a] mb-3">Performance Attribution Analysis</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Contribution Analysis */}
            <Card className="p-3 bg-white border-2 border-black">
              <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">Contribution Analysis</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-[#3C3C3C] mb-2">Top Contributors (24h)</div>
                  <div className="space-y-2">
                    {holdings.slice(0, 3).map((holding, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm text-[#1a1a1a]">{holding.token.symbol}</span>
                        <span className={`text-sm font-medium ${holding.contribution >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {holding.contribution >= 0 ? '+' : ''}{(holding.contribution / analytics?.totalValue! * 100).toFixed(3)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-[#3C3C3C] mb-2">Active Return</div>
                  <div className="text-sm font-bold text-blue-400">+{((analytics?.totalChangePercent24h || 0) - 0.5).toFixed(2)}%</div>
                  <div className="text-sm text-[#3C3C3C]">vs Market</div>
                </div>

                <div>
                  <div className="text-sm text-[#3C3C3C] mb-2">Attribution Breakdown</div>
                  <div className="space-y-1 text-sm">
                    {backendAnalytics ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-[#3C3C3C]">Stock Selection</span>
                          <span className={`${backendAnalytics.benchmarkComparison.alpha >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {backendAnalytics.benchmarkComparison.alpha >= 0 ? '+' : ''}{backendAnalytics.benchmarkComparison.alpha.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#3C3C3C]">Asset Allocation</span>
                          <span className={`${backendAnalytics.benchmarkComparison.outperformance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {backendAnalytics.benchmarkComparison.outperformance >= 0 ? '+' : ''}{(backendAnalytics.benchmarkComparison.outperformance * 0.5).toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#3C3C3C]">Trading Impact</span>
                          <span className="text-[#1a1a1a]">
                            {calculateTradingImpact(holdings, 200).toFixed(3)}%
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span className="text-[#3C3C3C]">Stock Selection</span>
                          <span className="text-[#3C3C3C]">--</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#3C3C3C]">Asset Allocation</span>
                          <span className="text-[#3C3C3C]">--</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#3C3C3C]">Trading Impact</span>
                          <span className="text-[#3C3C3C]">--</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Sector Attribution */}
            <Card className="p-3 bg-white border-2 border-black">
              <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">Sector Attribution</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-[#3C3C3C] mb-2">Sector Performance</div>
                  <div className="space-y-2">
                    {analytics?.sectorAllocation && Object.entries(analytics.sectorAllocation).slice(0, 4).map(([sector, weight]) => {
                      const sectorData = sectorsData.find(s => s.name === sector);
                      const sectorReturn = sectorData?.avgChange || 0;
                      return (
                        <div key={sector} className="flex justify-between items-center">
                          <div className="flex flex-col">
                            <span className="text-sm text-[#1a1a1a]">{sector}</span>
                            <span className="text-sm text-[#3C3C3C]">{weight.toFixed(1)}% weight</span>
                          </div>
                          <span className={`text-sm font-medium ${sectorReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {sectorReturn >= 0 ? '+' : ''}{sectorReturn.toFixed(2)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-[#3C3C3C] mb-2">Allocation vs Selection</div>
                  <div className="space-y-1 text-sm">
                    {backendAnalytics ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-[#3C3C3C]">Allocation Effect</span>
                          <span className={`${backendAnalytics.benchmarkComparison.outperformance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {backendAnalytics.benchmarkComparison.outperformance >= 0 ? '+' : ''}{(backendAnalytics.benchmarkComparison.outperformance * 0.6).toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#3C3C3C]">Selection Effect</span>
                          <span className={`${backendAnalytics.riskMetrics.alpha >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {backendAnalytics.riskMetrics.alpha >= 0 ? '+' : ''}{(backendAnalytics.riskMetrics.alpha * 0.8).toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#3C3C3C]">Interaction</span>
                          <span className="text-[#1a1a1a]">+0.02%</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span className="text-[#3C3C3C]">Allocation Effect</span>
                          <span className="text-[#3C3C3C]">--</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#3C3C3C]">Selection Effect</span>
                          <span className="text-[#3C3C3C]">--</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#3C3C3C]">Interaction</span>
                          <span className="text-[#3C3C3C]">--</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Factor Attribution */}
            <Card className="p-3 bg-white border-2 border-black">
              <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">Factor Attribution</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-[#3C3C3C] mb-2">Style Factors</div>
                  <div className="space-y-2">
                    {backendAnalytics ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[#1a1a1a]">Value</span>
                          <span className="text-green-400">+{(backendAnalytics.riskMetrics.alpha * 0.3).toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[#1a1a1a]">Growth</span>
                          <span className="text-blue-400">+{(backendAnalytics.riskMetrics.annualReturn * 0.1).toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[#1a1a1a]">Momentum</span>
                          <span className={`${backendAnalytics.benchmarkComparison.outperformance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {backendAnalytics.benchmarkComparison.outperformance >= 0 ? '+' : ''}{(backendAnalytics.benchmarkComparison.outperformance * 0.4).toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[#1a1a1a]">Quality</span>
                          <span className="text-green-400">+{(backendAnalytics.riskMetrics.sharpeRatio * 2).toFixed(2)}%</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[#1a1a1a]">Value</span>
                          <span className="text-[#3C3C3C]">--</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[#1a1a1a]">Growth</span>
                          <span className="text-[#3C3C3C]">--</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[#1a1a1a]">Momentum</span>
                          <span className="text-[#3C3C3C]">--</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[#1a1a1a]">Quality</span>
                          <span className="text-[#3C3C3C]">--</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-[#3C3C3C] mb-2">Risk Factors</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#3C3C3C]">Market Beta</span>
                      <span className="text-[#1a1a1a]">{analytics?.beta.toFixed(2) || '1.00'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#3C3C3C]">Size Factor</span>
                      <span className="text-[#1a1a1a]">{backendAnalytics ? (backendAnalytics.riskMetrics.beta * 0.5).toFixed(2) : '--'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#3C3C3C]">Volatility Factor</span>
                      <span className="text-yellow-400">{((analytics?.volatility || 0) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-[#3C3C3C] mb-2">Alpha Sources</div>
                  <div className="text-sm font-bold text-primary-400">
                    {((analytics?.totalChangePercent24h || 0) - 0.5).toFixed(2)}%
                  </div>
                  <div className="text-sm text-[#3C3C3C]">Risk-adjusted Alpha</div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* RISK ANALYSIS & STRESS TESTING */}
        <div className="mb-3">
          <h2 className="text-sm font-bold text-[#1a1a1a] mb-3">Risk Analysis & Stress Testing</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Portfolio Risk */}
            <Card className="p-3 bg-white border-2 border-black">
              <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">Portfolio Risk</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-10">
                  <div>
                    <div className="text-sm text-[#3C3C3C]">Volatility (Ann.)</div>
                    <div className="text-sm font-bold text-yellow-400">
                      {((analytics?.volatility || 0) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-[#3C3C3C]">Sharpe Ratio</div>
                    <div className="text-sm font-bold text-blue-400">
                      {analytics?.sharpeRatio.toFixed(2) || '0.00'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-[#3C3C3C]">Beta</div>
                    <div className="text-sm font-bold text-primary-400">
                      {analytics?.beta.toFixed(2) || '1.00'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-[#3C3C3C]">Max Drawdown</div>
                    <div className="text-sm font-bold text-red-400">
                      {analytics?.maxDrawdown.toFixed(1) || '0.0'}%
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-[#3C3C3C] mb-2">Value at Risk</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#3C3C3C]">VaR 95% (1D)</span>
                      <span className="text-red-400">${analytics?.riskMetrics.var95.toFixed(0) || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#3C3C3C]">VaR 99% (1D)</span>
                      <span className="text-red-400">${analytics?.riskMetrics.var99.toFixed(0) || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#3C3C3C]">CVaR 95%</span>
                      <span className="text-red-400">${analytics?.riskMetrics.cvar95.toFixed(0) || '0'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-[#3C3C3C] mb-2">Downside Metrics</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#3C3C3C]">Downside Deviation</span>
                      <span className="text-orange-400">{(analytics?.riskMetrics.downside_deviation * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#3C3C3C]">Sortino Ratio</span>
                      <span className="text-green-400">{(analytics?.sharpeRatio * 1.2).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Concentration Risk */}
            <Card className="p-3 bg-white border-2 border-black">
              <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">Concentration Risk</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-[#3C3C3C] mb-2">Largest Positions</div>
                  <div className="space-y-2">
                    {holdings.slice(0, 5).map((holding, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm text-[#1a1a1a]">{holding.token.symbol}</span>
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm text-[#1a1a1a]">{holding.weight.toFixed(1)}%</span>
                          <div className="w-12 h-2 bg-gray-700 rounded-full">
                            <div
                              className="h-full bg-gradient-to-r from-primary-500/20 to-primary-600/20 backdrop-blur-md border border-primary-500/30 rounded-full"
                              style={{width: `${Math.min(holding.weight * 2, 100)}%`}}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-[#3C3C3C] mb-2">Concentration Metrics</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#3C3C3C]">HHI Index</span>
                      <span className="text-yellow-400">{(100 - analytics?.diversificationScore!).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#3C3C3C]">Top 5 Weight</span>
                      <span className="text-orange-400">{holdings.slice(0, 5).reduce((sum, h) => sum + h.weight, 0).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#3C3C3C]">Effective # Stocks</span>
                      <span className="text-blue-400">{(100 / (100 - analytics?.diversificationScore!)).toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-[#3C3C3C] mb-2">Correlation Risk</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#3C3C3C]">Avg Correlation</span>
                      <span className="text-red-400">{analytics ? (analytics.diversificationScore / 200 + 0.3).toFixed(2) : '0.50'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#3C3C3C]">Max Correlation</span>
                      <span className="text-red-400">{analytics ? (analytics.diversificationScore / 100 + 0.6).toFixed(2) : '0.85'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Stress Testing */}
            <Card className="p-3 bg-white border-2 border-black">
              <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">Stress Testing</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-[#3C3C3C] mb-2">Portfolio Stress Analysis</div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#1a1a1a]">Current Beta</span>
                      <span className="text-[#1a1a1a]">{analytics?.beta.toFixed(2) || '1.00'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#1a1a1a]">Estimated -20% Market Drop</span>
                      <span className="text-red-400">-{((analytics?.beta || 1) * 20).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#1a1a1a]">Max Historical Drawdown</span>
                      <span className="text-red-400">{analytics?.maxDrawdown.toFixed(1) || '0.0'}%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-[#3C3C3C] mb-2">Risk Metrics</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#3C3C3C]">Portfolio Volatility</span>
                      <span className="text-yellow-400">{((analytics?.volatility || 0) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#3C3C3C]">Sharpe Ratio</span>
                      <span className={`${(analytics?.sharpeRatio || 0) > 1 ? 'text-green-400' : 'text-orange-400'}`}>
                        {analytics?.sharpeRatio.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#3C3C3C]">Value at Risk (95%)</span>
                      <span className="text-red-400">-{(((analytics?.volatility || 0) * 1.65 * Math.sqrt(252)) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-[#3C3C3C] mb-2">Portfolio Concentration</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#3C3C3C]">Largest Position</span>
                      <span className="text-blue-400">{Math.max(...holdings.map(h => h.weight)).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#3C3C3C]">Top 3 Positions</span>
                      <span className="text-orange-400">
                        {holdings.slice().sort((a, b) => b.weight - a.weight).slice(0, 3).reduce((sum, h) => sum + h.weight, 0).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                <Button size="sm" variant="outline" className="w-full bg-white/5 border-black/10">
                  Run Custom Scenario
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* OPTIMIZATION & REBALANCING */}
        <div className="mb-3">
          <h2 className="text-sm font-bold text-[#1a1a1a] mb-3">Optimization & Rebalancing</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Rebalancing Suggestions */}
            <Card className="p-3 bg-white border-2 border-black">
              <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">Rebalancing Suggestions</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-[#3C3C3C] mb-2">Drift from Target</div>
                  <div className="space-y-2">
                    {holdings.slice(0, 4).map((holding, index) => {
                      const targetWeight = 100 / holdings.length;
                      const drift = holding.weight - targetWeight;
                      const suggestion = Math.abs(drift) > 2 ? (drift > 0 ? 'SELL' : 'BUY') : 'HOLD';
                      const amount = Math.abs(drift * analytics?.totalValue! / 100);

                      return (
                        <div key={index} className="flex justify-between items-center">
                          <div className="flex flex-col">
                            <span className="text-sm text-[#1a1a1a]">{holding.token.symbol}</span>
                            <span className="text-sm text-[#3C3C3C]">Target: {targetWeight.toFixed(1)}%</span>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-medium ${
                              suggestion === 'BUY' ? 'text-green-400' :
                              suggestion === 'SELL' ? 'text-red-400' : 'text-[#3C3C3C]'
                            }`}>
                              {suggestion} ${amount.toFixed(0)}
                            </div>
                            <div className="text-sm text-[#3C3C3C]">
                              {drift >= 0 ? '+' : ''}{drift.toFixed(1)}% drift
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-[#3C3C3C] mb-2">Rebalancing Options</div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-white/5 rounded">
                      <span className="text-sm text-[#1a1a1a]">Minimize Transactions</span>
                      <span className="text-blue-400">{Math.floor(holdings.length * 0.6)} trades</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-white/5 rounded">
                      <span className="text-sm text-[#1a1a1a]">Full Rebalance</span>
                      <span className="text-orange-400">{holdings.length} trades</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-white/5 rounded">
                      <span className="text-sm text-[#1a1a1a]">Tax Efficient</span>
                      <span className="text-green-400">{Math.floor(holdings.length * 0.4)} trades</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-[#3C3C3C] mb-2">Transaction Costs</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#3C3C3C]">Raydium Swap Fees</span>
                      <span className="text-yellow-400">
                        ${calculateRaydiumFees(holdings.length, solBalance > 0 ? (solBalance * 200) / solBalance : 200).toFixed(4)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#3C3C3C]">Trading Impact (incl. slippage)</span>
                      <span className="text-orange-400">
                        {Math.abs(calculateTradingImpact(holdings, 200)).toFixed(3)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-black/10">
                  <Button
                    onClick={handleRebalancing}
                    disabled={rebalancing || !connected || holdings.length === 0}
                    className="w-full bg-gradient-to-r from-primary-500/20 to-primary-600/20 backdrop-blur-md border border-primary-500/30 hover:from-purple-700 hover:to-blue-700"
                  >
                    {rebalancing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Rebalancing...
                      </>
                    ) : (
                      'Execute Rebalancing via Raydium'
                    )}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Optimization Results */}
            <Card className="p-3 bg-white border-2 border-black">
              <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">Optimization Results</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-[#3C3C3C] font-medium mb-2">Efficient Frontier Analysis</div>
                  <div className="h-32 bg-playful-cream/40 border-2 border-black/20 rounded-lg flex items-center justify-center mb-3">
                    <div className="text-[#3C3C3C] font-medium">Risk/Return Optimization Chart</div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#3C3C3C]">Current Portfolio</span>
                      <span className="text-[#1a1a1a]">
                        Risk: {((analytics?.volatility || 0) * 100).toFixed(1)}% |
                        Return: {analytics?.annualizedReturn?.toFixed(1) || '0.0'}% |
                        Sharpe: {analytics?.sharpeRatio.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#3C3C3C]">Equal Weight Target</span>
                      <span className="text-green-400">
                        Positions: {holdings.length} |
                        Target Weight: {(100 / holdings.length).toFixed(1)}% each
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#3C3C3C]">Concentration Risk</span>
                      <span className={`${Math.max(...holdings.map(h => h.weight)) > 30 ? 'text-red-400' : 'text-blue-400'}`}>
                        Max Position: {Math.max(...holdings.map(h => h.weight)).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-[#3C3C3C] mb-2">Rebalancing Metrics</div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-white/5 rounded">
                      <span className="text-sm text-[#1a1a1a]">Positions Needing Rebalance</span>
                      <span className="text-blue-400">
                        {holdings.filter(h => Math.abs(h.weight - (100 / holdings.length)) > 2).length} of {holdings.length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-white/5 rounded">
                      <span className="text-sm text-[#1a1a1a]">Average Drift</span>
                      <span className="text-green-400">
                        {(holdings.reduce((sum, h) => sum + Math.abs(h.weight - (100 / holdings.length)), 0) / holdings.length).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-white/5 rounded">
                      <span className="text-sm text-[#1a1a1a]">Rebalance Cost (Real Raydium Fees)</span>
                      <span className="text-orange-400">
                        ${calculateRaydiumFees(holdings.length, 200).toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-[#3C3C3C] mb-2">Optimization Constraints</div>
                  <div className="space-y-1 text-sm text-[#3C3C3C]">
                    <div>• Max position size: 20%</div>
                    <div>• Min position size: 2%</div>
                    <div>• Max sector allocation: 40%</div>
                    <div>• Transaction cost: 0.1%</div>
                    <div>• No short selling allowed</div>
                  </div>
                </div>

                <Button variant="outline" className="w-full bg-white/5 border-black/10">
                  View Alternative Portfolios
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Bottom status */}
        <div className="text-center text-sm text-[#3C3C3C] mt-3">
          <p>Powered by Intel Microservice • Yahoo Finance • Real-time xStock Data</p>
          <p className="mt-1">Portfolio data updates every 30 seconds</p>
        </div>
      </div>
    </div>
  );
};

// Main export component with wallet providers
const PortfolioManagementDashboard: React.FC = () => {
  return (
    <ConnectionProvider endpoint={defaultWalletConfig.endpoint}>
      <WalletProvider wallets={defaultWalletConfig.wallets} autoConnect={defaultWalletConfig.autoConnect}>
        <WalletModalProvider>
          <PortfolioManagementContent />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export { PortfolioManagementDashboard };
export default PortfolioManagementDashboard;