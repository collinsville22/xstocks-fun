import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  LineData,
  Time,
  CandlestickSeries,
  LineSeries,
  HistogramSeries
} from 'lightweight-charts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { ENV } from '../../config/env';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw,
  Maximize2,
  Minimize2,
  Settings,
  Minus,
  Circle,
  Square,
  Move,
  Type,
  Ruler,
  GitBranch,
  TrendingUpIcon,
  Loader2
} from 'lucide-react';

interface MarketIndexChartProps {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  technical: {
    rsi: number;
    macd: {
      macd: number;
      signal: number;
      histogram: number;
    };
    sma20: number;
    sma50: number;
    sma200: number;
    bollinger: {
      upper: number;
      middle: number;
      lower: number;
    };
  };
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
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  rsi?: number;
  macd?: number;
  signal?: number;
  histogram?: number;
  sma20?: number;
  sma50?: number;
  sma200?: number;
  bollingerUpper?: number;
  bollingerMiddle?: number;
  bollingerLower?: number;
}

/**
 * Professional Market Index Chart Component
 * Features:
 * - Candlestick price chart with volume
 * - RSI indicator panel (0-100 scale with zones)
 * - MACD indicator panel (histogram + signal lines)
 * - Bollinger Bands overlay
 * - Moving Averages (SMA 20, 50, 200)
 * - Responsive and interactive
 */
