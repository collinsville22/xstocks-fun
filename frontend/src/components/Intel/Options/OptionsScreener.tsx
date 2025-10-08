import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { cn } from '../../../lib/utils';
import { ENV } from '../../../config/env';
import {
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Zap,
  Clock,
  DollarSign,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Info,
  Download
} from 'lucide-react';

interface ScreenerFilters {
  optionType: 'all' | 'calls' | 'puts';
  moneyness: 'all' | 'itm' | 'atm' | 'otm';
  deltaMin: number;
  deltaMax: number;
  ivMin: number;
  ivMax: number;
  volumeMin: number;
  daysToExpirationMin: number;
  daysToExpirationMax: number;
  premiumMin: number;
  premiumMax: number;
  openInterestMin: number;
  sortBy: 'volume' | 'openInterest' | 'iv' | 'delta' | 'premium' | 'roi';
  sortOrder: 'asc' | 'desc';
}

interface ScreenedOption {
  symbol: string;
  strike: number;
  type: 'CALL' | 'PUT';
  expiration: string;
  daysToExpiration: number;
  lastPrice: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  moneyness: 'ITM' | 'ATM' | 'OTM';
  breakeven: number;
  roi: number;
  probabilityITM: number;
}

interface OptionsScreenerProps {
  className?: string;
}

/**
 * Options Screener Component
 * Features:
 * - Filter by delta, IV, volume, OI
 * - Filter by days to expiration
 * - Filter by premium cost
 * - Filter by moneyness (ITM/ATM/OTM)
 * - Sort by multiple criteria
 * - Save custom scans
 * - Export results
 * - Real-time screening across all xStocks
 */
