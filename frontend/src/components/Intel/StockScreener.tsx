import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { ENV } from '../../config/env';
import {
  Search,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  Loader2,
  X,
  Save,
  RefreshCw
} from 'lucide-react';

interface Stock {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  pe: number | null;
  pb: number | null;
  dividendYield: number | null;
  epsGrowth: number | null;
  revenueGrowth: number | null;
  debtToEquity: number | null;
  roe: number | null;
  rsi: number | null;
  shortPercent: number | null;
  beta: number | null;
  // Advanced fundamental
  priceToSales: number | null;
  evToEbitda: number | null;
  currentRatio: number | null;
  quickRatio: number | null;
  freeCashflow: number | null;
}

interface Filters {
  // Fundamental
  marketCapMin?: number;
  marketCapMax?: number;
  peMin?: number;
  peMax?: number;
  pbMin?: number;
  pbMax?: number;
  dividendYieldMin?: number;
  epsGrowthMin?: number;
  revenueGrowthMin?: number;
  debtToEquityMax?: number;
  roeMin?: number;

  // Advanced Fundamental
  priceToSalesMin?: number;
  priceToSalesMax?: number;
  evToEbitdaMin?: number;
  evToEbitdaMax?: number;
  currentRatioMin?: number;
  quickRatioMin?: number;
  freeCashflowMin?: number;

  // Technical
  rsiMin?: number;
  rsiMax?: number;
  changePercentMin?: number;
  changePercentMax?: number;
  volumeMin?: number;
  betaMin?: number;
  betaMax?: number;

  // Quantitative
  shortPercentMax?: number;
  sectors?: string[];

  // Sorting
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const SCREENER_PRESETS = {
  value: {
    name: 'Value Stocks',
    filters: { peMax: 15, pbMax: 1.5, dividendYieldMin: 0.02 },
  },
  growth: {
    name: 'Growth Stocks',
    filters: { epsGrowthMin: 0.15, revenueGrowthMin: 0.10, peMin: 20 },
  },
  dividend: {
    name: 'Dividend Stocks',
    filters: { dividendYieldMin: 0.03, debtToEquityMax: 0.50 },
  },
  momentum: {
    name: 'Momentum Stocks',
    filters: { changePercentMin: 5, rsiMin: 60, volumeMin: 1000000 },
  },
  quality: {
    name: 'Quality Stocks',
    filters: { roeMin: 0.15, debtToEquityMax: 0.50, peMax: 30 },
  },
};

const SECTORS = [
  'Technology',
  'Healthcare',
  'Financial Services',
  'Consumer Cyclical',
  'Industrials',
  'Energy',
  'Consumer Defensive',
  'Communication Services',
  'Basic Materials',
  'Real Estate',
  'Utilities',
];

interface SavedScreener {
  name: string;
  filters: Filters;
  selectedSectors: string[];
}

export const StockScreener: React.FC = () => {
  const [filters, setFilters] = useState<Filters>({});
  const [results, setResults] = useState<Stock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('marketCap');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Saved Screeners State
  const [savedScreeners, setSavedScreeners] = useState<SavedScreener[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [screenerName, setScreenerName] = useState('');
  const [showLoadDialog, setShowLoadDialog] = useState(false);

  // Load saved screeners from localStorage on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('savedScreeners');
    if (saved) {
      setSavedScreeners(JSON.parse(saved));
    }
  }, []);

  // Save current screener
  const saveScreener = () => {
    if (!screenerName.trim()) {
      alert('Please enter a name for this screener');
      return;
    }

    const newScreener: SavedScreener = {
      name: screenerName.trim(),
      filters: filters,
      selectedSectors: selectedSectors,
    };

    const updated = [...savedScreeners, newScreener];
    setSavedScreeners(updated);
    localStorage.setItem('savedScreeners', JSON.stringify(updated));

    setShowSaveDialog(false);
    setScreenerName('');
    alert(`Screener "${newScreener.name}" saved successfully!`);
  };

