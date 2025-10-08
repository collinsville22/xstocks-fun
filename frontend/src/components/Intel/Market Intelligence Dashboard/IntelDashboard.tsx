'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MarketHeatmap } from './MarketHeatmap';
import { MarketIndices } from './MarketIndices';
import { SectorPerformance } from './SectorPerformance';
import { TopMovers } from './TopMovers';
import { GlassCard } from './ui/GlassCard';
import { cn } from '../../../lib/utils';
import { Activity, TrendingUp, PieChart, Zap, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { ENV } from '../../../config/env';

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  sector: string;
}

interface TechnicalIndicator {
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  sma20: number;
  sma50: number;
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

interface SectorStock extends StockData {}
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

interface MoverStock extends StockData {
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

interface IntelDashboardProps {
  className?: string;
}

const IntelDashboard: React.FC<IntelDashboardProps> = ({ className }) => {
  const [timePeriod, setTimePeriod] = useState<'1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y'>('1D');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  // Data states
  const [heatmapData, setHeatmapData] = useState<StockData[]>([]);
  const [indicesData, setIndicesData] = useState<IndexData[]>([]);
  const [sectorsData, setSectorsData] = useState<SectorData[]>([]);
  const [topGainers, setTopGainers] = useState<MoverStock[]>([]);
  const [topLosers, setTopLosers] = useState<MoverStock[]>([]);
  const [mostActive, setMostActive] = useState<MoverStock[]>([]);
  const [marketPulse, setMarketPulse] = useState<MarketPulse>({
    totalVolume: 0,
    avgVolume: 0,
    volumeChange: 0,
    marketCap: 0,
    activeStocks: 0,
    volatility: 0,
    momentum: 'neutral',
    fearGreedIndex: 50
  });

  const fetchData = useCallback(async () => {
    const startTime = performance.now();

    try {
      setLoading(true);
      setError(null);
      setConnectionStatus('connecting');

      // Use Vite environment variables (not Next.js NEXT_PUBLIC pattern)
      const baseUrl = ENV.INTEL_API_URL;

      // Single unified API call - MASSIVELY FASTER
      const response = await fetch(`${baseUrl}/api/dashboard/market?period=${timePeriod.toLowerCase()}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const apiResult = await response.json();

      if (!apiResult.success) {
        throw new Error(result.error || 'Failed to fetch dashboard data');
      }

      // Extract data from unified response
      const { data } = result;

      // Update state with aggregated data
      setHeatmapData(Array.isArray(data.heatmap) ? data.heatmap : []);
      setIndicesData(Array.isArray(data.indices) ? data.indices : []);
      setSectorsData(Array.isArray(data.sectors) ? data.sectors : []);

      // Handle top movers data structure
      if (data.topMovers) {
        setTopGainers(data.topMovers.gainers || []);
        setTopLosers(data.topMovers.losers || []);
        setMostActive(data.topMovers.volumeLeaders || []);
      }

      setMarketPulse(data.pulse || {
        totalVolume: 0,
        avgVolume: 0,
        volumeChange: 0,
        marketCap: 0,
        activeStocks: 0,
        volatility: 0,
        momentum: 'neutral',
        fearGreedIndex: 50
      });

      setConnectionStatus('connected');
      setLastUpdate(new Date());

      // Log performance improvement
      const duration = performance.now() - startTime;
      console.log(` Dashboard loaded in ${duration.toFixed(2)}ms (unified endpoint)`);
      if (result.metadata?.processingTimeMs) {
        console.log(` Backend processing: ${result.metadata.processingTimeMs}ms`);
      }
    } catch (err) {
      console.error('Error fetching Intel data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setConnectionStatus('error');

      const duration = performance.now() - startTime;
      console.error(` Dashboard load failed after ${duration.toFixed(2)}ms`);
    } finally {
      setLoading(false);
    }
  }, [timePeriod]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    // Use Vite environment variables (not Next.js pattern)
    const wsUrl = ENV.WS_URL;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setConnectionStatus('connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Update relevant data based on message type
        switch (data.type) {
          case 'heatmap_update':
            setHeatmapData(prev => [...prev, ...data.stocks]);
            break;
          case 'indices_update':
            setIndicesData(prev => [...prev, ...data.indices]);
            break;
          case 'sectors_update':
            setSectorsData(prev => [...prev, ...data.sectors]);
            break;
          case 'movers_update':
            setTopGainers(data.topGainers || []);
            setTopLosers(data.topLosers || []);
            setMostActive(data.mostActive || []);
            break;
          case 'pulse_update':
            setMarketPulse(data.pulse);
            break;
        }

        setLastUpdate(new Date());
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('error');
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setConnectionStatus('error');
    };

    return () => {
      ws.close();
    };
  }, []);

  const handleStockClick = useCallback((symbol: string) => {
    console.log('Stock clicked:', symbol);
    // TODO: Navigate to detailed stock analysis
  }, []);

  const handleSectorClick = useCallback((sectorName: string) => {
    console.log('Sector clicked:', sectorName);
    // TODO: Navigate to detailed sector analysis
  }, []);

  const handleRefresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className={cn('min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900', className)}>
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
        <div className="container mx-auto px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-10">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-playful-green rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-[#1a1a1a]" />
              </div>
              <div>
                <h1 className="text-sm font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Intel Market Dashboard
                </h1>
                <p className="text-sm text-[#3C3C3C]">Algorithmic trading-level market intelligence</p>
              </div>
            </div>

            <div className="flex items-center gap-10">
              {/* Connection Status */}
              <div className="flex items-center gap-2.5">
                {connectionStatus === 'connecting' && (
                  <RefreshCw className="w-4 h-4 text-yellow-400 animate-spin" />
                )}
                {connectionStatus === 'connected' && (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                )}
                {connectionStatus === 'error' && (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
                <span className="text-sm text-[#3C3C3C]">
                  {connectionStatus === 'connecting' && 'Connecting...'}
                  {connectionStatus === 'connected' && 'Connected'}
                  {connectionStatus === 'error' && 'Connection Error'}
                </span>
              </div>

              {/* Last Update */}
              <div className="text-sm text-[#3C3C3C]">
                Updated {formatTimeAgo(lastUpdate)}
              </div>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-3 py-2.5 space-y-3">
        {error && (
          <GlassCard className="p-3 border-red-400/30 bg-red-400/10">
            <div className="flex items-center gap-2.5 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span>Error: {error}</span>
            </div>
          </GlassCard>
        )}

        {/* Market Heatmap */}
        <MarketHeatmap
          data={heatmapData}
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
          onStockClick={handleStockClick}
          loading={loading}
        />

        {/* Market Indices */}
        <MarketIndices
          indices={indicesData}
          loading={loading}
          onIndexClick={handleStockClick}
        />

        {/* Sector Performance */}
        <SectorPerformance
          sectors={sectorsData}
          loading={loading}
          onSectorClick={handleSectorClick}
          onStockClick={handleStockClick}
        />

        {/* Top Movers & Market Pulse */}
        <TopMovers
          topGainers={topGainers}
          topLosers={topLosers}
          mostActive={mostActive}
          marketPulse={marketPulse}
          loading={loading}
          onStockClick={handleStockClick}
        />
      </div>
    </div>
  );
};

export { IntelDashboard };