import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { cn } from '../../../lib/utils';
import {
  Grid3X3,
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  Percent,
  Activity,
  DollarSign,
  Building2,
  Users,
  Star,
  Eye,
  Calendar,
  Zap,
  Shield,
  Filter,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Stock } from '../ScreeningResults/ResultsTable';
import { getStockLogo } from '../../../utils/stockImages';

interface PerformanceHeatmapProps {
  stocks: Stock[];
  className?: string;
}

interface HeatmapConfig {
  id: string;
  name: string;
  description: string;
  metrics: {
    key: keyof Stock;
    label: string;
    format: (value: number) => string;
    reversed?: boolean; // Lower values are better (like P/E ratio)
  }[];
  category: 'fundamental' | 'technical' | 'quantitative' | 'mixed';
}

const heatmapConfigs: HeatmapConfig[] = [
  {
    id: 'fundamental',
    name: 'Fundamental Metrics',
    description: 'Core financial health indicators',
    category: 'fundamental',
    metrics: [
      { key: 'pe', label: 'P/E', format: (v) => v.toFixed(1), reversed: true },
      { key: 'pb', label: 'P/B', format: (v) => v.toFixed(1), reversed: true },
      { key: 'dividendYield', label: 'Div %', format: (v) => `${v.toFixed(1)}%` },
      { key: 'epsGrowth', label: 'EPS Growth', format: (v) => `${v.toFixed(1)}%` },
      { key: 'debtToEquity', label: 'D/E', format: (v) => v.toFixed(1), reversed: true }
    ]
  },
  {
    id: 'technical',
    name: 'Technical Indicators',
    description: 'Price action and momentum signals',
    category: 'technical',
    metrics: [
      { key: 'changePercent', label: 'Price Δ', format: (v) => `${v.toFixed(1)}%` },
      { key: 'rsi', label: 'RSI', format: (v) => v.toFixed(1) },
      { key: 'volatility', label: 'Vol', format: (v) => `${v.toFixed(1)}%` }
    ]
  },
  {
    id: 'quantitative',
    name: 'Quantitative Factors',
    description: 'Analyst and ownership metrics',
    category: 'quantitative',
    metrics: [
      { key: 'analystRating', label: 'Rating', format: (v) => v.toFixed(1), reversed: true },
      { key: 'earningsSurprise', label: 'EPS Surprise', format: (v) => `${v.toFixed(1)}%` },
      { key: 'shortInterest', label: 'Short %', format: (v) => `${v.toFixed(1)}%`, reversed: true },
      { key: 'insiderOwnership', label: 'Insider %', format: (v) => `${v.toFixed(1)}%` },
      { key: 'institutionalOwnership', label: 'Inst %', format: (v) => `${v.toFixed(1)}%` }
    ]
  },
  {
    id: 'performance',
    name: 'Performance Overview',
    description: 'Overall performance and market position',
    category: 'mixed',
    metrics: [
      { key: 'performanceScore', label: 'Score', format: (v) => v.toString() },
      { key: 'marketCap', label: 'Market Cap', format: (v) => v >= 1e9 ? `$${(v/1e9).toFixed(1)}B` : `$${(v/1e6).toFixed(0)}M` },
      { key: 'volume', label: 'Volume', format: (v) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : `${(v/1e3).toFixed(0)}K` },
      { key: 'changePercent', label: 'Price Δ', format: (v) => `${v.toFixed(1)}%` }
    ]
  }
];

const getPercentileRank = (value: number, allValues: number[], reversed = false): number => {
  const sorted = [...allValues].sort((a, b) => a - b);
  const rank = sorted.findIndex(v => v >= value);
  const percentile = (rank / (sorted.length - 1)) * 100;
  return reversed ? 100 - percentile : percentile;
};

const getHeatmapColor = (percentile: number): string => {
  if (percentile >= 80) return 'bg-green-500';
  if (percentile >= 60) return 'bg-green-400';
  if (percentile >= 40) return 'bg-yellow-400';
  if (percentile >= 20) return 'bg-orange-400';
  return 'bg-red-500';
};