export const MarketIndexChart: React.FC<MarketIndexChartProps> = ({
  symbol,
  name,
  price,
  change,
  changePercent,
  technical,
  className
}) => {
  // Independent timeframe state (not using period from props anymore)
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');

  // Grouped timeframes like TradingView (only yfinance-supported intervals)
  const minuteTimeframes: Timeframe[] = ['1m', '2m', '5m', '15m', '30m'];
  const hourTimeframes: Timeframe[] = ['1h'];
  const dayTimeframes: Timeframe[] = ['1D', '1W', '1M', '3M', '6M', '1Y'];
  // Chart container refs
  const mainChartContainerRef = useRef<HTMLDivElement>(null);
  const rsiChartContainerRef = useRef<HTMLDivElement>(null);
  const macdChartContainerRef = useRef<HTMLDivElement>(null);

  // Chart instance refs
  const mainChartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const macdChartRef = useRef<IChartApi | null>(null);

  // Series refs for main chart
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const sma20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const sma50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const sma200SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bollingerUpperRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bollingerMiddleRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bollingerLowerRef = useRef<ISeriesApi<'Line'> | null>(null);

  // Series refs for RSI chart
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiOverboughtRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiOversoldRef = useRef<ISeriesApi<'Line'> | null>(null);

  // Series refs for MACD chart
  const macdLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdSignalRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdHistogramRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSMA, setShowSMA] = useState(true);
  const [showBollinger, setShowBollinger] = useState(true);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [showDrawingTools, setShowDrawingTools] = useState(false);
  const [showMeasureTools, setShowMeasureTools] = useState(false);
  const [hasFullHistory, setHasFullHistory] = useState(false);
  const [isLoadingFullHistory, setIsLoadingFullHistory] = useState(false);

  // Fetch chart data from backend
  const fetchChartData = async () => {
    setIsLoading(true);
    try {
      // Use TradingView-style timeframe directly (no conversion needed)
      const response = await fetch(
        `${ENV.INTEL_API_URL}/api/market/index-chart/${symbol}?timeframe=${timeframe}`
      );
      const apiResponse = await response.json();

      // Check for successful response
      if (!data.success || !data.chartData) {
        console.warn('No chart data available for', symbol);
        setIsLoading(false);
        return;
      }

      // Transform backend data to chart format
      const transformedData: ChartData[] = data.chartData.map((item: any) => ({
        time: item.time as Time,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
        rsi: item.rsi,
        macd: item.macd?.macd,
        signal: item.macd?.signal,
        histogram: item.macd?.histogram,
        sma20: item.sma20,
        sma50: item.sma50,
        sma200: item.sma200,
        bollingerUpper: item.bollinger?.upper,
        bollingerMiddle: item.bollinger?.middle,
        bollingerLower: item.bollinger?.lower
      }));

      setChartData(transformedData);
    } catch (error) {
      console.error('Error fetching chart data:', error);
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
    } finally {
      setIsLoading(false);
    }
  };

  // Load full history for minute/hourly timeframes (loads max available)
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
      const response = await fetch(
        `${ENV.INTEL_API_URL}/api/market/index-chart/${symbol}?timeframe=${fullTimeframe}`
      );
      const apiResponse = await response.json();

      if (!data.success || !data.chartData) {
        console.warn('No chart data available for full history');
        return;
      }

      const transformedData: ChartData[] = data.chartData.map((item: any) => ({
        time: item.time as Time,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
        rsi: item.rsi,
        macd: item.macd?.macd,
        signal: item.macd?.signal,
        histogram: item.macd?.histogram,
        sma20: item.sma20,
        sma50: item.sma50,
        sma200: item.sma200,
        bollingerUpper: item.bollinger?.upper,
        bollingerMiddle: item.bollinger?.middle,
        bollingerLower: item.bollinger?.lower
      }));

      setChartData(transformedData);
      setHasFullHistory(true);
    } catch (error) {
      console.error('Error loading full history:', error);
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
    } finally {
      setIsLoadingFullHistory(false);
    }
  };

  // Initialize main price chart
  useEffect(() => {
    if (!mainChartContainerRef.current) return;

    const chart = createChart(mainChartContainerRef.current, {
      width: mainChartContainerRef.current.clientWidth,
      height: isExpanded ? 500 : 300,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#374151' },
        horzLines: { color: '#374151' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#4b5563',
      },
      timeScale: {
        borderColor: '#4b5563',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    mainChartRef.current = chart;

    // Add candlestick series (v5 API)
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });
    candlestickSeriesRef.current = candlestickSeries;

    // Add volume series (v5 API)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#6366f1',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
    });
    volumeSeriesRef.current = volumeSeries;

    chart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // Add SMA lines (v5 API)
    const sma20Series = chart.addSeries(LineSeries, {
      color: '#3b82f6',
      lineWidth: 2,
      title: 'SMA 20',
    });
    sma20SeriesRef.current = sma20Series;

    const sma50Series = chart.addSeries(LineSeries, {
      color: '#f59e0b',
      lineWidth: 2,
      title: 'SMA 50',
    });
    sma50SeriesRef.current = sma50Series;

    const sma200Series = chart.addSeries(LineSeries, {
      color: '#8b5cf6',
      lineWidth: 2,
      title: 'SMA 200',
    });
    sma200SeriesRef.current = sma200Series;

    // Add Bollinger Bands (v5 API)
    const bollingerUpper = chart.addSeries(LineSeries, {
      color: '#ef4444',
      lineWidth: 1,
      lineStyle: 2,
      title: 'BB Upper',
    });
    bollingerUpperRef.current = bollingerUpper;

    const bollingerMiddle = chart.addSeries(LineSeries, {
      color: '#3b82f6',
      lineWidth: 1,
      lineStyle: 2,
      title: 'BB Middle',
    });
    bollingerMiddleRef.current = bollingerMiddle;

    const bollingerLower = chart.addSeries(LineSeries, {
      color: '#10b981',
      lineWidth: 1,
      lineStyle: 2,
      title: 'BB Lower',
    });
    bollingerLowerRef.current = bollingerLower;

    // Handle resize
    const handleResize = () => {
      if (mainChartContainerRef.current) {
        chart.applyOptions({
          width: mainChartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [isExpanded]);

  // Initialize RSI chart
  useEffect(() => {
    if (!rsiChartContainerRef.current) return;

    const chart = createChart(rsiChartContainerRef.current, {
      width: rsiChartContainerRef.current.clientWidth,
      height: 120,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#374151' },
        horzLines: { color: '#374151' },
      },
      rightPriceScale: {
        borderColor: '#4b5563',
      },
      timeScale: {
        borderColor: '#4b5563',
        visible: false,
      },
    });

    rsiChartRef.current = chart;

    // RSI line
    const rsiSeries = chart.addSeries(LineSeries, {
      color: '#8b5cf6',
      lineWidth: 2,
      title: 'RSI',
    });
    rsiSeriesRef.current = rsiSeries;

    // Overbought line (70)
    const overboughtSeries = chart.addSeries(LineSeries, {
      color: '#ef4444',
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
    });
    rsiOverboughtRef.current = overboughtSeries;

    // Oversold line (30)
    const oversoldSeries = chart.addSeries(LineSeries, {
      color: '#10b981',
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
    });
    rsiOversoldRef.current = oversoldSeries;

    chart.priceScale('right').applyOptions({
      scaleMargins: {
        top: 0.1,
        bottom: 0.1,
      },
    });

    const handleResize = () => {
      if (rsiChartContainerRef.current) {
        chart.applyOptions({
          width: rsiChartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Initialize MACD chart
  useEffect(() => {
    if (!macdChartContainerRef.current) return;

    const chart = createChart(macdChartContainerRef.current, {
      width: macdChartContainerRef.current.clientWidth,
      height: 120,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#374151' },
        horzLines: { color: '#374151' },
      },
      rightPriceScale: {
        borderColor: '#4b5563',
      },
      timeScale: {
        borderColor: '#4b5563',
        visible: false,
      },
    });

    macdChartRef.current = chart;

    // MACD histogram
    const macdHistogram = chart.addSeries(HistogramSeries, {
      color: '#6366f1',
      priceFormat: {
        type: 'price',
        precision: 4,
        minMove: 0.0001,
      },
    });
    macdHistogramRef.current = macdHistogram;

    // MACD line
    const macdLine = chart.addSeries(LineSeries, {
      color: '#3b82f6',
      lineWidth: 2,
      title: 'MACD',
    });
    macdLineRef.current = macdLine;

    // Signal line
    const signalLine = chart.addSeries(LineSeries, {
      color: '#f59e0b',
      lineWidth: 2,
      title: 'Signal',
    });
    macdSignalRef.current = signalLine;

    const handleResize = () => {
      if (macdChartContainerRef.current) {
        chart.applyOptions({
          width: macdChartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update chart data
  useEffect(() => {
    if (chartData.length === 0) return;

    // Update main chart
    if (candlestickSeriesRef.current) {
      const candleData: CandlestickData[] = chartData.map(d => ({
        time: d.time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));
      candlestickSeriesRef.current.setData(candleData);
    }

    if (volumeSeriesRef.current) {
      const volumeData: HistogramData[] = chartData.map(d => ({
        time: d.time,
        value: d.volume,
        color: d.close >= d.open ? '#10b98180' : '#ef444480',
      }));
      volumeSeriesRef.current.setData(volumeData);
    }

    // Update SMA lines
    if (showSMA) {
      if (sma20SeriesRef.current) {
        const sma20Data: LineData[] = chartData
          .filter(d => d.sma20)
          .map(d => ({ time: d.time, value: d.sma20! }));
        sma20SeriesRef.current.setData(sma20Data);
      }

      if (sma50SeriesRef.current) {
        const sma50Data: LineData[] = chartData
          .filter(d => d.sma50)
          .map(d => ({ time: d.time, value: d.sma50! }));
        sma50SeriesRef.current.setData(sma50Data);
      }

      if (sma200SeriesRef.current) {
        const sma200Data: LineData[] = chartData
          .filter(d => d.sma200)
          .map(d => ({ time: d.time, value: d.sma200! }));
        sma200SeriesRef.current.setData(sma200Data);
      }
    }

    // Update Bollinger Bands
    if (showBollinger) {
      if (bollingerUpperRef.current) {
        const upperData: LineData[] = chartData
          .filter(d => d.bollingerUpper)
          .map(d => ({ time: d.time, value: d.bollingerUpper! }));
        bollingerUpperRef.current.setData(upperData);
      }

      if (bollingerMiddleRef.current) {
        const middleData: LineData[] = chartData
          .filter(d => d.bollingerMiddle)
          .map(d => ({ time: d.time, value: d.bollingerMiddle! }));
        bollingerMiddleRef.current.setData(middleData);
      }

      if (bollingerLowerRef.current) {
        const lowerData: LineData[] = chartData
          .filter(d => d.bollingerLower)
          .map(d => ({ time: d.time, value: d.bollingerLower! }));
        bollingerLowerRef.current.setData(lowerData);
      }
    }

    // Update RSI chart
    if (rsiSeriesRef.current) {
      const rsiData: LineData[] = chartData
        .filter(d => d.rsi)
        .map(d => ({ time: d.time, value: d.rsi! }));
      rsiSeriesRef.current.setData(rsiData);
    }

    if (rsiOverboughtRef.current && chartData.length > 0) {
      const overboughtData: LineData[] = chartData.map(d => ({
        time: d.time,
        value: 70,
      }));
      rsiOverboughtRef.current.setData(overboughtData);
    }

    if (rsiOversoldRef.current && chartData.length > 0) {
      const oversoldData: LineData[] = chartData.map(d => ({
        time: d.time,
        value: 30,
      }));
      rsiOversoldRef.current.setData(oversoldData);
    }

    // Update MACD chart
    if (macdHistogramRef.current) {
      const histogramData: HistogramData[] = chartData
        .filter(d => d.histogram !== undefined)
        .map(d => ({
          time: d.time,
          value: d.histogram!,
          color: d.histogram! >= 0 ? '#10b981' : '#ef4444',
        }));
      macdHistogramRef.current.setData(histogramData);
    }

    if (macdLineRef.current) {
      const macdData: LineData[] = chartData
        .filter(d => d.macd)
        .map(d => ({ time: d.time, value: d.macd! }));
      macdLineRef.current.setData(macdData);
    }

    if (macdSignalRef.current) {
      const signalData: LineData[] = chartData
        .filter(d => d.signal)
        .map(d => ({ time: d.time, value: d.signal! }));
      macdSignalRef.current.setData(signalData);
    }

    // Fit content
    mainChartRef.current?.timeScale().fitContent();
    rsiChartRef.current?.timeScale().fitContent();
    macdChartRef.current?.timeScale().fitContent();
  }, [chartData, showSMA, showBollinger]);

  // Load data on mount and timeframe change
  useEffect(() => {
    fetchChartData();
  }, [symbol, timeframe]);

  const getRSIStatus = (rsi: number) => {
    if (rsi >= 70) return { label: 'Overbought', color: 'text-red-400', bg: 'bg-red-400/20' };
    if (rsi <= 30) return { label: 'Oversold', color: 'text-green-400', bg: 'bg-green-400/20' };
    if (rsi >= 60) return { label: 'Bullish', color: 'text-blue-400', bg: 'bg-blue-400/20' };
    if (rsi <= 40) return { label: 'Bearish', color: 'text-orange-400', bg: 'bg-orange-400/20' };
    return { label: 'Neutral', color: 'text-[#3C3C3C]', bg: 'bg-gray-400/20' };
  };

  const rsiStatus = getRSIStatus(technical?.rsi || 50);
  const isPositive = changePercent > 0;

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-playful-green/5 via-blue-500/5 to-green-500/5 opacity-50" />

      <CardHeader className="relative z-10 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-[#1a1a1a]">
              {symbol} - {name}
            </CardTitle>
            <div className="flex items-center gap-10 mt-2">
              <div className="text-sm font-bold text-[#1a1a1a]">
                ${price.toFixed(2)}
              </div>
              <div className={cn(
                'flex items-center gap-1.5 text-sm font-semibold',
                isPositive ? 'text-green-400' : 'text-red-400'
              )}>
                {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
              </div>
              <Badge variant="secondary" className={cn('text-sm', rsiStatus.bg, rsiStatus.color)}>
                RSI: {technical?.rsi?.toFixed(1) || 'N/A'} - {rsiStatus.label}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {isLoading && <RefreshCw className="w-4 h-4 text-[#3C3C3C] animate-spin" />}
          </div>
        </div>

        {/* TradingView-style Timeframe Selector + Chart Controls - Compact fit */}
        <div className="flex items-center gap-2 mt-3 px-2.5 py-1.5 bg-white rounded-2xl border-2 border-black flex-wrap">
          {/* Minutes */}
          <div className="flex items-center gap-0.5">
            <span className="text-[10px] font-semibold text-[#5C5C5C] mr-0.5">MIN</span>
            {minuteTimeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={cn(
                  'px-1.5 py-0.5 text-[10px] font-semibold rounded-md transition-all',
                  timeframe === tf
                    ? 'bg-playful-orange text-white'
                    : 'text-[#5C5C5C] hover:bg-playful-cream'
                )}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Hours */}
          <div className="flex items-center gap-0.5">
            <span className="text-[10px] font-semibold text-[#5C5C5C] mr-0.5">HRS</span>
            {hourTimeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={cn(
                  'px-1.5 py-0.5 text-[10px] font-semibold rounded-md transition-all',
                  timeframe === tf
                    ? 'bg-playful-orange text-white'
                    : 'text-[#5C5C5C] hover:bg-playful-cream'
                )}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Days/Months */}
          <div className="flex items-center gap-0.5">
            <span className="text-[10px] font-semibold text-[#5C5C5C] mr-0.5">DAYS</span>
            {dayTimeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={cn(
                  'px-1.5 py-0.5 text-[10px] font-semibold rounded-md transition-all',
                  timeframe === tf
                    ? 'bg-playful-orange text-white'
                    : 'text-[#5C5C5C] hover:bg-playful-cream'
                )}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Load Full History Button - Only for minute/hourly timeframes */}
          {!hasFullHistory && ['1m', '5m', '15m', '30m', '1h'].includes(timeframe) && (
            <button
              onClick={loadFullHistory}
              disabled={isLoadingFullHistory}
              className="px-2 py-0.5 text-[10px] font-semibold rounded-md border-2 border-blue-600 bg-blue-600 text-white hover:bg-blue-700 hover:border-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-0.5"
            >
              {isLoadingFullHistory ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Activity className="w-3 h-3" />
                  Full ({timeframe === '1m' ? '7d' : timeframe === '1h' ? '2y' : '60d'})
                </>
              )}
            </button>
          )}

          {/* Vertical Separator */}
          <div className="h-5 w-px bg-[#5C5C5C]/30" />

          {/* Chart Control Buttons - Compact */}
          <Button
            size="sm"
            variant={showDrawingTools ? 'default' : 'outline'}
            onClick={() => setShowDrawingTools(!showDrawingTools)}
            className={cn(
              'h-6 px-2 border border-[#5C5C5C]/30 rounded-md text-[10px]',
              showDrawingTools && 'bg-playful-green text-white'
            )}
          >
            <Move className="w-3 h-3 mr-0.5" />
            Draw
          </Button>
          <Button
            size="sm"
            variant={showMeasureTools ? 'default' : 'outline'}
            onClick={() => setShowMeasureTools(!showMeasureTools)}
            className={cn(
              'h-6 px-2 border border-[#5C5C5C]/30 rounded-md text-[10px]',
              showMeasureTools && 'bg-playful-orange text-white'
            )}
          >
            <Ruler className="w-3 h-3 mr-0.5" />
            Measure
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowSMA(!showSMA)}
            className={cn(
              'h-6 px-2 border border-[#5C5C5C]/30 rounded-md text-[10px]',
              showSMA && 'bg-blue-500/20'
            )}
          >
            SMA
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowBollinger(!showBollinger)}
            className={cn(
              'h-6 px-2 border border-[#5C5C5C]/30 rounded-md text-[10px]',
              showBollinger && 'bg-playful-green/20'
            )}
          >
            BB
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 px-2 border border-[#5C5C5C]/30 rounded-md"
          >
            {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 p-3 space-y-3">
        {/* Drawing Tools Panel */}
        {showDrawingTools && (
          <div className="flex items-center gap-2.5 mb-3 p-3 bg-playful-cream rounded-2xl border-2 border-black flex-wrap">
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
          <div className="flex items-center gap-2.5 mb-3 p-3 bg-playful-cream rounded-2xl border-2 border-black flex-wrap">
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

        {/* Main Price Chart */}
        <div>
          <div className="text-sm text-[#3C3C3C] mb-2 flex items-center gap-2.5">
            <Activity className="w-3 h-3" />
            Price Chart with Volume
          </div>
          <div
            ref={mainChartContainerRef}
            className="bg-gray-900/50 rounded-lg border border-black/10/30 h-[400px]"
          />
        </div>

        {/* RSI Indicator */}
        <div>
          <div className="text-sm text-[#3C3C3C] mb-2">
            RSI (Relative Strength Index) - Current: {technical?.rsi?.toFixed(1) || 'N/A'}
          </div>
          <div
            ref={rsiChartContainerRef}
            className="bg-gray-900/50 rounded-lg border border-black/10/30 h-[150px]"
          />
        </div>

        {/* MACD Indicator */}
        <div>
          <div className="text-sm text-[#3C3C3C] mb-2">
            MACD - MACD: {technical?.macd?.macd?.toFixed(3) || 'N/A'} | Signal: {technical?.macd?.signal?.toFixed(3) || 'N/A'} | Hist: {technical?.macd?.histogram?.toFixed(3) || 'N/A'}
          </div>
          <div
            ref={macdChartContainerRef}
            className="bg-gray-900/50 rounded-lg border border-black/10/30 h-[150px]"
          />
        </div>

        {/* Technical Summary */}
        <div className="grid grid-cols-3 gap-10 pt-4 border-t border-black/10/30">
          <div className="text-center">
            <div className="text-sm text-[#3C3C3C]">SMA 20</div>
            <div className="text-sm font-semibold text-blue-400">${technical?.sma20?.toFixed(2) || 'N/A'}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-[#3C3C3C]">SMA 50</div>
            <div className="text-sm font-semibold text-orange-400">${technical?.sma50?.toFixed(2) || 'N/A'}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-[#3C3C3C]">SMA 200</div>
            <div className="text-sm font-semibold text-primary-400">${technical?.sma200?.toFixed(2) || 'N/A'}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MarketIndexChart;