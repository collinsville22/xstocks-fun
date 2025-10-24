'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { GlassCard } from './ui/GlassCard';
import { cn } from '../../../lib/utils';
import { Zap, AlertTriangle, RefreshCw, TrendingUp, TrendingDown, Volume2 } from 'lucide-react';
import { useMarketData } from '../../../contexts/MarketDataContext';
import { ENV } from '../../../config/env';

interface UnusualStock {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  volume: number;
  averageVolume: number;
  volumeRatio: number; // volume / averageVolume (>=2.0 for unusual)
  sector: string;
}

interface UnusualVolumeResponse {
  success: boolean;
  unusualVolume: UnusualStock[];
  totalCount: number;
}

type AlertLevel = 'warning' | 'high' | 'extreme';
type FilterType = 'all' | '2-3x' | '3-5x' | '5x+';

interface SummaryStats {
  totalStocks: number;
  highestRatioStock: UnusualStock | null;
  mostCommonSector: string;
  averageVolumeRatio: number;
}

const UnusualVolumeDetector: React.FC = () => {
  const { period } = useMarketData();
  const [data, setData] = useState<UnusualStock[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Cache key based on period
  const cacheKey = `unusual-volume-${period}`;

  // Helper function to format volume numbers
  const formatVolume = (num: number): string => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  };

  // Helper function to get alert level based on volume ratio
  const getAlertLevel = (ratio: number): AlertLevel => {
    if (ratio >= 5.0) return 'extreme';
    if (ratio >= 3.0) return 'high';
    return 'warning';
  };

  // Helper function to get alert color classes
  const getAlertColor = (level: AlertLevel) => {
    switch (level) {
      case 'extreme':
        return {
          bg: 'bg-red-400/20',
          text: 'text-red-400',
          border: 'border-red-400/50',
          glow: 'shadow-red-400/20'
        };
      case 'high':
        return {
          bg: 'bg-orange-400/20',
          text: 'text-orange-400',
          border: 'border-orange-400/50',
          glow: 'shadow-orange-400/20'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-400/20',
          text: 'text-yellow-400',
          border: 'border-yellow-400/50',
          glow: 'shadow-yellow-400/20'
        };
    }
  };

  // Fetch unusual volume data with caching
  const fetchUnusualVolume = useCallback(async (skipCache = false) => {
    try {
      setLoading(true);
      setError(null);

      // Try to load from cache first (if not skipping cache)
      if (!skipCache) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data: cachedData, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;

          // Use cache if less than 2 minutes old (aggressive caching)
          if (age < 2 * 60 * 1000) {
            setData(cachedData);
            setLastUpdated(new Date(timestamp));
            setLoading(false);
            return;
          }
        }
      }

      // Fetch data from Intel microservice

      const response = await fetch(`${ENV.INTEL_API_URL}/api/market/unusual-volume?period=${period}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: UnusualVolumeResponse = await response.json();

      if (result.success && result.unusualVolume) {
        // Sort by volume ratio (highest first) and take top 20
        const sortedData = [...result.unusualVolume]
          .sort((a, b) => b.volumeRatio - a.volumeRatio)
          .slice(0, 20);

        setData(sortedData);
        const now = new Date();
        setLastUpdated(now);

        // Cache the data aggressively
        localStorage.setItem(cacheKey, JSON.stringify({
          data: sortedData,
          timestamp: now.getTime()
        }));
      } else {
        setData([]);
      }
    } catch (err) {
      console.error('Error fetching unusual volume:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch unusual volume data');
    } finally {
      setLoading(false);
    }
  }, [period, cacheKey]);

  // Initial fetch and auto-refresh every 5 minutes (re-fetch on period change)
  useEffect(() => {
    fetchUnusualVolume();

    const interval = setInterval(() => {
      fetchUnusualVolume(true); // Skip cache on auto-refresh
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchUnusualVolume, period]); // Re-fetch when period changes

  // Filter data based on active filter
  const filteredData = useMemo(() => {
    switch (activeFilter) {
      case '2-3x':
        return data.filter(stock => stock.volumeRatio >= 2.0 && stock.volumeRatio < 3.0);
      case '3-5x':
        return data.filter(stock => stock.volumeRatio >= 3.0 && stock.volumeRatio < 5.0);
      case '5x+':
        return data.filter(stock => stock.volumeRatio >= 5.0);
      default:
        return data;
    }
  }, [data, activeFilter]);

  // Calculate summary statistics
  const summaryStats = useMemo((): SummaryStats => {
    if (data.length === 0) {
      return {
        totalStocks: 0,
        highestRatioStock: null,
        mostCommonSector: 'N/A',
        averageVolumeRatio: 0
      };
    }

    const highestRatioStock = data.reduce((prev, current) =>
      current.volumeRatio > prev.volumeRatio ? current : prev
    );

    const sectorCounts = data.reduce((acc, stock) => {
      acc[stock.sector] = (acc[stock.sector] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommonSector = Object.entries(sectorCounts).reduce((prev, current) =>
      current[1] > prev[1] ? current : prev
    )[0];

    const averageVolumeRatio = data.reduce((sum, stock) => sum + stock.volumeRatio, 0) / data.length;

    return {
      totalStocks: data.length,
      highestRatioStock,
      mostCommonSector,
      averageVolumeRatio
    };
  }, [data]);

  // Manual refresh handler (skip cache)
  const handleRefresh = () => {
    fetchUnusualVolume(true);
  };

  return (
    <Card className="relative overflow-hidden glass-card border-black/10/50">
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-orange-500/5 to-red-500/5 opacity-50" />

      <CardHeader className="relative z-10 pb-4">
        <div className="flex items-center justify-between flex-wrap gap-10">
          <div className="flex items-center gap-10">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-red-500 rounded-lg flex items-center justify-center shadow-lg">
              <Volume2 className="w-6 h-6 text-[#1a1a1a]" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold bg-gradient-to-r from-yellow-400 to-red-400 bg-clip-text text-transparent">
                Unusual Volume Detector
              </CardTitle>
              <p className="text-sm text-[#3C3C3C]">
                Real-time volume spike detection & alerts
                {lastUpdated && ` • Updated ${lastUpdated.toLocaleTimeString()}`}
              </p>
            </div>
          </div>

          <Button
            onClick={handleRefresh}
            disabled={loading}
            variant="outline"
            size="sm"
            className="border-black/10 hover:bg-gray-700/50"
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2.5 mt-3 flex-wrap">
          {(['all', '2-3x', '3-5x', '5x+'] as FilterType[]).map((filter) => (
            <Button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              variant={activeFilter === filter ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'transition-all duration-200',
                activeFilter === filter
                  ? 'bg-gradient-to-r from-yellow-500 to-red-500 text-[#1a1a1a]'
                  : 'border-black/10 hover:bg-gray-700/50'
              )}
            >
              {filter === 'all' ? 'All' : filter}
            </Button>
          ))}
          <Badge variant="outline" className="ml-2 bg-gray-700/50 text-[#1a1a1a]">
            {filteredData.length} stocks
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 p-3 space-y-3">
        {loading && data.length === 0 ? (
          <div className="flex items-center justify-center py-2.5">
            <div className="text-center">
              <RefreshCw className="w-12 h-12 text-yellow-400 animate-spin mx-auto mb-3" />
              <p className="text-[#3C3C3C]">Scanning for unusual volume...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-2.5">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <p className="text-red-400 mb-2">Error loading data</p>
              <p className="text-[#3C3C3C] text-sm">{error}</p>
              <Button onClick={handleRefresh} variant="outline" size="sm" className="mt-3">
                Try Again
              </Button>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center py-2.5">
            <div className="text-center">
              <Volume2 className="w-12 h-12 text-[#3C3C3C] mx-auto mb-3" />
              <p className="text-[#3C3C3C] text-sm font-medium">No unusual volume detected</p>
              <p className="text-[#3C3C3C] text-sm">Market is quiet</p>
            </div>
          </div>
        ) : (
          <>
            {/* Summary Stats Card */}
            <GlassCard className="p-3">
              <div className="flex items-center gap-2.5 mb-3">
                <Zap className="w-5 h-5 text-yellow-400" />
                <h3 className="text-sm font-bold text-[#1a1a1a]">Summary Statistics</h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
                <div className="text-center">
                  <p className="text-sm font-bold text-yellow-400">
                    {summaryStats.totalStocks}
                  </p>
                  <p className="text-sm text-[#3C3C3C]">Unusual Stocks</p>
                </div>

                <div className="text-center">
                  <p className="text-sm font-bold text-red-400">
                    {summaryStats.highestRatioStock
                      ? `${summaryStats.highestRatioStock.volumeRatio.toFixed(1)}x`
                      : 'N/A'}
                  </p>
                  <p className="text-sm text-[#3C3C3C]">
                    {summaryStats.highestRatioStock
                      ? summaryStats.highestRatioStock.symbol
                      : 'Highest Ratio'}
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-sm font-bold text-orange-400">
                    {summaryStats.mostCommonSector}
                  </p>
                  <p className="text-sm text-[#3C3C3C]">Most Active Sector</p>
                </div>

                <div className="text-center">
                  <p className="text-sm font-bold text-yellow-400">
                    {summaryStats.averageVolumeRatio.toFixed(1)}x
                  </p>
                  <p className="text-sm text-[#3C3C3C]">Avg Volume Ratio</p>
                </div>
              </div>
            </GlassCard>

            {/* Stock Cards Grid */}
            {filteredData.length === 0 ? (
              <div className="text-center py-2.5">
                <AlertTriangle className="w-10 h-10 text-[#3C3C3C] mx-auto mb-3" />
                <p className="text-[#3C3C3C]">No stocks match the selected filter</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <AnimatePresence mode="popLayout">
                  {filteredData.map((stock, idx) => {
                    const alertLevel = getAlertLevel(stock.volumeRatio);
                    const colors = getAlertColor(alertLevel);

                    return (
                      <motion.div
                        key={stock.symbol}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{
                          duration: 0.3,
                          delay: idx * 0.05,
                          ease: "easeOut"
                        }}
                      >
                        <GlassCard
                          className={cn(
                            'p-3 hover:scale-[1.02] transition-all duration-300',
                            'border-2',
                            colors.border,
                            alertLevel === 'extreme' && 'animate-pulse'
                          )}
                        >
                          {/* Header with Symbol and Alert Badge */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2.5 mb-1">
                                <span className="text-sm font-bold text-[#1a1a1a]">
                                  {stock.symbol}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={cn(colors.bg, colors.text, 'flex items-center gap-1.5')}
                                >
                                  <AlertTriangle className="w-3 h-3" />
                                  {stock.volumeRatio.toFixed(1)}x
                                </Badge>
                              </div>
                              <p className="text-sm text-[#3C3C3C] truncate max-w-[200px]">
                                {stock.name}
                              </p>
                            </div>

                            <Badge variant="outline" className="bg-gray-700/50 text-[#1a1a1a]">
                              {stock.sector}
                            </Badge>
                          </div>

                          {/* Price and Change */}
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="text-sm font-bold text-[#1a1a1a]">
                                ${stock.price.toFixed(2)}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1">
                                {stock.changePercent >= 0 ? (
                                  <TrendingUp className="w-4 h-4 text-green-400" />
                                ) : (
                                  <TrendingDown className="w-4 h-4 text-red-400" />
                                )}
                                <span
                                  className={cn(
                                    'text-sm font-bold',
                                    stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                                  )}
                                >
                                  {stock.changePercent >= 0 ? '+' : ''}
                                  {stock.changePercent.toFixed(2)}%
                                </span>
                              </div>
                            </div>

                            {/* Volume Ratio Indicator */}
                            <div className="text-right">
                              <p className={cn('text-sm font-bold', colors.text)}>
                                {stock.volumeRatio.toFixed(1)}x
                              </p>
                              <p className="text-sm text-[#3C3C3C]">volume ratio</p>
                            </div>
                          </div>

                          {/* Volume Stats */}
                          <div className="p-3 bg-gray-900/30 rounded-lg">
                            <div className="flex items-center justify-between text-sm">
                              <div>
                                <p className="text-[#3C3C3C]">Current Volume</p>
                                <p className="text-[#1a1a1a] font-bold">
                                  {formatVolume(stock.volume)}
                                </p>
                              </div>
                              <div className="text-center">
                                <Volume2 className={cn('w-5 h-5 mx-auto', colors.text)} />
                              </div>
                              <div className="text-right">
                                <p className="text-[#3C3C3C]">Avg Volume</p>
                                <p className="text-[#1a1a1a] font-bold">
                                  {formatVolume(stock.averageVolume)}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Alert Level Badge */}
                          <div className="mt-3 flex items-center justify-between">
                            <Badge
                              variant="outline"
                              className={cn(colors.bg, colors.text, 'uppercase text-sm font-bold')}
                            >
                              {alertLevel === 'extreme'
                                ? ' Extreme Alert'
                                : alertLevel === 'high'
                                ? ' High Alert'
                                : ' Warning'}
                            </Badge>
                            <span className="text-sm text-[#3C3C3C]">
                              {alertLevel === 'extreme'
                                ? '5x+ Volume'
                                : alertLevel === 'high'
                                ? '3-5x Volume'
                                : '2-3x Volume'}
                            </span>
                          </div>
                        </GlassCard>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export { UnusualVolumeDetector };