const getHeatmapBackgroundColor = (percentile: number): string => {
  // Return RGBA color strings for proper color display
  if (percentile >= 80) return 'rgba(34, 197, 94, 0.9)';   // green-500
  if (percentile >= 60) return 'rgba(74, 222, 128, 0.85)'; // green-400
  if (percentile >= 40) return 'rgba(250, 204, 21, 0.8)';  // yellow-400
  if (percentile >= 20) return 'rgba(251, 146, 60, 0.85)'; // orange-400
  return 'rgba(239, 68, 68, 0.9)';                          // red-500
};

const HeatmapCell: React.FC<{
  stock: Stock;
  metric: HeatmapConfig['metrics'][0];
  percentile: number;
  value: number;
  onClick: () => void;
  isSelected: boolean;
}> = ({ stock, metric, percentile, value, onClick, isSelected }) => {
  return (
    <motion.div
      className={cn(
        "relative h-12 border border-black/10/30 cursor-pointer transition-all duration-200 flex items-center justify-center",
        isSelected && "ring-2 ring-white ring-opacity-75"
      )}
      style={{
        backgroundColor: getHeatmapBackgroundColor(percentile)
      }}
      onClick={onClick}
      whileHover={{ scale: 1.05, zIndex: 10 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-center">
        <div className="text-sm font-medium text-[#1a1a1a] drop-shadow-sm">
          {metric.format(value)}
        </div>
        <div className="text-sm text-[#1a1a1a]/80 drop-shadow-sm">
          {percentile.toFixed(0)}%
        </div>
      </div>

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-[#1a1a1a] text-sm rounded opacity-0 hover:opacity-100 transition-opacity duration-200 z-20 whitespace-nowrap">
        {stock.symbol}: {metric.label} = {metric.format(value)}
        <br />
        Percentile: {percentile.toFixed(1)}%
      </div>
    </motion.div>
  );
};

const PerformanceHeatmap: React.FC<PerformanceHeatmapProps> = ({
  stocks,
  className
}) => {
  const [selectedConfig, setSelectedConfig] = useState(heatmapConfigs[0]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [sortBy, setSortBy] = useState<'symbol' | 'performance' | 'sector'>('performance');

  const heatmapData = useMemo(() => {
    // Calculate percentiles for each metric
    const metricPercentiles = selectedConfig.metrics.map(metric => {
      const allValues = stocks.map(stock => Number(stock[metric.key]) || 0);
      return {
        metric,
        allValues,
        percentiles: stocks.map(stock => ({
          stock,
          value: Number(stock[metric.key]) || 0,
          percentile: getPercentileRank(Number(stock[metric.key]) || 0, allValues, metric.reversed)
        }))
      };
    });

    // Calculate overall scores for each stock
    const stockScores = stocks.map(stock => {
      const totalPercentile = metricPercentiles.reduce((sum, metricData) => {
        const stockData = metricData.percentiles.find(p => p.stock.symbol === stock.symbol);
        return sum + (stockData?.percentile || 0);
      }, 0);
      return {
        stock,
        averagePercentile: totalPercentile / selectedConfig.metrics.length
      };
    });

    return { metricPercentiles, stockScores };
  }, [stocks, selectedConfig]);

  const sortedStocks = useMemo(() => {
    const { stockScores } = heatmapData;

    switch (sortBy) {
      case 'symbol':
        return [...stockScores].sort((a, b) => a.stock.symbol.localeCompare(b.stock.symbol));
      case 'performance':
        return [...stockScores].sort((a, b) => b.averagePercentile - a.averagePercentile);
      case 'sector':
        return [...stockScores].sort((a, b) => {
          const sectorCompare = a.stock.sector.localeCompare(b.stock.sector);
          return sectorCompare !== 0 ? sectorCompare : b.averagePercentile - a.averagePercentile;
        });
      default:
        return stockScores;
    }
  }, [heatmapData, sortBy]);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'fundamental': return 'text-green-400 border-green-400/50';
      case 'technical': return 'text-orange-400 border-orange-400/50';
      case 'quantitative': return 'text-primary-400 border-primary-400/50';
      case 'mixed': return 'text-blue-400 border-blue-400/50';
      default: return 'text-[#3C3C3C] border-gray-400/50';
    }
  };

  const topPerformers = sortedStocks.slice(0, 5);
  const bottomPerformers = sortedStocks.slice(-5).reverse();

  return (
    <Card className={cn("glass-card border-black/10/50", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#1a1a1a] flex items-center gap-2.5">
            <Grid3X3 className="w-5 h-5 text-blue-400" />
            Performance Heatmap
            <Badge variant="outline" className="text-blue-400 border-blue-400/50">
              {stocks.length} stocks
            </Badge>
          </CardTitle>

          <div className="flex items-center gap-2.5">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-gray-700 text-[#1a1a1a] text-sm px-3 py-1 rounded border border-black/10"
            >
              <option value="performance">Sort by Performance</option>
              <option value="symbol">Sort by Symbol</option>
              <option value="sector">Sort by Sector</option>
            </select>
          </div>
        </div>

        {/* Config selector */}
        <div className="flex flex-wrap gap-2.5 mt-3">
          {heatmapConfigs.map((config) => (
            <Button
              key={config.id}
              onClick={() => {
                setSelectedConfig(config);
                setSelectedStock(null);
              }}
              variant="outline"
              size="sm"
              className={cn(
                "h-8 text-sm",
                selectedConfig.id === config.id
                  ? getCategoryColor(config.category) + " bg-current/10"
                  : "text-[#3C3C3C] border-black/10/50 hover:bg-gray-700/50"
              )}
            >
              {config.name}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Current config info */}
        <div className="bg-playful-cream rounded-2xl p-3">
          <h3 className="text-sm font-semibold text-[#1a1a1a] mb-2">{selectedConfig.name}</h3>
          <p className="text-sm text-[#3C3C3C] mb-3">{selectedConfig.description}</p>

          {/* Legend */}
          <div className="flex items-center gap-10 text-sm">
            <span className="text-[#1a1a1a]">Performance:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-[#3C3C3C]">Poor</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-orange-400 rounded"></div>
              <span className="text-[#3C3C3C]">Below Avg</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-yellow-400 rounded"></div>
              <span className="text-[#3C3C3C]">Average</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-green-400 rounded"></div>
              <span className="text-[#3C3C3C]">Above Avg</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-[#3C3C3C]">Excellent</span>
            </div>
          </div>
        </div>

        {/* Heatmap */}
        <div className="bg-playful-cream rounded-2xl p-3 overflow-x-auto">
          <div className="min-w-max">
            {/* Headers */}
            <div className="grid grid-cols-1 gap-0 mb-1" style={{ gridTemplateColumns: `120px repeat(${selectedConfig.metrics.length}, 80px)` }}>
              <div className="h-12 flex items-center justify-start px-2 bg-gray-700/50 border border-black/10/30">
                <span className="text-sm font-medium text-[#1a1a1a]">Stock</span>
              </div>
              {selectedConfig.metrics.map((metric) => (
                <div key={metric.key} className="h-12 flex items-center justify-center px-1 bg-gray-700/50 border border-black/10/30">
                  <span className="text-sm font-medium text-[#1a1a1a] text-center">{metric.label}</span>
                </div>
              ))}
            </div>

            {/* Data rows */}
            {sortedStocks.slice(0, 20).map(({ stock, averagePercentile }) => (
              <div key={stock.symbol} className="grid gap-0 mb-0" style={{ gridTemplateColumns: `120px repeat(${selectedConfig.metrics.length}, 80px)` }}>
                <div
                  className={cn(
                    "h-12 flex items-center justify-start gap-2.5 px-2 glass-card border border-black/10/30 cursor-pointer transition-colors",
                    selectedStock?.symbol === stock.symbol && "bg-blue-500/20"
                  )}
                  onClick={() => setSelectedStock(selectedStock?.symbol === stock.symbol ? null : stock)}
                >
                  <img
                    src={getStockLogo(stock.symbol)}
                    alt={stock.symbol}
                    className="w-6 h-6 rounded object-cover flex-shrink-0"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-[#1a1a1a] truncate">{stock.symbol}</span>
                    <span className="text-sm text-[#3C3C3C]">{averagePercentile.toFixed(0)}%</span>
                  </div>
                </div>
                {heatmapData.metricPercentiles.map((metricData) => {
                  const stockData = metricData.percentiles.find(p => p.stock.symbol === stock.symbol);
                  if (!stockData) return null;

                  return (
                    <HeatmapCell
                      key={`${stock.symbol}-${metricData.metric.key}`}
                      stock={stock}
                      metric={metricData.metric}
                      percentile={stockData.percentile}
                      value={stockData.value}
                      onClick={() => setSelectedStock(selectedStock?.symbol === stock.symbol ? null : stock)}
                      isSelected={selectedStock?.symbol === stock.symbol}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Performance summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Top performers */}
          <div className="bg-playful-cream rounded-2xl p-3">
            <h4 className="text-md font-semibold text-[#1a1a1a] mb-3 flex items-center gap-2.5">
              <ArrowUpRight className="w-4 h-4 text-green-400" />
              Top Performers
            </h4>
            <div className="space-y-2">
              {topPerformers.map(({ stock, averagePercentile }, index) => (
                <div key={stock.symbol} className="flex items-center justify-between p-2 glass-card rounded">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 bg-green-500 text-[#1a1a1a] text-sm font-bold rounded flex items-center justify-center">
                      {index + 1}
                    </div>
                    <img
                      src={getStockLogo(stock.symbol)}
                      alt={stock.symbol}
                      className="w-8 h-8 rounded object-cover"
                    />
                    <div>
                      <div className="text-sm font-medium text-[#1a1a1a]">{stock.symbol}</div>
                      <div className="text-sm text-[#3C3C3C]">{stock.sector}</div>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-green-400">
                    {averagePercentile.toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom performers */}
          <div className="bg-playful-cream rounded-2xl p-3">
            <h4 className="text-md font-semibold text-[#1a1a1a] mb-3 flex items-center gap-2.5">
              <ArrowDownRight className="w-4 h-4 text-red-400" />
              Bottom Performers
            </h4>
            <div className="space-y-2">
              {bottomPerformers.map(({ stock, averagePercentile }, index) => (
                <div key={stock.symbol} className="flex items-center justify-between p-2 glass-card rounded">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 bg-red-500 text-[#1a1a1a] text-sm font-bold rounded flex items-center justify-center">
                      {stocks.length - 4 + index}
                    </div>
                    <img
                      src={getStockLogo(stock.symbol)}
                      alt={stock.symbol}
                      className="w-8 h-8 rounded object-cover"
                    />
                    <div>
                      <div className="text-sm font-medium text-[#1a1a1a]">{stock.symbol}</div>
                      <div className="text-sm text-[#3C3C3C]">{stock.sector}</div>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-red-400">
                    {averagePercentile.toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Selected stock details */}
        {selectedStock && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-playful-cream rounded-2xl p-3"
          >
            <h4 className="text-md font-semibold text-[#1a1a1a] mb-3 flex items-center gap-2.5">
              <Eye className="w-4 h-4 text-blue-400" />
              {selectedStock.symbol} - {selectedStock.name}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
              {selectedConfig.metrics.map((metric) => {
                const value = Number(selectedStock[metric.key]) || 0;
                const metricData = heatmapData.metricPercentiles.find(m => m.metric.key === metric.key);
                const stockData = metricData?.percentiles.find(p => p.stock.symbol === selectedStock.symbol);
                const percentile = stockData?.percentile || 0;

                return (
                  <div key={metric.key} className="text-center">
                    <div className="text-sm font-medium text-[#1a1a1a]">{metric.label}</div>
                    <div className={cn(
                      "text-sm font-bold",
                      percentile >= 80 ? "text-green-400" :
                      percentile >= 60 ? "text-green-300" :
                      percentile >= 40 ? "text-yellow-400" :
                      percentile >= 20 ? "text-orange-400" : "text-red-400"
                    )}>
                      {metric.format(value)}
                    </div>
                    <div className="text-sm text-[#3C3C3C]">{percentile.toFixed(0)}th percentile</div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};

export { PerformanceHeatmap };