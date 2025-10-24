/**
 * Type Definitions for Portfolio Management Dashboard Components
 */

// PortfolioValueChart Types
export interface PortfolioDataPoint {
  date: string;
  value: number;
}

export interface PortfolioValueChartProps {
  startDate: string;
  endDate: string;
  portfolioData: PortfolioDataPoint[];
  benchmarkData: PortfolioDataPoint[];
  className?: string;
}

// SectorAllocationPie Types
export interface SectorAllocation {
  [sector: string]: number;
}

export interface SectorAllocationPieProps {
  sectorAllocation: SectorAllocation;
  className?: string;
}

// PerformanceAttributionBar Types
export interface PositionAttribution {
  symbol: string;
  contribution: number;
  gain: number;
  weight: number;
  gainPercent: number;
}

export interface PerformanceAttributionBarProps {
  positions: PositionAttribution[];
  className?: string;
}

// RiskGauges Types
export interface RiskMetrics {
  sharpeRatio: number;
  beta: number;
  alpha?: number;
  volatility?: number;
  maxDrawdown?: number;
}

export interface RiskGaugesProps extends RiskMetrics {
  className?: string;
}

// Backend API Response Types
export interface Position {
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
}

export interface PortfolioData {
  currentValue: number;
  totalReturn: number;
  positions: Position[];
}

export interface TimeSeriesPoint {
  date: string;
  portfolioValue: number;
  benchmarkValue: number;
}

export interface PortfolioAnalysisResponse {
  portfolio: PortfolioData;
  timeSeries: TimeSeriesPoint[];
  sectorAllocation: SectorAllocation;
  riskMetrics: RiskMetrics;
  benchmark: string;
  startDate: string;
  endDate: string;
}

// Sector Colors Mapping
export const SECTOR_COLORS: { [key: string]: string } = {
  'Technology': '#3b82f6',
  'Healthcare': '#10b981',
  'Financial Services': '#f59e0b',
  'Consumer Cyclical': '#8b5cf6',
  'Communication Services': '#06b6d4',
  'Industrials': '#ef4444',
  'Energy': '#eab308',
  'Consumer Defensive': '#ec4899',
  'Real Estate': '#14b8a6',
  'Basic Materials': '#f97316',
  'Utilities': '#84cc16',
  'Other': '#6b7280'
};

// Chart Color Palette (Dark Theme)
export const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  grid: '#374151',
  text: '#9ca3af',
  background: '#1f2937'
};

// Sharpe Ratio Zones
export const SHARPE_ZONES = [
  { threshold: -1, color: '#ef4444', label: 'Poor' },
  { threshold: 0, color: '#f59e0b', label: 'Below Average' },
  { threshold: 1, color: '#eab308', label: 'Average' },
  { threshold: 2, color: '#10b981', label: 'Good' },
  { threshold: 3, color: '#10b981', label: 'Excellent' }
];

// Beta Zones
export const BETA_ZONES = [
  { threshold: 0, color: '#10b981', label: 'Low Risk' },
  { threshold: 0.5, color: '#eab308', label: 'Moderate' },
  { threshold: 1.0, color: '#f59e0b', label: 'Market Risk' },
  { threshold: 1.5, color: '#ef4444', label: 'High Risk' },
  { threshold: 2.0, color: '#ef4444', label: 'Very High' }
];