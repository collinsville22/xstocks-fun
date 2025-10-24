import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ENV } from '../../config/env';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Activity,
  Building2,
  Percent,
  Shield,
  Target,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface FundamentalAnalysisProps {
  symbol: string;
  className?: string;
}

interface FundamentalsData {
  symbol: string;
  valuation: {
    trailingPE: number | null;
    forwardPE: number | null;
    priceToBook: number | null;
    priceToSales: number | null;
    enterpriseValue: number | null;
    enterpriseToRevenue: number | null;
    enterpriseToEbitda: number | null;
    pegRatio: number | null;
    marketCap: number | null;
  };
  financialHealth: {
    debtToEquity: number | null;
    currentRatio: number | null;
    quickRatio: number | null;
    totalDebt: number | null;
    totalCash: number | null;
    freeCashflow: number | null;
    operatingCashflow: number | null;
  };
  profitability: {
    grossMargins: number | null;
    operatingMargins: number | null;
    profitMargins: number | null;
    returnOnAssets: number | null;
    returnOnEquity: number | null;
    revenuePerShare: number | null;
    earningsPerShare: number | null;
  };
  growth: {
    revenueGrowth: number | null;
    earningsGrowth: number | null;
    earningsQuarterlyGrowth: number | null;
  };
  dividend: {
    dividendRate: number | null;
    dividendYield: number | null;
    payoutRatio: number | null;
    fiveYearAvgDividendYield: number | null;
  };
  companyInfo: {
    longName: string;
    sector: string;
    industry: string;
    website: string;
    country: string;
    fullTimeEmployees: number;
    longBusinessSummary: string;
  };
  financialStatements: {
    incomeStatement: Record<string, any>;
    balanceSheet: Record<string, any>;
    cashFlow: Record<string, any>;
  };
  timestamp: number;
}

/**
 * Fundamental Analysis Component - Phase 4.1 Week 2
 * Displays comprehensive fundamental metrics for stock analysis
 */
