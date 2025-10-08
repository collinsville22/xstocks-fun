import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Target,
  TrendingUp,
  Users,
  Award,
  Star,
  RefreshCw,
  Crown,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { GlassCard } from './ui/GlassCard';
import { useMarketData } from '../../../contexts/MarketDataContext';
import { ENV } from '../../../config/env';

// API Response Interfaces
interface AnalystStock {
  symbol: string;
  name: string;
  currentPrice: number;
  targetMean: number;
  upside: number;
  numAnalysts: number;
}

interface RatingDistribution {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

interface AnalystSummaryResponse {
  success: boolean;
  ratingDistribution: RatingDistribution;
  topRatedStocks: AnalystStock[];
  mostCoveredStocks: AnalystStock[];
  totalStocksAnalyzed: number;
}

// Helper Functions
const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

const getMarketSentiment = (
  distribution: RatingDistribution
): 'Bullish' | 'Bearish' | 'Neutral' => {
  const total =
    distribution.strongBuy +
    distribution.buy +
    distribution.hold +
    distribution.sell +
    distribution.strongSell;

  if (total === 0) return 'Neutral';

  const bullishPercent =
    ((distribution.strongBuy + distribution.buy) / total) * 100;
  const bearishPercent =
    ((distribution.sell + distribution.strongSell) / total) * 100;

  if (bullishPercent > 60) return 'Bullish';
  if (bearishPercent > 30) return 'Bearish';
  return 'Neutral';
};

const getSentimentColor = (sentiment: 'Bullish' | 'Bearish' | 'Neutral'): string => {
  switch (sentiment) {
    case 'Bullish':
      return 'bg-green-400/20 text-green-400 border-green-400/30';
    case 'Bearish':
      return 'bg-red-400/20 text-red-400 border-red-400/30';
    case 'Neutral':
      return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30';
  }
};

// Chart Colors
const CHART_COLORS = {
  strongBuy: '#10b981',
  buy: '#34d399',
  hold: '#fbbf24',
  sell: '#fb923c',
  strongSell: '#ef4444',
};

export const AnalystSummary: React.FC = () => {
  const { period } = useMarketData();
  const [data, setData] = useState<AnalystSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Cache key based on period
  const cacheKey = `analyst-summary-${period}`;

  const fetchAnalystData = useCallback(async (skipCache = false) => {
    try {
      setRefreshing(true);

      // Try to load from cache first (if not skipping cache)
      if (!skipCache) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data: cachedData, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;

          // Use cache if less than 5 minutes old (aggressive caching)
          if (age < 5 * 60 * 1000) {
            setData(cachedData);
            setLastUpdated(new Date(timestamp));
            setLoading(false);
            setRefreshing(false);
            return;
          }
        }
      }

      // Fetch data from Intel microservice

      const response = await fetch(`${ENV.INTEL_API_URL}/api/market/analyst-summary?period=${period}`);
      const apiResult = await response.json();

      if (result.success) {
        setData(result);
        const now = new Date();
        setLastUpdated(now);

        // Cache the data aggressively
        localStorage.setItem(cacheKey, JSON.stringify({
          data: result,
          timestamp: now.getTime()
        }));
      }
    } catch (error) {
      console.error('Failed to fetch analyst summary:', error);
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, cacheKey]);

