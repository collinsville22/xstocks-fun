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
}

interface SectorAnalysisData {
  sectors: SectorData[];
  totalSectors: number;
  totalStocks: number;
  timestamp: number;
}

type MetricType = 'performance' | 'valuation' | 'profitability' | 'size';

export const SectorHeatmap: React.FC = () => {
  const [data, setData] = useState<SectorAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<MetricType>('performance');

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

  const getMetricValue = (sector: SectorData): number => {
    switch (metric) {
      case 'performance':
        return sector.avgPriceChange;
      case 'valuation':
        return sector.avgPE || 0;
      case 'profitability':
        return sector.avgROE || 0;
      case 'size':
        return sector.totalMarketCap;
      default:
        return 0;
    }
  };

  const getMetricLabel = (sector: SectorData): string => {
    const value = getMetricValue(sector);
    switch (metric) {
      case 'performance':
        return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
      case 'valuation':
        return value > 0 ? value.toFixed(2) : 'N/A';
      case 'profitability':
        return value > 0 ? `${value.toFixed(2)}%` : 'N/A';
      case 'size':
        if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
        if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
        return `$${(value / 1e6).toFixed(2)}M`;
      default:
        return 'N/A';
    }
  };

  const getHeatmapColor = (sector: SectorData): string => {
    const value = getMetricValue(sector);

    switch (metric) {
      case 'performance':
        if (value > 10) return 'bg-green-600';
        if (value > 5) return 'bg-green-500';
        if (value > 0) return 'bg-green-400';
        if (value > -5) return 'bg-red-400';
        if (value > -10) return 'bg-red-500';
        return 'bg-red-600';

      case 'valuation':
        if (value === 0) return 'bg-gray-300';
        if (value < 15) return 'bg-green-600';
        if (value < 20) return 'bg-green-500';
        if (value < 25) return 'bg-yellow-500';
        if (value < 30) return 'bg-orange-500';
        return 'bg-red-500';

      case 'profitability':
        if (value === 0) return 'bg-gray-300';
        if (value > 20) return 'bg-green-600';
        if (value > 15) return 'bg-green-500';
        if (value > 10) return 'bg-green-400';
        if (value > 5) return 'bg-yellow-500';
        return 'bg-red-500';

      case 'size':
        if (value > 1e12) return 'bg-blue-600';
        if (value > 500e9) return 'bg-blue-500';
        if (value > 100e9) return 'bg-blue-400';
        if (value > 50e9) return 'bg-blue-300';
        return 'bg-blue-200';

      default:
        return 'bg-gray-300';
    }
  };

  const getColorScale = (): { color: string; label: string }[] => {
    switch (metric) {
      case 'performance':
        return [
          { color: 'bg-red-600', label: '< -10%' },
          { color: 'bg-red-500', label: '-5 to -10%' },
          { color: 'bg-red-400', label: '0 to -5%' },
          { color: 'bg-green-400', label: '0 to 5%' },
          { color: 'bg-green-500', label: '5 to 10%' },
          { color: 'bg-green-600', label: '> 10%' },
        ];
      case 'valuation':
        return [
          { color: 'bg-green-600', label: '< 15' },
          { color: 'bg-green-500', label: '15-20' },
          { color: 'bg-yellow-500', label: '20-25' },
          { color: 'bg-orange-500', label: '25-30' },
          { color: 'bg-red-500', label: '> 30' },
        ];
      case 'profitability':
        return [
          { color: 'bg-red-500', label: '< 5%' },
          { color: 'bg-yellow-500', label: '5-10%' },
          { color: 'bg-green-400', label: '10-15%' },
          { color: 'bg-green-500', label: '15-20%' },
          { color: 'bg-green-600', label: '> 20%' },
        ];
      case 'size':
        return [
          { color: 'bg-blue-200', label: '< $50B' },
          { color: 'bg-blue-300', label: '$50-100B' },
          { color: 'bg-blue-400', label: '$100-500B' },
          { color: 'bg-blue-500', label: '$500B-1T' },
          { color: 'bg-blue-600', label: '> $1T' },
        ];
      default:
        return [];
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-center h-64">
            <div className="text-[#3C3C3C]">Loading heatmap...</div>
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

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold">Sector Heatmap</h3>
            <p className="text-[#3C3C3C] text-sm mt-1">Visual comparison across sectors</p>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={() => setMetric('performance')}
              className={`px-3 py-2.5 rounded-lg transition-colors ${
                metric === 'performance'
                  ? 'bg-blue-600 text-[#1a1a1a]'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Performance
            </button>
            <button
              onClick={() => setMetric('valuation')}
              className={`px-3 py-2.5 rounded-lg transition-colors ${
                metric === 'valuation'
                  ? 'bg-blue-600 text-[#1a1a1a]'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Valuation
            </button>
            <button
              onClick={() => setMetric('profitability')}
              className={`px-3 py-2.5 rounded-lg transition-colors ${
                metric === 'profitability'
                  ? 'bg-blue-600 text-[#1a1a1a]'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Profitability
            </button>
            <button
              onClick={() => setMetric('size')}
              className={`px-3 py-2.5 rounded-lg transition-colors ${
                metric === 'size'
                  ? 'bg-blue-600 text-[#1a1a1a]'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Size
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Heatmap Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10 mb-3">
          {data.sectors.map((sector) => (
            <div
              key={sector.sector}
              className={`${getHeatmapColor(sector)} rounded-lg p-3 text-[#1a1a1a] transition-all hover:scale-105 cursor-pointer shadow-md`}
              title={`${sector.sector}: ${getMetricLabel(sector)}`}
            >
              <div className="font-semibold text-sm mb-1">{sector.sector}</div>
              <div className="text-sm font-bold">{getMetricLabel(sector)}</div>
              <div className="text-sm opacity-90 mt-1">{sector.stockCount} stocks</div>
            </div>
          ))}
        </div>

        {/* Color Scale Legend */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-semibold mb-3">Legend</h4>
          <div className="flex flex-wrap gap-10">
            {getColorScale().map((item, idx) => (
              <div key={idx} className="flex items-center gap-2.5">
                <div className={`w-6 h-6 rounded ${item.color}`} />
                <span className="text-sm text-[#3C3C3C]">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Metric Description */}
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-[#3C3C3C]">
            {metric === 'performance' && 'Average 1-month price change across all stocks in the sector.'}
            {metric === 'valuation' && 'Average P/E ratio - lower values indicate cheaper valuations.'}
            {metric === 'profitability' && 'Average ROE (Return on Equity) - higher values indicate better profitability.'}
            {metric === 'size' && 'Total market capitalization of all stocks in the sector.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SectorHeatmap;