import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
// Select component will be replaced with HTML select for now
import { cn } from '../../lib/utils';
import { useMarketData } from '../../contexts/MarketDataContext';
import { BacktestChart } from './Quantitative/BacktestChart';
import { EfficientFrontierChart } from './Quantitative/EfficientFrontierChart';
import { MonteCarloChart } from './Quantitative/MonteCarloChart';
import { RiskMetricsDashboard } from './Quantitative/RiskMetricsDashboard';
import { QuantitativeAPI } from '../../services/quantitativeApi';
import { ENV, API } from '../../config/env';
import {
  BarChart3,
  Activity,
  Target,
  TrendingUp,
  Calculator,
  Shuffle,
  Brain,
  Settings,
  Play,
  Pause,
  RefreshCw,
  Download,
  Upload,
  AlertTriangle,
  TrendingDown,
  PieChart,
  LineChart,
  Zap,
  Database,
  Filter,
  ArrowUpDown,
  Eye,
  GitBranch,
  Layers,
  Globe,
  Shield,
  Gauge
} from 'lucide-react';

// All 63 xStocks available - Official list from tokens.json
const XSTOCKS_SYMBOLS = [
  'AAPLx', 'ABBVx', 'ABTx', 'ACNx', 'AMBRx', 'AMZNx', 'APPx', 'AVGOx', 'AZNx',
  'BACx', 'BRK.Bx', 'CMCSAx', 'COINx', 'CRCLx', 'CRMx', 'CRWDx', 'CSCOx', 'CVXx',
  'DFDVx', 'DHRx', 'GLDx', 'GMEx', 'GOOGLx', 'GSx', 'HDx', 'HONx', 'HOODx',
  'IBMx', 'INTCx', 'JNJx', 'JPMx', 'KOx', 'LINx', 'LLYx', 'MAx', 'MCDx', 'MDTx',
  'METAx', 'MRKx', 'MRVLx', 'MSFTx', 'MSTRx', 'NFLXx', 'NVDAx', 'NVOx', 'OPENx',
  'ORCLx', 'PEPx', 'PFEx', 'PGx', 'PLTRx', 'PMx', 'QQQx', 'SPYx', 'TBLLx',
  'TMOx', 'TQQQx', 'TSLAx', 'UNHx', 'VTIx', 'Vx', 'WMTx', 'XOMx'
];

// Tool types for the analytics platform
type AnalyticsTool =
  | 'backtesting'
  | 'portfolio-optimization'
  | 'correlation-analysis'
  | 'risk-metrics'
  | 'monte-carlo';

// Real data interfaces
interface StockPrice {
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose: number;
}

interface BacktestResult {
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  calmarRatio: number;
  winRate: number;
  profitFactor: number;
  averageGain: number;
  averageLoss: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgTradeDuration: number;
  alpha: number;
  beta: number;
  informationRatio: number;
  sortinoRatio: number;
  trades: Array<{
    date: string;
    symbol: string;
    action: 'BUY' | 'SELL';
    price: number;
    quantity: number;
    pnl: number;
  }>;
  portfolioHistory: Array<{
    date: string;
    value: number;
    benchmark: number;
  }>;
}

interface PortfolioOptimization {
  efficientFrontier: Array<{
    risk: number;
    return: number;
    weights: { [symbol: string]: number };
  }>;
  optimalPortfolio: {
    weights: { [symbol: string]: number };
    expectedReturn: number;
    volatility: number;
    sharpeRatio: number;
  };
  minVariancePortfolio: {
    weights: { [symbol: string]: number };
    expectedReturn: number;
    volatility: number;
    sharpe?: number;
  };
  maxSharpePortfolio: {
    weights: { [symbol: string]: number };
    expectedReturn: number;
    volatility: number;
    sharpeRatio: number;
  };
}

interface CorrelationAnalysis {
  correlationMatrix: { [symbol: string]: { [symbol: string]: number } };
  clusters: Array<{
    name: string;
    stocks: string[];
    avgCorrelation: number;
  }>;
  principalComponents: Array<{
    component: number;
    variance: number;
    cumulativeVariance: number;
    loadings: { [symbol: string]: number };
  }>;
  hierarchicalClustering: {
    dendrogram: any; // Tree structure
    distances: number[];
  };
}

interface RiskMetrics {
  var: {
    historical: { [confidence: string]: number };
    parametric: { [confidence: string]: number };
    monteCarlo: { [confidence: string]: number };
    conditional: { [confidence: string]: number };
  };
  stressTesting: {
    scenarios: Array<{
      name: string;
      description: string;
      portfolioReturn: number;
      probability: number;
    }>;
    extremeEvents: Array<{
      date: string;
      event: string;
      marketReturn: number;
      portfolioReturn: number;
      impact: number;
    }>;
  };
  factorExposure: {
    styleFactors: { [factor: string]: number };
    sectorFactors: { [sector: string]: number };
    riskContribution: { [symbol: string]: number };
  };
}

interface MonteCarloParams {
  numSimulations: number;
  timeHorizon: number;
  initialValue: number;
  confidenceLevel: number;
}

interface MonteCarloResults {
  statistics: {
    mean: number;
    median: number;
    standardDeviation: number;
    std: number;
    minimum: number;
    min: number;
    maximum: number;
    max: number;
    percentile5: number;
    percentile25: number;
    percentile75: number;
    percentile95: number;
    probPositive: number;
  };
  percentiles: {
    [percentile: string]: number;
  };
  riskMetrics: {
    var: { [confidence: string]: number };
    conditionalVar: { [confidence: string]: number };
    probabilityOfLoss: number;
    expectedShortfall: number;
  };
  scenarios: Array<{
    name: string;
    finalValue: number;
    return: number;
  }>;
  samplePaths: Array<{
    date: string;
    [key: string]: number | string; // path1-20, percentile5-95
  }>;
  distribution?: Array<{
    bin: string;
    count: number;
  }>;
  initialCapital: number;
  years: number;
  simulations: number;
}

interface BlackLittermanResults {
  impliedReturns: { [symbol: string]: number };
  updatedReturns: { [symbol: string]: number };
  posteriorCovariance: number[][];
  views: Array<{
    assets: string[];
    expectedReturn: number;
    confidence: number;
    description: string;
  }>;
  optimizedWeights: { [symbol: string]: number };
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
}

interface FactorAnalysisResults {
  models: {
    capm: {
      alpha: number;
      beta: number;
      rSquared: number;
      sharpeRatio: number;
      treynorRatio: number;
      trackingError: number;
    };
    famaFrench3: {
      alpha: number;
      marketBeta: number;
      sizeBeta: number;
      valueBeta: number;
      rSquared: number;
    };
    famaFrench5: {
      alpha: number;
      marketBeta: number;
      sizeBeta: number;
      valueBeta: number;
      profitabilityBeta: number;
      investmentBeta: number;
      rSquared: number;
    };
  };
  riskAttribution: {
    systematicRisk: number;
    idiosyncraticRisk: number;
    totalRisk: number;
  };
  factorExposures: {
    [factorName: string]: number;
  };
  performanceAttribution: {
    [factorName: string]: number;
  };
}

// Tool configuration
const analyticsTools = [
  {
    id: 'backtesting' as AnalyticsTool,
    title: 'Backtesting',
    description: 'Strategy backtesting with performance analysis',
    icon: <Activity className="w-5 h-5" />,
    color: 'from-blue-500 to-cyan-500',
    badge: 'Advanced'
  },
  {
    id: 'portfolio-optimization' as AnalyticsTool,
    title: 'Portfolio Optimization',
    description: 'Modern portfolio theory and efficient frontier',
    icon: <Target className="w-5 h-5" />,
    color: 'from-green-500 to-emerald-500',
    badge: 'MPT'
  },
  {
    id: 'correlation-analysis' as AnalyticsTool,
    title: 'Correlation Analysis',
    description: 'Correlation matrix and clustering analysis',
    icon: <GitBranch className="w-5 h-5" />,
    color: 'primary',
    badge: 'Stats'
  },
  {
    id: 'risk-metrics' as AnalyticsTool,
    title: 'Risk Metrics',
    description: 'VaR, CVaR, Sharpe, Sortino, Beta, Alpha',
    icon: <Shield className="w-5 h-5" />,
    color: 'from-red-500 to-orange-500',
    badge: 'Risk'
  },
  {
    id: 'monte-carlo' as AnalyticsTool,
    title: 'Monte Carlo',
    description: 'Monte Carlo simulations and scenarios',
    icon: <Shuffle className="w-5 h-5" />,
    color: 'from-yellow-500 to-orange-500',
    badge: 'Simulation'
  }
];