  useEffect(() => {
    fetchAnalystData();

    // Auto-refresh every 1 hour (skip cache on auto-refresh)
    const interval = setInterval(() => fetchAnalystData(true), 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchAnalystData, period]); // Re-fetch when period changes

  // Prepare chart data
  const chartData = data
    ? [
        { name: 'Strong Buy', value: data.ratingDistribution.strongBuy, color: CHART_COLORS.strongBuy },
        { name: 'Buy', value: data.ratingDistribution.buy, color: CHART_COLORS.buy },
        { name: 'Hold', value: data.ratingDistribution.hold, color: CHART_COLORS.hold },
        { name: 'Sell', value: data.ratingDistribution.sell, color: CHART_COLORS.sell },
        { name: 'Strong Sell', value: data.ratingDistribution.strongSell, color: CHART_COLORS.strongSell },
      ]
    : [];

  const sentiment = data ? getMarketSentiment(data.ratingDistribution) : 'Neutral';

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-green-500/5 via-playful-green/5 to-blue-500/5 border-black/10/50 p-3">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
        </div>
      </Card>
    );
  }

  if (!data || data.totalStocksAnalyzed === 0) {
    return (
      <Card className="bg-gradient-to-br from-green-500/5 via-playful-green/5 to-blue-500/5 border-black/10/50 p-3">
        <div className="flex flex-col items-center justify-center h-64 text-[#3C3C3C]">
          <Target className="h-16 w-16 mb-3 opacity-50" />
          <p className="text-sm">No analyst data available</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-green-500/5 via-playful-green/5 to-blue-500/5 border-black/10/50 overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-black/10/50">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-10">
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-playful-green">
              <Target className="h-6 w-6 text-[#1a1a1a]" />
            </div>
            <div>
              <h2 className="text-sm font-bold bg-gradient-to-r from-green-400 to-purple-400 bg-clip-text text-transparent">
                Analyst Summary
              </h2>
              <p className="text-sm text-[#3C3C3C] mt-1">
                Professional analyst ratings and price targets
              </p>
            </div>
          </div>
          <div className="flex items-center gap-10">
            {lastUpdated && (
              <span className="text-sm text-[#3C3C3C]">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <Button
              onClick={() => fetchAnalystData(true)}
              disabled={refreshing}
              size="sm"
              className="bg-white border-2 border-black hover:bg-playful-cream"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Section 1: Market Consensus */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <Star className="h-5 w-5 text-green-400" />
            <h3 className="text-sm font-semibold text-[#1a1a1a]">Market Consensus</h3>
          </div>

          <GlassCard className="p-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Donut Chart */}
              <div className="flex flex-col items-center justify-center">
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(17, 24, 39, 0.9)',
                        border: '1px solid rgba(75, 85, 99, 0.5)',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#e5e7eb' }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="flex items-center gap-10 mt-3">
                  <Badge className="bg-white border-2 border-black text-[#1a1a1a]">
                    {data.totalStocksAnalyzed} Stocks Analyzed
                  </Badge>
                  <Badge className={`border ${getSentimentColor(sentiment)}`}>
                    {sentiment === 'Bullish' && <ThumbsUp className="h-3 w-3 mr-1" />}
                    {sentiment === 'Bearish' && <ThumbsDown className="h-3 w-3 mr-1" />}
                    {sentiment}
                  </Badge>
                </div>
              </div>

              {/* Rating Categories */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-playful-cream border-2 border-black">
                  <span className="text-sm font-medium text-green-500">Strong Buy</span>
                  <span className="text-sm font-bold text-green-400">
                    {data.ratingDistribution.strongBuy}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-playful-cream border-2 border-black">
                  <span className="text-sm font-medium text-green-400">Buy</span>
                  <span className="text-sm font-bold text-green-400">
                    {data.ratingDistribution.buy}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-playful-cream border-2 border-black">
                  <span className="text-sm font-medium text-yellow-400">Hold</span>
                  <span className="text-sm font-bold text-yellow-400">
                    {data.ratingDistribution.hold}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-playful-cream border-2 border-black">
                  <span className="text-sm font-medium text-orange-400">Sell</span>
                  <span className="text-sm font-bold text-orange-400">
                    {data.ratingDistribution.sell}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-playful-cream border-2 border-black">
                  <span className="text-sm font-medium text-red-500">Strong Sell</span>
                  <span className="text-sm font-bold text-red-400">
                    {data.ratingDistribution.strongSell}
                  </span>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Gradient Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-gray-700/50 to-transparent" />

        {/* Section 2: Top Rated Stocks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <TrendingUp className="h-5 w-5 text-green-400" />
            <h3 className="text-sm font-semibold text-[#1a1a1a]">
              Top Rated Stocks (By Upside Potential)
            </h3>
          </div>

          <div className="space-y-3">
            {data.topRatedStocks.map((stock, index) => (
              <motion.div
                key={stock.symbol}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <GlassCard className="p-3 hover:border-green-400/50 transition-colors duration-200">
                  <div className="flex items-center justify-between gap-10">
                    <div className="flex items-center gap-10 flex-1 min-w-0">
                      {index < 3 && (
                        <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/30 flex items-center gap-1.5">
                          <Crown className="h-3 w-3" />
                          #{index + 1}
                        </Badge>
                      )}
                      {index >= 3 && (
                        <Badge className="bg-playful-cream border-2 border-black text-[#1a1a1a]">
                          #{index + 1}
                        </Badge>
                      )}
                      <Badge className="bg-blue-400/20 text-blue-400 border-blue-400/30">
                        {stock.symbol}
                      </Badge>
                      <span className="text-sm text-[#1a1a1a] truncate flex-1">
                        {stock.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-10">
                      <div className="text-right">
                        <div className="text-sm text-[#3C3C3C]">Current</div>
                        <div className="text-sm font-medium text-[#1a1a1a]">
                          {formatCurrency(stock.currentPrice)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-[#3C3C3C]">Target</div>
                        <div className="text-sm font-medium text-green-400">
                          {formatCurrency(stock.targetMean)}
                        </div>
                      </div>
                      <div className="text-right min-w-[80px]">
                        <div className="text-sm text-[#3C3C3C]">Upside</div>
                        <div
                          className={`text-sm font-bold ${
                            stock.upside >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {stock.upside >= 0 ? '+' : ''}
                          {stock.upside.toFixed(1)}%
                        </div>
                      </div>
                      <Badge className="bg-playful-green/20 text-primary-400 border-primary-400/30">
                        <Users className="h-3 w-3 mr-1" />
                        {stock.numAnalysts}
                      </Badge>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Gradient Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-gray-700/50 to-transparent" />

        {/* Section 3: Most Covered Stocks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <Award className="h-5 w-5 text-primary-400" />
            <h3 className="text-sm font-semibold text-[#1a1a1a]">
              Most Covered Stocks (By Analyst Count)
            </h3>
          </div>

          <div className="space-y-3">
            {data.mostCoveredStocks.map((stock, index) => (
              <motion.div
                key={stock.symbol}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <GlassCard className="p-3 hover:border-primary-400/50 transition-colors duration-200">
                  <div className="flex items-center justify-between gap-10">
                    <div className="flex items-center gap-10 flex-1 min-w-0">
                      <Badge className="bg-blue-400/20 text-blue-400 border-blue-400/30">
                        {stock.symbol}
                      </Badge>
                      <span className="text-sm text-[#1a1a1a] truncate flex-1">
                        {stock.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-10">
                      <div className="text-right min-w-[100px]">
                        <div className="text-sm text-[#3C3C3C]">Analysts</div>
                        <div className="text-sm font-bold text-primary-400">
                          {stock.numAnalysts}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-[#3C3C3C]">Current</div>
                        <div className="text-sm font-medium text-[#1a1a1a]">
                          {formatCurrency(stock.currentPrice)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-[#3C3C3C]">Target</div>
                        <div className="text-sm font-medium text-green-400">
                          {formatCurrency(stock.targetMean)}
                        </div>
                      </div>
                      <div className="text-right min-w-[70px]">
                        <div className="text-sm text-[#3C3C3C]">Upside</div>
                        <div
                          className={`text-sm font-semibold ${
                            stock.upside >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {stock.upside >= 0 ? '+' : ''}
                          {stock.upside.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </Card>
  );
};