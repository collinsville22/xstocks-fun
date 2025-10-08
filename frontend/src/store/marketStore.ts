import { create } from 'zustand';

interface MarketState {
  selectedSymbol: string | null;
  selectedSector: string | null;
  dashboardView: 'market' | 'sector' | 'individual';
  refreshInterval: number;

  // Actions
  setSelectedSymbol: (symbol: string | null) => void;
  setSelectedSector: (sector: string | null) => void;
  setDashboardView: (view: 'market' | 'sector' | 'individual') => void;
  setRefreshInterval: (interval: number) => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  selectedSymbol: null,
  selectedSector: null,
  dashboardView: 'market',
  refreshInterval: 30000, // 30 seconds default

  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
  setSelectedSector: (sector) => set({ selectedSector: sector }),
  setDashboardView: (view) => set({ dashboardView: view }),
  setRefreshInterval: (interval) => set({ refreshInterval: interval }),
}));