import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  LineData,
  CandlestickSeries,
  HistogramSeries,
  LineSeries
} from 'lightweight-charts';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { ENV } from '../../config/env';
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Activity,
  Minus,
  Circle,
  Square,
  Move,
  Type,
  Ruler,
  GitBranch,
  TrendingUpIcon
} from 'lucide-react';

interface StockChartProps {
  symbol: string;
  period?: string;
  className?: string;
}

// TradingView-style timeframes (only yfinance-supported intervals)
type Timeframe =
  // Minutes
  | '1m' | '2m' | '5m' | '15m' | '30m'
  // Hours
  | '1h'
  // Days/Weeks/Months
  | '1D' | '1W' | '1M' | '3M' | '6M' | '1Y';

interface ChartData {
  symbol: string;
  timeframe: string;
  candlesticks: CandlestickData[];
  volume: HistogramData[];
  technicals?: {
    sma20?: LineData[];
    sma50?: LineData[];
    sma200?: LineData[];
    rsi?: LineData[];
    macd?: {
      macd: LineData[];
      signal: LineData[];
      histogram: HistogramData[];
    };
    bollinger?: {
      upper: LineData[];
      middle: LineData[];
      lower: LineData[];
    };
  };
  timestamp: number;
}

/**
 * Professional Stock Chart Component using Lightweight Charts
 * Features:
 * - Candlestick chart with volume
 * - Multi-timeframe selection (1D to ALL)
 * - Responsive design
 * - Real data from yfinance
 */
