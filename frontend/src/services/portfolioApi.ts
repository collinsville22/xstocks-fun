/**
 * Portfolio Analytics API Service
 * 100% REAL backend integration - NO CLIENT-SIDE CALCULATIONS
 *
 * Pattern: Replicates quantitativeApi.ts structure for portfolio analytics
 */

import { ENV } from '../config/env';
import { fetchWithTimeout } from '../lib/fetchWithTimeout';

const BACKEND_URL = ENV.INTEL_API_URL;

export interface PortfolioMetricsResponse {
  sharpeRatio: number;
  volatility: number;
  beta: number | null;
  alpha: number | null;
  var95: number;
  var99: number;
  cvar95: number;
  cvar99: number;
  maxDrawdown: number;
  downsideVolatility: number;
  sortinoRatio: number;
}

export interface PortfolioOptimizationResponse {
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
  efficientFrontier: Array<{
    return: number;
    volatility: number;
    sharpe: number;
    weights: { [symbol: string]: number };
  }>;
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
  initialCapital: number;
  timeHorizonDays: number;
  numSimulations: number;
}

export class PortfolioAPI {
  /**
   * Calculate portfolio risk metrics
   * Endpoint: POST /api/portfolio/analyze
   */
  static async analyzePortfolio(
    symbols: string[],
    startDate: string,
    endDate: string,
    portfolioWeights?: { [symbol: string]: number },
    benchmarkSymbol: string = 'SPY'
  ): Promise<PortfolioMetricsResponse> {
    const response = await fetchWithTimeout(`${BACKEND_URL}/api/portfolio/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbols,
        startDate,
        endDate,
        portfolioWeights,
        benchmarkSymbol
      }),
      timeout: 30000 // 30 second timeout for portfolio analysis
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Portfolio analysis failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Optimize portfolio using Modern Portfolio Theory
   * Endpoint: POST /api/portfolio/optimize
   */
  static async optimizePortfolio(
    symbols: string[],
    startDate: string,
    endDate: string,
    minWeight: number = 0.0,
    maxWeight: number = 1.0,
    nPortfolios: number = 1000
  ): Promise<PortfolioOptimizationResponse> {
    const response = await fetchWithTimeout(`${BACKEND_URL}/api/portfolio/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbols,
        startDate,
        endDate,
        minWeight,
        maxWeight,
        nPortfolios
      }),
      timeout: 45000 // 45 second timeout for optimization (computationally intensive)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Portfolio optimization failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Run Monte Carlo simulation
   * Endpoint: POST /api/portfolio/monte-carlo
   */
  static async runMonteCarlo(
    symbols: string[],
    startDate: string,
    endDate: string,
    initialCapital: number,
    timeHorizonDays: number,
    numSimulations: number,
    portfolioWeights?: { [symbol: string]: number }
  ): Promise<MonteCarloResponse> {
    const response = await fetchWithTimeout(`${BACKEND_URL}/api/portfolio/monte-carlo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbols,
        startDate,
        endDate,
        initialCapital,
        timeHorizonDays,
        numSimulations,
        portfolioWeights
      }),
      timeout: 60000 // 60 second timeout for Monte Carlo (very computationally intensive)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Monte Carlo simulation failed: ${error}`);
    }

    return response.json();
  }
}
