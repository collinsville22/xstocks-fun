import React, { useState, useEffect } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { cn } from '../../../lib/utils';
import { ENV } from '../../../config/env';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Info,
  AlertCircle,
  Layers
} from 'lucide-react';

interface IVSurfacePoint {
  expiration: string;
  strike: number;
  type: 'CALL' | 'PUT';
  impliedVolatility: number;
  moneyness: number;
}

interface IVSummary {
  atmIV: number;
  meanIV: number;
  medianIV: number;
  minIV: number;
  maxIV: number;
  stdIV: number;
  ivRank: number;
  skew: number;
  skewInterpretation: 'PUT_SKEW' | 'CALL_SKEW' | 'BALANCED';
}

interface IVSurfaceData {
  symbol: string;
  realSymbol: string;
  currentPrice: number;
  summary: IVSummary;
  surface: IVSurfacePoint[];
  timestamp: number;
}

interface IVSurfaceProps {
  symbol: string;
  currentPrice: number;
  className?: string;
}

/**
 * Implied Volatility Surface Component
 * Features:
 * - IV by strike and expiration
 * - ATM IV calculation
 * - IV statistics (mean, median, min, max, std)
 * - IV rank (percentile)
 * - IV skew analysis (put skew vs call skew)
 * - 3D-style scatter visualization
 */