  // Load a saved screener
  const loadScreener = (screener: SavedScreener) => {
    setFilters(screener.filters);
    setSelectedSectors(screener.selectedSectors);
    setShowLoadDialog(false);
    alert(`Loaded screener "${screener.name}"`);
  };

  // Delete a saved screener
  const deleteScreener = (index: number) => {
    if (confirm(`Delete screener "${savedScreeners[index].name}"?`)) {
      const updated = savedScreeners.filter((_, i) => i !== index);
      setSavedScreeners(updated);
      localStorage.setItem('savedScreeners', JSON.stringify(updated));
    }
  };

  const runScreener = async () => {
    setIsLoading(true);

    try {
      const screenFilters = {
        ...filters,
        sectors: selectedSectors,
        sortBy,
        sortOrder,
      };

      const response = await fetch(`${ENV.INTEL_API_URL}/api/screener`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(screenFilters),
      });

      if (!response.ok) {
        throw new Error('Failed to run screener');
      }

      const apiResponse = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Screener error:', error);
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
      alert('Failed to run screener. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const applyPreset = (preset: keyof typeof SCREENER_PRESETS) => {
    setFilters(SCREENER_PRESETS[preset].filters);
    setSelectedSectors([]);
  };

  const clearFilters = () => {
    setFilters({});
    setSelectedSectors([]);
    setResults([]);
  };

  const exportResults = () => {
    if (results.length === 0) return;

    const csv = [
      ['Symbol', 'Name', 'Price', 'Change %', 'Market Cap', 'P/E', 'P/B', 'Dividend Yield', 'EPS Growth', 'ROE'].join(','),
      ...results.map(s => [
        s.symbol,
        s.name,
        s.price,
        s.changePercent.toFixed(2),
        s.marketCap,
        s.pe || 'N/A',
        s.pb || 'N/A',
        s.dividendYield ? (s.dividendYield * 100).toFixed(2) : 'N/A',
        s.epsGrowth ? (s.epsGrowth * 100).toFixed(2) : 'N/A',
        s.roe ? (s.roe * 100).toFixed(2) : 'N/A',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `screener_results_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatNumber = (num: number | null, decimals: number = 2): string => {
    if (num === null || num === undefined) return 'N/A';
    if (num >= 1e12) return `$${(num / 1e12).toFixed(decimals)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(decimals)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(decimals)}M`;
    return `$${num.toFixed(decimals)}`;
  };

  const formatPercent = (num: number | null): string => {
    if (num === null || num === undefined) return 'N/A';
    return `${(num * 100).toFixed(2)}%`;
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader className="border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-10">
              <Filter className="w-6 h-6 text-blue-400" />
              <h2 className="text-sm font-bold text-[#1a1a1a]">Stock Screener</h2>
            </div>
            <div className="flex items-center gap-2.5">
              <Button
                onClick={() => setShowSaveDialog(true)}
                variant="outline"
                className="flex items-center gap-2.5"
              >
                <Save className="w-4 h-4" />
                Save
              </Button>
              <Button
                onClick={() => setShowLoadDialog(true)}
                variant="outline"
                className="flex items-center gap-2.5"
                disabled={savedScreeners.length === 0}
              >
                <RefreshCw className="w-4 h-4" />
                Load
              </Button>
              <Button
                onClick={clearFilters}
                variant="outline"
                className="flex items-center gap-2.5"
              >
                <X className="w-4 h-4" />
                Clear
              </Button>
              <Button
                onClick={exportResults}
                variant="outline"
                disabled={results.length === 0}
                className="flex items-center gap-2.5"
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </div>

          {/* Save Dialog */}
          {showSaveDialog && (
            <div className="mt-3 p-3 glass-card border border-black/10 rounded-lg">
              <h3 className="text-[#1a1a1a] font-semibold mb-3">Save Screener</h3>
              <input
                type="text"
                placeholder="Enter screener name..."
                value={screenerName}
                onChange={(e) => setScreenerName(e.target.value)}
                className="bg-gray-900 text-[#1a1a1a] px-3 py-2 rounded w-full mb-3"
                onKeyPress={(e) => e.key === 'Enter' && saveScreener()}
              />
              <div className="flex gap-2.5">
                <Button onClick={saveScreener} className="bg-blue-600 hover:bg-blue-700">
                  Save
                </Button>
                <Button onClick={() => setShowSaveDialog(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Load Dialog */}
          {showLoadDialog && (
            <div className="mt-3 p-3 glass-card border border-black/10 rounded-lg max-h-96 overflow-y-auto">
              <h3 className="text-[#1a1a1a] font-semibold mb-3">Load Saved Screener</h3>
              {savedScreeners.length === 0 ? (
                <p className="text-[#3C3C3C] text-sm">No saved screeners yet</p>
              ) : (
                <div className="space-y-2">
                  {savedScreeners.map((screener, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gray-900 rounded hover:bg-gray-800 transition-colors"
                    >
                      <button
                        onClick={() => loadScreener(screener)}
                        className="flex-1 text-left text-[#1a1a1a] font-medium"
                      >
                        {screener.name}
                      </button>
                      <Button
                        onClick={() => deleteScreener(idx)}
                        variant="outline"
                        size="sm"
                        className="ml-2"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <Button onClick={() => setShowLoadDialog(false)} variant="outline" className="mt-3 w-full">
                Close
              </Button>
            </div>
          )}
        </CardHeader>

        {/* Presets */}
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-2.5">
            <span className="text-sm text-[#3C3C3C] self-center mr-2">Presets:</span>
            {Object.entries(SCREENER_PRESETS).map(([key, preset]) => (
              <Button
                key={key}
                onClick={() => applyPreset(key as keyof typeof SCREENER_PRESETS)}
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5"
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Fundamental Filters */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="border-b border-gray-800">
            <h3 className="text-sm font-semibold text-[#1a1a1a]">Fundamental</h3>
          </CardHeader>
          <CardContent className="p-3 space-y-3">
            {/* Market Cap */}
            <div>
              <label className="text-sm text-[#3C3C3C] block mb-2">Market Cap</label>
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="number"
                  placeholder="Min"
                  className="bg-gray-800 text-[#1a1a1a] px-3 py-2 rounded text-sm"
                  value={filters.marketCapMin || ''}
                  onChange={(e) => setFilters({ ...filters, marketCapMin: e.target.value ? Number(e.target.value) : undefined })}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className="bg-gray-800 text-[#1a1a1a] px-3 py-2 rounded text-sm"
                  value={filters.marketCapMax || ''}
                  onChange={(e) => setFilters({ ...filters, marketCapMax: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
            </div>

            {/* P/E Ratio */}
            <div>
              <label className="text-sm text-[#3C3C3C] block mb-2">P/E Ratio</label>
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="number"
                  placeholder="Min"
                  className="bg-gray-800 text-[#1a1a1a] px-3 py-2 rounded text-sm"
                  value={filters.peMin || ''}
                  onChange={(e) => setFilters({ ...filters, peMin: e.target.value ? Number(e.target.value) : undefined })}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className="bg-gray-800 text-[#1a1a1a] px-3 py-2 rounded text-sm"
                  value={filters.peMax || ''}
                  onChange={(e) => setFilters({ ...filters, peMax: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
            </div>

            {/* P/B Ratio */}
            <div>
              <label className="text-sm text-[#3C3C3C] block mb-2">P/B Ratio</label>
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="number"
                  placeholder="Min"
                  className="bg-gray-800 text-[#1a1a1a] px-3 py-2 rounded text-sm"
                  value={filters.pbMin || ''}
                  onChange={(e) => setFilters({ ...filters, pbMin: e.target.value ? Number(e.target.value) : undefined })}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className="bg-gray-800 text-[#1a1a1a] px-3 py-2 rounded text-sm"
                  value={filters.pbMax || ''}
                  onChange={(e) => setFilters({ ...filters, pbMax: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
            </div>

            {/* Dividend Yield */}
            <div>
              <label className="text-sm text-[#3C3C3C] block mb-2">Dividend Yield (Min %)</label>
              <input
                type="number"
                placeholder="e.g. 2 for 2%"
                className="bg-gray-800 text-[#1a1a1a] px-3 py-2 rounded text-sm w-full"
                value={filters.dividendYieldMin ? filters.dividendYieldMin * 100 : ''}
                onChange={(e) => setFilters({ ...filters, dividendYieldMin: e.target.value ? Number(e.target.value) / 100 : undefined })}
              />
            </div>

            {/* EPS Growth */}
            <div>
              <label className="text-sm text-[#3C3C3C] block mb-2">EPS Growth (Min %)</label>
              <input
                type="number"
                placeholder="e.g. 10 for 10%"
                className="bg-gray-800 text-[#1a1a1a] px-3 py-2 rounded text-sm w-full"
                value={filters.epsGrowthMin ? filters.epsGrowthMin * 100 : ''}
                onChange={(e) => setFilters({ ...filters, epsGrowthMin: e.target.value ? Number(e.target.value) / 100 : undefined })}
              />
            </div>

            {/* Revenue Growth */}
            <div>
              <label className="text-sm text-[#3C3C3C] block mb-2">Revenue Growth (Min %)</label>
              <input
                type="number"
                placeholder="e.g. 10 for 10%"
                className="bg-gray-800 text-[#1a1a1a] px-3 py-2 rounded text-sm w-full"
                value={filters.revenueGrowthMin ? filters.revenueGrowthMin * 100 : ''}
                onChange={(e) => setFilters({ ...filters, revenueGrowthMin: e.target.value ? Number(e.target.value) / 100 : undefined })}
              />
            </div>

            {/* Debt to Equity */}
            <div>
              <label className="text-sm text-[#3C3C3C] block mb-2">Debt/Equity (Max)</label>
              <input
                type="number"
                placeholder="e.g. 0.5"
                className="bg-gray-800 text-[#1a1a1a] px-3 py-2 rounded text-sm w-full"
                value={filters.debtToEquityMax || ''}
                onChange={(e) => setFilters({ ...filters, debtToEquityMax: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>

            {/* ROE */}
            <div>
              <label className="text-sm text-[#3C3C3C] block mb-2">ROE (Min %)</label>
              <input
                type="number"
                placeholder="e.g. 15 for 15%"
                className="bg-gray-800 text-[#1a1a1a] px-3 py-2 rounded text-sm w-full"
                value={filters.roeMin ? filters.roeMin * 100 : ''}
                onChange={(e) => setFilters({ ...filters, roeMin: e.target.value ? Number(e.target.value) / 100 : undefined })}
              />
            </div>

            {/* Price to Sales */}
            <div>
              <label className="text-sm text-[#3C3C3C] block mb-2">P/S Ratio</label>
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="number"
                  placeholder="Min"
                  className="bg-gray-800 text-[#1a1a1a] px-3 py-2 rounded text-sm"
                  value={filters.priceToSalesMin || ''}
                  onChange={(e) => setFilters({ ...filters, priceToSalesMin: e.target.value ? Number(e.target.value) : undefined })}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className="bg-gray-800 text-[#1a1a1a] px-3 py-2 rounded text-sm"
                  value={filters.priceToSalesMax || ''}
                  onChange={(e) => setFilters({ ...filters, priceToSalesMax: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
            </div>

            {/* EV/EBITDA */}
            <div>
              <label className="text-sm text-[#3C3C3C] block mb-2">EV/EBITDA</label>
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="number"
                  placeholder="Min"
                  className="bg-gray-800 text-[#1a1a1a] px-3 py-2 rounded text-sm"
                  value={filters.evToEbitdaMin || ''}
                  onChange={(e) => setFilters({ ...filters, evToEbitdaMin: e.target.value ? Number(e.target.value) : undefined })}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className="bg-gray-800 text-[#1a1a1a] px-3 py-2 rounded text-sm"
                  value={filters.evToEbitdaMax || ''}
                  onChange={(e) => setFilters({ ...filters, evToEbitdaMax: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
            </div>

            {/* Current Ratio */}
            <div>
              <label className="text-sm text-[#3C3C3C] block mb-2">Current Ratio (Min)</label>
              <input
                type="number"
                placeholder="e.g. 1.5"
                className="bg-gray-800 text-[#1a1a1a] px-3 py-2 rounded text-sm w-full"
                value={filters.currentRatioMin || ''}
                onChange={(e) => setFilters({ ...filters, currentRatioMin: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>

            {/* Quick Ratio */}
            <div>
              <label className="text-sm text-[#3C3C3C] block mb-2">Quick Ratio (Min)</label>
              <input
                type="number"
                placeholder="e.g. 1.0"
                className="bg-gray-800 text-[#1a1a1a] px-3 py-2 rounded text-sm w-full"
                value={filters.quickRatioMin || ''}
                onChange={(e) => setFilters({ ...filters, quickRatioMin: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>

            {/* Free Cash Flow */}
            <div>
              <label className="text-sm text-[#3C3C3C] block mb-2">Free Cash Flow (Min)</label>
              <input
                type="number"
                placeholder="e.g. 1000000000"
                className="bg-gray-800 text-[#1a1a1a] px-3 py-2 rounded text-sm w-full"
                value={filters.freeCashflowMin || ''}
                onChange={(e) => setFilters({ ...filters, freeCashflowMin: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Technical Filters */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="border-b border-gray-800">
            <h3 className="text-sm font-semibold text-[#1a1a1a]">Technical</h3>
          </CardHeader>
          <CardContent className="p-3 space-y-3">
            {/* RSI */}
            <div>
              <label className="text-sm text-[#3C3C3C] block mb-2">RSI (14)</label>
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="number"
                  placeholder="Min"
                  className="bg-gray-800 text-[#1a1a1a] px-3 py-2 rounded text-sm"
                  value={filters.rsiMin || ''}
                  onChange={(e) => setFilters({ ...filters, rsiMin: e.target.value ? Number(e.target.value) : undefined })}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className="bg-gray-800 text-[#1a1a1a] px-3 py-2 rounded text-sm"
                  value={filters.rsiMax || ''}
                  onChange={(e) => setFilters({ ...filters, rsiMax: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
            </div>

            {/* Price Change % */}
            <div>
              <label className="text-sm text-[#3C3C3C] block mb-2">Price Change %</label>
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="number"
                  placeholder="Min"
                  className="bg-gray-800 text-[#1a1a1a] px-3 py-2 rounded text-sm"
                  value={filters.changePercentMin || ''}
                  onChange={(e) => setFilters({ ...filters, changePercentMin: e.target.value ? Number(e.target.value) : undefined })}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className="bg-gray-800 text-[#1a1a1a] px-3 py-2 rounded text-sm"
                  value={filters.changePercentMax || ''}
                  onChange={(e) => setFilters({ ...filters, changePercentMax: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
            </div>

            {/* Volume */}
            <div>
              <label className="text-sm text-[#3C3C3C] block mb-2">Volume (Min)</label>
              <input
                type="number"
                placeholder="e.g. 1000000"
                className="bg-gray-800 text-[#1a1a1a] px-3 py-2 rounded text-sm w-full"
                value={filters.volumeMin || ''}
                onChange={(e) => setFilters({ ...filters, volumeMin: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>

            {/* Beta */}
            <div>
              <label className="text-sm text-[#3C3C3C] block mb-2">Beta</label>
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="number"
                  placeholder="Min"
                  className="bg-gray-800 text-[#1a1a1a] px-3 py-2 rounded text-sm"
                  value={filters.betaMin || ''}
                  onChange={(e) => setFilters({ ...filters, betaMin: e.target.value ? Number(e.target.value) : undefined })}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className="bg-gray-800 text-[#1a1a1a] px-3 py-2 rounded text-sm"
                  value={filters.betaMax || ''}
                  onChange={(e) => setFilters({ ...filters, betaMax: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quantitative Filters */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="border-b border-gray-800">
            <h3 className="text-sm font-semibold text-[#1a1a1a]">Quantitative</h3>
          </CardHeader>
          <CardContent className="p-3 space-y-3">
            {/* Short Interest */}
            <div>
              <label className="text-sm text-[#3C3C3C] block mb-2">Short Interest (Max %)</label>
              <input
                type="number"
                placeholder="e.g. 10 for 10%"
                className="bg-gray-800 text-[#1a1a1a] px-3 py-2 rounded text-sm w-full"
                value={filters.shortPercentMax ? filters.shortPercentMax * 100 : ''}
                onChange={(e) => setFilters({ ...filters, shortPercentMax: e.target.value ? Number(e.target.value) / 100 : undefined })}
              />
            </div>

            {/* Sectors */}
            <div>
              <label className="text-sm text-[#3C3C3C] block mb-2">Sectors</label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {SECTORS.map(sector => (
                  <label key={sector} className="flex items-center gap-2.5 text-sm text-[#1a1a1a] cursor-pointer hover:text-[#1a1a1a]">
                    <input
                      type="checkbox"
                      checked={selectedSectors.includes(sector)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSectors([...selectedSectors, sector]);
                        } else {
                          setSelectedSectors(selectedSectors.filter(s => s !== sector));
                        }
                      }}
                      className="rounded"
                    />
                    {sector}
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Run Screener Button */}
      <div className="flex justify-center">
        <Button
          onClick={runScreener}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-[#1a1a1a] px-3 py-2.5 text-sm flex items-center gap-2.5"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Screening...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Run Screener
            </>
          )}
        </Button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="border-b border-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#1a1a1a]">
                Results ({results.length} stocks)
              </h3>
              <div className="flex items-center gap-2.5 text-sm">
                <span className="text-[#3C3C3C]">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    runScreener();
                  }}
                  className="bg-gray-800 text-[#1a1a1a] px-3 py-1 rounded"
                >
                  <option value="marketCap">Market Cap</option>
                  <option value="price">Price</option>
                  <option value="changePercent">Change %</option>
                  <option value="volume">Volume</option>
                  <option value="pe">P/E</option>
                  <option value="pb">P/B</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="glass-card">
                  <tr>
                    <th className="text-left p-3 text-[#3C3C3C] font-medium">Symbol</th>
                    <th className="text-left p-3 text-[#3C3C3C] font-medium">Name</th>
                    <th className="text-left p-3 text-[#3C3C3C] font-medium">Sector</th>
                    <th className="text-right p-3 text-[#3C3C3C] font-medium">Price</th>
                    <th className="text-right p-3 text-[#3C3C3C] font-medium">Change</th>
                    <th className="text-right p-3 text-[#3C3C3C] font-medium">Market Cap</th>
                    <th className="text-right p-3 text-[#3C3C3C] font-medium">P/E</th>
                    <th className="text-right p-3 text-[#3C3C3C] font-medium">P/B</th>
                    <th className="text-right p-3 text-[#3C3C3C] font-medium">Div Yield</th>
                    <th className="text-right p-3 text-[#3C3C3C] font-medium">ROE</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((stock, idx) => (
                    <tr
                      key={stock.symbol}
                      className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${
                        idx % 2 === 0 ? 'bg-gray-900/30' : ''
                      }`}
                    >
                      <td className="p-3 text-[#1a1a1a] font-medium">{stock.symbol}</td>
                      <td className="p-3 text-[#1a1a1a]">{stock.name}</td>
                      <td className="p-3 text-[#3C3C3C]">{stock.sector}</td>
                      <td className="p-3 text-right text-[#1a1a1a]">${stock.price.toFixed(2)}</td>
                      <td className={`p-3 text-right ${stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        <div className="flex items-center justify-end gap-1.5">
                          {stock.changePercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {stock.changePercent.toFixed(2)}%
                        </div>
                      </td>
                      <td className="p-3 text-right text-[#1a1a1a]">{formatNumber(stock.marketCap)}</td>
                      <td className="p-3 text-right text-[#1a1a1a]">{stock.pe?.toFixed(2) || 'N/A'}</td>
                      <td className="p-3 text-right text-[#1a1a1a]">{stock.pb?.toFixed(2) || 'N/A'}</td>
                      <td className="p-3 text-right text-[#1a1a1a]">{formatPercent(stock.dividendYield)}</td>
                      <td className="p-3 text-right text-[#1a1a1a]">{formatPercent(stock.roe)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};