export const StockChart: React.FC<StockChartProps> = ({ symbol, period, className = '' }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const sma20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const sma50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const sma200SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdSignalSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdHistogramSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const bollingerUpperRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bollingerMiddleRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bollingerLowerRef = useRef<ISeriesApi<'Line'> | null>(null);

  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSMA20, setShowSMA20] = useState(true);
  const [showSMA50, setShowSMA50] = useState(true);
  const [showSMA200, setShowSMA200] = useState(true);
  const [showRSI, setShowRSI] = useState(false);
  const [showMACD, setShowMACD] = useState(false);
  const [showBollinger, setShowBollinger] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [showDrawingTools, setShowDrawingTools] = useState(false);
  const [showMeasureTools, setShowMeasureTools] = useState(false);
  const [hasFullHistory, setHasFullHistory] = useState(false);
  const [isLoadingFullHistory, setIsLoadingFullHistory] = useState(false);

  // Grouped timeframes like TradingView
  const minuteTimeframes: Timeframe[] = ['1m', '2m', '5m', '15m', '30m'];
  const hourTimeframes: Timeframe[] = ['1h'];
  const dayTimeframes: Timeframe[] = ['1D', '1W', '1M', '3M', '6M', '1Y'];

  // Fetch chart data
  const fetchChartData = async (selectedTimeframe: Timeframe) => {
    setIsLoading(true);
    setError(null);

    try {
      // Use timeframe directly - backend handles the mapping
      const url = `${ENV.INTEL_API_URL}/api/chart/${symbol}?timeframe=${selectedTimeframe}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch chart data: ${response.statusText}`);
      }

      const apiResult = await response.json();

      if (!apiResult.candlesticks || !Array.isArray(apiResult.candlesticks)) {
        throw new Error('Invalid chart data received');
      }

      // Transform data to Lightweight Charts format
      const transformedData: ChartData = {
        symbol: apiResult.symbol,
        timeframe: selectedTimeframe,
        candlesticks: apiResult.candlesticks.map((item: any) => ({
          time: item.time,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
        })),
        volume: apiResult.candlesticks.map((item: any) => ({
          time: item.time,
          value: item.volume || 0,
          color: item.close >= item.open ? '#26a69a' : '#ef5350',
        })),
        technicals: {
          sma20: apiResult.candlesticks.filter((item: any) => item.sma20).map((item: any) => ({
            time: item.time,
            value: item.sma20,
          })),
          sma50: apiResult.candlesticks.filter((item: any) => item.sma50).map((item: any) => ({
            time: item.time,
            value: item.sma50,
          })),
          rsi: apiResult.candlesticks.filter((item: any) => item.rsi).map((item: any) => ({
            time: item.time,
            value: item.rsi,
          })),
        },
        timestamp: Date.now(),
      };

      setChartData(transformedData);
    } catch (err) {
      console.error('Error fetching chart data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chart data');
    } finally {
      setIsLoading(false);
    }
  };

  // Load full history for minute/hourly timeframes (loads max available: 7d for 1m, 60d for 5m/15m/30m, 730d for 1h)
  const loadFullHistory = async () => {
    setIsLoadingFullHistory(true);
    try {
      // Map current timeframe to _full variant for backend
      const fullTimeframeMap: Record<string, string> = {
        '1m': '1m_full',
        '5m': '5m_full',
        '15m': '15m_full',
        '30m': '30m_full',
        '1h': '1h_full',
      };

      const fullTimeframe = fullTimeframeMap[timeframe] || timeframe;
      const url = `${ENV.INTEL_API_URL}/api/chart/${symbol}?timeframe=${fullTimeframe}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to load full history');
      }

      const apiResult = await response.json();

      const transformedData: ChartData = {
        symbol:apiResult.symbol,
        timeframe: fullTimeframe,
        candlesticks: apiResult.candlesticks.map((item: any) => ({
          time: item.time,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
        })),
        volume: apiResult.candlesticks.map((item: any) => ({
          time: item.time,
          value: item.volume,
          color: item.close >= item.open ? '#26a69a' : '#ef5350',
        })),
        technicals: apiResult.technicals,
        timestamp: Date.now()
      };

      setChartData(transformedData);
      setHasFullHistory(true);
    } catch (err) {
      console.error('Error loading full history:', err);
    } finally {
      setIsLoadingFullHistory(false);
    }
  };

  // Initialize chart
  useEffect(() => {
    console.log(' Chart initialization useEffect running');
    if (!chartContainerRef.current) {
      console.log(' chartContainerRef.current is null');
      return;
    }
    console.log(' chartContainerRef exists, creating chart');

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#1a1a1a' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#2b2b2b' },
        horzLines: { color: '#2b2b2b' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
      rightPriceScale: {
        borderColor: '#2b2b2b',
      },
      timeScale: {
        borderColor: '#2b2b2b',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
      },
    });

    // Create candlestick series (v5 API)
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Create volume series (v5 API)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.7,
        bottom: 0,
      },
    });

    // Create SMA series (v5 API - initially empty)
    const sma20Series = chart.addSeries(LineSeries, {
      color: '#2196F3',
      lineWidth: 2,
      title: 'SMA 20',
    });

    const sma50Series = chart.addSeries(LineSeries, {
      color: '#FF9800',
      lineWidth: 2,
      title: 'SMA 50',
    });

    const sma200Series = chart.addSeries(LineSeries, {
      color: '#9C27B0',
      lineWidth: 2,
      title: 'SMA 200',
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;
    sma20SeriesRef.current = sma20Series;
    sma50SeriesRef.current = sma50Series;
    sma200SeriesRef.current = sma200Series;

    console.log(' Chart and series created successfully');

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  // Update chart data
  useEffect(() => {
    console.log(' Update chart data useEffect running', {
      hasChartData: !!chartData,
      hasCandlestickSeries: !!candlestickSeriesRef.current,
      hasVolumeSeries: !!volumeSeriesRef.current,
      candlesticksLength: chartData?.candlesticks?.length || 0,
      timeframe: timeframe
    });

    if (!chartData || !candlestickSeriesRef.current || !volumeSeriesRef.current) {
      console.log(' Missing required data or series refs');
      return;
    }

    try {
      console.log(' Setting chart data...');
      // Set candlestick data
      candlestickSeriesRef.current.setData(chartData.candlesticks);

      // Set volume data
      volumeSeriesRef.current.setData(chartData.volume);

      // Set SMA data (if available and toggled on)
      if (chartData.technicals) {
        if (sma20SeriesRef.current && chartData.technicals.sma20) {
          sma20SeriesRef.current.setData(showSMA20 ? chartData.technicals.sma20 : []);
        }
        if (sma50SeriesRef.current && chartData.technicals.sma50) {
          sma50SeriesRef.current.setData(showSMA50 ? chartData.technicals.sma50 : []);
        }
        if (sma200SeriesRef.current && chartData.technicals.sma200) {
          sma200SeriesRef.current.setData(showSMA200 ? chartData.technicals.sma200 : []);
        }
      }

      // Fit content
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
        console.log(' Chart data updated and fitted successfully');
      }
    } catch (err) {
      console.error(' Error updating chart:', err);
    }
  }, [chartData, showSMA20, showSMA50, showSMA200]);

  // Fetch data on symbol or period change (NOT timeframe - buttons handle that directly)
  useEffect(() => {
    // Use period prop if provided, otherwise fall back to timeframe state
    const effectiveTimeframe = period || timeframe;
    fetchChartData(effectiveTimeframe as Timeframe);
  }, [symbol, period]); // Removed timeframe from dependencies to prevent race conditions

  // Calculate price change
  const getPriceChange = () => {
    if (!chartData || chartData.candlesticks.length < 2) return null;

    const first = chartData.candlesticks[0];
    const last = chartData.candlesticks[chartData.candlesticks.length - 1];
    const change = last.close - first.open;
    const changePercent = ((change / first.open) * 100);

    return {
      value: change,
      percent: changePercent,
      isPositive: change >= 0,
    };
  };

  const priceChange = getPriceChange();

  return (
    <Card className={`p-3 bg-playful-cream border-3 border-black ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-10">
          <h3 className="text-sm font-bold text-[#1a1a1a]">{symbol}</h3>
          {chartData && chartData.candlesticks.length > 0 && (
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-bold text-[#1a1a1a]">
                ${chartData.candlesticks[chartData.candlesticks.length - 1].close.toFixed(2)}
              </span>
              {priceChange && (
                <Badge
                  variant="outline"
                  className={`flex items-center gap-1.5 ${
                    priceChange.isPositive
                      ? 'text-green-400 border-green-400/50'
                      : 'text-red-400 border-red-400/50'
                  }`}
                >
                  {priceChange.isPositive ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {priceChange.isPositive ? '+' : ''}
                  {priceChange.value.toFixed(2)} ({priceChange.percent.toFixed(2)}%)
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Drawing Tools */}
        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant={showDrawingTools ? 'default' : 'outline'}
            onClick={() => setShowDrawingTools(!showDrawingTools)}
            className={cn(
              'h-8 px-3 border-2 border-black rounded-xl',
              showDrawingTools && 'bg-playful-green text-white shadow-md'
            )}
          >
            <Move className="w-4 h-4 mr-1.5" />
            Draw
          </Button>

          <Button
            size="sm"
            variant={showMeasureTools ? 'default' : 'outline'}
            onClick={() => setShowMeasureTools(!showMeasureTools)}
            className={cn(
              'h-8 px-3 border-2 border-black rounded-xl',
              showMeasureTools && 'bg-playful-orange text-white shadow-md'
            )}
          >
            <Ruler className="w-4 h-4 mr-1.5" />
            Measure
          </Button>
        </div>

        {/* Timeframe Selector - TradingView Style */}
        <div className="flex items-center gap-4">
          {/* Minutes */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-[#5C5C5C] mr-1">MINUTES</span>
            {minuteTimeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => {
                  setTimeframe(tf);
                  setHasFullHistory(false);
                  fetchChartData(tf);
                }}
                disabled={isLoading}
                className={`px-2 py-1 text-xs font-semibold rounded-lg border-2 border-black transition-all ${
                  timeframe === tf
                    ? 'bg-playful-orange text-white shadow-md'
                    : 'bg-white text-[#1a1a1a] hover:bg-playful-cream'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Hours */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-[#5C5C5C] mr-1">HOURS</span>
            {hourTimeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => {
                  setTimeframe(tf);
                  setHasFullHistory(false);
                  fetchChartData(tf);
                }}
                disabled={isLoading}
                className={`px-2 py-1 text-xs font-semibold rounded-lg border-2 border-black transition-all ${
                  timeframe === tf
                    ? 'bg-playful-orange text-white shadow-md'
                    : 'bg-white text-[#1a1a1a] hover:bg-playful-cream'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Days/Months */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-[#5C5C5C] mr-1">DAYS</span>
            {dayTimeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => {
                  setTimeframe(tf);
                  setHasFullHistory(false);
                  fetchChartData(tf);
                }}
                disabled={isLoading}
                className={`px-2 py-1 text-xs font-semibold rounded-lg border-2 border-black transition-all ${
                  timeframe === tf
                    ? 'bg-playful-orange text-white shadow-md'
                    : 'bg-white text-[#1a1a1a] hover:bg-playful-cream'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Load Full History Button - Only for minute/hourly timeframes */}
          {!hasFullHistory && ['1m', '2m', '5m', '15m', '30m', '1h'].includes(timeframe) && (
            <div className="ml-auto">
              <button
                onClick={loadFullHistory}
                disabled={isLoadingFullHistory}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border-2 border-blue-600 bg-blue-600 text-white hover:bg-blue-700 hover:border-blue-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {isLoadingFullHistory ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Activity className="w-3 h-3" />
                    Load Full History ({timeframe === '1m' ? '7d' : timeframe === '1h' ? '2y' : timeframe === '2m' ? '60d' : '60d'} max)
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Drawing Tools Panel */}
      {showDrawingTools && (
        <div className="flex items-center gap-2.5 mt-3 mb-3 p-3 bg-playful-cream rounded-2xl border-2 border-black flex-wrap">
          <span className="text-sm font-semibold text-[#1a1a1a]">Drawing Tools:</span>
          <Button
            size="sm"
            variant={activeTool === 'trendline' ? 'default' : 'outline'}
            onClick={() => setActiveTool(activeTool === 'trendline' ? null : 'trendline')}
            className={cn(
              'h-7 px-3 text-sm border-2 border-black rounded-xl',
              activeTool === 'trendline' ? 'bg-playful-green text-white' : 'bg-white text-[#1a1a1a]'
            )}
          >
            <Minus className="w-4 h-4 mr-1.5 rotate-45" />
            Trend Line
          </Button>
          <Button
            size="sm"
            variant={activeTool === 'horizontal' ? 'default' : 'outline'}
            onClick={() => setActiveTool(activeTool === 'horizontal' ? null : 'horizontal')}
            className={cn(
              'h-7 px-3 text-sm border-2 border-black rounded-xl',
              activeTool === 'horizontal' ? 'bg-playful-green text-white' : 'bg-white text-[#1a1a1a]'
            )}
          >
            <Minus className="w-4 h-4 mr-1.5" />
            Horizontal Line
          </Button>
          <Button
            size="sm"
            variant={activeTool === 'channel' ? 'default' : 'outline'}
            onClick={() => setActiveTool(activeTool === 'channel' ? null : 'channel')}
            className={cn(
              'h-7 px-3 text-sm border-2 border-black rounded-xl',
              activeTool === 'channel' ? 'bg-playful-green text-white' : 'bg-white text-[#1a1a1a]'
            )}
          >
            <TrendingUpIcon className="w-4 h-4 mr-1.5" />
            Channel
          </Button>
          <Button
            size="sm"
            variant={activeTool === 'rectangle' ? 'default' : 'outline'}
            onClick={() => setActiveTool(activeTool === 'rectangle' ? null : 'rectangle')}
            className={cn(
              'h-7 px-3 text-sm border-2 border-black rounded-xl',
              activeTool === 'rectangle' ? 'bg-playful-green text-white' : 'bg-white text-[#1a1a1a]'
            )}
          >
            <Square className="w-4 h-4 mr-1.5" />
            Rectangle
          </Button>
          <Button
            size="sm"
            variant={activeTool === 'circle' ? 'default' : 'outline'}
            onClick={() => setActiveTool(activeTool === 'circle' ? null : 'circle')}
            className={cn(
              'h-7 px-3 text-sm border-2 border-black rounded-xl',
              activeTool === 'circle' ? 'bg-playful-green text-white' : 'bg-white text-[#1a1a1a]'
            )}
          >
            <Circle className="w-4 h-4 mr-1.5" />
            Circle
          </Button>
          <Button
            size="sm"
            variant={activeTool === 'text' ? 'default' : 'outline'}
            onClick={() => setActiveTool(activeTool === 'text' ? null : 'text')}
            className={cn(
              'h-7 px-3 text-sm border-2 border-black rounded-xl',
              activeTool === 'text' ? 'bg-playful-green text-white' : 'bg-white text-[#1a1a1a]'
            )}
          >
            <Type className="w-4 h-4 mr-1.5" />
            Text
          </Button>
        </div>
      )}

      {/* Measure Tools Panel */}
      {showMeasureTools && (
        <div className="flex items-center gap-2.5 mt-3 mb-3 p-3 bg-playful-cream rounded-2xl border-2 border-black flex-wrap">
          <span className="text-sm font-semibold text-[#1a1a1a]">Measure & Analysis:</span>
          <Button
            size="sm"
            variant={activeTool === 'fibonacci' ? 'default' : 'outline'}
            onClick={() => setActiveTool(activeTool === 'fibonacci' ? null : 'fibonacci')}
            className={cn(
              'h-7 px-3 text-sm border-2 border-black rounded-xl',
              activeTool === 'fibonacci' ? 'bg-playful-orange text-white' : 'bg-white text-[#1a1a1a]'
            )}
          >
            <GitBranch className="w-4 h-4 mr-1.5" />
            Fibonacci Retracement
          </Button>
          <Button
            size="sm"
            variant={activeTool === 'fibextension' ? 'default' : 'outline'}
            onClick={() => setActiveTool(activeTool === 'fibextension' ? null : 'fibextension')}
            className={cn(
              'h-7 px-3 text-sm border-2 border-black rounded-xl',
              activeTool === 'fibextension' ? 'bg-playful-orange text-white' : 'bg-white text-[#1a1a1a]'
            )}
          >
            <GitBranch className="w-4 h-4 mr-1.5 rotate-180" />
            Fib Extension
          </Button>
          <Button
            size="sm"
            variant={activeTool === 'measure' ? 'default' : 'outline'}
            onClick={() => setActiveTool(activeTool === 'measure' ? null : 'measure')}
            className={cn(
              'h-7 px-3 text-sm border-2 border-black rounded-xl',
              activeTool === 'measure' ? 'bg-playful-orange text-white' : 'bg-white text-[#1a1a1a]'
            )}
          >
            <Ruler className="w-4 h-4 mr-1.5" />
            Price Range
          </Button>
          <Button
            size="sm"
            variant={activeTool === 'pitchfork' ? 'default' : 'outline'}
            onClick={() => setActiveTool(activeTool === 'pitchfork' ? null : 'pitchfork')}
            className={cn(
              'h-7 px-3 text-sm border-2 border-black rounded-xl',
              activeTool === 'pitchfork' ? 'bg-playful-orange text-white' : 'bg-white text-[#1a1a1a]'
            )}
          >
            <TrendingUp className="w-4 h-4 mr-1.5" />
            Pitchfork
          </Button>
        </div>
      )}

      {/* Technical Indicators Toggle */}
      {chartData?.technicals && (
        <div className="flex items-center gap-10 mb-3 px-2">
          <span className="text-sm text-[#3C3C3C] font-medium">Indicators:</span>
          {chartData.technicals.sma20 && (
            <button
              onClick={() => setShowSMA20(!showSMA20)}
              className={`flex items-center gap-2.5 px-2 py-1 text-sm rounded-2xl transition-colors ${
                showSMA20
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-600/50'
                  : 'bg-white/80 text-[#3C3C3C] border border-black/10'
              }`}
            >
              <div className="w-3 h-0.5 bg-blue-500" />
              SMA 20
            </button>
          )}
          {chartData.technicals.sma50 && (
            <button
              onClick={() => setShowSMA50(!showSMA50)}
              className={`flex items-center gap-2.5 px-2 py-1 text-sm rounded-2xl transition-colors ${
                showSMA50
                  ? 'bg-orange-600/20 text-orange-400 border border-orange-600/50'
                  : 'bg-white/80 text-[#3C3C3C] border border-black/10'
              }`}
            >
              <div className="w-3 h-0.5 bg-orange-500" />
              SMA 50
            </button>
          )}
          {chartData.technicals.sma200 && (
            <button
              onClick={() => setShowSMA200(!showSMA200)}
              className={`flex items-center gap-2.5 px-2 py-1 text-sm rounded-2xl transition-colors ${
                showSMA200
                  ? 'bg-playful-green/20 text-primary-400 border border-playful-green/50'
                  : 'bg-white/80 text-[#3C3C3C] border border-black/10'
              }`}
            >
              <div className="w-3 h-0.5 bg-playful-green" />
              SMA 200
            </button>
          )}
          {chartData.technicals.rsi && (
            <button
              onClick={() => setShowRSI(!showRSI)}
              className={`flex items-center gap-2.5 px-2 py-1 text-sm rounded-2xl transition-colors ${
                showRSI
                  ? 'bg-green-600/20 text-green-400 border border-green-600/50'
                  : 'bg-white/80 text-[#3C3C3C] border border-black/10'
              }`}
            >
              <Activity className="w-3 h-3" />
              RSI
            </button>
          )}
          {chartData.technicals.bollinger && (
            <button
              onClick={() => setShowBollinger(!showBollinger)}
              className={`flex items-center gap-2.5 px-2 py-1 text-sm rounded-2xl transition-colors ${
                showBollinger
                  ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-600/50'
                  : 'bg-white/80 text-[#3C3C3C] border border-black/10'
              }`}
            >
              <div className="w-3 h-0.5 bg-cyan-500" />
              Bollinger
            </button>
          )}
          {chartData.technicals.macd && (
            <button
              onClick={() => setShowMACD(!showMACD)}
              className={`flex items-center gap-2.5 px-2 py-1 text-sm rounded-2xl transition-colors ${
                showMACD
                  ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/50'
                  : 'bg-white/80 text-[#3C3C3C] border border-black/10'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              MACD
            </button>
          )}
        </div>
      )}

      {/* Active Tool Indicator */}
      {activeTool && (
        <div className="mb-3 p-3 bg-gradient-to-r from-playful-green/20 to-playful-orange/20 rounded-2xl border-2 border-black">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Badge className="bg-playful-green text-white border-2 border-black">
                Tool Active
              </Badge>
              <span className="text-sm font-semibold text-[#1a1a1a]">
                {activeTool === 'trendline' && ' Trend Line: Click two points to draw'}
                {activeTool === 'horizontal' && ' Horizontal Line: Click to place support/resistance'}
                {activeTool === 'channel' && ' Channel: Click to define parallel trend lines'}
                {activeTool === 'rectangle' && ' Rectangle: Drag to mark price zones'}
                {activeTool === 'circle' && ' Circle: Mark key chart patterns'}
                {activeTool === 'text' && ' Text: Click to add annotations'}
                {activeTool === 'fibonacci' && ' Fibonacci: Click high and low points'}
                {activeTool === 'fibextension' && ' Fib Extension: Define three points for projection'}
                {activeTool === 'measure' && ' Measure: Calculate price and time distance'}
                {activeTool === 'pitchfork' && ' Pitchfork: Click three pivot points'}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveTool(null)}
              className="h-8 border-2 border-black rounded-xl bg-white hover:bg-playful-cream"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Chart Container */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-playful-cream/50 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center gap-2.5">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="text-sm text-[#3C3C3C]">Loading chart data...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-playful-cream/50 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center gap-2.5 text-center px-3">
              <Activity className="w-8 h-8 text-red-500" />
              <span className="text-sm text-red-400">{error}</span>
              <button
                onClick={() => fetchChartData(timeframe)}
                className="mt-2 px-3 py-2.5 text-sm bg-blue-600 text-[#1a1a1a] rounded hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <div ref={chartContainerRef} className="w-full h-[500px]" />
      </div>

      {/* Chart Info */}
      {chartData && (
        <div className="mt-3 flex items-center gap-10 text-sm text-[#3C3C3C]">
          <div className="flex items-center gap-2.5">
            <Activity className="w-4 h-4" />
            <span>{chartData.candlesticks.length} data points</span>
          </div>
          <div>
            Timeframe: {timeframe}
          </div>
          <div>
            Updated: {new Date(chartData.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}
    </Card>
  );
};

export default StockChart;