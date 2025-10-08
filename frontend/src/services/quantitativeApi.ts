/**
 * Quantitative Analytics API Service
 * 100% REAL backend integration - NO CLIENT-SIDE CALCULATIONS
 */

import { ENV } from '../config/env';

const BACKEND_URL = ENV.INTEL_API_URL;

export interface CorrelationAnalysisResponse {
  matrix: Array<Array<{
    symbol1: string;
    symbol2: string;
    correlation: number;
  }>>;
  symbols: string[];
  averageCorrelations: { [symbol: string]: number };
  highestCorrelations: Array<{
    symbol1: string;
    symbol2: string;
    correlation: number;
  }>;
  lowestCorrelations: Array<{
    symbol1: string;
    symbol2: string;
    correlation: number;
  }>;
  clusters: Array<{
    id: number;
    stocks: string[];
    averageCorrelation: number;
  }>;
  principalComponents: Array<{
    id: number;
    varianceExplained: number;
    cumulativeVariance: number;
    topContributors: Array<{
      symbol: string;
      loading: number;
    }>;
  }>;
  failedSymbols?: string[];
  period?: {
    start: string;
    end: string;
  };
  timestamp?: number;
}

export interface PortfolioOptimizationResponse {
  efficientFrontier: Array<{
    return: number;
    volatility: number;
    sharpe: number;
    weights: { [symbol: string]: number };
  }>;
  maxSharpePortfolio: {
    weights: { [symbol: string]: number };
    expectedReturn: number;
    volatility: number;
    sharpe: number;
  };
  minVolatilityPortfolio: {
    weights: { [symbol: string]: number };
    expectedReturn: number;
    volatility: number;
    sharpe: number;
  };
  symbols: string[];
  tradingDays: number;
}

export interface MonteCarloResponse {
  statistics: {
    mean: number;
    median: number;
    std: number;
    min: number;
    max: number;
    percentile5: number;
    percentile25: number;
    percentile75: number;
    percentile95: number;
    probPositive: number;
  };
  percentilePaths: {
    5: number[];
    25: number[];
    50: number[];
    75: number[];
    95: number[];
  };
  samplePaths: number[][];
  distribution: Array<{
    bin: string;
    count: number;
  }>;
  initialCapital: number;
  timeHorizonDays: number;
  numSimulations: number;
}

export interface RiskMetricsResponse {
  var95: number;
  var99: number;
  cvar95: number;
  cvar99: number;
  sharpeRatio: number;
  sortinoRatio: number;
  beta: number;
  alpha: number;
  volatility: number;
  downsideVolatility: number;
  correlationMatrix: {
    symbols: string[];
    matrix: number[][];
  };
}

export interface BacktestResponse {
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
  metrics: {
    totalReturn: number;
    annualizedReturn: number;
    volatility: number;
    sharpeRatio: number;
    sortinoRatio: number;
    maxDrawdown: number;
    calmarRatio: number;
    beta: number;
    alpha: number;
    winRate: number;
    profitFactor: number;
    averageGain: number;
    averageLoss: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
  };
  initialCapital: number;
  finalValue: number;
}