export const OptionsScreener: React.FC<OptionsScreenerProps> = ({ className }) => {
  const [filters, setFilters] = useState<ScreenerFilters>({
    optionType: 'all',
    moneyness: 'all',
    deltaMin: 0,
    deltaMax: 1,
    ivMin: 0,
    ivMax: 200,
    volumeMin: 0,
    daysToExpirationMin: 0,
    daysToExpirationMax: 365,
    premiumMin: 0,
    premiumMax: 10000,
    openInterestMin: 0,
    sortBy: 'volume',
    sortOrder: 'desc'
  });

  const [results, setResults] = useState<ScreenedOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [error, setError] = useState<string>('');

  // Run screen
  const runScreen = async () => {
    setIsLoading(true);

    try {
      const queryParams = new URLSearchParams({
        optionType: filters.optionType,
        moneyness: filters.moneyness,
        deltaMin: filters.deltaMin.toString(),
        deltaMax: filters.deltaMax.toString(),
        ivMin: filters.ivMin.toString(),
        ivMax: filters.ivMax.toString(),
        volumeMin: filters.volumeMin.toString(),
        daysToExpirationMin: filters.daysToExpirationMin.toString(),
        daysToExpirationMax: filters.daysToExpirationMax.toString(),
        premiumMin: filters.premiumMin.toString(),
        premiumMax: filters.premiumMax.toString(),
        openInterestMin: filters.openInterestMin.toString(),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      });

      const response = await fetch(
        `${ENV.INTEL_API_URL}/api/options/screen?${queryParams}`
      );

      if (!response.ok) {
        throw new Error(`Failed to screen options: ${response.statusText}`);
      }

      const apiResponse = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Error screening options:', error);
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
      setError(error instanceof Error ? error.message : 'Failed to screen options');
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    runScreen();
  }, []);

  // Reset filters
  const resetFilters = () => {
    setFilters({
      optionType: 'all',
      moneyness: 'all',
      deltaMin: 0,
      deltaMax: 1,
      ivMin: 0,
      ivMax: 200,
      volumeMin: 0,
      daysToExpirationMin: 0,
      daysToExpirationMax: 365,
      premiumMin: 0,
      premiumMax: 10000,
      openInterestMin: 0,
      sortBy: 'volume',
      sortOrder: 'desc'
    });
  };

  // Preset scans
  const applyPreset = (preset: string) => {
    switch (preset) {
      case 'high_volume':
        setFilters(prev => ({
          ...prev,
          volumeMin: 1000,
          sortBy: 'volume',
          sortOrder: 'desc'
        }));
        break;
      case 'high_iv':
        setFilters(prev => ({
          ...prev,
          ivMin: 40,
          sortBy: 'iv',
          sortOrder: 'desc'
        }));
        break;
      case 'near_money':
        setFilters(prev => ({
          ...prev,
          moneyness: 'atm',
          deltaMin: 0.4,
          deltaMax: 0.6
        }));
        break;
      case 'short_term':
        setFilters(prev => ({
          ...prev,
          daysToExpirationMin: 0,
          daysToExpirationMax: 30
        }));
        break;
      case 'cheap_options':
        setFilters(prev => ({
          ...prev,
          premiumMin: 0,
          premiumMax: 5,
          sortBy: 'premium',
          sortOrder: 'asc'
        }));
        break;
    }
  };

  // Export results
  const exportResults = () => {
    const csv = [
      ['Symbol', 'Type', 'Strike', 'Expiration', 'Days', 'Last', 'Volume', 'OI', 'IV', 'Delta', 'Theta', 'Moneyness'],
      ...results.map(r => [
        r.symbol,
        r.type,
        r.strike,
        r.expiration,
        r.daysToExpiration,
        r.lastPrice.toFixed(2),
        r.volume,
        r.openInterest,
        r.impliedVolatility.toFixed(1),
        r.delta.toFixed(3),
        r.theta.toFixed(3),
        r.moneyness
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `options-screen-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#1a1a1a] flex items-center gap-2.5">
                <Search className="w-5 h-5 text-blue-400" />
                Options Screener
              </h3>
              <p className="text-sm text-[#3C3C3C] mt-1">
                Filter and scan options across all xStocks • {results.length} results found
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="text-sm"
              >
                <Filter className="w-4 h-4 mr-2" />
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={runScreen}
                disabled={isLoading}
                className="text-sm"
              >
                <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
                Run Screen
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={exportResults}
                disabled={results.length === 0}
                className="text-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preset Scans */}
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle className="text-sm">Preset Scans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { applyPreset('high_volume'); runScreen(); }}
              className="text-sm"
            >
              <Activity className="w-3 h-3 mr-1" />
              High Volume
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { applyPreset('high_iv'); runScreen(); }}
              className="text-sm"
            >
              <Zap className="w-3 h-3 mr-1" />
              High IV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { applyPreset('near_money'); runScreen(); }}
              className="text-sm"
            >
              <Target className="w-3 h-3 mr-1" />
              Near-The-Money
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { applyPreset('short_term'); runScreen(); }}
              className="text-sm"
            >
              <Clock className="w-3 h-3 mr-1" />
              Short-Term
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { applyPreset('cheap_options'); runScreen(); }}
              className="text-sm"
            >
              <DollarSign className="w-3 h-3 mr-1" />
              Cheap Options
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      {showFilters && (
        <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Filter Criteria</CardTitle>
              <Button variant="ghost" size="sm" onClick={resetFilters} className="text-sm">
                Reset All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {/* Option Type */}
              <div>
                <label className="text-sm text-[#3C3C3C] mb-2 block">Option Type</label>
                <Select
                  value={filters.optionType}
                  onValueChange={(value: any) => setFilters(prev => ({ ...prev, optionType: value }))}
                >
                  <SelectTrigger className="bg-white border-2 border-black text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-2 border-black">
                    <SelectItem value="all">All Options</SelectItem>
                    <SelectItem value="calls">Calls Only</SelectItem>
                    <SelectItem value="puts">Puts Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Moneyness */}
              <div>
                <label className="text-sm text-[#3C3C3C] mb-2 block">Moneyness</label>
                <Select
                  value={filters.moneyness}
                  onValueChange={(value: any) => setFilters(prev => ({ ...prev, moneyness: value }))}
                >
                  <SelectTrigger className="bg-white border-2 border-black text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-2 border-black">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="itm">In-The-Money</SelectItem>
                    <SelectItem value="atm">At-The-Money</SelectItem>
                    <SelectItem value="otm">Out-Of-The-Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort By */}
              <div>
                <label className="text-sm text-[#3C3C3C] mb-2 block">Sort By</label>
                <Select
                  value={filters.sortBy}
                  onValueChange={(value: any) => setFilters(prev => ({ ...prev, sortBy: value }))}
                >
                  <SelectTrigger className="bg-white border-2 border-black text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-2 border-black">
                    <SelectItem value="volume">Volume</SelectItem>
                    <SelectItem value="openInterest">Open Interest</SelectItem>
                    <SelectItem value="iv">Implied Volatility</SelectItem>
                    <SelectItem value="delta">Delta</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="roi">ROI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Delta Range */}
              <div className="md:col-span-2">
                <label className="text-sm text-[#3C3C3C] mb-2 block">Delta Range</label>
                <div className="flex items-center gap-2.5">
                  <Input
                    type="number"
                    value={filters.deltaMin}
                    onChange={(e) => setFilters(prev => ({ ...prev, deltaMin: parseFloat(e.target.value) || 0 }))}
                    className="bg-white border-2 border-black text-sm"
                    placeholder="Min"
                    step="0.1"
                    min="0"
                    max="1"
                  />
                  <span className="text-[#3C3C3C]">to</span>
                  <Input
                    type="number"
                    value={filters.deltaMax}
                    onChange={(e) => setFilters(prev => ({ ...prev, deltaMax: parseFloat(e.target.value) || 1 }))}
                    className="bg-white border-2 border-black text-sm"
                    placeholder="Max"
                    step="0.1"
                    min="0"
                    max="1"
                  />
                </div>
              </div>

              {/* IV Range */}
              <div>
                <label className="text-sm text-[#3C3C3C] mb-2 block">Min IV (%)</label>
                <Input
                  type="number"
                  value={filters.ivMin}
                  onChange={(e) => setFilters(prev => ({ ...prev, ivMin: parseFloat(e.target.value) || 0 }))}
                  className="bg-white border-2 border-black text-sm"
                  placeholder="0"
                />
              </div>

              {/* Volume Min */}
              <div>
                <label className="text-sm text-[#3C3C3C] mb-2 block">Min Volume</label>
                <Input
                  type="number"
                  value={filters.volumeMin}
                  onChange={(e) => setFilters(prev => ({ ...prev, volumeMin: parseInt(e.target.value) || 0 }))}
                  className="bg-white border-2 border-black text-sm"
                  placeholder="0"
                />
              </div>

              {/* Open Interest Min */}
              <div>
                <label className="text-sm text-[#3C3C3C] mb-2 block">Min Open Interest</label>
                <Input
                  type="number"
                  value={filters.openInterestMin}
                  onChange={(e) => setFilters(prev => ({ ...prev, openInterestMin: parseInt(e.target.value) || 0 }))}
                  className="bg-white border-2 border-black text-sm"
                  placeholder="0"
                />
              </div>

              {/* Days to Expiration */}
              <div className="md:col-span-2">
                <label className="text-sm text-[#3C3C3C] mb-2 block">Days to Expiration</label>
                <div className="flex items-center gap-2.5">
                  <Input
                    type="number"
                    value={filters.daysToExpirationMin}
                    onChange={(e) => setFilters(prev => ({ ...prev, daysToExpirationMin: parseInt(e.target.value) || 0 }))}
                    className="bg-white border-2 border-black text-sm"
                    placeholder="Min"
                  />
                  <span className="text-[#3C3C3C]">to</span>
                  <Input
                    type="number"
                    value={filters.daysToExpirationMax}
                    onChange={(e) => setFilters(prev => ({ ...prev, daysToExpirationMax: parseInt(e.target.value) || 365 }))}
                    className="bg-white border-2 border-black text-sm"
                    placeholder="Max"
                  />
                </div>
              </div>

              {/* Premium Range */}
              <div>
                <label className="text-sm text-[#3C3C3C] mb-2 block">Max Premium ($)</label>
                <Input
                  type="number"
                  value={filters.premiumMax}
                  onChange={(e) => setFilters(prev => ({ ...prev, premiumMax: parseFloat(e.target.value) || 10000 }))}
                  className="bg-white border-2 border-black text-sm"
                  placeholder="10000"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Table */}
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle className="text-sm">Screening Results ({results.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-playful-cream border-b-2 border-black/10 sticky top-0">
                <tr className="text-sm text-[#3C3C3C]">
                  <th className="px-3 py-2.5 text-left">Symbol</th>
                  <th className="px-3 py-2.5 text-left">Type</th>
                  <th className="px-3 py-2.5 text-right">Strike</th>
                  <th className="px-3 py-2.5 text-right">Exp</th>
                  <th className="px-3 py-2.5 text-right">Last</th>
                  <th className="px-3 py-2.5 text-right">Vol</th>
                  <th className="px-3 py-2.5 text-right">OI</th>
                  <th className="px-3 py-2.5 text-right">IV</th>
                  <th className="px-3 py-2.5 text-right">Delta</th>
                  <th className="px-3 py-2.5 text-right">Theta</th>
                  <th className="px-3 py-2.5 text-center">Money</th>
                  <th className="px-3 py-2.5 text-right">Prob ITM</th>
                </tr>
              </thead>
              <tbody>
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-3 py-2.5 text-center text-[#3C3C3C]">
                      <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No options match your criteria. Try adjusting your filters.</p>
                    </td>
                  </tr>
                ) : (
                  results.map((option, index) => (
                    <tr
                      key={`${option.symbol}-${option.strike}-${option.type}-${index}`}
                      className="border-b border-black/10 hover:glass-card transition-colors"
                    >
                      <td className="px-3 py-2.5 text-sm text-[#1a1a1a] font-semibold">
                        {option.symbol}
                      </td>
                      <td className="px-3 py-2.5 text-sm">
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-sm',
                            option.type === 'CALL' ? 'bg-playful-cream text-green-400' : 'bg-playful-cream text-red-400'
                          )}
                        >
                          {option.type}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-sm text-right text-[#1a1a1a]">
                        ${option.strike.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-right text-[#3C3C3C]">
                        {option.daysToExpiration}d
                      </td>
                      <td className="px-3 py-2.5 text-sm text-right text-[#1a1a1a] font-semibold">
                        ${option.lastPrice.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-right text-blue-400">
                        {option.volume.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-right text-[#3C3C3C]">
                        {option.openInterest.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-right text-primary-400">
                        {option.impliedVolatility.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2.5 text-sm text-right text-[#1a1a1a]">
                        {option.delta.toFixed(3)}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-right text-red-400">
                        {option.theta.toFixed(3)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-sm',
                            option.moneyness === 'ITM' && 'bg-playful-cream text-green-400',
                            option.moneyness === 'ATM' && 'bg-playful-cream text-yellow-400',
                            option.moneyness === 'OTM' && 'bg-playful-cream text-[#3C3C3C]'
                          )}
                        >
                          {option.moneyness}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-sm text-right text-[#1a1a1a]">
                        {option.probabilityITM.toFixed(1)}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
        <CardContent className="p-3">
          <div className="flex items-start gap-10">
            <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-[#1a1a1a] space-y-1">
              <p className="font-semibold text-[#1a1a1a]">Options Screener Tips:</p>
              <p><strong>High Volume:</strong> Look for options with volume &gt; 1,000 for better liquidity and tighter spreads.</p>
              <p><strong>High IV:</strong> Target IV &gt; 40% for premium selling strategies (covered calls, credit spreads).</p>
              <p><strong>Near-The-Money:</strong> Delta 0.4-0.6 offers good balance of profit potential and probability.</p>
              <p><strong>Short-Term:</strong> Options &lt; 30 DTE have faster theta decay (good for sellers).</p>
              <p><strong>Probability ITM:</strong> Higher probability = safer trade, but lower ROI. Balance based on risk tolerance.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OptionsScreener;
