import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, LineData, ColorType } from 'lightweight-charts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  LineChart,
  CandlestickChart,
  Activity,
  Eye,
  EyeOff,
  Settings,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minus,
  TrendingUpIcon,
  Circle,
  Square,
  Move,
  Type,
  Ruler,
  GitBranch
} from 'lucide-react';

interface AdvancedTradingChartProps {
  symbol: string;
  data: CandlestickData[];
  className?: string;
  height?: number;
  showVolume?: boolean;
  showIndicators?: boolean;
}

type ChartType = 'candlestick' | 'line' | 'area';
type TimeFrame = '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

interface Indicator {
  id: string;
  name: string;
  color: string;
  visible: boolean;
}

const AdvancedTradingChart: React.FC<AdvancedTradingChartProps> = ({
  symbol,
  data,
  className,
  height = 500,
  showVolume = true,
  showIndicators = true
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | ISeriesApi<'Area'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('1M');
  const [indicators, setIndicators] = useState<Indicator[]>([
    { id: 'sma20', name: 'SMA 20', color: '#7EC850', visible: false },
    { id: 'sma50', name: 'SMA 50', color: '#FF8C42', visible: false },
    { id: 'sma200', name: 'SMA 200', color: '#8B5CF6', visible: false },
    { id: 'ema', name: 'EMA 12', color: '#60A5FA', visible: false },
    { id: 'rsi', name: 'RSI (14)', color: '#F59E0B', visible: false },
    { id: 'macd', name: 'MACD', color: '#3B82F6', visible: false },
    { id: 'bb', name: 'Bollinger Bands', color: '#9CA3AF', visible: false },
    { id: 'stoch', name: 'Stochastic', color: '#EC4899', visible: false }
  ]);
  const [volumeVisible, setVolumeVisible] = useState(showVolume);
  const [fullscreen, setFullscreen] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [showDrawingTools, setShowDrawingTools] = useState(false);
  const [showMeasureTools, setShowMeasureTools] = useState(false);

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#FFFFFF' },
        textColor: '#1a1a1a',
        fontSize: 12,
        fontFamily: 'Fredoka, sans-serif',
      },
      grid: {
        vertLines: { color: '#E5E5E5', style: 1, visible: true },
        horzLines: { color: '#E5E5E5', style: 1, visible: true },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 2,
          color: '#7EC850',
          style: 1,
          labelBackgroundColor: '#7EC850',
        },
        horzLine: {
          width: 2,
          color: '#7EC850',
          style: 1,
          labelBackgroundColor: '#7EC850',
        },
      },
      rightPriceScale: {
        borderColor: '#1a1a1a',
        borderVisible: true,
      },
      timeScale: {
        borderColor: '#1a1a1a',
        borderVisible: true,
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: fullscreen ? window.innerHeight - 200 : height,
    });

    chartRef.current = chart;

    // Create main series based on chart type
    let series;
    if (chartType === 'candlestick') {
      series = (chart.addSeries({
        type: 'Candlestick',
        upColor: '#7EC850',
        downColor: '#EF4444',
        borderUpColor: '#7EC850',
        borderDownColor: '#EF4444',
        wickUpColor: '#7EC850',
        wickDownColor: '#EF4444',
      } as any) as any);
      series.setData(data);
    } else if (chartType === 'line') {
      series = (chart.addSeries({
        type: 'Line',
        color: '#7EC850',
        lineWidth: 2,
      } as any) as any);
      const lineData: LineData[] = data.map(d => ({
        time: d.time,
        value: d.close
      }));
      series.setData(lineData);
    } else {
      series = (chart.addSeries({
        type: 'Area',
        lineColor: '#7EC850',
        topColor: 'rgba(126, 200, 80, 0.4)',
        bottomColor: 'rgba(126, 200, 80, 0.0)',
        lineWidth: 2,
      } as any) as any);
      const areaData: LineData[] = data.map(d => ({
        time: d.time,
        value: d.close
      }));
      series.setData(areaData);
    }

    seriesRef.current = series;

    // Add volume series if enabled
    if (volumeVisible && 'volume' in data[0]) {
      const volumeSeries = chart.addSeries({
        type: 'Histogram',
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
      } as any) as any;

      volumeSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });

      const volumeData = data.map(d => ({
        time: d.time,
        value: (d as any).volume || 0,
        color: d.close >= d.open ? 'rgba(126, 200, 80, 0.5)' : 'rgba(239, 68, 68, 0.5)'
      }));

      volumeSeries.setData(volumeData);
      volumeSeriesRef.current = volumeSeries as any;
    }

    // Add indicators (SMA, EMA, etc.)
    indicators.forEach(indicator => {
      if (indicator.visible) {
        const indicatorSeries = (chart.addSeries({
          type: 'Line',
          color: indicator.color,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        } as any) as any);

        // Calculate indicator values (simplified for demo)
        let indicatorData: LineData[] = [];
        if (indicator.id.startsWith('sma')) {
          const period = parseInt(indicator.id.replace('sma', ''));
          indicatorData = calculateSMA(data, period);
        } else if (indicator.id === 'ema') {
          indicatorData = calculateEMA(data, 12);
        }

        indicatorSeries.setData(indicatorData);
      }
    });

    // Fit content
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: fullscreen ? window.innerHeight - 200 : height,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, chartType, timeFrame, volumeVisible, indicators, fullscreen, height]);

  const calculateSMA = (data: CandlestickData[], period: number): LineData[] => {
    const smaData: LineData[] = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, d) => acc + d.close, 0);
      smaData.push({
        time: data[i].time,
        value: sum / period
      });
    }
    return smaData;
  };

  const calculateEMA = (data: CandlestickData[], period: number): LineData[] => {
    const emaData: LineData[] = [];
    const multiplier = 2 / (period + 1);
    let ema = data[0].close;

    emaData.push({ time: data[0].time, value: ema });

    for (let i = 1; i < data.length; i++) {
      ema = (data[i].close - ema) * multiplier + ema;
      emaData.push({ time: data[i].time, value: ema });
    }

    return emaData;
  };

  const toggleIndicator = (indicatorId: string) => {
    setIndicators(prev =>
      prev.map(ind =>
        ind.id === indicatorId ? { ...ind, visible: !ind.visible } : ind
      )
    );
  };

  const handleZoomIn = () => {
    if (chartRef.current) {
      const timeScale = chartRef.current.timeScale();
      const visibleRange = timeScale.getVisibleLogicalRange();
      if (visibleRange) {
        const newFrom = visibleRange.from + (visibleRange.to - visibleRange.from) * 0.1;
        const newTo = visibleRange.to - (visibleRange.to - visibleRange.from) * 0.1;
        timeScale.setVisibleLogicalRange({ from: newFrom, to: newTo });
      }
    }
  };

  const handleZoomOut = () => {
    if (chartRef.current) {
      const timeScale = chartRef.current.timeScale();
      const visibleRange = timeScale.getVisibleLogicalRange();
      if (visibleRange) {
        const newFrom = visibleRange.from - (visibleRange.to - visibleRange.from) * 0.1;
        const newTo = visibleRange.to + (visibleRange.to - visibleRange.from) * 0.1;
        timeScale.setVisibleLogicalRange({ from: Math.max(0, newFrom), to: newTo });
      }
    }
  };

  const handleFitContent = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  };

  const timeFrames: TimeFrame[] = ['1D', '5D', '1M', '3M', '6M', '1Y', 'ALL'];

  return (
    <Card className={cn('glass-card border-3 border-black', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-10">
          <CardTitle className="text-[#1a1a1a] flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-playful-green" />
            {symbol} Chart
          </CardTitle>

          <div className="flex items-center gap-10 flex-wrap">
            {/* Chart Type Selector */}
            <div className="flex items-center gap-1.5 bg-playful-cream rounded-2xl p-1 border-2 border-black">
              <Button
                size="sm"
                variant={chartType === 'candlestick' ? 'default' : 'ghost'}
                onClick={() => setChartType('candlestick')}
                className={cn(
                  'h-8 px-3',
                  chartType === 'candlestick'
                    ? 'bg-playful-green text-white border-2 border-black'
                    : 'text-[#1a1a1a] hover:bg-white'
                )}
              >
                <CandlestickChart className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={chartType === 'line' ? 'default' : 'ghost'}
                onClick={() => setChartType('line')}
                className={cn(
                  'h-8 px-3',
                  chartType === 'line'
                    ? 'bg-playful-green text-white border-2 border-black'
                    : 'text-[#1a1a1a] hover:bg-white'
                )}
              >
                <LineChart className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={chartType === 'area' ? 'default' : 'ghost'}
                onClick={() => setChartType('area')}
                className={cn(
                  'h-8 px-3',
                  chartType === 'area'
                    ? 'bg-playful-green text-white border-2 border-black'
                    : 'text-[#1a1a1a] hover:bg-white'
                )}
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
            </div>

            {/* Time Frame Selector */}
            <div className="flex items-center gap-1.5 bg-playful-cream rounded-2xl p-1 border-2 border-black">
              {timeFrames.map(tf => (
                <Button
                  key={tf}
                  size="sm"
                  variant={timeFrame === tf ? 'default' : 'ghost'}
                  onClick={() => setTimeFrame(tf)}
                  className={cn(
                    'h-8 px-3 text-sm font-semibold',
                    timeFrame === tf
                      ? 'bg-playful-orange text-white border-2 border-black'
                      : 'text-[#1a1a1a] hover:bg-white'
                  )}
                >
                  {tf}
                </Button>
              ))}
            </div>

            {/* Drawing Tools */}
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant={showDrawingTools ? 'default' : 'outline'}
                onClick={() => setShowDrawingTools(!showDrawingTools)}
                className={cn(
                  'h-8 border-2 border-black rounded-xl',
                  showDrawingTools && 'bg-playful-green text-white'
                )}
              >
                <Move className="w-4 h-4" />
                <span className="ml-2 text-sm">Draw</span>
              </Button>

              <Button
                size="sm"
                variant={showMeasureTools ? 'default' : 'outline'}
                onClick={() => setShowMeasureTools(!showMeasureTools)}
                className={cn(
                  'h-8 border-2 border-black rounded-xl',
                  showMeasureTools && 'bg-playful-orange text-white'
                )}
              >
                <Ruler className="w-4 h-4" />
                <span className="ml-2 text-sm">Measure</span>
              </Button>
            </div>

            {/* Tools */}
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setVolumeVisible(!volumeVisible)}
                className="h-8 border-2 border-black rounded-xl"
              >
                {volumeVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                <span className="ml-2 text-sm">Volume</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleZoomIn}
                className="h-8 border-2 border-black rounded-xl"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleZoomOut}
                className="h-8 border-2 border-black rounded-xl"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleFitContent}
                className="h-8 border-2 border-black rounded-xl"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Drawing Tools Panel */}
        {showDrawingTools && (
          <div className="flex items-center gap-2.5 mt-3 p-3 bg-playful-cream rounded-2xl border-2 border-black flex-wrap">
            <span className="text-sm font-semibold text-[#1a1a1a]">Drawing Tools:</span>
            <Button
              size="sm"
              variant={activeTool === 'trendline' ? 'default' : 'outline'}
              onClick={() => setActiveTool(activeTool === 'trendline' ? null : 'trendline')}
              className={cn(
                'h-7 px-3 text-sm border-2 border-black rounded-xl',
                activeTool === 'trendline'
                  ? 'bg-playful-green text-white'
                  : 'bg-white text-[#1a1a1a] hover:bg-playful-cream'
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
                activeTool === 'horizontal'
                  ? 'bg-playful-green text-white'
                  : 'bg-white text-[#1a1a1a] hover:bg-playful-cream'
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
                activeTool === 'channel'
                  ? 'bg-playful-green text-white'
                  : 'bg-white text-[#1a1a1a] hover:bg-playful-cream'
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
                activeTool === 'rectangle'
                  ? 'bg-playful-green text-white'
                  : 'bg-white text-[#1a1a1a] hover:bg-playful-cream'
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
                activeTool === 'circle'
                  ? 'bg-playful-green text-white'
                  : 'bg-white text-[#1a1a1a] hover:bg-playful-cream'
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
                activeTool === 'text'
                  ? 'bg-playful-green text-white'
                  : 'bg-white text-[#1a1a1a] hover:bg-playful-cream'
              )}
            >
              <Type className="w-4 h-4 mr-1.5" />
              Text
            </Button>
          </div>
        )}

        {/* Measure Tools Panel */}
        {showMeasureTools && (
          <div className="flex items-center gap-2.5 mt-3 p-3 bg-playful-cream rounded-2xl border-2 border-black flex-wrap">
            <span className="text-sm font-semibold text-[#1a1a1a]">Measure & Analysis:</span>
            <Button
              size="sm"
              variant={activeTool === 'fibonacci' ? 'default' : 'outline'}
              onClick={() => setActiveTool(activeTool === 'fibonacci' ? null : 'fibonacci')}
              className={cn(
                'h-7 px-3 text-sm border-2 border-black rounded-xl',
                activeTool === 'fibonacci'
                  ? 'bg-playful-orange text-white'
                  : 'bg-white text-[#1a1a1a] hover:bg-playful-cream'
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
                activeTool === 'fibextension'
                  ? 'bg-playful-orange text-white'
                  : 'bg-white text-[#1a1a1a] hover:bg-playful-cream'
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
                activeTool === 'measure'
                  ? 'bg-playful-orange text-white'
                  : 'bg-white text-[#1a1a1a] hover:bg-playful-cream'
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
                activeTool === 'pitchfork'
                  ? 'bg-playful-orange text-white'
                  : 'bg-white text-[#1a1a1a] hover:bg-playful-cream'
              )}
            >
              <TrendingUp className="w-4 h-4 mr-1.5" />
              Pitchfork
            </Button>
          </div>
        )}

        {/* Indicators */}
        {showIndicators && (
          <div className="flex items-center gap-2.5 mt-3 flex-wrap">
            <span className="text-sm font-semibold text-[#3C3C3C]">Indicators:</span>
            {indicators.map(indicator => (
              <Button
                key={indicator.id}
                size="sm"
                variant={indicator.visible ? 'default' : 'outline'}
                onClick={() => toggleIndicator(indicator.id)}
                className={cn(
                  'h-7 px-3 text-sm border-2 border-black rounded-xl',
                  indicator.visible
                    ? 'bg-white text-[#1a1a1a]'
                    : 'bg-transparent text-[#3C3C3C] hover:bg-white'
                )}
              >
                <div
                  className="w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: indicator.color }}
                />
                {indicator.name}
              </Button>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-3">
        {/* Active Tool Indicator */}
        {activeTool && (
          <div className="mb-3 p-3 bg-gradient-to-r from-playful-green/20 to-playful-orange/20 rounded-2xl border-2 border-black">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Badge className="bg-playful-green text-white border-2 border-black">
                  Tool Active
                </Badge>
                <span className="text-sm font-semibold text-[#1a1a1a]">
                  {activeTool === 'trendline' && '📈 Trend Line: Click two points to draw'}
                  {activeTool === 'horizontal' && '📊 Horizontal Line: Click to place support/resistance'}
                  {activeTool === 'channel' && '📉 Channel: Click to define parallel trend lines'}
                  {activeTool === 'rectangle' && '⬜ Rectangle: Drag to mark price zones'}
                  {activeTool === 'circle' && '⭕ Circle: Mark key chart patterns'}
                  {activeTool === 'text' && '📝 Text: Click to add annotations'}
                  {activeTool === 'fibonacci' && '🔢 Fibonacci: Click high and low points'}
                  {activeTool === 'fibextension' && '📐 Fib Extension: Define three points for projection'}
                  {activeTool === 'measure' && '📏 Measure: Calculate price and time distance'}
                  {activeTool === 'pitchfork' && '🔱 Pitchfork: Click three pivot points'}
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

        <div
          ref={chartContainerRef}
          className="w-full rounded-2xl border-2 border-black overflow-hidden bg-white"
        />
      </CardContent>
    </Card>
  );
};

export { AdvancedTradingChart };
export type { CandlestickData };
