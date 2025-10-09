'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { GlassCard } from './ui/GlassCard';
import { NeonProgress } from './ui/NeonProgress';
import { StockTooltip } from './ui/StockTooltip';
import { cn } from '../../../lib/utils';
import { TrendingUp, TrendingDown, Activity, BarChart3, RefreshCw, Target, Zap, LineChart } from 'lucide-react';
import { MarketIndexChart } from '../MarketIndexChart';
import { useMarketData } from '../../../contexts/MarketDataContext';

interface TechnicalIndicator {
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  sma20: number;
  sma50: number;
  sma200?: number;
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
  };
}

interface IndexData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  technical: TechnicalIndicator;
  lastUpdated: string;
}

interface MarketIndicesProps {
  indices: IndexData[];
  loading?: boolean;
  className?: string;
  onIndexClick?: (symbol: string) => void;
}

const MarketIndices: React.FC<MarketIndicesProps> = React.memo(({
  indices,
  loading = false,
  className,
  onIndexClick
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'charts'>('charts');

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

  const getRSIStatus = (rsi: number) => {
    if (rsi >= 70) return { label: 'Overbought', color: 'text-red-400', bg: 'bg-red-400/20' };
    if (rsi <= 30) return { label: 'Oversold', color: 'text-green-400', bg: 'bg-green-400/20' };
    if (rsi >= 60) return { label: 'Bullish', color: 'text-blue-400', bg: 'bg-blue-400/20' };
    if (rsi <= 40) return { label: 'Bearish', color: 'text-orange-400', bg: 'bg-orange-400/20' };
    return { label: 'Neutral', color: 'text-[#3C3C3C]', bg: 'bg-gray-400/20' };
  };

  const getMACDSignal = (macd: number, signal: number) => {
    if (macd > signal) return { label: 'Bullish', color: 'text-green-400', direction: 'up' };
    if (macd < signal) return { label: 'Bearish', color: 'text-red-400', direction: 'down' };
    return { label: 'Neutral', color: 'text-[#3C3C3C]', direction: 'neutral' };
  };

  const getTrendSignal = (price: number, sma20: number, sma50: number) => {
    const aboveSMA20 = price > sma20;
    const aboveSMA50 = price > sma50;
    const sma20AboveSMA50 = sma20 > sma50;

    if (aboveSMA20 && aboveSMA50 && sma20AboveSMA50) {
      return { label: 'Strong Buy', color: 'text-green-400', strength: 3 };
    }
    if (aboveSMA20 && sma20AboveSMA50) {
      return { label: 'Buy', color: 'text-emerald-400', strength: 2 };
    }
    if (aboveSMA50) {
      return { label: 'Weak Buy', color: 'text-blue-400', strength: 1 };
    }
    if (!aboveSMA20 && !aboveSMA50 && !sma20AboveSMA50) {
      return { label: 'Strong Sell', color: 'text-red-400', strength: -3 };
    }
    if (!aboveSMA20 && !sma20AboveSMA50) {
      return { label: 'Sell', color: 'text-orange-400', strength: -2 };
    }
    return { label: 'Weak Sell', color: 'text-yellow-400', strength: -1 };
  };

  const overallStats = useMemo(() => {
    if (indices.length === 0) return null;

    const totalMarketCap = indices.reduce((sum, index) => sum + index.marketCap, 0);
    const avgChange = indices.reduce((sum, index) => sum + index.changePercent, 0) / indices.length;
    const gainers = indices.filter(index => index.changePercent > 0).length;
    const losers = indices.filter(index => index.changePercent < 0).length;

    return { totalMarketCap, avgChange, gainers, losers };
  }, [indices]);

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-playful-green/5 via-blue-500/5 to-green-500/5 opacity-50" />

      <CardHeader className="relative z-10 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-10">
            <div className="w-8 h-8 bg-gradient-to-br from-playful-green to-blue-500 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-[#1a1a1a]" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Market Indices
              </CardTitle>
              <p className="text-sm text-[#3C3C3C]">Technical analysis & indicators</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {loading && (
              <RefreshCw className="w-5 h-5 text-[#3C3C3C] animate-spin" />
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setViewMode('charts')}
              className={cn('text-sm', viewMode === 'charts' && 'bg-blue-500/20 border-blue-500')}
            >
              <LineChart className="w-4 h-4 mr-1" />
              Charts
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setViewMode('cards')}
              className={cn('text-sm', viewMode === 'cards' && 'bg-blue-500/20 border-blue-500')}
            >
              <BarChart3 className="w-4 h-4 mr-1" />
              Cards
            </Button>
          </div>
        </div>

        {overallStats && (
          <div className="flex gap-10">
            <div className="flex items-center gap-2.5">
              <Target className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-[#1a1a1a]">
                Market Cap: {formatCurrency(overallStats.totalMarketCap)}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-[#1a1a1a]">
                Avg Change: {overallStats.avgChange.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm text-[#1a1a1a]">
                {overallStats.gainers} up
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              <span className="text-sm text-[#1a1a1a]">
                {overallStats.losers} down
              </span>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="relative z-10 p-3">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-96 bg-gray-700/50 rounded-lg border border-black/10/30"></div>
              </div>
            ))}
          </div>
        )}

        {!loading && viewMode === 'charts' && (
          // Professional Chart View
          <div className="space-y-3">
            {indices.map((index, indexIdx) => (
              <motion.div
                key={index.symbol}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: indexIdx * 0.1 }}
              >
                <MarketIndexChart
                  symbol={index.symbol}
                  name={index.name}
                  price={index.price}
                  change={index.change}
                  changePercent={index.changePercent}
                  technical={index.technical}
                />
              </motion.div>
            ))}
          </div>
        )}

        {!loading && viewMode === 'cards' && (
          // Original Card View (Legacy)
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {indices.map((index, indexIdx) => {
              const rsiStatus = getRSIStatus(index.technical.rsi);
              const macdSignal = getMACDSignal(index.technical.macd.macd, index.technical.macd.signal);
              const trendSignal = getTrendSignal(index.price, index.technical.sma20, index.technical.sma50);
              const isPositive = index.changePercent > 0;

              return (
              <motion.div
                key={index.symbol}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: indexIdx * 0.1 }}
                className="cursor-pointer group"
                onClick={() => onIndexClick?.(index.symbol)}
              >
                <GlassCard className="p-3 h-full border-black/10/30 hover:border-black/10/50 transition-all duration-300">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-[#1a1a1a] group-hover:text-blue-400 transition-colors">
                          {index.symbol}
                        </h3>
                        <p className="text-sm text-[#3C3C3C]">{index.name}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-[#1a1a1a]">
                          ${index.price.toFixed(2)}
                        </div>
                        <div className={cn(
                          'flex items-center gap-1.5 text-sm font-semibold',
                          isPositive ? 'text-green-400' : 'text-red-400'
                        )}>
                          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          {index.change >= 0 ? '+' : ''}{index.change.toFixed(2)} ({index.changePercent >= 0 ? '+' : ''}{index.changePercent.toFixed(2)}%)
                        </div>
                      </div>
                    </div>

                    {/* Technical Indicators Grid */}
                    <div className="grid grid-cols-2 gap-10">
                      {/* RSI */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#3C3C3C]">RSI</span>
                          <Badge variant="outline" className={cn('text-sm', rsiStatus.bg, rsiStatus.color)}>
                            {rsiStatus.label}
                          </Badge>
                        </div>
                        <NeonProgress
                          value={index.technical.rsi}
                          max={100}
                          size="sm"
                          color={rsiStatus.color.includes('green') ? 'green' : rsiStatus.color.includes('red') ? 'red' : 'blue'}
                          showValue={true}
                        />
                      </div>

                      {/* MACD */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#3C3C3C]">MACD</span>
                          <Badge variant="outline" className={cn(
                            'text-sm',
                            macdSignal.color === 'text-green-400' ? 'bg-green-400/20' :
                            macdSignal.color === 'text-red-400' ? 'bg-red-400/20' : 'bg-gray-400/20'
                          )}>
                            {macdSignal.label}
                          </Badge>
                        </div>
                        <div className="flex gap-2.5">
                          <div className="flex-1">
                            <p className="text-sm text-[#3C3C3C]">MACD</p>
                            <p className="text-sm font-mono text-[#1a1a1a]">{index.technical.macd.macd.toFixed(3)}</p>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-[#3C3C3C]">Signal</p>
                            <p className="text-sm font-mono text-[#1a1a1a]">{index.technical.macd.signal.toFixed(3)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Moving Averages */}
                      <div className="space-y-2">
                        <span className="text-sm text-[#3C3C3C]">Moving Averages</span>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-[#3C3C3C]">SMA20:</span>
                            <span className="text-[#1a1a1a] font-mono">${index.technical.sma20.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-[#3C3C3C]">SMA50:</span>
                            <span className="text-[#1a1a1a] font-mono">${index.technical.sma50.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Trend Signal */}
                      <div className="space-y-2">
                        <span className="text-sm text-[#3C3C3C]">Trend Signal</span>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className={cn(
                            'text-sm',
                            trendSignal.color === 'text-green-400' ? 'bg-green-400/20' :
                            trendSignal.color === 'text-red-400' ? 'bg-red-400/20' :
                            trendSignal.color === 'text-blue-400' ? 'bg-blue-400/20' :
                            trendSignal.color === 'text-emerald-400' ? 'bg-emerald-400/20' :
                            trendSignal.color === 'text-orange-400' ? 'bg-orange-400/20' : 'bg-yellow-400/20'
                          )}>
                            {trendSignal.label}
                          </Badge>
                          <div className="flex gap-1.5">
                            {Array.from({ length: Math.abs(trendSignal.strength) }, (_, i) => (
                              <div
                                key={i}
                                className={cn(
                                  'w-1 h-3 rounded-full',
                                  trendSignal.strength > 0 ? 'bg-green-400' : 'bg-red-400'
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bollinger Bands */}
                    <div className="space-y-2">
                      <span className="text-sm text-[#3C3C3C]">Bollinger Bands</span>
                      <div className="relative h-12 bg-gray-800/30 rounded-lg p-2">
                        <div className="absolute inset-2 flex flex-col justify-between">
                          <div className="h-px bg-red-400/50" />
                          <div className="h-px bg-blue-400/50" />
                          <div className="h-px bg-red-400/50" />
                        </div>
                        <div
                          className="absolute left-2 w-2 h-2 bg-cyan-400 rounded-full"
                          style={{
                            top: `${((index.price - index.technical.bollinger.lower) /
                                   (index.technical.bollinger.upper - index.technical.bollinger.lower)) * 100}%`,
                            transform: 'translateY(-50%)'
                          }}
                        />
                        <div className="absolute left-6 top-1 text-sm text-[#3C3C3C]">
                          Upper: ${index.technical.bollinger.upper.toFixed(2)}
                        </div>
                        <div className="absolute left-6 bottom-1 text-sm text-[#3C3C3C]">
                          Lower: ${index.technical.bollinger.lower.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Volume & Market Cap */}
                    <div className="flex justify-between text-sm text-[#3C3C3C]">
                      <span>Vol: {formatNumber(index.volume)}</span>
                      <span>MCap: {formatCurrency(index.marketCap)}</span>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
              );
            })}
          </div>
        )}

        {!loading && indices.length === 0 && (
          <div className="text-center py-2.5">
            <BarChart3 className="w-12 h-12 text-[#3C3C3C] mx-auto mb-3" />
            <p className="text-[#3C3C3C]">No indices data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

MarketIndices.displayName = 'MarketIndices';

export { MarketIndices };