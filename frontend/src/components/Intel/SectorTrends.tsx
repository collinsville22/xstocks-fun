import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { ENV } from '../../config/env';

interface SectorData {
  sector: string;
  stockCount: number;
  totalMarketCap: number;
  avgPriceChange: number;
  avgPE: number | null;
  avgROE: number | null;
  avgProfitMargin: number | null;
  avgEPSGrowth: number | null;
  avgRevenueGrowth: number | null;
}

interface SectorAnalysisData {
  sectors: SectorData[];
  totalSectors: number;
  totalStocks: number;
  timestamp: number;
}

export const SectorTrends: React.FC = () => {
  const [data, setData] = useState<SectorAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sector data');
    } finally {
      setLoading(false);
    }
  };

  const formatPercent = (num: number | null): string => {
    if (num === null || num === undefined) return 'N/A';
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  const formatNumber = (num: number, decimals: number = 2): string => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(decimals)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(decimals)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(decimals)}M`;
    return `$${num.toFixed(decimals)}`;
  };

  const getPerformanceColor = (change: number): string => {
    if (change > 5) return 'text-green-600';
    if (change > 0) return 'text-green-500';
    if (change > -5) return 'text-red-500';
    return 'text-red-600';
  };

  const getTopPerformers = (): SectorData[] => {
    if (!data) return [];
    return [...data.sectors]
      .sort((a, b) => b.avgPriceChange - a.avgPriceChange)
      .slice(0, 5);
  };

  const getBottomPerformers = (): SectorData[] => {
    if (!data) return [];
    return [...data.sectors]
      .sort((a, b) => a.avgPriceChange - b.avgPriceChange)
      .slice(0, 5);
  };

  const getMostValuable = (): SectorData[] => {
    if (!data) return [];
    return [...data.sectors]
      .sort((a, b) => b.totalMarketCap - a.totalMarketCap)
      .slice(0, 5);
  };

  const getBestValue = (): SectorData[] => {
    if (!data) return [];
    return [...data.sectors]
      .filter(s => s.avgPE && s.avgPE > 0)
      .sort((a, b) => (a.avgPE || 0) - (b.avgPE || 0))
      .slice(0, 5);
  };

  const getMostProfitable = (): SectorData[] => {
    if (!data) return [];
    return [...data.sectors]
      .filter(s => s.avgROE && s.avgROE > 0)
      .sort((a, b) => (b.avgROE || 0) - (a.avgROE || 0))
      .slice(0, 5);
  };

  const getHighestGrowth = (): SectorData[] => {
    if (!data) return [];
    return [...data.sectors]
      .filter(s => s.avgEPSGrowth && s.avgEPSGrowth > 0)
      .sort((a, b) => (b.avgEPSGrowth || 0) - (a.avgEPSGrowth || 0))
      .slice(0, 5);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-center h-64">
            <div className="text-[#3C3C3C]">Loading sector trends...</div>
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

  const topPerformers = getTopPerformers();
  const bottomPerformers = getBottomPerformers();
  const mostValuable = getMostValuable();
  const bestValue = getBestValue();
  const mostProfitable = getMostProfitable();
  const highestGrowth = getHighestGrowth();

  const TrendCard = ({ title, sectors, metric }: {
    title: string;
    sectors: SectorData[];
    metric: (sector: SectorData) => string | number;
  }) => (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-sm">{title}</h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sectors.map((sector, idx) => {
            const metricValue = metric(sector);
            const isPercentage = typeof metricValue === 'string' && metricValue.includes('%');
            const isPositive = typeof metricValue === 'string' && metricValue.includes('+');

            return (
              <div key={sector.sector} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                <div className="flex items-center gap-10">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold text-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-medium">{sector.sector}</div>
                    <div className="text-sm text-[#3C3C3C]">{sector.stockCount} stocks</div>
                  </div>
                </div>
                <div className={`font-bold ${
                  isPercentage && isPositive ? 'text-green-600' :
                  isPercentage && !isPositive ? 'text-red-600' :
                  'text-[#3C3C3C]'
                }`}>
                  {metricValue}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold">Sector Trends & Leaders</h2>
              <p className="text-[#3C3C3C] text-sm mt-1">
                Top performing sectors across multiple dimensions
              </p>
            </div>
            <button
              onClick={fetchSectorData}
              className="px-3 py-2.5 bg-blue-600 text-[#1a1a1a] rounded-lg hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </CardHeader>
      </Card>

      {/* Performance Leaders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <TrendCard
          title="Top Performers (1M)"
          sectors={topPerformers}
          metric={(s) => formatPercent(s.avgPriceChange)}
        />
        <TrendCard
          title="Bottom Performers (1M)"
          sectors={bottomPerformers}
          metric={(s) => formatPercent(s.avgPriceChange)}
        />
      </div>

      {/* Size & Value */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <TrendCard
          title="Largest by Market Cap"
          sectors={mostValuable}
          metric={(s) => formatNumber(s.totalMarketCap)}
        />
        <TrendCard
          title="Best Value (Lowest P/E)"
          sectors={bestValue}
          metric={(s) => s.avgPE ? s.avgPE.toFixed(2) : 'N/A'}
        />
      </div>

      {/* Profitability & Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <TrendCard
          title="Most Profitable (ROE)"
          sectors={mostProfitable}
          metric={(s) => formatPercent(s.avgROE)}
        />
        <TrendCard
          title="Highest Growth (EPS)"
          sectors={highestGrowth}
          metric={(s) => formatPercent(s.avgEPSGrowth)}
        />
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-sm">Market Overview</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-[#3C3C3C] text-sm mb-1">Total Sectors</div>
              <div className="text-sm font-bold">{data.totalSectors}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-[#3C3C3C] text-sm mb-1">Total Stocks</div>
              <div className="text-sm font-bold">{data.totalStocks}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-[#3C3C3C] text-sm mb-1">Avg Performance</div>
              <div className={`text-sm font-bold ${
                getPerformanceColor(
                  data.sectors.reduce((sum, s) => sum + s.avgPriceChange, 0) / data.sectors.length
                )
              }`}>
                {formatPercent(
                  data.sectors.reduce((sum, s) => sum + s.avgPriceChange, 0) / data.sectors.length
                )}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-[#3C3C3C] text-sm mb-1">Total Market Cap</div>
              <div className="text-sm font-bold">
                {formatNumber(data.sectors.reduce((sum, s) => sum + s.totalMarketCap, 0))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SectorTrends;