// Fetch real historical prices from backend API
const fetchHistoricalPrices = async (
  symbols: string[],
  startDate: string,
  endDate: string
): Promise<{ [symbol: string]: StockPrice[] }> => {
  try {
    // Convert xStock symbols to real symbols (remove 'x' suffix)
    // e.g., "AVGOx" -> "AVGO", "AAPLx" -> "AAPL"
    const realSymbols = symbols.map(s => s.endsWith('x') ? s.slice(0, -1) : s);

    const response = await fetch(`${ENV.INTEL_API_URL}/api/market/historical/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols: realSymbols, startDate, endDate })
    });

    if (!response.ok) throw new Error("Failed to fetch historical data");

    const apiResult = await response.json();
    if (!apiResult.success) throw new Error("Invalid response from server");

    const historicalData: { [symbol: string]: StockPrice[] } = {};
    // Map back to xStock symbols for consistency
    for (let i = 0; i < symbols.length; i++) {
      const xStockSymbol = symbols[i];
      const realSymbol = realSymbols[i];
      const symbolData = apiResult.data[realSymbol];

      if (Array.isArray(symbolData) && apiResult.data.length > 0) {
        historicalData[xStockSymbol] = (symbolData as any[]).map(item => ({
          symbol: xStockSymbol,
          date: item.date,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume,
          adjustedClose: item.adjustedClose
        }));
      }
    }
    return historicalData;
  } catch (error) {
 console.error("Error fetching real historical prices:", error);
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
    return {};
  }
};

// Mathematical utility functions
const calculateReturns = (prices: number[]): number[] => {
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  return returns;
};

const calculateVolatility = (returns: number[], annualize = true): number => {
  if (returns.length < 2) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / (returns.length - 1);
  const volatility = Math.sqrt(variance);
  return annualize ? volatility * Math.sqrt(252) : volatility;
};

const calculateSharpeRatio = (returns: number[], riskFreeRate = 0.02): number => {
  if (returns.length < 2) return 0;
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length * 252;
  const volatility = calculateVolatility(returns, true);
  if (volatility === 0) return 0;
  return (meanReturn - riskFreeRate) / volatility;
};

const calculateMaxDrawdown = (portfolioValues: number[]): number => {
  if (portfolioValues.length < 2) return 0;
  let maxDrawdown = 0;
  let peak = portfolioValues[0];

  for (let i = 1; i < portfolioValues.length; i++) {
    if (portfolioValues[i] > peak) {
      peak = portfolioValues[i];
    } else {
      const drawdown = (peak - portfolioValues[i]) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
  }

  return maxDrawdown;
};

const calculateCorrelationMatrix = (returns: { [symbol: string]: number[] }): { [symbol: string]: { [symbol: string]: number } } => {
  const symbols = Object.keys(returns);
  const matrix: { [symbol: string]: { [symbol: string]: number } } = {};

  for (const symbol1 of symbols) {
    matrix[symbol1] = {};
    for (const symbol2 of symbols) {
      if (symbol1 === symbol2) {
        matrix[symbol1][symbol2] = 1;
      } else {
        const corr = calculateCorrelation(returns[symbol1], returns[symbol2]);
        matrix[symbol1][symbol2] = corr;
      }
    }
  }

  return matrix;
};

const calculateCorrelation = (x: number[], y: number[]): number => {
  const n = Math.min(x.length, y.length);
  const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let sumXSquared = 0;
  let sumYSquared = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    sumXSquared += dx * dx;
    sumYSquared += dy * dy;
  }

  const denominator = Math.sqrt(sumXSquared * sumYSquared);
  return denominator === 0 ? 0 : numerator / denominator;
};

const calculateVaR = (returns: number[], confidence = 0.95): number => {
  const sortedReturns = [...returns].sort((a, b) => a - b);
  const index = Math.floor((1 - confidence) * sortedReturns.length);
  return Math.abs(sortedReturns[index]);
};

const QuantitativeAnalyticsTools: React.FC = () => {
  // Use shared market data context - no API calls needed!
  const { allStocks, isLoading: contextLoading } = useMarketData();

  // State management
  const [activeTool, setActiveTool] = useState<AnalyticsTool>('backtesting');
  const [isLoading, setIsLoading] = useState(false);
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(['AAPLx', 'MSFTx', 'GOOGLx', 'AMZNx', 'NVDAx']);

  // Portfolio optimization section state (MPT or BL)
  const [activeOptimizationSection, setActiveOptimizationSection] = useState<'mpt' | 'bl'>('mpt');

  // Analytics results state
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [portfolioOptimization, setPortfolioOptimization] = useState<PortfolioOptimization | null>(null);
  const [correlationAnalysis, setCorrelationAnalysis] = useState<CorrelationAnalysis | null>(null);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [monteCarloResults, setMonteCarloResults] = useState<MonteCarloResults | null>(null);
  const [blackLittermanResults, setBlackLittermanResults] = useState<BlackLittermanResults | null>(null);
  const [factorAnalysisResults, setFactorAnalysisResults] = useState<FactorAnalysisResults | null>(null);
  const [lastOptimizationMethod, setLastOptimizationMethod] = useState<'mpt' | 'black-litterman' | null>(null);

  // Parameters state
  const [backtestParams, setBacktestParams] = useState({
    startDate: '2023-01-01',
    endDate: '2024-01-01',
    initialCapital: 100000,
    strategy: 'mean-reversion',
    benchmark: 'AAPLx', // Configurable benchmark (default to first xStock)
    lookbackPeriod: 20,
    entryThreshold: -2,
    exitThreshold: 0,
    stopLoss: 0.05,
    positionSize: 0.1
  });

  const [monteCarloParams, setMonteCarloParams] = useState<MonteCarloParams>({
    numSimulations: 10000,
    timeHorizon: 252, // 1 year in trading days
    initialValue: 100000,
    confidenceLevel: 0.95
  });

  // Black-Litterman investor views state - Auto-populate with first 3 selected stocks
  const [investorViews, setInvestorViews] = useState([
    { symbol: 'AAPLx', expectedReturn: 10, confidence: 80, description: 'View 1' },
    { symbol: 'MSFTx', expectedReturn: 10, confidence: 80, description: 'View 2' },
    { symbol: 'GOOGLx', expectedReturn: 10, confidence: 80, description: 'View 3' }
  ]);

  // Auto-sync investor views with selected symbols - prefill ALL selected stocks
  useEffect(() => {
    if (selectedSymbols.length > 0) {
      // Create views for ALL selected stocks with default ER=10 and Confidence=80
      const newViews = selectedSymbols.map((symbol, index) => ({
        symbol,
        expectedReturn: 10,
        confidence: 80,
        description: `View ${index + 1}`
      }));
      setInvestorViews(newViews);
    }
  }, [selectedSymbols.join(',')]); // Use join to create a stable dependency

  // Independent date ranges for MPT and Black-Litterman
  const [mptDateRange, setMptDateRange] = useState({
    startDate: '2023-01-01',
    endDate: '2024-01-01'
  });

  const [blDateRange, setBlDateRange] = useState({
    startDate: '2023-01-01',
    endDate: '2024-01-01'
  });

  // Load available symbols - Use hardcoded XSTOCKS_SYMBOLS for reliability
  useEffect(() => {
    // Use the official 63 xStocks list directly instead of fetching
    setAvailableSymbols(XSTOCKS_SYMBOLS);
    console.log(`✅ Loaded ${XSTOCKS_SYMBOLS.length} official xStock symbols for quantitative analysis`);

    // Optional: Validate against backend (but don't rely on it for UI)
    const validateSymbols = async () => {
      try {
        const response = await fetch(API.intel.allXStocks);
        if (!response.ok) return;

        const apiResponse = await response.json();
        const backendSymbols = Object.keys(apiResponse);
        console.log(`📊 Backend has ${backendSymbols.length} symbols available`);
      } catch (error) {
        console.warn('Could not validate symbols with backend (non-critical):', error);
      }
    };

    validateSymbols(); // Non-blocking validation
  }, []);

  // ========================================
  // NEW ARCHITECTURE: Time-synchronized backtesting
  // ========================================

  // Portfolio snapshot for tracking state at each date
  interface PortfolioSnapshot {
    date: string;
    cash: number;
    positions: { [symbol: string]: { shares: number; entryPrice: number; currentPrice: number } };
    portfolioValue: number;
    benchmarkValue: number;
  }

  // Align all historical data to common timeline
  const alignHistoricalData = (
    historicalData: { [symbol: string]: StockPrice[] },
    symbols: string[],
    benchmark: string
  ): {
    dates: string[];
    aligned: { [symbol: string]: { [date: string]: StockPrice } };
  } => {
    // Get all unique dates from all symbols
    const allDatesSet = new Set<string>();
    for (const symbol of [...symbols, benchmark]) {
      const prices = historicalData[symbol];
      if (prices) {
        prices.forEach(p => allDatesSet.add(p.date));
      }
    }

    // Sort dates chronologically
    const dates = Array.from(allDatesSet).sort();

    // Create aligned data structure
    const aligned: { [symbol: string]: { [date: string]: StockPrice } } = {};
    for (const symbol of [...symbols, benchmark]) {
      aligned[symbol] = {};
      const prices = historicalData[symbol] || [];

      // Create a map of date -> price for quick lookup
      const priceMap = new Map<string, StockPrice>();
      prices.forEach(p => priceMap.set(p.date, p));

      // Fill aligned data, forward-filling missing dates
      let lastKnownPrice: StockPrice | null = null;
      for (const date of dates) {
        const price = priceMap.get(date);
        if (price) {
          lastKnownPrice = price;
          aligned[symbol][date] = price;
        } else if (lastKnownPrice) {
          // Forward fill with last known price
          aligned[symbol][date] = { ...lastKnownPrice, date };
        }
      }
    }

    return { dates, aligned };
  };

  // Run backtesting analysis
  const runBacktest = async () => {
    setIsLoading(true);
    try {
 console.log(' Running REAL backtest via backend...');

      // Run historical backtest simulation


      // NOTE: Backtest assumes no slippage - real results will vary
      // @emma 2024-08-22


      const backtestResults = await QuantitativeAPI.runBacktest(
        selectedSymbols,
        backtestParams.startDate,
        backtestParams.endDate,
        backtestParams.initialCapital,
        backtestParams.strategy as 'mean-reversion' | 'momentum' | 'breakout',
        {
          lookbackPeriod: backtestParams.lookbackPeriod,
          entryThreshold: backtestParams.entryThreshold,
          exitThreshold: backtestParams.exitThreshold,
          stopLoss: backtestParams.stopLoss,
          positionSize: backtestParams.positionSize
        },
        backtestParams.benchmark // Keep xStock format
      ) as any;

      console.log('📦 RAW Backtest API Response:', backtestResults);
      console.log('🔍 DEBUG INFO:', {
        symbols: backtestResults.symbols,
        dataPoints: backtestResults.chart?.length || 0,
        timestamp: new Date(backtestResults.timestamp).toISOString(),
        debug: backtestResults._debug
      });

      // Validate response structure
      if (!backtestResults || !backtestResults.chart) {
        throw new Error(`Invalid backtest response structure: ${JSON.stringify(backtestResults).substring(0, 200)}`);
      }

      // CACHE DETECTION: Check if we're getting the same data
      if (backtestResults._debug) {
        console.log('🔎 CACHE CHECK:');
        console.log('   - Request hash:', backtestResults._debug.requestHash);
        console.log('   - Generated at:', backtestResults._debug.generatedAt);
        console.log('   - Data points:', backtestResults._debug.dataPoints);
        console.log('   - Symbols processed:', backtestResults._debug.symbolsProcessed);
      }

      // Backend returns 'chart' array with portfolioValue, not 'portfolioHistory'
      const equityCurve = backtestResults.chart.map((item: any) => ({
        date: item.date,
        value: item.portfolioValue,
        benchmark: item.portfolioValue // TODO: add real benchmark data
      }));

      // Calculate drawdown from equity curve
      const initialCapital = backtestResults.performance.initialCapital;
      let maxValue = initialCapital;
      const drawdownData = equityCurve.map((item: any) => {
        maxValue = Math.max(maxValue, item.value);
        const drawdown = ((item.value - maxValue) / maxValue) * 100;
        return {
          date: item.date,
          drawdown
        };
      });

      const backtestResult = {
        totalReturn: backtestResults.performance.totalReturn,
        annualizedReturn: backtestResults.performance.annualReturn,
        volatility: backtestResults.performance.annualVolatility,
        sharpeRatio: backtestResults.performance.sharpeRatio,
        sortinoRatio: backtestResults.performance.sortinoRatio,
        maxDrawdown: backtestResults.performance.maxDrawdown,
        winRate: backtestResults.performance.winRate,
        portfolioHistory: backtestResults.chart,
        equityCurve,
        drawdownData,
        trades: [],
        strategyParams: backtestParams,
        // Add missing properties
        calmarRatio: backtestResults.performance.calmarRatio || 0,
        profitFactor: backtestResults.performance.profitFactor || 0,
        averageGain: backtestResults.performance.averageGain || 0,
        averageLoss: backtestResults.performance.averageLoss || 0,
        totalTrades: backtestResults.performance.totalTrades || 0,
        winningTrades: backtestResults.performance.winningTrades || 0,
        losingTrades: backtestResults.performance.losingTrades || 0,
        bestTrade: backtestResults.performance.bestTrade || 0,
        worstTrade: backtestResults.performance.worstTrade || 0,
        avgTradeDuration: backtestResults.performance.averageTradeDuration || 0,
        averageTradeDuration: backtestResults.performance.averageTradeDuration || 0,
        returnDistribution: backtestResults.performance.returnDistribution || [],
        alpha: backtestResults.performance.alpha || 0,
        beta: backtestResults.performance.beta || 1,
        informationRatio: backtestResults.performance.informationRatio || 0
      };

 console.log(' Backtest result being set:', backtestResult);
 console.log(' Equity curve data:', equityCurve.slice(0, 5));
 console.log(' Drawdown data:', drawdownData.slice(0, 5));

      setBacktestResult(backtestResult);

 console.log(' REAL backtest complete!');

    } catch (error) {
 console.error(' Backtest error:', error);
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
      alert(`Backtest failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Run correlation analysis
  const runCorrelationAnalysis = async () => {
    setIsLoading(true);
    try {
 console.log(' Running REAL correlation analysis via backend...');

      // Calculate Pearson correlation matrix across portfolio holdings


      // FIXME: Should we use Spearman rank correlation instead for non-normal distributions?
      // @nchedo 2024-08-28


      const correlationApiResponse = await QuantitativeAPI.runCorrelationAnalysis(
        selectedSymbols,
        backtestParams.startDate,
        backtestParams.endDate
      );

      // Transform backend matrix format to correlationMatrix format
      const correlationMatrix: { [key: string]: { [key: string]: number } } = {};
      correlationApiResponse.matrix.forEach((row) => {
        row.forEach((cell) => {
          if (!correlationMatrix[cell.symbol1]) {
            correlationMatrix[cell.symbol1] = {};
          }
          correlationMatrix[cell.symbol1][cell.symbol2] = cell.correlation;
        });
      });

      setCorrelationAnalysis({
        correlationMatrix,
        clusters: (correlationApiResponse.clusters || []).map((cluster: any, idx: number) => ({
          name: `Cluster ${idx + 1}`,
          stocks: cluster.stocks,
          avgCorrelation: cluster.averageCorrelation
        })),
        principalComponents: (correlationApiResponse.principalComponents || []).map((pc: any) => ({
          component: pc.id,
          variance: pc.varianceExplained,
          cumulativeVariance: pc.cumulativeVariance,
          loadings: pc.topContributors.reduce((acc: any, contrib: any) => {
            acc[contrib.symbol] = contrib.loading;
            return acc;
          }, {})
        })),
        hierarchicalClustering: {
          dendrogram: {},
          distances: []
        }
      });

 console.log('[SUCCESS] REAL correlation analysis complete');
 console.log('[DATA] Highest correlations:', correlationApiResponse.highestCorrelations);
 console.log('[DATA] Lowest correlations:', correlationApiResponse.lowestCorrelations);
 console.log('[DATA] Clusters:', correlationApiResponse.clusters);
 console.log('[DATA] Principal Components:', correlationApiResponse.principalComponents);

    } catch (error) {
 console.error(' Correlation analysis error:', error);
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
      alert(`Correlation analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Run portfolio optimization
  const runPortfolioOptimization = async () => {
    setIsLoading(true);
    try {
 console.log(' Running REAL portfolio optimization via backend...');

      // Run mean-variance optimization (Markowitz model)


      // WARNING: This assumes returns are normally distributed (they\'re not)


      // Consider adding robust optimization in the future - STOCK-2922
      // @justin 2024-09-05


      const result = await QuantitativeAPI.optimizePortfolio(
        selectedSymbols,
        mptDateRange.startDate,
        mptDateRange.endDate,
        0.0,
        0.5,
        1000
      ) as any;

      // Validate API response
      const minVolPortfolio = result.minVolatilityPortfolio || result.minRiskPortfolio;
      if (!result || !result.efficientFrontier || !result.maxSharpePortfolio || !minVolPortfolio) {
        throw new Error(`Invalid portfolio optimization response: ${JSON.stringify(result).substring(0, 200)}`);
      }

      setPortfolioOptimization({
        efficientFrontier: result.efficientFrontier.map((p: any) => ({
          return: p.return || p.expectedReturn,
          risk: p.volatility,
          volatility: p.volatility,
          sharpe: p.sharpe,
          weights: p.weights
        })),
        optimalPortfolio: {
          weights: result.maxSharpePortfolio.weights,
          expectedReturn: result.maxSharpePortfolio.expectedReturn,
          volatility: result.maxSharpePortfolio.volatility,
          sharpeRatio: result.maxSharpePortfolio.sharpe
        },
        minVariancePortfolio: {
          weights: minVolPortfolio.weights,
          expectedReturn: minVolPortfolio.expectedReturn,
          volatility: minVolPortfolio.volatility,
          sharpe: minVolPortfolio.sharpe
        },
        maxSharpePortfolio: {
          weights: result.maxSharpePortfolio.weights,
          expectedReturn: result.maxSharpePortfolio.expectedReturn,
          volatility: result.maxSharpePortfolio.volatility,
          sharpeRatio: result.maxSharpePortfolio.sharpe
        }
      });

      setLastOptimizationMethod('mpt');
 console.log(' REAL portfolio optimization complete!');
    } catch (error) {
 console.error(' Portfolio optimization error:', error);
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
      alert(`Portfolio optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const runBlackLittermanModel = async () => {
    setIsLoading(true);
    try {
 console.log(' Running Black-Litterman model with backend API...');

      const views = investorViews.map(view => ({
        assets: [view.symbol.endsWith("x") ? view.symbol : `${view.symbol}x`],
        expectedReturn: view.expectedReturn,
        confidence: view.confidence,
        description: view.description
      }));

      const results = await QuantitativeAPI.runBlackLitterman(
        selectedSymbols,
        blDateRange.startDate,
        blDateRange.endDate,
        views
      );

      // Validate API response
      if (!results || !results.optimizedWeights) {
        throw new Error(`Invalid Black-Litterman response: ${JSON.stringify(results).substring(0, 200)}`);
      }

      setBlackLittermanResults({
        impliedReturns: results.impliedReturns,
        updatedReturns: results.updatedReturns,
        posteriorCovariance: results.posteriorCovariance,
        views: results.views,
        optimizedWeights: results.optimizedWeights,
        expectedReturn: results.expectedReturn,
        volatility: results.volatility,
        sharpeRatio: results.sharpeRatio,
        efficientFrontier: results.efficientFrontier,
        mptEfficientFrontier: results.mptEfficientFrontier,
        minVolatilityPortfolio: results.minVolatilityPortfolio,
        tradingDays: results.tradingDays,
        timestamp: results.timestamp,
        _debug: results._debug
      } as any);

      setLastOptimizationMethod('black-litterman');
 console.log(' Black-Litterman complete!');
    } catch (error) {
 console.error(' Black-Litterman error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      // Provide helpful suggestions for singular matrix error
      if (errorMsg.includes('Singular matrix')) {
        alert(`Black-Litterman failed: Mathematical error (Singular Matrix)\n\nThis can happen when:\n• Using too few stocks (try 5+ stocks)\n• Stocks are highly correlated\n• Time period is too short (try 1+ year)\n• Insufficient historical data\n\nTry: More stocks, longer date range, or different stock selection`);
      } else {
        alert(`Black-Litterman failed: ${errorMsg}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const runRiskAnalysis = async () => {
    setIsLoading(true);
    try {
 console.log(' Running risk analysis via backend...');

      // Equal weights for all symbols
      const weights = selectedSymbols.map(() => 1.0 / selectedSymbols.length);

      const riskMetricsResponse = await QuantitativeAPI.runRiskAnalysis(
        selectedSymbols,
        weights,
        backtestParams.startDate,
        backtestParams.endDate
      );

      console.log(' Risk metrics API response:', riskMetricsResponse);

      // Validate API response
      if (!riskMetricsResponse || !(riskMetricsResponse as any).metrics) {
        throw new Error('Invalid response from risk metrics API');
      }

      const apiMetrics = (riskMetricsResponse as any).metrics;

      // Transform backend response to match RiskMetrics interface
      const riskMetrics: RiskMetrics = {
        var: {
          historical: { '95%': apiMetrics.var95 || 0, '99%': apiMetrics.var99 || 0 },
          parametric: { '95%': apiMetrics.var95 || 0, '99%': apiMetrics.var99 || 0 },
          monteCarlo: {},
          conditional: { '95%': apiMetrics.cvar95 || 0, '99%': apiMetrics.cvar99 || 0 }
        },
        stressTesting: {
          scenarios: [],
          extremeEvents: []
        },
        factorExposure: {
          styleFactors: {},
          sectorFactors: {},
          riskContribution: {}
        }
      };

      // Store the raw metrics for display
      setRiskMetrics({
        ...riskMetrics,
        ...(apiMetrics as any) // Spread all metrics for direct access
      } as any);
 console.log(' Risk analysis complete!');
    } catch (error) {
 console.error(' Risk analysis error:', error);
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
      alert(`Risk analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const runMonteCarloSimulation = async () => {
    setIsLoading(true);
    try {
 console.log(' Running Monte Carlo simulation via backend...');

      const monteCarloSimulation = await QuantitativeAPI.runMonteCarlo(
        selectedSymbols,
        backtestParams.startDate,
        backtestParams.endDate,
        monteCarloParams.numSimulations,
        monteCarloParams.timeHorizon / 252, // Convert days to years
        monteCarloParams.initialValue
      ) as any;

      setMonteCarloResults(monteCarloSimulation);
 console.log(' Monte Carlo complete!');
    } catch (error) {
 console.error(' Monte Carlo error:', error);
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
      alert(`Monte Carlo failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper functions
  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <div className="w-14 h-14 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <h2 className="text-sm font-bold text-[#1a1a1a] mb-2">Running Analytics</h2>
          <p className="text-[#3C3C3C]">Processing quantitative analysis with real apiResult.data...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-3"
        >
          <h1 className="text-sm font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent mb-2">
            Quantitative Analytics Dashboard
          </h1>
          <p className="text-sm text-[#1a1a1a]">
            Professional-grade quantitative analysis with real mathematical models
          </p>
          </motion.div>

                {/* Main Dashboard Card with Backdrop Blur */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-card backdrop-blur-xl border border-black/10 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Card Header with Tool Tabs */}
          <div className="bg-white/50 backdrop-blur-xl p-3 border-b border-black/30">
            <div className="flex items-center justify-between mb-3">
              {/* Dashboard Title */}
              <div>
                <h2 className="text-sm font-bold text-[#1a1a1a]">Quantitative Analytics</h2>
                <div className="text-sm text-[#3C3C3C] mt-1">
                  <Badge className="bg-gradient-to-r from-green-500 to-blue-500 text-[#1a1a1a] text-sm">
                    100% REAL DATA • SCIPY • NUMPY • SKLEARN
                  </Badge>
                </div>
              </div>

              {/* Stock Selection Badge */}
              <Badge className="bg-gradient-to-r from-primary-500/20 to-primary-600/20 backdrop-blur-md border border-primary-500/30 text-[#1a1a1a] px-3 py-2.5 text-sm font-semibold">
                {selectedSymbols.length} stocks selected
              </Badge>
            </div>

            {/* Tool Tabs Navigation */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-2">
              {analyticsTools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl transition-all duration-200 whitespace-nowrap ${
                    tool.id === activeTool
                      ? `bg-gradient-to-r ${tool.color} text-[#1a1a1a] shadow-lg`
                      : 'bg-white border-2 border-black text-[#1a1a1a] hover:bg-playful-cream'
                  }`}
                >
                  <div className={`w-5 h-5 flex items-center justify-center ${
                    tool.id === activeTool ? 'text-[#1a1a1a]' : ''
                  }`}>
                    {tool.icon}
                  </div>
                  <span className="text-sm font-medium">{tool.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Portfolio Stock Selection - Embedded in Card */}
          <div className="bg-playful-cream border-2 border-black p-3 border-b border-black/20">
            <div className="flex items-center gap-10 mb-3">
              <Database className="w-5 h-5 text-primary-400" />
              <h3 className="text-sm font-semibold text-[#1a1a1a]">Portfolio Stocks Selection</h3>
            </div>
            <div className="flex flex-wrap gap-2.5 mb-3">
              {selectedSymbols.map((symbol) => (
                <Badge
                  key={symbol}
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 text-[#1a1a1a] px-3 py-1.5 cursor-pointer hover:from-red-500 hover:to-red-600 transition-all"
                  onClick={() => {
                    if (selectedSymbols.length > 2) {
                      setSelectedSymbols(selectedSymbols.filter(s => s !== symbol));
                      setInvestorViews(investorViews.filter(v => v.symbol !== symbol));
                    }
                  }}
                >
                  {symbol} ×
                </Badge>
              ))}
            </div>
            <div className="flex gap-10">
              <select
                className="bg-white border-2 border-black text-[#1a1a1a] rounded px-3 py-2 text-sm flex-1"
                value=""
                onChange={(e) => {
                  const symbol = e.target.value;
                  if (symbol && !selectedSymbols.includes(symbol)) {
                    setSelectedSymbols([...selectedSymbols, symbol]);
                  }
                }}
              >
                <option value="">+ Add Stock from 63 xStocks...</option>
                {availableSymbols
                  .filter(s => !selectedSymbols.includes(s))
                  .map(symbol => (
                    <option key={symbol} value={symbol}>{symbol}</option>
                  ))}
              </select>
            </div>
            <p className="text-sm text-[#3C3C3C] mt-2">
              Click × on any stock to remove it (min 2 stocks). This selection applies to ALL quantitative tools.
            </p>
          </div>

          {/* Active Tool Content */}
          <div className="p-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTool}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >

        {/* Global Stock Selection */}
        
          <motion.div
            key={activeTool}
            initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
          >
            {activeTool === 'backtesting' && (
              <div className="space-y-3">
                {/* Backtesting Configuration */}
                <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
                  <CardHeader>
                    <CardTitle className="text-sm text-[#1a1a1a] flex items-center gap-10">
                      <Activity className="w-8 h-8 text-blue-400" />
                      Backtesting Engine
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                      {/* Strategy Builder - 1 column */}
                      <div className="lg:col-span-1 bg-playful-cream p-3 rounded-2xl border-2 border-black">
                        <h4 className="text-sm font-semibold text-[#1a1a1a] mb-3">Strategy Builder</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm text-[#3C3C3C] mb-1 block">Strategy Type</label>
                            <select
                              value={backtestParams.strategy}
                              onChange={(e) => setBacktestParams(prev => ({ ...prev, strategy: e.target.value }))}
                              className="bg-white border-2 border-black text-[#1a1a1a] rounded px-3 py-2 w-full"
                            >
                              <option value="mean-reversion">Mean Reversion</option>
                              <option value="momentum">Momentum</option>
                              <option value="buy-and-hold">Buy and Hold</option>
                              <option value="moving-average">Moving Average Crossover</option>
                              <option value="pairs-trading">Pairs Trading</option>
                              <option value="breakout">Breakout</option>
                              <option value="rsi">RSI (Relative Strength Index)</option>
                              <option value="bollinger-bands">Bollinger Bands</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-sm text-[#3C3C3C] mb-1 block">Benchmark Stock (xStock)</label>
                            <select
                              value={backtestParams.benchmark}
                              onChange={(e) => setBacktestParams(prev => ({ ...prev, benchmark: e.target.value }))}
                              className="bg-white border-2 border-black text-[#1a1a1a] rounded px-3 py-2 w-full"
                            >
                              {XSTOCKS_SYMBOLS.map(symbol => (
                                <option key={symbol} value={symbol}>{symbol}</option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="text-sm text-[#3C3C3C] mb-1 block">Lookback Period</label>
                              <Input
                                type="number"
                                value={backtestParams.lookbackPeriod}
                                onChange={(e) => setBacktestParams(prev => ({
                                  ...prev,
                                  lookbackPeriod: parseInt(e.target.value)
                                }))}
                                className="bg-white border-2 border-black text-[#1a1a1a]"
                              />
                            </div>
                            <div>
                              <label className="text-sm text-[#3C3C3C] mb-1 block">Position Size</label>
                              <Input
                                type="number"
                                step="0.01"
                                value={backtestParams.positionSize}
                                onChange={(e) => setBacktestParams(prev => ({
                                  ...prev,
                                  positionSize: parseFloat(e.target.value)
                                }))}
                                className="bg-white border-2 border-black text-[#1a1a1a]"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="text-sm text-[#3C3C3C] mb-1 block">Entry Threshold</label>
                              <Input
                                type="number"
                                step="0.1"
                                value={backtestParams.entryThreshold}
                                onChange={(e) => setBacktestParams(prev => ({
                                  ...prev,
                                  entryThreshold: parseFloat(e.target.value)
                                }))}
                                className="bg-white border-2 border-black text-[#1a1a1a]"
                              />
                            </div>
                            <div>
                              <label className="text-sm text-[#3C3C3C] mb-1 block">Stop Loss</label>
                              <Input
                                type="number"
                                step="0.01"
                                value={backtestParams.stopLoss}
                                onChange={(e) => setBacktestParams(prev => ({
                                  ...prev,
                                  stopLoss: parseFloat(e.target.value)
                                }))}
                                className="bg-white border-2 border-black text-[#1a1a1a]"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="text-sm text-[#3C3C3C] mb-1 block">Start Date</label>
                              <Input
                                type="date"
                                value={backtestParams.startDate}
                                onChange={(e) => setBacktestParams(prev => ({
                                  ...prev,
                                  startDate: e.target.value
                                }))}
                                className="bg-white border-2 border-black text-[#1a1a1a]"
                              />
                            </div>
                            <div>
                              <label className="text-sm text-[#3C3C3C] mb-1 block">End Date</label>
                              <Input
                                type="date"
                                value={backtestParams.endDate}
                                onChange={(e) => setBacktestParams(prev => ({
                                  ...prev,
                                  endDate: e.target.value
                                }))}
                                className="bg-white border-2 border-black text-[#1a1a1a]"
                              />
                            </div>
                          </div>

                          <Button
                            onClick={runBacktest}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            disabled={isLoading}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Run Backtest
                          </Button>
                        </div>
                      </div>

                      {/* Backtest Results - spans 2 columns */}
                      <div className="lg:col-span-2">
                        {backtestResult ? (
                          <BacktestChart
                            data={{
                              summary: {
                                totalReturn: backtestResult.totalReturn,
                                annualReturn: backtestResult.annualizedReturn,
                                annualVolatility: backtestResult.volatility,
                                sharpeRatio: backtestResult.sharpeRatio,
                                sortinoRatio: backtestResult.sortinoRatio,
                                maxDrawdown: backtestResult.maxDrawdown,
                                winRate: backtestResult.winRate,
                                finalValue: (backtestResult.portfolioHistory[backtestResult.portfolioHistory.length - 1] as any)?.portfolioValue || (backtestResult.portfolioHistory[backtestResult.portfolioHistory.length - 1] as any)?.value || 10000
                              },
                              portfolioHistory: backtestResult.portfolioHistory.map((item: any, index: number) => {
                                // Calculate drawdown
                                const peak = backtestResult.portfolioHistory
                                  .slice(0, index + 1)
                                  .reduce((max, curr: any) => Math.max(max, curr.portfolioValue || curr.value || 0), 0);
                                const drawdown = peak > 0 ? ((((item as any).portfolioValue || (item as any).value || 0) - peak) / peak) * 100 : 0;

                                return {
                                  date: (item as any).date,
                                  value: (item as any).portfolioValue || (item as any).value || 0,
                                  benchmarkValue: (item as any).benchmark,
                                  drawdown: drawdown
                                };
                              }),
                              yearlyReturns: [] // Could be calculated if needed
                            }}
                            benchmarkSymbol={backtestParams.benchmark}
                          />
                        ) : (
                          <div className="text-[#3C3C3C] text-center py-2.5 bg-playful-cream p-3 rounded-2xl border-2 border-black">
                            Run a backtest to see performance charts and metrics
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTool === 'portfolio-optimization' && (
              <div className="space-y-3">
                <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
                  <CardHeader>
                    <CardTitle className="text-sm text-[#1a1a1a] flex items-center gap-10">
                      <Target className="w-8 h-8 text-green-400" />
                      Portfolio Optimization & Black-Litterman
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Section Navigation Tabs */}
                    <div className="mb-3 flex gap-3 border-b-2 border-black pb-2">
                      <Button
                        onClick={() => setActiveOptimizationSection('mpt')}
                        className={`${
                          activeOptimizationSection === 'mpt'
                            ? 'bg-playful-green border-2 border-black'
                            : 'bg-white border-2 border-black text-[#1a1a1a] hover:bg-playful-cream'
                        }`}
                      >
                        <Target className="w-4 h-4 mr-2" />
                        Modern Portfolio Theory
                      </Button>
                      <Button
                        onClick={() => setActiveOptimizationSection('bl')}
                        className={`${
                          activeOptimizationSection === 'bl'
                            ? 'bg-playful-green border-2 border-black'
                            : 'bg-white border-2 border-black text-[#1a1a1a] hover:bg-playful-cream'
                        }`}
                      >
                        <Brain className="w-4 h-4 mr-2" />
                        Black-Litterman Model
                      </Button>
                    </div>

                    {/* MPT Section */}
                    {activeOptimizationSection === 'mpt' && (
                      <div className="space-y-3">
                        <div className="bg-playful-cream p-3 rounded-2xl border-2 border-black">
                          <p className="text-sm text-[#3C3C3C]">
                            Modern Portfolio Theory optimizes your portfolio based purely on historical returns and risk.
                            Select your stocks above and click Run to calculate the optimal allocation.
                          </p>
                        </div>

                        <Button
                          onClick={runPortfolioOptimization}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white border-2 border-black"
                          disabled={isLoading}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Run MPT Optimization
                        </Button>
                      </div>
                    )}

                    {/* Black-Litterman Section */}
                    {activeOptimizationSection === 'bl' && (
                      <div className="space-y-3">
                        {/* Investor Views Configuration */}
                    <div className="mb-3 bg-playful-cream p-3 rounded-2xl border-2 border-black">
                      <h4 className="text-sm font-semibold text-[#1a1a1a] mb-3 flex items-center gap-2.5">
                        <Brain className="w-5 h-5 text-primary-400" />
                        Investor Views Configuration (Black-Litterman Only)
                      </h4>
                      <div className="space-y-3">
                        {investorViews.map((view, index) => (
                          <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-10 p-3 bg-white rounded-2xl border-2 border-black">
                            <div>
                              <label className="text-sm text-[#3C3C3C] mb-1 block">Stock</label>
                              <select
                                value={view.symbol}
                                onChange={(e) => {
                                  const newViews = [...investorViews];
                                  newViews[index].symbol = e.target.value;
                                  setInvestorViews(newViews);
                                }}
                                className="bg-white border-2 border-black text-[#1a1a1a] rounded px-2 py-1 text-sm w-full"
                              >
                                {selectedSymbols.map(sym => (
                                  <option key={sym} value={sym}>{sym}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-sm text-[#3C3C3C] mb-1 block">Expected Return (%)</label>
                              <Input
                                type="number"
                                value={view.expectedReturn}
                                onChange={(e) => {
                                  const newViews = [...investorViews];
                                  newViews[index].expectedReturn = parseFloat(e.target.value);
                                  setInvestorViews(newViews);
                                }}
                                className="bg-white border-2 border-black text-[#1a1a1a] text-sm h-8"
                              />
                            </div>
                            <div>
                              <label className="text-sm text-[#3C3C3C] mb-1 block">Confidence (%)</label>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={view.confidence}
                                onChange={(e) => {
                                  const newViews = [...investorViews];
                                  newViews[index].confidence = parseFloat(e.target.value);
                                  setInvestorViews(newViews);
                                }}
                                className="bg-white border-2 border-black text-[#1a1a1a] text-sm h-8"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-sm text-[#3C3C3C] mb-1 block">Description</label>
                              <Input
                                type="text"
                                value={view.description}
                                onChange={(e) => {
                                  const newViews = [...investorViews];
                                  newViews[index].description = e.target.value;
                                  setInvestorViews(newViews);
                                }}
                                className="bg-white border-2 border-black text-[#1a1a1a] text-sm h-8"
                                placeholder="View description..."
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex gap-2.5">
                        <Button
                          onClick={() => {
                            setInvestorViews([...investorViews, {
                              symbol: selectedSymbols[0] || 'AAPLx',
                              expectedReturn: 10,
                              confidence: 80,
                              description: 'New view'
                            }]);
                          }}
                          size="sm"
                          className="bg-playful-green hover:bg-playful-orange border-2 border-black"
                        >
                          + Add View
                        </Button>
                        <Button
                          onClick={() => {
                            if (investorViews.length > 1) {
                              setInvestorViews(investorViews.slice(0, -1));
                            }
                          }}
                          size="sm"
                          variant="outline"
                          className="border-2 border-black text-[#1a1a1a] hover:bg-playful-cream"
                          disabled={investorViews.length <= 1}
                        >
                          - Remove Last
                        </Button>
                      </div>

                      {/* Note about modifying values */}
                      <div className="mt-3 p-2.5 bg-blue-50 border-l-4 border-blue-400 rounded">
                        <p className="text-xs text-blue-800">
                          💡 <strong>Tip:</strong> Investor views are auto-populated from your stock selection with Expected Return: 10% and Confidence: 80%.
                          Modify these values to match your market outlook before running the optimization.
                        </p>
                      </div>
                    </div>

                        {/* Run BL Optimization Button */}
                        <Button
                          onClick={runBlackLittermanModel}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white border-2 border-black"
                          disabled={isLoading}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Run Black-Litterman Optimization
                        </Button>
                      </div>
                    )}

                    {/* Modern Portfolio Theory Results - Only show in MPT section */}
                    {portfolioOptimization && lastOptimizationMethod === 'mpt' && activeOptimizationSection === 'mpt' ? (
                      <div className="mt-3">
                        <h3 className="text-sm font-bold text-[#1a1a1a] mb-3 flex items-center gap-10">
                          <TrendingUp className="w-6 h-6 text-primary-400" />
                          Modern Portfolio Theory Results
                        </h3>
                        <EfficientFrontierChart
                          data={{
                            efficientFrontier: portfolioOptimization.efficientFrontier.map(point => ({
                              return: point.return,
                              volatility: point.risk,
                              sharpe: point.return / point.risk, // Calculate Sharpe ratio from return/risk
                              weights: point.weights
                            })),
                            optimalSharpe: {
                              return: portfolioOptimization.maxSharpePortfolio.expectedReturn,
                              volatility: portfolioOptimization.maxSharpePortfolio.volatility,
                              sharpe: portfolioOptimization.maxSharpePortfolio.sharpeRatio,
                              weights: portfolioOptimization.maxSharpePortfolio.weights
                            },
                            optimalMinVol: {
                              return: portfolioOptimization.minVariancePortfolio.expectedReturn,
                              volatility: portfolioOptimization.minVariancePortfolio.volatility,
                              sharpe: portfolioOptimization.minVariancePortfolio.sharpe || 0,
                              weights: portfolioOptimization.minVariancePortfolio.weights
                            }
                          }}
                        />
                      </div>
                    ) : !lastOptimizationMethod ? (
                      <div className="text-[#3C3C3C] text-center py-2.5 bg-playful-cream rounded-2xl border-2 border-black p-3">
                        Run Modern Portfolio Theory or Black-Litterman to see optimization results
                      </div>
                    ) : null}

                    {/* Black-Litterman Results - Only show in BL section */}
                    {blackLittermanResults && lastOptimizationMethod === 'black-litterman' && activeOptimizationSection === 'bl' && (
                      <div className="mt-3 border-t-2 border-black pt-6">
                        <h3 className="text-sm font-bold text-[#1a1a1a] mb-3 flex items-center gap-10">
                          <Brain className="w-6 h-6 text-primary-400" />
                          Black-Litterman Model Results
                        </h3>

                        {/* Black-Litterman Efficient Frontier with MPT Comparison */}
                        {(() => {
                          console.log('🔍 BL Results:', blackLittermanResults);
                          console.log('🔍 Has efficientFrontier?', (blackLittermanResults as any).efficientFrontier);
                          console.log('🔍 efficientFrontier length:', (blackLittermanResults as any).efficientFrontier?.length);
                          return null;
                        })()}
                        {(blackLittermanResults as any).efficientFrontier && (
                          <div className="mb-6">
                            <h4 className="text-sm font-semibold text-[#1a1a1a] mb-3">Efficient Frontier Comparison</h4>
                            <EfficientFrontierChart
                              data={{
                                efficientFrontier: (blackLittermanResults as any).efficientFrontier.map((point: any) => ({
                                  return: point.return,
                                  volatility: point.volatility,
                                  sharpe: point.sharpe,
                                  weights: point.weights
                                })),
                                optimalSharpe: {
                                  return: blackLittermanResults.expectedReturn,
                                  volatility: blackLittermanResults.volatility,
                                  sharpe: blackLittermanResults.sharpeRatio,
                                  weights: blackLittermanResults.optimizedWeights
                                },
                                optimalMinVol: (blackLittermanResults as any).minVolatilityPortfolio ? {
                                  return: (blackLittermanResults as any).minVolatilityPortfolio.expectedReturn,
                                  volatility: (blackLittermanResults as any).minVolatilityPortfolio.volatility,
                                  sharpe: (blackLittermanResults as any).minVolatilityPortfolio.sharpe,
                                  weights: (blackLittermanResults as any).minVolatilityPortfolio.weights
                                } : undefined,
                                mptFrontier: (blackLittermanResults as any).mptEfficientFrontier?.map((point: any) => ({
                                  return: point.return,
                                  volatility: point.volatility,
                                  sharpe: point.sharpe,
                                  weights: point.weights
                                }))
                              }}
                            />
                            <div className="mt-3 p-3 bg-playful-cream rounded-2xl border-2 border-black">
                              <p className="text-sm text-[#3C3C3C]">
                                <span className="font-semibold text-blue-600">Blue points:</span> Black-Litterman frontier (with investor views) |{' '}
                                <span className="font-semibold text-gray-400">Gray points:</span> MPT frontier (historical data only)
                              </p>
                              <p className="text-sm text-[#3C3C3C] mt-2">
                                Investor views shift the efficient frontier, showing how your beliefs modify the optimal risk/return tradeoff.
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                          {/* Investor Views */}
                          <div className="bg-playful-cream p-3 rounded-2xl border-2 border-black">
                            <h4 className="text-sm font-semibold text-[#1a1a1a] mb-3">Investor Views</h4>
                            <div className="space-y-3">
                              {blackLittermanResults.views.map((view, index) => (
                                <div key={index} className="bg-white border-2 border-black p-3 rounded-2xl">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-[#3C3C3C]">{view.assets.join(', ')}</span>
                                    <span className="text-green-400 font-bold">{formatPercent(view.expectedReturn)}</span>
                                  </div>
                                  <div className="text-sm text-[#3C3C3C] mb-1">{view.description}</div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-[#3C3C3C]">Confidence:</span>
                                    <span className="text-sm text-blue-400">{formatPercent(view.confidence)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="mt-3 pt-4 border-t-2 border-black">
                              <div className="text-sm text-green-400 font-semibold mb-2"> Real Bayesian Updating</div>
                              <p className="text-sm text-[#3C3C3C]">
                                Market equilibrium + investor views with confidence levels
                              </p>
                            </div>
                          </div>

                          {/* Returns Comparison */}
                          <div className="bg-playful-cream p-3 rounded-2xl border-2 border-black">
                            <h4 className="text-sm font-semibold text-[#1a1a1a] mb-3">Returns Analysis</h4>
                            <div className="space-y-3">
                              <div>
                                <h5 className="text-sm font-semibold text-[#1a1a1a] mb-2">Implied Equilibrium Returns</h5>
                                <div className="space-y-1">
                                  {Object.entries(blackLittermanResults.impliedReturns).slice(0, 5).map(([symbol, ret]) => (
                                    <div key={symbol} className="flex justify-between">
                                      <span className="text-[#3C3C3C]">{symbol}:</span>
                                      <span className="text-blue-400 font-bold">{formatPercent(ret)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <h5 className="text-sm font-semibold text-[#1a1a1a] mb-2">Updated BL Returns</h5>
                                <div className="space-y-1">
                                  {Object.entries(blackLittermanResults.updatedReturns).slice(0, 5).map(([symbol, ret]) => (
                                    <div key={symbol} className="flex justify-between">
                                      <span className="text-[#3C3C3C]">{symbol}:</span>
                                      <span className="text-green-400 font-bold">{formatPercent(ret)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="pt-2 border-t-2 border-black">
                                <div className="text-center">
                                  <div className="text-sm font-bold text-primary-400">
                                    {formatPercent(blackLittermanResults.expectedReturn)}
                                  </div>
                                  <div className="text-sm text-[#3C3C3C]">BL Portfolio Return</div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Optimized Portfolio */}
                          <div className="bg-playful-cream p-3 rounded-2xl border-2 border-black">
                            <h4 className="text-sm font-semibold text-[#1a1a1a] mb-3">BL Optimized Portfolio</h4>
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-10">
                                <div className="text-center">
                                  <div className="text-sm font-bold text-green-400">
                                    {formatPercent(blackLittermanResults.expectedReturn)}
                                  </div>
                                  <div className="text-sm text-[#3C3C3C]">Expected Return</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm font-bold text-blue-400">
                                    {formatPercent(blackLittermanResults.volatility)}
                                  </div>
                                  <div className="text-sm text-[#3C3C3C]">Volatility</div>
                                </div>
                              </div>

                              <div className="text-center">
                                <div className="text-sm font-bold text-primary-400">
                                  {blackLittermanResults.sharpeRatio.toFixed(3)}
                                </div>
                                <div className="text-sm text-[#3C3C3C]">Sharpe Ratio</div>
                              </div>

                              <div>
                                <h5 className="text-sm font-semibold text-[#1a1a1a] mb-2">Asset Allocation</h5>
                                <div className="space-y-1">
                                  {Object.entries(blackLittermanResults.optimizedWeights)
                                    .sort(([,a], [,b]) => b - a)
                                    .slice(0, 5)
                                    .map(([symbol, weight]) => (
                                      <div key={symbol} className="flex justify-between">
                                        <span className="text-[#3C3C3C]">{symbol}:</span>
                                        <span className="text-[#1a1a1a] font-bold">{formatPercent(weight)}</span>
                                      </div>
                                    ))
                                  }
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTool === 'correlation-analysis' && (
              <div className="space-y-3">
                <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
                  <CardHeader>
                    <CardTitle className="text-sm text-[#1a1a1a] flex items-center gap-10">
                      <GitBranch className="w-8 h-8 text-primary-400" />
                      Correlation & Clustering Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-3 flex gap-10">
                      <Button
                        onClick={runCorrelationAnalysis}
                        className="bg-playful-green hover:bg-playful-orange"
                        disabled={isLoading}
                      >
                        <Calculator className="w-4 h-4 mr-2" />
                        Run Analysis
                      </Button>
                    </div>

                    {correlationAnalysis ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* Correlation Matrix */}
                        <div className="bg-playful-cream p-3 rounded-2xl border-2 border-black">
                          <h4 className="text-sm font-semibold text-[#1a1a1a] mb-3">Correlation Matrix</h4>
                          <div className="text-sm">
                            <div className="text-green-400 font-semibold mb-2"> Real Correlation Data</div>
                            <p className="text-[#3C3C3C] mb-3">
                              {Object.keys(correlationAnalysis.correlationMatrix).length}x{Object.keys(correlationAnalysis.correlationMatrix).length} correlation matrix computed
                            </p>

                            {/* Show sample correlations */}
                            <div className="space-y-2">
                              {Object.keys(correlationAnalysis.correlationMatrix).slice(0, 5).map(symbol1 => (
                                <div key={symbol1} className="flex items-center justify-between">
                                  <span className="text-[#1a1a1a] font-semibold">{symbol1}:</span>
                                  <div className="flex gap-2.5">
                                    {Object.keys(correlationAnalysis.correlationMatrix[symbol1]).slice(0, 5).map(symbol2 => {
                                      if (symbol1 === symbol2) return null;
                                      const corr = correlationAnalysis.correlationMatrix[symbol1][symbol2];
                                      return (
                                        <span
                                          key={symbol2}
                                          className={`text-sm px-2 py-1 rounded-lg font-bold text-white border-2 border-black ${
                                            corr > 0.7 ? 'bg-playful-green' :
                                            corr > 0.5 ? 'bg-green-500' :
                                            corr > 0.3 ? 'bg-yellow-500' :
                                            corr > 0 ? 'bg-orange-400' :
                                            corr > -0.3 ? 'bg-orange-500' :
                                            corr > -0.5 ? 'bg-red-400' :
                                            'bg-red-600'
                                          }`}
                                        >
                                          {corr.toFixed(2)}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Color Legend */}
                            <div className="mt-4 pt-3 border-t-2 border-black">
                              <div className="text-sm font-semibold text-[#1a1a1a] mb-2">Correlation Scale:</div>
                              <div className="grid grid-cols-4 gap-2 text-xs">
                                <div className="flex items-center gap-1">
                                  <div className="w-4 h-4 bg-playful-green border-2 border-black rounded"></div>
                                  <span className="text-[#1a1a1a]">&gt; 0.7 Strong +</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="w-4 h-4 bg-yellow-500 border-2 border-black rounded"></div>
                                  <span className="text-[#1a1a1a]">0.3-0.5 Moderate +</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="w-4 h-4 bg-orange-500 border-2 border-black rounded"></div>
                                  <span className="text-[#1a1a1a]">-0.3 to 0 Weak</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="w-4 h-4 bg-red-600 border-2 border-black rounded"></div>
                                  <span className="text-[#1a1a1a]">&lt; -0.5 Strong -</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Clustering Results */}
                        <div className="bg-playful-cream p-3 rounded-2xl border-2 border-black">
                          <h4 className="text-sm font-semibold text-[#1a1a1a] mb-3">Cluster Analysis</h4>
                          <div className="space-y-3">
                            {correlationAnalysis.clusters.map((cluster, index) => (
                              <div key={index} className="border border-black/10 rounded p-3">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-[#1a1a1a] font-medium">Cluster {index + 1}</span>
                                  <Badge className="bg-playful-green">{cluster.stocks.length} stocks</Badge>
                                </div>
                                <div className="text-sm mb-2 flex items-center gap-2">
                                  <span className="text-[#3C3C3C]">Avg Correlation:</span>
                                  <span className={`font-bold px-2 py-1 rounded-lg border-2 border-black text-white ${
                                    cluster.avgCorrelation > 0.7 ? 'bg-playful-green' :
                                    cluster.avgCorrelation > 0.5 ? 'bg-green-500' :
                                    cluster.avgCorrelation > 0.3 ? 'bg-yellow-500' :
                                    'bg-orange-400'
                                  }`}>
                                    {cluster.avgCorrelation.toFixed(3)}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {cluster.stocks.map(stock => (
                                    <span key={stock} className="bg-playful-cream border-2 border-black text-sm px-2 py-1 rounded">
                                      {stock}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* PCA Results */}
                        <div className="bg-playful-cream p-3 rounded-2xl border-2 border-black lg:col-span-2">
                          <h4 className="text-sm font-semibold text-[#1a1a1a] mb-3">Principal Component Analysis</h4>
                          <div className="grid grid-cols-3 gap-10">
                            {correlationAnalysis.principalComponents.map((pc, pcIdx) => (
                              <div key={pcIdx} className="border border-black/10 rounded p-3">
                                <div className="text-[#1a1a1a] font-medium mb-2">Component {pc.component}</div>
                                <div className="text-sm space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[#3C3C3C]">Variance:</span>
                                    <span className={`font-bold px-2 py-1 rounded-lg border-2 border-black text-white text-xs ${
                                      pc.variance > 40 ? 'bg-playful-green' :
                                      pc.variance > 25 ? 'bg-green-500' :
                                      pc.variance > 15 ? 'bg-yellow-500' :
                                      'bg-orange-400'
                                    }`}>
                                      {formatPercent(pc.variance)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-[#3C3C3C]">Cumulative:</span>
                                    <span className={`font-bold px-2 py-1 rounded-lg border-2 border-black text-white text-xs ${
                                      pc.cumulativeVariance > 80 ? 'bg-playful-green' :
                                      pc.cumulativeVariance > 60 ? 'bg-green-500' :
                                      pc.cumulativeVariance > 40 ? 'bg-yellow-500' :
                                      'bg-orange-400'
                                    }`}>
                                      {formatPercent(pc.cumulativeVariance)}
                                    </span>
                                  </div>
                                  <div className="mt-2">
                                    <div className="text-[#3C3C3C] text-sm mb-1">Top Contributors:</div>
                                    {Object.entries(pc.loadings)
                                      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                                      .slice(0, 3)
                                      .map(([symbol, loading]) => (
                                        <div key={symbol} className="flex justify-between text-sm">
                                          <span className="text-[#1a1a1a]">{symbol}</span>
                                          <span className="text-[#1a1a1a]">{loading.toFixed(3)}</span>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[#3C3C3C] text-center py-2.5">
                        Run correlation analysis to see results
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTool === 'risk-metrics' && (
              <div className="space-y-3">
                <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
                  <CardHeader>
                    <CardTitle className="text-sm text-[#1a1a1a] flex items-center gap-10">
                      <Shield className="w-8 h-8 text-red-400" />
                      Risk Analysis & Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-3 flex gap-10">
                      <Button
                        onClick={runRiskAnalysis}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={isLoading}
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Run Risk Analysis
                      </Button>
                    </div>

                    {riskMetrics && (riskMetrics as any).sharpeRatio !== undefined ? (
                      <RiskMetricsDashboard
                        data={{
                          var95: (riskMetrics as any).var95 || 0,
                          var99: (riskMetrics as any).var99 || 0,
                          cvar95: (riskMetrics as any).cvar95 || 0,
                          cvar99: (riskMetrics as any).cvar99 || 0,
                          sharpeRatio: (riskMetrics as any).sharpeRatio || 0,
                          sortinoRatio: (riskMetrics as any).sortinoRatio || 0,
                          beta: (riskMetrics as any).beta || 1,
                          alpha: (riskMetrics as any).alpha || 0,
                          volatility: (riskMetrics as any).annualVolatility || 0,
                          downsideVolatility: (riskMetrics as any).downsideVolatility || 0,
                          correlationMatrix: (riskMetrics as any).correlationMatrix || undefined
                        }}
                      />
                    ) : (
                      <div className="text-[#3C3C3C] text-center py-2.5 bg-playful-cream rounded-2xl border-2 border-black p-3">
                        Run risk analysis to see detailed metrics
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTool === 'monte-carlo' && (
              <div className="space-y-3">
                <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
                  <CardHeader>
                    <CardTitle className="text-sm text-[#1a1a1a] flex items-center gap-10">
                      <Shuffle className="w-8 h-8 text-yellow-400" />
                      Monte Carlo Simulations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Simulation Configuration Panel */}
                    <div className="mb-3 bg-playful-cream p-3 rounded-2xl border-2 border-black">
                      <h4 className="text-sm font-semibold text-[#1a1a1a] mb-3">Simulation Parameters</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                        <div>
                          <label className="text-sm text-[#3C3C3C] mb-1 block">Number of Simulations</label>
                          <select
                            value={monteCarloParams.numSimulations}
                            onChange={(e) => setMonteCarloParams(prev => ({ ...prev, numSimulations: parseInt(e.target.value) }))}
                            className="bg-white border-2 border-black text-[#1a1a1a] rounded px-3 py-2 w-full"
                          >
                            <option value="1000">1,000 paths</option>
                            <option value="5000">5,000 paths</option>
                            <option value="10000">10,000 paths</option>
                            <option value="50000">50,000 paths</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-sm text-[#3C3C3C] mb-1 block">Time Horizon (Days)</label>
                          <Input
                            type="number"
                            value={monteCarloParams.timeHorizon}
                            onChange={(e) => setMonteCarloParams(prev => ({ ...prev, timeHorizon: parseInt(e.target.value) }))}
                            className="bg-white border-2 border-black text-[#1a1a1a]"
                          />
                        </div>

                        <div>
                          <label className="text-sm text-[#3C3C3C] mb-1 block">Initial Portfolio Value</label>
                          <Input
                            type="number"
                            value={monteCarloParams.initialValue}
                            onChange={(e) => setMonteCarloParams(prev => ({ ...prev, initialValue: parseFloat(e.target.value) }))}
                            className="bg-white border-2 border-black text-[#1a1a1a]"
                          />
                        </div>

                        <div>
                          <label className="text-sm text-[#3C3C3C] mb-1 block">Confidence Level</label>
                          <select
                            value={monteCarloParams.confidenceLevel}
                            onChange={(e) => setMonteCarloParams(prev => ({ ...prev, confidenceLevel: parseFloat(e.target.value) }))}
                            className="bg-white border-2 border-black text-[#1a1a1a] rounded px-3 py-2 w-full"
                          >
                            <option value="0.90">90%</option>
                            <option value="0.95">95%</option>
                            <option value="0.99">99%</option>
                            <option value="0.999">99.9%</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="mb-3 flex gap-10">
                      <Button
                        onClick={runMonteCarloSimulation}
                        className="bg-yellow-600 hover:bg-yellow-700"
                        disabled={isLoading}
                      >
                        <Shuffle className="w-4 h-4 mr-2" />
                        Run Monte Carlo
                      </Button>
                    </div>

                    {monteCarloResults ? (
                      <MonteCarloChart
                        data={{
                          statistics: {
                            mean: monteCarloResults.statistics.mean,
                            median: monteCarloResults.statistics.median,
                            std: monteCarloResults.statistics.std,
                            min: monteCarloResults.statistics.min,
                            max: monteCarloResults.statistics.max,
                            percentile5: monteCarloResults.percentiles['5th'],
                            percentile25: monteCarloResults.percentiles['25th'],
                            percentile75: monteCarloResults.percentiles['75th'],
                            percentile95: monteCarloResults.percentiles['95th'],
                            probPositive: monteCarloResults.statistics.probPositive || 50
                          },
                          samplePaths: (() => {
                            try {
                              // Transform backend array-of-arrays to Recharts format
                              const rawPaths = monteCarloResults.samplePaths || [];

 console.log(' Raw samplePaths:', rawPaths);
 console.log(' Type check:', typeof rawPaths, Array.isArray(rawPaths));

                              if (!Array.isArray(rawPaths) || rawPaths.length === 0) {
 console.warn(' No sample paths data');
                                return [];
                              }

                              const paths = rawPaths.slice(0, 10); // Limit to 10 paths for display

                              if (!Array.isArray(paths[0])) {
 console.error(' First path is not an array:', paths[0]);
                                return [];
                              }

                              const numPoints = paths[0].length;
                              const transformed = [];

                              // Downsample if too many points (keep every Nth point)
                              const maxPoints = 252; // Maximum points to display
                              const step = Math.max(1, Math.floor(numPoints / maxPoints));

                              for (let i = 0; i < numPoints; i += step) {
                                const dataPoint: any = {
                                  date: `Day ${i + 1}`
                                };

                                // Add individual sample paths
                                paths.forEach((path, pathIndex) => {
                                  dataPoint[`path${pathIndex + 1}`] = path[i];
                                });

                                // Calculate percentiles across all paths at this time point
                                const valuesAtTimePoint = rawPaths.map(path => Number(path[i]) || 0).sort((a, b) => a - b);
                                const len = valuesAtTimePoint.length;
                                dataPoint.percentile5 = valuesAtTimePoint[Math.floor(len * 0.05)] || 0;
                                dataPoint.percentile25 = valuesAtTimePoint[Math.floor(len * 0.25)] || 0;
                                dataPoint.percentile50 = valuesAtTimePoint[Math.floor(len * 0.50)] || 0;
                                dataPoint.percentile75 = valuesAtTimePoint[Math.floor(len * 0.75)] || 0;
                                dataPoint.percentile95 = valuesAtTimePoint[Math.floor(len * 0.95)] || 0;

                                transformed.push(dataPoint);
                              }

 console.log(' Transformed paths:', transformed.length, 'points (downsampled from', numPoints, ')');
                              return transformed;
                            } catch (error) {
 console.error(' Error transforming samplePaths:', error);
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
                              return [];
                            }
                          })(),
                          distribution: monteCarloResults.distribution,
                          initialCapital: monteCarloParams.initialValue,
                          years: monteCarloParams.timeHorizon / 252,
                          simulations: monteCarloParams.numSimulations
                        }}
                      />
                    ) : (
                      <div className="text-[#3C3C3C] text-center py-2.5 bg-gray-900/30 rounded-2xl">
                        <Shuffle className="w-12 h-12 mx-auto mb-3 text-[#3C3C3C]" />
                        <p className="text-sm font-semibold">No Monte Carlo Results</p>
                        <p className="text-sm mt-1">Run a Monte Carlo simulation to see portfolio projections</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Scenario Analysis */}
                {monteCarloResults && monteCarloResults.statistics && (
                  <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
                    <CardHeader>
                      <CardTitle className="text-sm text-[#1a1a1a] flex items-center gap-10">
                        <BarChart3 className="w-6 h-6 text-primary-400" />
                        Scenario Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                        {[
                          { name: "Best Case (95th)", finalValue: monteCarloResults.percentiles['95th'], return: ((monteCarloResults.percentiles['95th'] - monteCarloParams.initialValue) / monteCarloParams.initialValue) * 100 },
                          { name: "Optimistic (75th)", finalValue: monteCarloResults.percentiles['75th'], return: ((monteCarloResults.percentiles['75th'] - monteCarloParams.initialValue) / monteCarloParams.initialValue) * 100 },
                          { name: "Median (50th)", finalValue: monteCarloResults.statistics.median, return: ((monteCarloResults.statistics.median - monteCarloParams.initialValue) / monteCarloParams.initialValue) * 100 },
                          { name: "Conservative (25th)", finalValue: monteCarloResults.percentiles['25th'], return: ((monteCarloResults.percentiles['25th'] - monteCarloParams.initialValue) / monteCarloParams.initialValue) * 100 },
                          { name: "Worst Case (5th)", finalValue: monteCarloResults.percentiles['5th'], return: ((monteCarloResults.percentiles['5th'] - monteCarloParams.initialValue) / monteCarloParams.initialValue) * 100 }
                        ].map((scenario, index) => (
                          <div key={index} className="bg-playful-cream p-3 rounded-2xl border-2 border-black">
                            <div className="text-center">
                              <div className={`text-sm font-bold mb-2 ${
                                scenario.finalValue > monteCarloParams.initialValue ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {formatCurrency(scenario.finalValue)}
                              </div>
                              <div className="text-sm text-[#3C3C3C]">{scenario.name}</div>
                              <div className={`text-sm font-semibold ${
                                scenario.return > 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {formatPercent(scenario.return)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

        </motion.div>

        {/* Footer Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-3 text-[#3C3C3C]"
        >
          <p>
            Tracking <span className="text-green-400 font-semibold">63</span> xStock symbols
            • <span className="text-blue-400 font-semibold">5</span> quantitative tools
            • <span className="text-primary-400 font-semibold">Real-time</span> market data
            • <span className="text-cyan-400 font-semibold">100%</span> real mathematical models
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default QuantitativeAnalyticsTools;