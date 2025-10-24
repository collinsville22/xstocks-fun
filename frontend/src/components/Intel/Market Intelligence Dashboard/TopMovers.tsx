'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { GlassCard } from './ui/GlassCard';
import { StockTooltip } from './ui/StockTooltip';
import { cn } from '../../../lib/utils';
import { getStockLogo } from '../../../utils/stockImages';
import { TrendingUp, TrendingDown, Zap, BarChart3, RefreshCw, Award, AlertTriangle, Star, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { useMarketData } from '../../../contexts/MarketDataContext';

interface MoverStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  sector: string;
  avgVolume: number;
  volumeRatio: number;
}

interface MarketPulse {
  totalVolume: number;
  avgVolume: number;
  volumeChange: number;
  marketCap: number;
  activeStocks: number;
  volatility: number;
  momentum: 'bullish' | 'bearish' | 'neutral';
  fearGreedIndex: number;
}

interface TopMoversProps {
  topGainers: MoverStock[];
  topLosers: MoverStock[];
  mostActive: MoverStock[];
  marketPulse: MarketPulse;
  loading?: boolean;
  className?: string;
  onStockClick?: (symbol: string) => void;
}

const TopMovers: React.FC<TopMoversProps> = React.memo(({
  topGainers,
  topLosers,
  mostActive,
  marketPulse,
  loading = false,
  className,
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

  const getFearGreedColor = (index: number) => {
    if (index >= 75) return { color: 'text-green-400', bg: 'bg-green-400/20', label: 'Extreme Greed' };
    if (index >= 55) return { color: 'text-emerald-400', bg: 'bg-emerald-400/20', label: 'Greed' };
    if (index >= 45) return { color: 'text-yellow-400', bg: 'bg-yellow-400/20', label: 'Neutral' };
    if (index >= 25) return { color: 'text-orange-400', bg: 'bg-orange-400/20', label: 'Fear' };
    return { color: 'text-red-400', bg: 'bg-red-400/20', label: 'Extreme Fear' };
  };

  const getMomentumColor = (momentum: string) => {
    switch (momentum) {
      case 'bullish': return { color: 'text-green-400', bg: 'bg-green-400/20', icon: TrendingUp };
      case 'bearish': return { color: 'text-red-400', bg: 'bg-red-400/20', icon: TrendingDown };
      default: return { color: 'text-yellow-400', bg: 'bg-yellow-400/20', icon: Activity };
    }
  };

  const fearGreedData = getFearGreedColor(marketPulse.fearGreedIndex);
  const momentumData = getMomentumColor(marketPulse.momentum);
  const MomentumIcon = momentumData.icon;

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-yellow-500/5 to-green-500/5 opacity-50" />

      <CardHeader className="relative z-10 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-yellow-500 rounded-2xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#1a1a1a]" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold bg-gradient-to-r from-red-400 to-yellow-400 bg-clip-text text-transparent">
                Top Movers & Market Pulse - {displayPeriod}
              </CardTitle>
              <p className="text-sm text-[#3C3C3C]">Market momentum & sentiment analysis</p>
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
      </CardHeader>

      <CardContent className="relative z-10 p-3">
        {loading && (
          <div className="space-y-3">
            {/* Market Pulse Skeleton */}
            <div className="animate-pulse">
              <div className="h-48 bg-playful-cream border-2 border-black rounded-2xl"></div>
            </div>
            {/* Movers Grid Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-3">
                  <div className="h-8 bg-playful-cream border-2 border-black rounded-2xl w-1/3"></div>
                  {[1, 2, 3, 4, 5].map((j) => (
                    <div key={j} className="h-24 bg-playful-cream border-2 border-black rounded-2xl"></div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && (
          <>
            {/* Market Pulse Section */}
            <GlassCard className="p-3 mb-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[#1a1a1a] flex items-center gap-2.5">
              <Activity className="w-5 h-5 text-yellow-400" />
              Market Pulse
            </h3>
            <Badge variant="outline" className={cn(momentumData.bg, momentumData.color)}>
              {marketPulse.momentum.toUpperCase()}
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            <div className="text-center">
              <p className="text-sm font-bold text-cyan-400">
                {formatNumber(marketPulse.totalVolume)}
              </p>
              <p className="text-sm text-[#3C3C3C]">Total Volume</p>
            </div>
            <div className="text-center">
              <p className={cn(
                'text-sm font-bold',
                marketPulse.volumeChange >= 0 ? 'text-green-400' : 'text-red-400'
              )}>
                {marketPulse.volumeChange >= 0 ? '+' : ''}{marketPulse.volumeChange.toFixed(1)}%
              </p>
              <p className="text-sm text-[#3C3C3C]">Volume Change</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-primary-400">
                {formatCurrency(marketPulse.marketCap)}
              </p>
              <p className="text-sm text-[#3C3C3C]">Market Cap</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-orange-400">
                {marketPulse.activeStocks}
              </p>
              <p className="text-sm text-[#3C3C3C]">Active Stocks</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-3">
            <div className="flex items-center justify-between p-3 bg-playful-cream border-2 border-black rounded-2xl">
              <div className="flex items-center gap-2.5">
                <MomentumIcon className="w-4 h-4" />
                <span className="text-sm text-[#1a1a1a]">Momentum</span>
              </div>
              <Badge variant="outline" className={cn(momentumData.bg, momentumData.color)}>
                {marketPulse.momentum.toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-playful-cream border-2 border-black rounded-2xl">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-[#1a1a1a]">Fear & Greed</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="text-sm font-bold text-[#1a1a1a]">
                  {marketPulse.fearGreedIndex}
                </div>
                <Badge variant="outline" className={cn(fearGreedData.bg, fearGreedData.color)}>
                  {fearGreedData.label}
                </Badge>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Top Movers Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Top Gainers */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <Award className="w-5 h-5 text-green-400" />
              <h3 className="text-sm font-bold text-green-400">Top Gainers</h3>
            </div>
            {topGainers.slice(0, 5).map((stock, idx) => (
              <motion.div
                key={stock.symbol}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <GlassCard
                  className="p-3 cursor-pointer hover:border-green-400/50 transition-all duration-300"
                  onClick={() => onStockClick?.(stock.symbol)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-10 flex-1">
                      <img
                        src={getStockLogo(stock.symbol)}
                        alt={stock.symbol}
                        className="w-10 h-10 rounded-2xl object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm font-bold text-[#1a1a1a]">{stock.symbol}</span>
                          <Badge variant="outline" className="text-sm bg-white border-2 border-black">
                            {stock.sector}
                          </Badge>
                        </div>
                        <p className="text-sm text-[#3C3C3C] truncate">{stock.name}</p>
                        <div className="flex items-center gap-2.5 mt-1">
                          <span className="text-sm font-bold text-green-400">
                            +{stock.changePercent.toFixed(2)}%
                          </span>
                          <span className="text-sm text-[#3C3C3C]">
                            {formatNumber(stock.volume)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-[#1a1a1a]">
                        ${stock.price.toFixed(2)}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-green-400">
                        <ArrowUpRight className="w-3 h-3" />
                        <span>{stock.volumeRatio.toFixed(1)}x vol</span>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          {/* Top Losers */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h3 className="text-sm font-bold text-red-400">Top Losers</h3>
            </div>
            {topLosers.slice(0, 5).map((stock, idx) => (
              <motion.div
                key={stock.symbol}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <GlassCard
                  className="p-3 cursor-pointer hover:border-red-400/50 transition-all duration-300"
                  onClick={() => onStockClick?.(stock.symbol)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-10 flex-1">
                      <img
                        src={getStockLogo(stock.symbol)}
                        alt={stock.symbol}
                        className="w-10 h-10 rounded-2xl object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm font-bold text-[#1a1a1a]">{stock.symbol}</span>
                          <Badge variant="outline" className="text-sm bg-white border-2 border-black">
                            {stock.sector}
                          </Badge>
                        </div>
                        <p className="text-sm text-[#3C3C3C] truncate">{stock.name}</p>
                        <div className="flex items-center gap-2.5 mt-1">
                          <span className="text-sm font-bold text-red-400">
                            {stock.changePercent.toFixed(2)}%
                          </span>
                          <span className="text-sm text-[#3C3C3C]">
                            {formatNumber(stock.volume)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-[#1a1a1a]">
                        ${stock.price.toFixed(2)}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-red-400">
                        <ArrowDownRight className="w-3 h-3" />
                        <span>{stock.volumeRatio.toFixed(1)}x vol</span>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          {/* Most Active */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <BarChart3 className="w-5 h-5 text-primary-400" />
              <h3 className="text-sm font-bold text-primary-400">Most Active</h3>
            </div>
            {mostActive.slice(0, 5).map((stock, idx) => (
              <motion.div
                key={stock.symbol}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <GlassCard
                  className="p-3 cursor-pointer hover:border-primary-400/50 transition-all duration-300"
                  onClick={() => onStockClick?.(stock.symbol)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-10 flex-1">
                      <img
                        src={getStockLogo(stock.symbol)}
                        alt={stock.symbol}
                        className="w-10 h-10 rounded-2xl object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm font-bold text-[#1a1a1a]">{stock.symbol}</span>
                          <Badge variant="outline" className="text-sm bg-white border-2 border-black">
                            {stock.sector}
                          </Badge>
                          <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        </div>
                        <p className="text-sm text-[#3C3C3C] truncate">{stock.name}</p>
                        <div className="flex items-center gap-2.5 mt-1">
                          <span className={cn(
                            'text-sm font-bold',
                            stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                          )}>
                            {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-[#1a1a1a]">
                        ${stock.price.toFixed(2)}
                      </div>
                      <div className="text-sm text-primary-400">
                        {formatNumber(stock.volume)}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>

            {(topGainers.length === 0 || topLosers.length === 0 || mostActive.length === 0) && (
              <div className="text-center py-2.5">
                <Zap className="w-12 h-12 text-[#3C3C3C] mx-auto mb-3" />
                <p className="text-[#3C3C3C]">No movers data available</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
});

TopMovers.displayName = 'TopMovers';

export { TopMovers };