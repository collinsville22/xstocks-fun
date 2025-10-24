import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { RefreshCw, Activity, AlertCircle } from 'lucide-react';
import { ENV } from '../../../config/env';
import {
  PortfolioValueChart,
  SectorAllocationPie,
  PerformanceAttributionBar,
  RiskGauges
} from './index';

/**
 * Portfolio Dashboard Example
 *
 * This example demonstrates how to integrate all four portfolio chart components
 * with the Phase 4.6 backend API endpoints.
 *
 * API Endpoint: GET /api/portfolio/analyze?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */

interface PortfolioAnalysisData {
  portfolio: {
    currentValue: number;
    totalReturn: number;
    positions: Array<{
      symbol: string;
      shares: number;
      currentPrice: number;
      marketValue: number;
      costBasis: number;
      gain: number;
      gainPercent: number;
      weight: number;
      contribution: number;
      sector: string;
    }>;
  };
  timeSeries: Array<{
    date: string;
    portfolioValue: number;
    benchmarkValue: number;
  }>;
  sectorAllocation: { [sector: string]: number };
  riskMetrics: {
    sharpeRatio: number;
    beta: number;
    alpha: number;
    volatility: number;
    maxDrawdown: number;
  };
  benchmark: string;
  startDate: string;
  endDate: string;
}

const PortfolioDashboardExample: React.FC = () => {
  const [data, setData] = useState<PortfolioAnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Fetch portfolio analysis data
  const fetchPortfolioData = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Calculate date range (last 1 year)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - 1);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const response = await fetch(
        `${ENV.INTEL_API_URL}/api/portfolio/analyze?startDate=${startDateStr}&endDate=${endDateStr}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch portfolio data: ${response.statusText}`);
      }

      const portfolioData = await response.json();
      setData(portfolioData);
    } catch (err) {
      console.error('Error fetching portfolio data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load portfolio data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Card className="glass-card border-black/10/50">
          <CardContent className="p-3 text-center">
            <Activity className="w-12 h-12 mx-auto mb-3 text-blue-400 animate-pulse" />
            <p className="text-[#3C3C3C]">Loading portfolio analysis...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
        <CardContent className="p-3 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
          <p className="text-red-400 mb-3">{error}</p>
          <Button onClick={fetchPortfolioData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // No data state
  if (!data) {
    return (
      <Card className="glass-card border-black/10/50">
        <CardContent className="p-3 text-center">
          <Activity className="w-12 h-12 mx-auto mb-3 text-[#3C3C3C]" />
          <p className="text-[#3C3C3C]">No portfolio data available</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for charts
  const portfolioTimeSeriesData = data.timeSeries.map(point => ({
    date: point.date,
    value: point.portfolioValue
  }));

  const benchmarkTimeSeriesData = data.timeSeries.map(point => ({
    date: point.date,
    value: point.benchmarkValue
  }));

  const positionAttributions = data.portfolio.positions.map(position => ({
    symbol: position.symbol,
    contribution: position.contribution,
    gain: position.gain,
    weight: position.weight,
    gainPercent: position.gainPercent
  }));

  return (
    <div className="space-y-3">
      {/* Dashboard Header */}
      <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm text-[#1a1a1a] mb-2">
                Portfolio Management Dashboard
              </CardTitle>
              <p className="text-sm text-[#3C3C3C]">
                Comprehensive analysis from {data.startDate} to {data.endDate}
              </p>
            </div>
            <Button onClick={fetchPortfolioData} variant="outline" size="sm" disabled={isLoading}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="bg-playful-cream/40 rounded-lg p-3 border-2 border-black/20">
              <div className="text-sm text-[#3C3C3C] font-medium mb-1">Portfolio Value</div>
              <div className="text-sm font-bold text-[#1a1a1a]">
                ${data.portfolio.currentValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="bg-playful-cream/40 rounded-lg p-3 border-2 border-black/20">
              <div className="text-sm text-[#3C3C3C] font-medium mb-1">Total Return</div>
              <div className={`text-sm font-bold ${data.portfolio.totalReturn >= 0 ? 'text-playful-green' : 'text-playful-orange'}`}>
                {data.portfolio.totalReturn >= 0 ? '+' : ''}{data.portfolio.totalReturn.toFixed(2)}%
              </div>
            </div>
            <div className="bg-playful-cream/40 rounded-lg p-3 border-2 border-black/20">
              <div className="text-sm text-[#3C3C3C] font-medium mb-1">Positions</div>
              <div className="text-sm font-bold text-[#1a1a1a]">
                {data.portfolio.positions.length}
              </div>
            </div>
            <div className="bg-playful-cream/40 rounded-lg p-3 border-2 border-black/20">
              <div className="text-sm text-[#3C3C3C] font-medium mb-1">Benchmark</div>
              <div className="text-sm font-bold text-blue-600">
                {data.benchmark}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Portfolio Value Chart */}
      <PortfolioValueChart
        startDate={data.startDate}
        endDate={data.endDate}
        portfolioData={portfolioTimeSeriesData}
        benchmarkData={benchmarkTimeSeriesData}
      />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Sector Allocation */}
        <SectorAllocationPie sectorAllocation={data.sectorAllocation} />

        {/* Risk Gauges */}
        <RiskGauges
          sharpeRatio={data.riskMetrics.sharpeRatio}
          beta={data.riskMetrics.beta}
          alpha={data.riskMetrics.alpha}
          volatility={data.riskMetrics.volatility}
          maxDrawdown={data.riskMetrics.maxDrawdown}
        />
      </div>

      {/* Performance Attribution */}
      <PerformanceAttributionBar positions={positionAttributions} />
    </div>
  );
};

export default PortfolioDashboardExample;