export const IVSurface: React.FC<IVSurfaceProps> = ({
  symbol,
  currentPrice,
  className
}) => {
  const [ivData, setIvData] = useState<IVSurfaceData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [viewMode, setViewMode] = useState<'all' | 'calls' | 'puts'>('all');

  // Fetch IV surface data
  const fetchIVSurface = async () => {
    if (!symbol) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${ENV.INTEL_API_URL}/api/options/implied-volatility/${symbol}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch IV surface: ${response.statusText}`);
      }

      const apiResponse = await response.json();
      setIvData(data);
    } catch (err) {
      console.error('Error fetching IV surface:', err);
      setError(err instanceof Error ? err.message : 'Failed to load IV surface');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIVSurface();
  }, [symbol]);

  // Filter surface data by view mode
  const filteredSurface = ivData?.surface.filter((point) => {
    if (viewMode === 'all') return true;
    if (viewMode === 'calls') return point.type === 'CALL';
    if (viewMode === 'puts') return point.type === 'PUT';
    return true;
  }) || [];

  // Prepare scatter chart data
  const scatterData = filteredSurface.map((point) => ({
    moneyness: point.moneyness,
    iv: point.impliedVolatility,
    strike: point.strike,
    type: point.type,
    expiration: new Date(point.expiration).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    // Size based on how far from ATM (smaller = closer to ATM)
    size: 100 + Math.abs(point.moneyness) * 10
  }));

  // Get color based on IV level
  const getIVColor = (iv: number) => {
    if (iv > 60) return '#ef4444'; // Red - Very High
    if (iv > 40) return '#f97316'; // Orange - High
    if (iv > 25) return '#f59e0b'; // Yellow - Moderate
    if (iv > 15) return '#3b82f6'; // Blue - Low
    return '#10b981'; // Green - Very Low
  };

  // Get skew interpretation
  const getSkewConfig = (skewInterpretation: string) => {
    switch (skewInterpretation) {
      case 'PUT_SKEW':
        return {
          color: 'text-red-400',
          bgColor: 'bg-playful-cream',
          borderColor: 'border-red-500/30',
          icon: TrendingDown,
          label: 'PUT SKEW',
          description: 'Downside protection expensive (fear in market)'
        };
      case 'CALL_SKEW':
        return {
          color: 'text-green-400',
          bgColor: 'bg-playful-cream',
          borderColor: 'border-green-500/30',
          icon: TrendingUp,
          label: 'CALL SKEW',
          description: 'Upside speculation expensive (greed in market)'
        };
      case 'BALANCED':
        return {
          color: 'text-[#3C3C3C]',
          bgColor: 'bg-playful-cream',
          borderColor: 'border-gray-500/30',
          icon: Activity,
          label: 'BALANCED',
          description: 'Symmetrical IV curve (neutral positioning)'
        };
      default:
        return {
          color: 'text-[#3C3C3C]',
          bgColor: 'bg-playful-cream',
          borderColor: 'border-gray-500/30',
          icon: Activity,
          label: 'UNKNOWN',
          description: ''
        };
    }
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      return (
        <div className="bg-white border-3 border-black rounded-lg p-3 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-10">
              <span className="text-sm text-[#3C3C3C]">Type:</span>
              <Badge
                variant="secondary"
                className={cn(
                  'text-sm',
                  point.type === 'CALL' ? 'bg-playful-cream text-green-400' : 'bg-playful-cream text-red-400'
                )}
              >
                {point.type}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-10">
              <span className="text-sm text-[#3C3C3C]">Strike:</span>
              <span className="text-[#1a1a1a] font-semibold">${point.strike.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between gap-10">
              <span className="text-sm text-[#3C3C3C]">Expiration:</span>
              <span className="text-[#1a1a1a]">{point.expiration}</span>
            </div>
            <div className="flex items-center justify-between gap-10">
              <span className="text-sm text-[#3C3C3C]">Moneyness:</span>
              <span className="text-blue-400 font-semibold">{point.moneyness.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between gap-10">
              <span className="text-sm text-[#3C3C3C]">IV:</span>
              <span className="text-primary-400 font-bold">{point.iv.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
        <CardContent className="p-3 text-center">
          <Activity className="w-12 h-12 mx-auto mb-3 text-primary-400 animate-pulse" />
          <p className="text-[#3C3C3C]">Loading IV surface...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
        <CardContent className="p-3 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
          <p className="text-red-400">{error}</p>
          <Button onClick={fetchIVSurface} variant="outline" size="sm" className="mt-3">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!ivData) {
    return (
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
        <CardContent className="p-3 text-center">
          <Activity className="w-12 h-12 mx-auto mb-3 text-[#3C3C3C]" />
          <p className="text-[#3C3C3C]">No IV surface data available</p>
        </CardContent>
      </Card>
    );
  }

  const skewConfig = getSkewConfig(ivData.summary.skewInterpretation);

  return (
    <div className={cn('space-y-3', className)}>
      {/* IV Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
        <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
          <CardContent className="p-3">
            <div className="flex items-center gap-2.5 mb-1">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-[#3C3C3C]">ATM IV</span>
            </div>
            <div className="text-sm font-bold text-[#1a1a1a]">{ivData.summary.atmIV.toFixed(1)}%</div>
            <div className="text-sm text-[#3C3C3C] mt-1">At-the-money</div>
          </CardContent>
        </Card>

        <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
          <CardContent className="p-3">
            <div className="flex items-center gap-2.5 mb-1">
              <Layers className="w-4 h-4 text-primary-400" />
              <span className="text-sm text-[#3C3C3C]">IV Rank</span>
            </div>
            <div className="text-sm font-bold text-[#1a1a1a]">{ivData.summary.ivRank.toFixed(0)}%</div>
            <div className="text-sm text-[#3C3C3C] mt-1">
              {ivData.summary.ivRank > 70 ? 'Very High' : ivData.summary.ivRank > 50 ? 'High' : ivData.summary.ivRank > 30 ? 'Moderate' : 'Low'}
            </div>
          </CardContent>
        </Card>

        <Card className={cn('border', skewConfig.borderColor, skewConfig.bgColor)}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2.5 mb-1">
              <skewConfig.icon className={cn('w-4 h-4', skewConfig.color)} />
              <span className="text-sm text-[#3C3C3C]">IV Skew</span>
            </div>
            <div className="text-sm font-bold text-[#1a1a1a]">{ivData.summary.skew.toFixed(1)}%</div>
            <Badge variant="secondary" className={cn('text-sm mt-1', skewConfig.bgColor, skewConfig.color)}>
              {skewConfig.label}
            </Badge>
          </CardContent>
        </Card>

        <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
          <CardContent className="p-3">
            <div className="flex items-center gap-2.5 mb-1">
              <TrendingUp className="w-4 h-4 text-orange-400" />
              <span className="text-sm text-[#3C3C3C]">Mean IV</span>
            </div>
            <div className="text-sm font-bold text-[#1a1a1a]">{ivData.summary.meanIV.toFixed(1)}%</div>
            <div className="text-sm text-[#3C3C3C] mt-1">
              Range: {ivData.summary.minIV.toFixed(1)}% - {ivData.summary.maxIV.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* IV Skew Interpretation */}
      <Card className={cn('border', skewConfig.borderColor, skewConfig.bgColor)}>
        <CardContent className="p-3">
          <div className="flex items-center gap-10">
            <skewConfig.icon className={cn('w-8 h-8', skewConfig.color)} />
            <div>
              <div className="font-semibold text-[#1a1a1a] mb-1">{skewConfig.label}</div>
              <div className="text-sm text-[#1a1a1a]">{skewConfig.description}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Button
                variant={viewMode === 'all' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('all')}
                className="text-sm"
              >
                All Options
              </Button>
              <Button
                variant={viewMode === 'calls' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('calls')}
                className="text-sm text-green-400"
              >
                Calls Only
              </Button>
              <Button
                variant={viewMode === 'puts' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('puts')}
                className="text-sm text-red-400"
              >
                Puts Only
              </Button>
            </div>

            <Button onClick={fetchIVSurface} variant="outline" size="sm" disabled={isLoading}>
              <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* IV Surface Scatter Plot */}
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2.5">
              <Activity className="w-5 h-5 text-primary-400" />
              Implied Volatility Surface
            </CardTitle>
            <div className="flex items-center gap-2.5 text-sm text-[#3C3C3C]">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>&gt;60%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span>40-60%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span>25-40%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>15-25%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>&lt;15%</span>
              </div>
            </div>
          </div>
          <p className="text-sm text-[#3C3C3C] mt-1">
            {scatterData.length} data points • X-axis: Moneyness (distance from current price) • Y-axis: Implied Volatility
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                type="number"
                dataKey="moneyness"
                name="Moneyness"
                unit="%"
                stroke="#9ca3af"
                style={{ fontSize: '14px' }}
                label={{
                  value: 'Moneyness (% from current price)',
                  position: 'bottom',
                  fill: '#9ca3af',
                  fontSize: 12
                }}
              />
              <YAxis
                type="number"
                dataKey="iv"
                name="IV"
                unit="%"
                stroke="#9ca3af"
                style={{ fontSize: '14px' }}
                label={{
                  value: 'Implied Volatility (%)',
                  angle: -90,
                  position: 'left',
                  fill: '#9ca3af',
                  fontSize: 12
                }}
              />
              <ZAxis type="number" dataKey="size" range={[50, 400]} />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />

              <Scatter name="Options" data={scatterData} fill="#3b82f6">
                {scatterData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getIVColor(entry.iv)}
                    fillOpacity={0.7}
                  />
                ))}
              </Scatter>

              <Legend wrapperStyle={{ fontSize: '14px' }} />
            </ScatterChart>
          </ResponsiveContainer>

          <div className="mt-3 p-3 bg-playful-cream border-2 border-black rounded-lg">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-primary-400 mt-0.5" />
              <div className="text-sm text-[#1a1a1a]">
                <p className="font-semibold text-[#1a1a1a] mb-1">How to Read This Chart:</p>
                <ul className="space-y-1 text-[#3C3C3C]">
                  <li>• <strong>X-axis (Moneyness)</strong>: Negative = ITM, 0 = ATM, Positive = OTM</li>
                  <li>• <strong>Y-axis (IV)</strong>: Higher IV = more expensive options</li>
                  <li>• <strong>Color</strong>: Shows IV level (red = very high, green = very low)</li>
                  <li>• <strong>Size</strong>: Larger dots = further from ATM</li>
                  <li>• <strong>Skew</strong>: Asymmetry in curve reveals market bias</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading Recommendations */}
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle className="text-sm">Trading Recommendations Based on IV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-10">
            <Badge
              variant="secondary"
              className={cn(
                'text-sm mt-0.5',
                ivData.summary.ivRank > 70 ? 'bg-playful-cream text-green-400' : 'bg-playful-cream text-[#3C3C3C]'
              )}
            >
              {ivData.summary.ivRank > 70 ? 'SELL' : 'WAIT'}
            </Badge>
            <div className="text-sm text-[#1a1a1a]">
              <p className="font-semibold text-[#1a1a1a]">High IV Rank (&gt;70%):</p>
              <p>Consider selling premium (covered calls, cash-secured puts, credit spreads). Options are expensive.</p>
            </div>
          </div>

          <div className="flex items-start gap-10">
            <Badge
              variant="secondary"
              className={cn(
                'text-sm mt-0.5',
                ivData.summary.ivRank < 30 ? 'bg-playful-cream text-blue-400' : 'bg-playful-cream text-[#3C3C3C]'
              )}
            >
              {ivData.summary.ivRank < 30 ? 'BUY' : 'WAIT'}
            </Badge>
            <div className="text-sm text-[#1a1a1a]">
              <p className="font-semibold text-[#1a1a1a]">Low IV Rank (&lt;30%):</p>
              <p>Consider buying options (long calls, long puts, debit spreads). Options are cheap.</p>
            </div>
          </div>

          <div className="flex items-start gap-10">
            <Badge
              variant="secondary"
              className={cn(
                'text-sm mt-0.5',
                ivData.summary.skewInterpretation === 'PUT_SKEW' ? 'bg-playful-cream text-red-400' : 'bg-playful-cream text-[#3C3C3C]'
              )}
            >
              {ivData.summary.skewInterpretation === 'PUT_SKEW' ? 'ALERT' : 'NORMAL'}
            </Badge>
            <div className="text-sm text-[#1a1a1a]">
              <p className="font-semibold text-[#1a1a1a]">Put Skew:</p>
              <p>Market fears downside. Downside protection is expensive. Consider selling OTM puts if confident.</p>
            </div>
          </div>

          <div className="flex items-start gap-10">
            <Badge
              variant="secondary"
              className={cn(
                'text-sm mt-0.5',
                ivData.summary.skewInterpretation === 'CALL_SKEW' ? 'bg-playful-cream text-green-400' : 'bg-playful-cream text-[#3C3C3C]'
              )}
            >
              {ivData.summary.skewInterpretation === 'CALL_SKEW' ? 'ALERT' : 'NORMAL'}
            </Badge>
            <div className="text-sm text-[#1a1a1a]">
              <p className="font-semibold text-[#1a1a1a]">Call Skew:</p>
              <p>Market expects upside. Upside speculation is expensive. Consider selling OTM calls if confident.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IVSurface;