export class QuantitativeAPI {
  /**
   * Run correlation analysis with PCA and clustering
   */
  static async runCorrelationAnalysis(
    symbols: string[],
    startDate: string,
    endDate: string
  ): Promise<CorrelationAnalysisResponse> {
    const response = await fetch(`${BACKEND_URL}/api/quant/correlation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbols: symbols, // Keep xStock format
        startDate,
        endDate
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Correlation analysis failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Run risk analysis on portfolio
   */
  static async runRiskAnalysis(
    symbols: string[],
    weights: number[],
    startDate: string,
    endDate: string
  ): Promise<RiskMetricsResponse> {
    const response = await fetch(`${BACKEND_URL}/api/quant/risk-metrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbols: symbols, // Keep xStock format
        weights,
        startDate,
        endDate
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Risk analysis failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Run Monte Carlo simulation
   */
  static async runMonteCarlo(
    symbols: string[],
    startDate: string,
    endDate: string,
    simulations: number = 1000,
    years: number = 5,
    initialCapital: number = 10000
  ): Promise<MonteCarloResponse> {
    const response = await fetch(`${BACKEND_URL}/api/quant/monte-carlo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbols: symbols, // Keep xStock format
        startDate,
        simulations,
        years,
        initialCapital
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Monte Carlo simulation failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Optimize portfolio using Modern Portfolio Theory
   */
  static async optimizePortfolio(
    symbols: string[],
    startDate: string,
    endDate: string,
    minWeight: number = 0.0,
    maxWeight: number = 1.0,
    nPortfolios: number = 1000
  ): Promise<PortfolioOptimizationResponse> {
    const response = await fetch(`${BACKEND_URL}/api/quant/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbols: symbols, // Keep xStock format
        startDate,
        endDate,
        minWeight,
        maxWeight,
        nPortfolios
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Portfolio optimization failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Run Monte Carlo simulation
   */
  static async runMonteCarloSimulation(
    symbols: string[],
    startDate: string,
    endDate: string,
    initialCapital: number,
    timeHorizonDays: number,
    numSimulations: number,
    portfolioWeights?: { [symbol: string]: number }
  ): Promise<MonteCarloResponse> {
    const response = await fetch(`${BACKEND_URL}/api/quant/monte-carlo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbols: symbols, // Keep xStock format
        startDate,
        endDate,
        initialCapital,
        timeHorizonDays,
        numSimulations,
        portfolioWeights: portfolioWeights // Keep xStock format in weights
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Monte Carlo simulation failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Calculate risk metrics
   */
  static async calculateRiskMetrics(
    symbols: string[],
    startDate: string,
    endDate: string,
    portfolioWeights?: { [symbol: string]: number },
    benchmarkSymbol: string = 'SPY'
  ): Promise<RiskMetricsResponse> {
    const response = await fetch(`${BACKEND_URL}/api/quant/risk-metrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbols: symbols, // Keep xStock format
        startDate,
        endDate,
        portfolioWeights: portfolioWeights, // Keep xStock format in weights
        benchmarkSymbol
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Risk metrics calculation failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Run backtest with specified strategy
   */
  static async runBacktest(
    symbols: string[],
    startDate: string,
    endDate: string,
    initialCapital: number,
    strategy: 'mean-reversion' | 'momentum' | 'breakout',
    strategyParams: {
      lookbackPeriod?: number;
      entryThreshold?: number;
      exitThreshold?: number;
      stopLoss?: number;
      positionSize?: number;
    },
    benchmarkSymbol: string = 'SPY'
  ): Promise<BacktestResponse> {
    const requestBody = {
      symbols: symbols, // Keep xStock format
      startDate,
      endDate,
      initialCapital,
      strategy,
      benchmarkSymbol,
      strategyParams
    };

 console.log('[SEARCH] Backtest request:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${BACKEND_URL}/api/quant/backtest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
 console.error('[ERROR] Backtest error response:', error);
      throw new Error(`Backtest failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Run Black-Litterman Model with investor views
   */
  static async runBlackLitterman(
    symbols: string[],
    startDate: string,
    endDate: string,
    views: Array<{
      assets: string[];
      expectedReturn: number;
      confidence: number;
      description: string;
    }>,
    marketCapWeights?: { [symbol: string]: number },
    riskAversion: number = 2.5,
    tau: number = 0.05
  ): Promise<{
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
    tradingDays: number;
    timestamp: number;
  }> {
    const requestBody = {
      symbols: symbols, // Keep xStock format
      startDate,
      endDate,
      views,
      marketCapWeights,
      riskAversion,
      tau
    };

 console.log(' Black-Litterman request:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${BACKEND_URL}/api/quant/black-litterman`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
 console.error('[ERROR] Black-Litterman error response:', error);
      throw new Error(`Black-Litterman model failed: ${error}`);
    }

    return response.json();
  }
}
