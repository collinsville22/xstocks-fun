import { useQuery } from '@tanstack/react-query';

// OPTION 1: Unified Intel Service - All market data from single source
const INTEL_API_URL = import.meta.env.VITE_INTEL_API_URL || 'http://localhost:8002';

interface DashboardData {
  success: boolean;
  type: string;
  data: {
    heatmap: any[];
    indices: any[];
    sectors: any[];
    topMovers: {
      gainers: any[];
      losers: any[];
    };
    pulse: any;
  };
  metadata: {
    period: string;
    symbolCount: number;
    timestamp: string;
    processingTimeMs: number;
  };
}

// Fetch unified dashboard data (heatmap, indices, sectors, movers, pulse)
// Period changes will always trigger fresh data fetch due to staleTime: 0
export const useMarketDashboard = (period: string = '1d') => {
  return useQuery({
    queryKey: ['marketDashboard', period],
    queryFn: async (): Promise<DashboardData> => {
      const url = `${INTEL_API_URL}/api/dashboard/market?period=${period}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch market dashboard');
      }
      return response.json();
    },
    staleTime: 0, // Always consider data stale so period changes trigger refetch
    gcTime: 10 * 60 * 1000, // Keep cached data for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch on tab focus
    refetchInterval: false, // No auto-refetch
  });
};

// Fetch real-time data for specific symbol
export const useStockData = (symbol: string | null) => {
  return useQuery({
    queryKey: ['stockData', symbol],
    queryFn: async () => {
      if (!symbol) return null;
      const response = await fetch(`${INTEL_API_URL}/api/realtime/${symbol}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch data for ${symbol}`);
      }
      return response.json();
    },
    enabled: !!symbol, // Only run query if symbol is not null
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
};

// Fetch historical data for specific symbol
export const useHistoricalData = (symbol: string | null, period: string = '1mo', interval: string = '1d') => {
  return useQuery({
    queryKey: ['historicalData', symbol, period, interval],
    queryFn: async () => {
      if (!symbol) return null;
      const response = await fetch(`${INTEL_API_URL}/api/historical/${symbol}?period=${period}&interval=${interval}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch historical data for ${symbol}`);
      }
      return response.json();
    },
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000, // 5 minutes (historical data changes less frequently)
  });
};

// Fetch technical indicators for specific symbol
export const useTechnicalIndicators = (symbol: string | null) => {
  return useQuery({
    queryKey: ['technicalIndicators', symbol],
    queryFn: async () => {
      if (!symbol) return null;
      const response = await fetch(`${INTEL_API_URL}/api/technical/${symbol}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch technical indicators for ${symbol}`);
      }
      return response.json();
    },
    enabled: !!symbol,
    staleTime: 60 * 1000, // 1 minute
  });
};

// Fetch fundamentals for specific symbol
export const useFundamentals = (symbol: string | null) => {
  return useQuery({
    queryKey: ['fundamentals', symbol],
    queryFn: async () => {
      if (!symbol) return null;
      const response = await fetch(`${INTEL_API_URL}/api/fundamentals/${symbol}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch fundamentals for ${symbol}`);
      }
      return response.json();
    },
    enabled: !!symbol,
    staleTime: 10 * 60 * 1000, // 10 minutes (fundamentals change less frequently)
  });
};