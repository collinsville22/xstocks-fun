import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardContent } from '../ui/card';
import { createChart, IChartApi, ISeriesApi, LineData } from 'lightweight-charts';
import { ENV } from '../../config/env';

interface SectorHistoryData {
  sector: string;
  stockCount: number;
  performance: number;
  history: { time: number; value: number }[];
}

interface SectorHistoricalData {
  sectors: SectorHistoryData[];
  period: string;
  totalSectors: number;
  timestamp: number;
}

type TimeRange = '1m' | '3m' | '6m' | '1y' | '3y' | '5y';

export const SectorHistoricalChart: React.FC = () => {
  const [data, setData] = useState<SectorHistoricalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('1y');
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesMapRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());

  useEffect(() => {
    fetchHistoricalData();
  }, [timeRange]);

  useEffect(() => {
    if (data && chartContainerRef.current) {
      initChart();
    }
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [data, selectedSectors, showAll]);

  const fetchHistoricalData = async () => {
    try {
      setLoading(true);
      setError(null);
      // FIXME: Historical data cache expires after 5 minutes
      // We should implement smarter caching based on trading session
      const response = await fetch(`${ENV.INTEL_API_URL}/api/sectors/historical?period=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch historical data');
      const apiResult = await response.json();
      setData(apiResult);

      // Auto-select top 5 performers on first load
      if (selectedSectors.length === 0 && apiResult.sectors.length > 0) {
        const top5 = apiResult.sectors.slice(0, 5).map((s: SectorHistoryData) => s.sector);
        setSelectedSectors(top5);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load historical data');
    } finally {
      setLoading(false);
    }
  };

  const initChart = () => {
    if (!chartContainerRef.current || !data) return;

    // Clear existing chart
    if (chartRef.current) {
      chartRef.current.remove();
    }
    seriesMapRef.current.clear();

    // Create new chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      rightPriceScale: {
        borderColor: '#e0e0e0',
      },
      timeScale: {
        borderColor: '#e0e0e0',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Color palette for sectors
    const colors = [
      '#3b82f6', // blue
      '#10b981', // green
      '#f59e0b', // orange
      '#ef4444', // red
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#84cc16', // lime
      '#f97316', // orange-red
      '#6366f1', // indigo
      '#14b8a6', // teal
    ];

    // Determine which sectors to show
    const sectorsToShow = showAll
      ? data.sectors
      : data.sectors.filter(s => selectedSectors.includes(s.sector));

    // Add line series for each sector
    sectorsToShow.forEach((sector, index) => {
      const lineSeries = chart.addSeries({
        type: 'Line',
        color: colors[index % colors.length],
        // downColor: colors[index % colors.length],
        // borderVisible: false,
        // wickVisible: false,
      } as any) as any;

      const chartData: LineData[] = sector.history.map(point => ({
        time: point.time as any,
        value: point.value,
      }));

      lineSeries.setData(chartData);
      seriesMapRef.current.set(sector.sector, lineSeries);
    });

    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  };

  const toggleSector = (sector: string) => {
    setSelectedSectors(prev =>
      prev.includes(sector)
        ? prev.filter(s => s !== sector)
        : [...prev, sector]
    );
  };

  const selectTopPerformers = (count: number) => {
    if (!data) return;
    const top = data.sectors.slice(0, count).map(s => s.sector);
    setSelectedSectors(top);
    setShowAll(false);
  };

  const getPerformanceColor = (performance: number): string => {
    if (performance > 20) return 'text-green-600';
    if (performance > 0) return 'text-green-500';
    if (performance > -20) return 'text-red-500';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-center h-64">
            <div className="text-[#3C3C3C]">Loading historical data...</div>
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
            onClick={fetchHistoricalData}
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
    <div className="space-y-3">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
            <div>
              <h3 className="text-sm font-bold">Sector Historical Performance</h3>
              <p className="text-[#3C3C3C] text-sm mt-1">
                Compare sector performance over time (% change from start)
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => setTimeRange('1m')}
                className={`px-3 py-1.5 rounded transition-colors text-sm ${
                  timeRange === '1m'
                    ? 'bg-blue-600 text-[#1a1a1a]'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                1M
              </button>
              <button
                onClick={() => setTimeRange('3m')}
                className={`px-3 py-1.5 rounded transition-colors text-sm ${
                  timeRange === '3m'
                    ? 'bg-blue-600 text-[#1a1a1a]'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                3M
              </button>
              <button
                onClick={() => setTimeRange('6m')}
                className={`px-3 py-1.5 rounded transition-colors text-sm ${
                  timeRange === '6m'
                    ? 'bg-blue-600 text-[#1a1a1a]'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                6M
              </button>
              <button
                onClick={() => setTimeRange('1y')}
                className={`px-3 py-1.5 rounded transition-colors text-sm ${
                  timeRange === '1y'
                    ? 'bg-blue-600 text-[#1a1a1a]'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                1Y
              </button>
              <button
                onClick={() => setTimeRange('3y')}
                className={`px-3 py-1.5 rounded transition-colors text-sm ${
                  timeRange === '3y'
                    ? 'bg-blue-600 text-[#1a1a1a]'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                3Y
              </button>
              <button
                onClick={() => setTimeRange('5y')}
                className={`px-3 py-1.5 rounded transition-colors text-sm ${
                  timeRange === '5y'
                    ? 'bg-blue-600 text-[#1a1a1a]'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                5Y
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Quick Select Buttons */}
          <div className="flex flex-wrap gap-2.5 mb-3">
            <button
              onClick={() => selectTopPerformers(3)}
              className="px-3 py-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
            >
              Top 3
            </button>
            <button
              onClick={() => selectTopPerformers(5)}
              className="px-3 py-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
            >
              Top 5
            </button>
            <button
              onClick={() => {
                setShowAll(true);
                setSelectedSectors([]);
              }}
              className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
            >
              Show All
            </button>
            <button
              onClick={() => {
                setShowAll(false);
                setSelectedSectors([]);
              }}
              className="px-3 py-1.5 bg-gray-100 text-[#3C3C3C] rounded hover:bg-gray-200 text-sm"
            >
              Clear
            </button>
          </div>

          {/* Chart */}
          <div ref={chartContainerRef} className="w-full" />

          {/* Sector Selector Grid */}
          <div className="mt-3">
            <h4 className="font-semibold mb-3">Select Sectors to Display:</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {data.sectors.map((sector) => (
                <button
                  key={sector.sector}
                  onClick={() => {
                    setShowAll(false);
                    toggleSector(sector.sector);
                  }}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    selectedSectors.includes(sector.sector)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-black/20 hover:border-black/30'
                  }`}
                >
                  <div className="font-medium text-sm">{sector.sector}</div>
                  <div className={`text-sm font-semibold ${getPerformanceColor(sector.performance)}`}>
                    {sector.performance >= 0 ? '+' : ''}{sector.performance.toFixed(2)}%
                  </div>
                  <div className="text-sm text-[#3C3C3C]">{sector.stockCount} stocks</div>
                </button>
              ))}
            </div>
          </div>

          {/* Performance Summary */}
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">Performance Summary ({timeRange.toUpperCase()})</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
              <div>
                <div className="text-sm text-[#3C3C3C]">Best Performer</div>
                <div className="font-semibold">{data.sectors[0]?.sector}</div>
                <div className={`text-sm ${getPerformanceColor(data.sectors[0]?.performance || 0)}`}>
                  {data.sectors[0]?.performance >= 0 ? '+' : ''}
                  {data.sectors[0]?.performance.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-sm text-[#3C3C3C]">Worst Performer</div>
                <div className="font-semibold">{data.sectors[data.sectors.length - 1]?.sector}</div>
                <div className={`text-sm ${getPerformanceColor(data.sectors[data.sectors.length - 1]?.performance || 0)}`}>
                  {data.sectors[data.sectors.length - 1]?.performance >= 0 ? '+' : ''}
                  {data.sectors[data.sectors.length - 1]?.performance.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-sm text-[#3C3C3C]">Average Performance</div>
                <div className={`text-sm font-semibold ${getPerformanceColor(
                  data.sectors.reduce((sum, s) => sum + s.performance, 0) / data.sectors.length
                )}`}>
                  {(data.sectors.reduce((sum, s) => sum + s.performance, 0) / data.sectors.length) >= 0 ? '+' : ''}
                  {(data.sectors.reduce((sum, s) => sum + s.performance, 0) / data.sectors.length).toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-sm text-[#3C3C3C]">Positive Sectors</div>
                <div className="text-sm font-semibold">
                  {data.sectors.filter(s => s.performance > 0).length} / {data.sectors.length}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SectorHistoricalChart;