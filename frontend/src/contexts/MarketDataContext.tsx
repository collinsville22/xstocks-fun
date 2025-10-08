import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { useMarketDashboard } from '../hooks/useMarketData';
import { useMarketDataWebSocket } from '../hooks/useRobustWebSocket';

type TimePeriod = '1d' | '1w' | '1mo' | '3mo' | 'ytd' | '1y';

// Custom debounce hook for period changes
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface MarketDataContextType {
  // Raw dashboard data
  dashboardData: any;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: any;

  // Computed data accessible to all dashboards
  allStocks: any[];
  indices: any[];
  sectors: any[];
  topGainers: any[];
  topLosers: any[];
  mostActive: any[];
  pulse: any;

  // Period management
  period: TimePeriod;
  setPeriod: (period: TimePeriod) => void;

  // WebSocket connection status
  wsConnected: boolean;
  wsLastUpdate: string | null;
  wsQueuedMessages: number;
  wsLastHeartbeat: number | null;

  // Utility functions
  getStockBySymbol: (symbol: string) => any;
  getStocksBySector: (sector: string) => any[];
  getSectorData: (sector: string) => any;
  subscribe: (dashboardTypes: string[]) => void;
  unsubscribe: (dashboardTypes: string[]) => void;
}

const MarketDataContext = createContext<MarketDataContextType | undefined>(undefined);

export const MarketDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Period state management with debouncing
  const [period, setPeriod] = useState<TimePeriod>('1d');

  // Debounce period changes to prevent rapid API calls (100ms delay for snappier UX)
  const debouncedPeriod = useDebounce(period, 100);

  // Initial data fetch using React Query - cached and shared
  // Uses debounced period to prevent rapid API calls on period changes
  const { data: dashboardData, isLoading, isFetching, isError, error } = useMarketDashboard(debouncedPeriod);

  // DEBUG: Log React Query state
  useEffect(() => {
    console.log('[MarketDataContext] React Query State:', {
      isLoading,
      isFetching,
      isError,
      error,
      dashboardData,
      period: debouncedPeriod
    });
  }, [dashboardData, isLoading, isFetching, isError, error, debouncedPeriod]);

  // Real-time WebSocket updates (subscribes to 'market' dashboard by default)
  const { marketData: wsData, connection: wsConnection, subscribe, unsubscribe } = useMarketDataWebSocket(['market']);

  // Merge HTTP and WebSocket data with proper priority handling
  const [mergedData, setMergedData] = useState<any>(null);
  const previousPeriodRef = useRef<TimePeriod>(period);

  useEffect(() => {
    // Detect period change
    const periodChanged = previousPeriodRef.current !== debouncedPeriod;
    if (periodChanged) {
      previousPeriodRef.current = debouncedPeriod;
    }

    // When period changes or HTTP data arrives, prioritize HTTP data
    if (dashboardData?.data) {
      setMergedData(dashboardData.data);
    }
  }, [dashboardData, debouncedPeriod]);

  useEffect(() => {
    // Only apply WebSocket updates if we have existing merged data
    // WebSocket data is for real-time updates only (not period-specific)
    if (mergedData && (wsData.heatmap || wsData.indices || wsData.sectors || wsData.topMovers || wsData.pulse)) {
      setMergedData((prev: any) => ({
        heatmap: wsData.heatmap || prev?.heatmap || [],
        indices: wsData.indices || prev?.indices || [],
        sectors: wsData.sectors || prev?.sectors || [],
        topMovers: wsData.topMovers || prev?.topMovers || { gainers: [], losers: [] },
        pulse: wsData.pulse || prev?.pulse || null
      }));
    }
  }, [wsData, mergedData]);

  // Compute derived data from merged source
  const allStocks = mergedData?.heatmap || [];
  const indices = mergedData?.indices || [];
  const sectors = mergedData?.sectors || [];
  const topGainers = mergedData?.topMovers?.gainers || [];
  const topLosers = mergedData?.topMovers?.losers || [];
  const mostActive = mergedData?.topMovers?.mostActive || [];
  const pulse = mergedData?.pulse || null;

  // DEBUG: Log data to console
  useEffect(() => {
    console.log('[MarketDataContext] mergedData:', mergedData);
    console.log('[MarketDataContext] indices count:', indices.length);
    console.log('[MarketDataContext] allStocks count:', allStocks.length);
  }, [mergedData, indices, allStocks]);

  // Utility functions
  const getStockBySymbol = (symbol: string) => {
    return allStocks.find(stock => stock.symbol === symbol);
  };

  const getStocksBySector = (sector: string) => {
    return allStocks.filter(stock => stock.sector === sector);
  };

  const getSectorData = (sector: string) => {
    return sectors.find(s => s.sector === sector);
  };

  const value: MarketDataContextType = {
    dashboardData: mergedData,
    isLoading,
    isFetching,
    isError,
    error,
    allStocks,
    indices,
    sectors,
    topGainers,
    topLosers,
    mostActive,
    pulse,
    period,
    setPeriod,
    wsConnected: wsConnection.isConnected,
    wsLastUpdate: wsData.lastUpdate,
    wsQueuedMessages: wsConnection.queuedMessages,
    wsLastHeartbeat: wsConnection.lastHeartbeat,
    getStockBySymbol,
    getStocksBySector,
    getSectorData,
    subscribe,
    unsubscribe,
  };

  return (
    <MarketDataContext.Provider value={value}>
      {children}
    </MarketDataContext.Provider>
  );
};

// Custom hook to use market data in any dashboard
export const useMarketData = () => {
  const context = useContext(MarketDataContext);
  if (context === undefined) {
    throw new Error('useMarketData must be used within a MarketDataProvider');
  }
  return context;
};