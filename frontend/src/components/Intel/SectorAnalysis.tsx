import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '../ui/card';
import { ENV } from '../../config/env';

interface Stock {
  symbol: string;
  name: string;
  price: number;
  marketCap: number;
  priceChange: number;
}

interface SectorData {
  sector: string;
  stockCount: number;
  totalMarketCap: number;
  avgPE: number | null;
  avgPB: number | null;
  avgPS: number | null;
  avgROE: number | null;
  avgProfitMargin: number | null;
  avgEPSGrowth: number | null;
  avgRevenueGrowth: number | null;
  avgDebtToEquity: number | null;
  avgPriceChange: number;
  totalVolume: number;
  topStocks: Stock[];
}

interface SectorAnalysisData {
  sectors: SectorData[];
  totalSectors: number;
  totalStocks: number;
  timestamp: number;
}

export const SectorAnalysis: React.FC = () => {
  const [data, setData] = useState<SectorAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'marketCap' | 'performance' | 'valuation'>('marketCap');

  useEffect(() => {
    fetchSectorData();
  }, []);

  const fetchSectorData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Load sector performance metrics aggregated across all stocks
      const response = await fetch(`${ENV.INTEL_API_URL}/api/sectors`);
      if (!response.ok) throw new Error('Failed to fetch sector data');
      const apiResult = await response.json();
      setData(apiResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sector data');
    } finally {
      setLoading(false);
    }
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
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  const getSortedSectors = () => {
    if (!data) return [];
    const sectors = [...data.sectors];

    switch (sortBy) {
      case 'marketCap':
        return sectors.sort((a, b) => b.totalMarketCap - a.totalMarketCap);
      case 'performance':
        return sectors.sort((a, b) => b.avgPriceChange - a.avgPriceChange);
      case 'valuation':
        return sectors.sort((a, b) => {
          const aVal = a.avgPE || 0;
          const bVal = b.avgPE || 0;
          return aVal - bVal;
        });
      default:
        return sectors;
    }
  };

  const getPerformanceColor = (change: number): string => {
    if (change > 5) return 'text-green-600';
    if (change > 0) return 'text-green-500';
    if (change > -5) return 'text-red-500';
    return 'text-red-600';
  };

  const getHealthScore = (sector: SectorData): number => {
    let score = 50;

    // Performance (30 points)
    if (sector.avgPriceChange > 5) score += 15;
    else if (sector.avgPriceChange > 0) score += 10;
    else if (sector.avgPriceChange > -5) score += 5;

    // Valuation (20 points)
    if (sector.avgPE && sector.avgPE < 20) score += 10;
    if (sector.avgPB && sector.avgPB < 3) score += 10;

    // Profitability (30 points)
    if (sector.avgROE && sector.avgROE > 15) score += 15;
    if (sector.avgProfitMargin && sector.avgProfitMargin > 10) score += 15;

    // Growth (20 points)
    if (sector.avgEPSGrowth && sector.avgEPSGrowth > 10) score += 10;
    if (sector.avgRevenueGrowth && sector.avgRevenueGrowth > 10) score += 10;

    return Math.min(score, 100);
  };

  const getHealthColor = (score: number): string => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-center h-64">
            <div className="text-[#3C3C3C]">Loading sector analysis...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-3">
          <div className="text-red-600">Error: {error}</div>
          <button
            onClick={fetchSectorData}
            className="mt-3 px-3 py-2.5 bg-blue-600 text-[#1a1a1a] rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const sortedSectors = getSortedSectors();
  const selectedSectorData = selectedSector
    ? data.sectors.find(s => s.sector === selectedSector)
    : null;

  return (
    <div className="space-y-3">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold">Sector Analysis</h2>
              <p className="text-[#3C3C3C] text-sm mt-1">
                {data.totalSectors} sectors - {data.totalStocks} stocks analyzed
              </p>
            </div>
            <div className="flex gap-2.5">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2.5 border rounded-lg bg-white"
              >
                <option value="marketCap">Sort by Market Cap</option>
                <option value="performance">Sort by Performance</option>
                <option value="valuation">Sort by Valuation</option>
              </select>
              <button
                onClick={fetchSectorData}
                className="px-3 py-2.5 bg-blue-600 text-[#1a1a1a] rounded-lg hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Sector Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {sortedSectors.map((sector) => {
          const healthScore = getHealthScore(sector);
          return (
            <Card
              key={sector.sector}
              className={`cursor-pointer transition-all ${
                selectedSector === sector.sector
                  ? 'ring-2 ring-blue-500 shadow-lg'
                  : 'hover:shadow-md'
              }`}
              onClick={() => setSelectedSector(
                selectedSector === sector.sector ? null : sector.sector
              )}
            >
              <CardContent className="p-3">
                {/* Sector Name & Health Bar */}
                <div className="mb-3">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-sm">{sector.sector}</h3>
                    <span className={`text-sm font-bold ${getPerformanceColor(sector.avgPriceChange)}`}>
                      {formatPercent(sector.avgPriceChange)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getHealthColor(healthScore)}`}
                      style={{ width: `${healthScore}%` }}
                    />
                  </div>
                  <p className="text-sm text-[#3C3C3C] mt-1">
                    Health Score: {healthScore}/100
                  </p>
                </div>

                {/* Key Metrics */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#3C3C3C]">Stocks:</span>
                    <span className="font-medium">{sector.stockCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#3C3C3C]">Market Cap:</span>
                    <span className="font-medium">{formatNumber(sector.totalMarketCap)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#3C3C3C]">Avg P/E:</span>
                    <span className="font-medium">
                      {sector.avgPE ? sector.avgPE.toFixed(2) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#3C3C3C]">Avg ROE:</span>
                    <span className="font-medium">
                      {formatPercent(sector.avgROE)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#3C3C3C]">Profit Margin:</span>
                    <span className="font-medium">
                      {formatPercent(sector.avgProfitMargin)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected Sector Details */}
      {selectedSectorData && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-bold">{selectedSectorData.sector} - Detailed Analysis</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {/* Valuation Metrics */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm border-b pb-2">Valuation</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#3C3C3C]">Avg P/E Ratio:</span>
                    <span className="font-medium">
                      {selectedSectorData.avgPE ? selectedSectorData.avgPE.toFixed(2) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#3C3C3C]">Avg P/B Ratio:</span>
                    <span className="font-medium">
                      {selectedSectorData.avgPB ? selectedSectorData.avgPB.toFixed(2) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#3C3C3C]">Avg P/S Ratio:</span>
                    <span className="font-medium">
                      {selectedSectorData.avgPS ? selectedSectorData.avgPS.toFixed(2) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Profitability Metrics */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm border-b pb-2">Profitability</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#3C3C3C]">Avg ROE:</span>
                    <span className="font-medium">{formatPercent(selectedSectorData.avgROE)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#3C3C3C]">Profit Margin:</span>
                    <span className="font-medium">{formatPercent(selectedSectorData.avgProfitMargin)}</span>
                  </div>
                </div>
              </div>

              {/* Growth Metrics */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm border-b pb-2">Growth</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#3C3C3C]">EPS Growth:</span>
                    <span className="font-medium">{formatPercent(selectedSectorData.avgEPSGrowth)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#3C3C3C]">Revenue Growth:</span>
                    <span className="font-medium">{formatPercent(selectedSectorData.avgRevenueGrowth)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Stocks */}
            <div className="mt-3">
              <h4 className="font-semibold text-sm border-b pb-2 mb-3">Top 5 Stocks by Market Cap</h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm">
                      <th className="pb-2 pr-4">Symbol</th>
                      <th className="pb-2 pr-4">Name</th>
                      <th className="pb-2 pr-4 text-right">Price</th>
                      <th className="pb-2 pr-4 text-right">Market Cap</th>
                      <th className="pb-2 text-right">1M Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSectorData.topStocks.map((stock) => (
                      <tr key={stock.symbol} className="border-b hover:bg-gray-50">
                        <td className="py-2 pr-4 font-medium">{stock.symbol}</td>
                        <td className="py-2 pr-4 text-sm text-[#3C3C3C]">{stock.name}</td>
                        <td className="py-2 pr-4 text-right">{formatNumber(stock.price)}</td>
                        <td className="py-2 pr-4 text-right">{formatNumber(stock.marketCap)}</td>
                        <td className={`py-2 text-right font-medium ${getPerformanceColor(stock.priceChange)}`}>
                          {formatPercent(stock.priceChange)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SectorAnalysis;