export const FundamentalAnalysis: React.FC<FundamentalAnalysisProps> = ({
  symbol,
  className = ''
}) => {
  const [data, setData] = useState<FundamentalsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFundamentals();
  }, [symbol]);

  const fetchFundamentals = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const url = `${ENV.INTEL_API_URL}/api/fundamentals/${symbol}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch fundamentals: ${response.statusText}`);
      }

      const fundamentals: FundamentalsData = await response.json();
      setData(fundamentals);
    } catch (err) {
      console.error('Error fetching fundamentals:', err);
      setError(err instanceof Error ? err.message : 'Failed to load fundamental data');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper functions
  const formatNumber = (num: number | null, decimals: number = 2): string => {
    if (num === null || num === undefined) return 'N/A';
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const formatCurrency = (num: number | null, compact: boolean = false): string => {
    if (num === null || num === undefined) return 'N/A';

    if (compact) {
      if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
      if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
      if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
      return `$${num.toFixed(2)}`;
    }

    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercent = (num: number | null): string => {
    if (num === null || num === undefined) return 'N/A';
    return `${(num * 100).toFixed(2)}%`;
  };

  const getHealthScore = (ratio: number | null, type: 'debt' | 'current' | 'quick'): { color: string; label: string } => {
    if (ratio === null) return { color: 'text-[#3C3C3C]', label: 'N/A' };

    if (type === 'debt') {
      if (ratio < 0.5) return { color: 'text-playful-green', label: 'Excellent' };
      if (ratio < 1.0) return { color: 'text-playful-green', label: 'Good' };
      if (ratio < 2.0) return { color: 'text-yellow-400', label: 'Moderate' };
      return { color: 'text-red-500', label: 'High Risk' };
    }

    if (type === 'current' || type === 'quick') {
      if (ratio >= 2.0) return { color: 'text-playful-green', label: 'Strong' };
      if (ratio >= 1.5) return { color: 'text-playful-green', label: 'Good' };
      if (ratio >= 1.0) return { color: 'text-yellow-400', label: 'Adequate' };
      return { color: 'text-red-500', label: 'Weak' };
    }

    return { color: 'text-[#3C3C3C]', label: 'N/A' };
  };

  const MetricCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string;
    subtext?: string;
    color?: string;
  }> = ({ icon, label, value, subtext, color = 'text-[#1a1a1a]' }) => (
    <div className="bg-playful-cream p-3 rounded-2xl border border-2 border-black hover:border-2 border-black transition-colors">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="text-[#3C3C3C]">{icon}</div>
        <span className="text-sm text-[#3C3C3C]">{label}</span>
      </div>
      <div className={`text-sm font-bold ${color}`}>{value}</div>
      {subtext && <div className="text-sm text-[#3C3C3C] mt-1">{subtext}</div>}
    </div>
  );

  if (isLoading) {
    return (
      <Card className={`bg-white border-3 border-black rounded-2xl shadow-md border-2 border-black ${className}`}>
        <CardContent className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-10">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="text-[#3C3C3C]">Loading fundamental data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className={`bg-white border-3 border-black rounded-2xl shadow-md border-2 border-black ${className}`}>
        <CardContent className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-10 text-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <span className="text-red-500">{error || 'Failed to load data'}</span>
            <button
              onClick={fetchFundamentals}
              className="mt-2 px-3 py-2.5 text-sm bg-blue-600 text-[#1a1a1a] rounded hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Valuation Metrics */}
      <Card className="bg-white border-3 border-black rounded-2xl shadow-md border-2 border-black">
        <CardHeader>
          <CardTitle className="text-sm text-[#1a1a1a] flex items-center gap-10">
            <DollarSign className="w-6 h-6 text-playful-green" />
            Valuation Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            <MetricCard
              icon={<Target className="w-4 h-4" />}
              label="P/E Ratio (TTM)"
              value={formatNumber(data.valuation.trailingPE)}
              subtext="Price to Earnings"
            />
            <MetricCard
              icon={<Target className="w-4 h-4" />}
              label="Forward P/E"
              value={formatNumber(data.valuation.forwardPE)}
              subtext="Next 12 months"
            />
            <MetricCard
              icon={<PieChart className="w-4 h-4" />}
              label="P/B Ratio"
              value={formatNumber(data.valuation.priceToBook)}
              subtext="Price to Book"
            />
            <MetricCard
              icon={<Activity className="w-4 h-4" />}
              label="P/S Ratio"
              value={formatNumber(data.valuation.priceToSales)}
              subtext="Price to Sales"
            />
            <MetricCard
              icon={<Building2 className="w-4 h-4" />}
              label="Market Cap"
              value={formatCurrency(data.valuation.marketCap, true)}
              subtext="Company size"
            />
            <MetricCard
              icon={<DollarSign className="w-4 h-4" />}
              label="EV/EBITDA"
              value={formatNumber(data.valuation.enterpriseToEbitda)}
              subtext="Enterprise multiple"
            />
            <MetricCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="PEG Ratio"
              value={formatNumber(data.valuation.pegRatio)}
              subtext="P/E to Growth"
            />
            <MetricCard
              icon={<Building2 className="w-4 h-4" />}
              label="EV/Revenue"
              value={formatNumber(data.valuation.enterpriseToRevenue)}
              subtext="Enterprise to Sales"
            />
          </div>
        </CardContent>
      </Card>

      {/* Financial Health */}
      <Card className="bg-white border-3 border-black rounded-2xl shadow-md border-2 border-black">
        <CardHeader>
          <CardTitle className="text-sm text-[#1a1a1a] flex items-center gap-10">
            <Shield className="w-6 h-6 text-playful-green" />
            Financial Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            <MetricCard
              icon={<Shield className="w-4 h-4" />}
              label="Debt to Equity"
              value={formatNumber(data.financialHealth.debtToEquity)}
              subtext={getHealthScore(data.financialHealth.debtToEquity, 'debt').label}
              color={getHealthScore(data.financialHealth.debtToEquity, 'debt').color}
            />
            <MetricCard
              icon={<Activity className="w-4 h-4" />}
              label="Current Ratio"
              value={formatNumber(data.financialHealth.currentRatio)}
              subtext={getHealthScore(data.financialHealth.currentRatio, 'current').label}
              color={getHealthScore(data.financialHealth.currentRatio, 'current').color}
            />
            <MetricCard
              icon={<Activity className="w-4 h-4" />}
              label="Quick Ratio"
              value={formatNumber(data.financialHealth.quickRatio)}
              subtext={getHealthScore(data.financialHealth.quickRatio, 'quick').label}
              color={getHealthScore(data.financialHealth.quickRatio, 'quick').color}
            />
            <MetricCard
              icon={<DollarSign className="w-4 h-4" />}
              label="Total Cash"
              value={formatCurrency(data.financialHealth.totalCash, true)}
              subtext="Cash & equivalents"
            />
            <MetricCard
              icon={<AlertCircle className="w-4 h-4" />}
              label="Total Debt"
              value={formatCurrency(data.financialHealth.totalDebt, true)}
              subtext="Long & short term"
            />
            <MetricCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="Free Cash Flow"
              value={formatCurrency(data.financialHealth.freeCashflow, true)}
              subtext="FCF (TTM)"
            />
            <MetricCard
              icon={<Activity className="w-4 h-4" />}
              label="Operating CF"
              value={formatCurrency(data.financialHealth.operatingCashflow, true)}
              subtext="Cash from operations"
            />
            <MetricCard
              icon={<Percent className="w-4 h-4" />}
              label="Net Cash Position"
              value={formatCurrency(
                (data.financialHealth.totalCash || 0) - (data.financialHealth.totalDebt || 0),
                true
              )}
              subtext="Cash minus debt"
              color={
                (data.financialHealth.totalCash || 0) > (data.financialHealth.totalDebt || 0)
                  ? 'text-playful-green'
                  : 'text-red-500'
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Profitability & Efficiency */}
      <Card className="bg-white border-3 border-black rounded-2xl shadow-md border-2 border-black">
        <CardHeader>
          <CardTitle className="text-sm text-[#1a1a1a] flex items-center gap-10">
            <Percent className="w-6 h-6 text-primary-400" />
            Profitability & Efficiency
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            <MetricCard
              icon={<Percent className="w-4 h-4" />}
              label="Gross Margin"
              value={formatPercent(data.profitability.grossMargins)}
              subtext="Revenue - COGS"
              color={
                data.profitability.grossMargins && data.profitability.grossMargins > 0.4
                  ? 'text-playful-green'
                  : 'text-yellow-400'
              }
            />
            <MetricCard
              icon={<Percent className="w-4 h-4" />}
              label="Operating Margin"
              value={formatPercent(data.profitability.operatingMargins)}
              subtext="Operating income"
              color={
                data.profitability.operatingMargins && data.profitability.operatingMargins > 0.15
                  ? 'text-playful-green'
                  : 'text-yellow-400'
              }
            />
            <MetricCard
              icon={<Percent className="w-4 h-4" />}
              label="Net Profit Margin"
              value={formatPercent(data.profitability.profitMargins)}
              subtext="Bottom line"
              color={
                data.profitability.profitMargins && data.profitability.profitMargins > 0.1
                  ? 'text-playful-green'
                  : 'text-yellow-400'
              }
            />
            <MetricCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="ROE"
              value={formatPercent(data.profitability.returnOnEquity)}
              subtext="Return on Equity"
              color={
                data.profitability.returnOnEquity && data.profitability.returnOnEquity > 0.15
                  ? 'text-playful-green'
                  : 'text-yellow-400'
              }
            />
            <MetricCard
              icon={<Activity className="w-4 h-4" />}
              label="ROA"
              value={formatPercent(data.profitability.returnOnAssets)}
              subtext="Return on Assets"
            />
            <MetricCard
              icon={<DollarSign className="w-4 h-4" />}
              label="EPS (TTM)"
              value={formatCurrency(data.profitability.earningsPerShare)}
              subtext="Earnings per share"
            />
            <MetricCard
              icon={<Activity className="w-4 h-4" />}
              label="Revenue/Share"
              value={formatCurrency(data.profitability.revenuePerShare)}
              subtext="Sales efficiency"
            />
            <MetricCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="Revenue Growth"
              value={formatPercent(data.growth.revenueGrowth)}
              subtext="YoY growth"
              color={
                data.growth.revenueGrowth && data.growth.revenueGrowth > 0
                  ? 'text-playful-green'
                  : 'text-red-500'
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Dividend Information (if applicable) */}
      {data.dividend.dividendYield !== null && data.dividend.dividendYield > 0 && (
        <Card className="bg-white border-3 border-black rounded-2xl shadow-md border-2 border-black">
          <CardHeader>
            <CardTitle className="text-sm text-[#1a1a1a] flex items-center gap-10">
              <DollarSign className="w-6 h-6 text-yellow-400" />
              Dividend Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
              <MetricCard
                icon={<Percent className="w-4 h-4" />}
                label="Dividend Yield"
                value={formatPercent(data.dividend.dividendYield)}
                subtext="Annual yield"
                color="text-yellow-400"
              />
              <MetricCard
                icon={<DollarSign className="w-4 h-4" />}
                label="Dividend Rate"
                value={formatCurrency(data.dividend.dividendRate)}
                subtext="Per share (annual)"
              />
              <MetricCard
                icon={<Percent className="w-4 h-4" />}
                label="Payout Ratio"
                value={formatPercent(data.dividend.payoutRatio)}
                subtext="% of earnings"
              />
              <MetricCard
                icon={<Activity className="w-4 h-4" />}
                label="5Y Avg Yield"
                value={formatPercent(data.dividend.fiveYearAvgDividendYield)}
                subtext="Historical average"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Statements - Removed as yfinance doesn't reliably provide this data */}

      {/* Data timestamp */}
      <div className="text-sm text-[#3C3C3C] text-center">
        Data updated: {new Date(data.timestamp).toLocaleString()}
      </div>
    </div>
  );
};

export default FundamentalAnalysis;