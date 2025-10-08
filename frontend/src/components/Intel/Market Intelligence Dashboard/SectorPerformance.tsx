'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { GlassCard } from './ui/GlassCard';
import { NeonProgress } from './ui/NeonProgress';
import { StockTooltip } from './StockTooltip';
import { cn } from '../../../lib/utils';
import { getStockLogo } from '../../../utils/stockImages';
import { TrendingUp, TrendingDown, Building2, BarChart3, RefreshCw, PieChart, Activity, DollarSign } from 'lucide-react';
import { useMarketData } from '../../../contexts/MarketDataContext';
import * as d3 from 'd3';

interface SectorStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
}

interface SectorData {
  name: string;
  stocks: SectorStock[];
  totalMarketCap: number;
  avgChange: number;
  totalVolume: number;
  topGainer: SectorStock | null;
  topLoser: SectorStock | null;
  performance: number;
}

interface SectorPerformanceProps {
  sectors: SectorData[];
  loading?: boolean;
  className?: string;
  onSectorClick?: (sectorName: string) => void;
  onStockClick?: (symbol: string) => void;
}

const SectorPerformance: React.FC<SectorPerformanceProps> = React.memo(({
  sectors,
  loading = false,
  className,
  onSectorClick,
  onStockClick
}) => {
  // Get period state from context
  const { period, setPeriod } = useMarketData();

  // Period mapping
  const periodMap: Record<'1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y', '1d' | '1w' | '1mo' | '3mo' | 'ytd' | '1y'> = {
    '1D': '1d',
    '1W': '1w',
    '1M': '1mo',
    '3M': '3mo',
    'YTD': 'ytd',
    '1Y': '1y'
  };

  const reversePeriodMap: Record<'1d' | '1w' | '1mo' | '3mo' | 'ytd' | '1y', '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y'> = {
    '1d': '1D',
    '1w': '1W',
    '1mo': '1M',
    '3mo': '3M',
    'ytd': 'YTD',
    '1y': '1Y'
  };

  const displayPeriod = reversePeriodMap[period];

  const formatCurrency = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatNumber = (value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toString();
  };

  const getPerformanceColor = (performance: number) => {
    if (performance > 3) return { color: 'text-green-400', bg: 'bg-green-400/20', border: 'border-green-400/30' };
    if (performance > 1) return { color: 'text-emerald-400', bg: 'bg-emerald-400/20', border: 'border-emerald-400/30' };
    if (performance > 0) return { color: 'text-blue-400', bg: 'bg-blue-400/20', border: 'border-blue-400/30' };
    if (performance > -1) return { color: 'text-yellow-400', bg: 'bg-yellow-400/20', border: 'border-yellow-400/30' };
    if (performance > -3) return { color: 'text-orange-400', bg: 'bg-orange-400/20', border: 'border-orange-400/30' };
    return { color: 'text-red-400', bg: 'bg-red-400/20', border: 'border-red-400/30' };
  };

  const sortedSectors = useMemo(() => {
    return [...sectors].sort((a, b) => b.performance - a.performance);
  }, [sectors]);

  const overallStats = useMemo(() => {
    if (sectors.length === 0) return null;

    const totalMarketCap = sectors.reduce((sum, sector) => sum + sector.totalMarketCap, 0);
    const totalVolume = sectors.reduce((sum, sector) => sum + sector.totalVolume, 0);
    const performingSectors = sectors.filter(s => s.performance > 0).length;
    const decliningSectors = sectors.filter(s => s.performance < 0).length;

    return { totalMarketCap, totalVolume, performingSectors, decliningSectors };
  }, [sectors]);

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-blue-500/5 to-playful-green/5 opacity-50" />

      <CardHeader className="relative z-10 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-2xl flex items-center justify-center">
              <PieChart className="w-5 h-5 text-[#1a1a1a]" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                Sector Performance - {displayPeriod}
              </CardTitle>
              <p className="text-sm text-[#3C3C3C]">Industry sector analysis & trends</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {loading && (
              <RefreshCw className="w-5 h-5 text-[#3C3C3C] animate-spin" />
            )}
            <div className="flex gap-2.5">
              {['1D', '1W', '1M', '3M', 'YTD', '1Y'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(periodMap[p as keyof typeof periodMap])}
                  className={cn(
                    "px-3 py-2.5 rounded-2xl transition-all text-sm font-medium",
                    displayPeriod === p
                      ? "bg-blue-500 text-[#1a1a1a] shadow-lg"
                      : "bg-white border-2 border-black hover:bg-playful-cream"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {overallStats && (
          <div className="flex gap-10 mt-3">
            <div className="flex items-center gap-2.5">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span className="text-sm text-[#1a1a1a]">
                Total MCap: {formatCurrency(overallStats.totalMarketCap)}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-primary-400" />
              <span className="text-sm text-[#1a1a1a]">
                Volume: {formatNumber(overallStats.totalVolume)}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm text-[#1a1a1a]">
                {overallStats.performingSectors} up
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              <span className="text-sm text-[#1a1a1a]">
                {overallStats.decliningSectors} down
              </span>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="relative z-10 p-3">
        {loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-10">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-80 bg-playful-cream border-2 border-black rounded-2xl"></div>
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-10">
            {sortedSectors.map((sector, sectorIdx) => {
            const performanceColors = getPerformanceColor(sector.performance);
            const isPositive = sector.performance > 0;

            return (
              <motion.div
                key={sector.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: sectorIdx * 0.1 }}
                className="cursor-pointer group"
                onClick={() => onSectorClick?.(sector.name)}
              >
                <GlassCard className="p-3 h-full border-black/10/30 hover:border-black/10/50 transition-all duration-300">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-[#1a1a1a] group-hover:text-green-400 transition-colors">
                          {sector.name}
                        </h3>
                        <p className="text-sm text-[#3C3C3C]">{sector.stocks.length} stocks</p>
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          'flex items-center gap-1.5 text-sm font-bold',
                          performanceColors.color
                        )}>
                          {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                          {sector.performance >= 0 ? '+' : ''}{sector.performance.toFixed(2)}%
                        </div>
                      </div>
                    </div>

                    {/* Performance Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-[#3C3C3C]">
                        <span>Sector Performance</span>
                        <span>{sector.performance >= 0 ? '+' : ''}{sector.performance.toFixed(2)}%</span>
                      </div>
                      <NeonProgress
                        value={Math.abs(sector.performance)}
                        max={10}
                        size="md"
                        color={isPositive ? 'green' : 'red'}
                        showValue={false}
                      />
                    </div>

                    {/* Top Stats */}
                    <div className="grid grid-cols-2 gap-10">
                      <div className="space-y-1">
                        <p className="text-sm text-[#3C3C3C]">Market Cap</p>
                        <p className="text-sm font-semibold text-[#1a1a1a]">
                          {formatCurrency(sector.totalMarketCap)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-[#3C3C3C]">Volume</p>
                        <p className="text-sm font-semibold text-[#1a1a1a]">
                          {formatNumber(sector.totalVolume)}
                        </p>
                      </div>
                    </div>

                    {/* Top Gainer & Loser */}
                    <div className="grid grid-cols-2 gap-10">
                      {sector.topGainer && (
                        <div className="space-y-2">
                          <p className="text-sm text-green-400">Top Gainer</p>
                          <div
                            className="p-2 bg-green-400/10 rounded border border-green-400/20 cursor-pointer hover:bg-green-400/20 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              onStockClick?.(sector.topGainer!.symbol);
                            }}
                          >
                            <div className="flex items-center gap-2.5">
                              <img
                                src={getStockLogo(sector.topGainer.symbol)}
                                alt={sector.topGainer.symbol}
                                className="w-8 h-8 rounded object-cover flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[#1a1a1a] truncate">
                                  {sector.topGainer.symbol}
                                </p>
                                <p className="text-sm text-green-400">
                                  +{sector.topGainer.changePercent.toFixed(2)}%
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {sector.topLoser && (
                        <div className="space-y-2">
                          <p className="text-sm text-red-400">Top Loser</p>
                          <div
                            className="p-2 bg-red-400/10 rounded border border-red-400/20 cursor-pointer hover:bg-red-400/20 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              onStockClick?.(sector.topLoser!.symbol);
                            }}
                          >
                            <div className="flex items-center gap-2.5">
                              <img
                                src={getStockLogo(sector.topLoser.symbol)}
                                alt={sector.topLoser.symbol}
                                className="w-8 h-8 rounded object-cover flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[#1a1a1a] truncate">
                                  {sector.topLoser.symbol}
                                </p>
                                <p className="text-sm text-red-400">
                                  {sector.topLoser.changePercent.toFixed(2)}%
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Mini Performance Chart */}
                    <div className="h-16 bg-playful-cream border-2 border-black rounded-2xl p-2 relative overflow-hidden">
                      <div className="absolute inset-2">
                        <svg width="100%" height="100%" viewBox="0 0 200 48" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id={`gradient-${sectorIdx}`} x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity="0.4" />
                              <stop offset="100%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity="0.1" />
                            </linearGradient>
                          </defs>
                          {/* Generate sparkline from stock performance distribution */}
                          {(() => {
                            // Sort stocks by performance to create a smooth curve
                            const sortedStocks = [...sector.stocks].sort((a, b) => a.changePercent - b.changePercent);
                            const points = sortedStocks.length > 0 ? sortedStocks : Array(10).fill({ changePercent: 0 });

                            // Calculate y-scale based on min/max values
                            const values = points.map(s => s.changePercent);
                            const minVal = Math.min(...values, -2);
                            const maxVal = Math.max(...values, 2);
                            const range = maxVal - minVal || 1;

                            // Generate path points
                            const pathPoints = points.map((stock, i) => {
                              const x = (i / (points.length - 1)) * 200;
                              const normalizedY = (stock.changePercent - minVal) / range;
                              const y = 48 - (normalizedY * 48);
                              return `${x},${y}`;
                            }).join(' ');

                            // Create area path for gradient fill
                            const areaPath = `M 0,48 L ${pathPoints} L 200,48 Z`;

                            return (
                              <>
                                {/* Area fill */}
                                <path
                                  d={areaPath}
                                  fill={`url(#gradient-${sectorIdx})`}
                                  opacity="0.6"
                                />
                                {/* Line */}
                                <polyline
                                  points={pathPoints}
                                  fill="none"
                                  stroke={isPositive ? "#10b981" : "#ef4444"}
                                  strokeWidth="2"
                                  opacity="0.8"
                                />
                                {/* Endpoint dot */}
                                <circle
                                  cx={200}
                                  cy={48 - ((values[values.length - 1] - minVal) / range * 48)}
                                  r="3"
                                  fill={isPositive ? "#10b981" : "#ef4444"}
                                  opacity="0.9"
                                />
                              </>
                            );
                          })()}
                        </svg>
                      </div>
                    </div>

                    {/* Stock Count */}
                    <div className="flex justify-between items-center">
                      <Badge variant="secondary" className="glass-card text-[#1a1a1a]">
                        {sector.stocks.length} stocks
                      </Badge>
                      <div className="text-sm text-[#3C3C3C]">
                        Avg: {sector.avgChange >= 0 ? '+' : ''}{sector.avgChange.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
          </div>
        )}

        {sectors.length === 0 && !loading && (
          <div className="text-center py-2.5">
            <Building2 className="w-12 h-12 text-[#3C3C3C] mx-auto mb-3" />
            <p className="text-[#3C3C3C]">No sector data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

SectorPerformance.displayName = 'SectorPerformance';

export { SectorPerformance };