import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { cn } from '../../../lib/utils';
import { ENV } from '../../../config/env';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw,
  Info,
  AlertCircle,
  Calendar,
  Target,
  Zap
} from 'lucide-react';

interface IVDataPoint {
  date: string;
  atmIV: number;
  ivRank: number;
  ivPercentile: number;
  highIV: number;
  lowIV: number;
  volume: number;
}

interface IVStatistics {
  current: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  ivRank: number;
  ivPercentile: number;
  interpretation: 'VERY_HIGH' | 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW';
}

interface HistoricalIVData {
  symbol: string;
  currentPrice: number;
  history30Day: IVDataPoint[];
  history60Day: IVDataPoint[];
  history90Day: IVDataPoint[];
  statistics: IVStatistics;
  timestamp: number;
}

interface HistoricalIVRankProps {
  symbol: string;
  className?: string;
}

/**
 * Historical IV Rank Component
 * Features:
 * - 30/60/90 day IV history
 * - IV Rank (0-100 percentile)
 * - IV Percentile calculation
 * - Mean reversion analysis
 * - High/Low IV ranges
 * - Volume correlation
 * - Trading recommendations based on IV
 */
export const HistoricalIVRank: React.FC<HistoricalIVRankProps> = ({
  symbol,
  className
}) => {
  const [ivData, setIvData] = useState<HistoricalIVData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [timeframe, setTimeframe] = useState<'30' | '60' | '90'>('30');

  // Fetch historical IV data
  const fetchHistoricalIV = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${ENV.INTEL_API_URL}/api/options/historical-iv/${symbol}?days=${timeframe}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch historical IV: ${response.statusText}`);
      }

      const apiResponse = await response.json();
      setIvData(apiResponse);
    } catch (err) {
      console.error('Error fetching historical IV:', err);
      setError(err instanceof Error ? err.message : 'Failed to load historical IV');
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    fetchHistoricalIV();
  }, [symbol, timeframe]);

  // Get interpretation config
  const getInterpretationConfig = (interpretation: IVStatistics['interpretation']) => {
    switch (interpretation) {
      case 'VERY_HIGH':
        return {
          color: 'text-red-400',
          bgColor: 'bg-playful-cream',
          borderColor: 'border-red-500/30',
          icon: TrendingUp,
          label: 'VERY HIGH IV',
          description: 'IV in top 20% of range. Consider selling premium strategies.',
          action: 'SELL OPTIONS'
        };
      case 'HIGH':
        return {
          color: 'text-orange-400',
          bgColor: 'bg-playful-cream',
          borderColor: 'border-orange-500/30',
          icon: TrendingUp,
          label: 'HIGH IV',
          description: 'IV elevated. Good for credit spreads and covered calls.',
          action: 'SELL PREMIUM'
        };
      case 'LOW':
        return {
          color: 'text-blue-400',
          bgColor: 'bg-playful-cream',
          borderColor: 'border-blue-500/30',
          icon: TrendingDown,
          label: 'LOW IV',
          description: 'IV below average. Consider buying options strategies.',
          action: 'BUY OPTIONS'
        };
      case 'VERY_LOW':
        return {
          color: 'text-green-400',
          bgColor: 'bg-playful-cream',
          borderColor: 'border-green-500/30',
          icon: TrendingDown,
          label: 'VERY LOW IV',
          description: 'IV in bottom 20%. Excellent for buying debit spreads.',
          action: 'BUY SPREADS'
        };
      default:
        return {
          color: 'text-[#3C3C3C]',
          bgColor: 'bg-playful-cream',
          borderColor: 'border-gray-500/30',
          icon: Activity,
          label: 'MODERATE IV',
          description: 'IV near historical average. Neutral positioning.',
          action: 'NEUTRAL'
        };
    }
  };

  const getHistoryByTimeframe = () => {
    if (!ivData) return [];
    switch (timeframe) {
      case '30': return ivData.history30Day;
      case '60': return ivData.history60Day;
      case '90': return ivData.history90Day;
      default: return ivData.history30Day;
    }
  };

  const history = getHistoryByTimeframe();

  if (isLoading && !ivData) {
    return (
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
        <CardContent className="p-3 text-center">
          <Activity className="w-12 h-12 mx-auto mb-3 text-primary-400 animate-pulse" />
          <p className="text-[#3C3C3C]">Loading historical IV data...</p>
        </CardContent>
      </Card>
    );
  }

  if (error && !ivData) {
    return (
      <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
        <CardContent className="p-3 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
          <p className="text-red-400">{error}</p>
          <Button onClick={fetchHistoricalIV} variant="outline" size="sm" className="mt-3">
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
          <p className="text-[#3C3C3C]">No historical IV data available</p>
        </CardContent>
      </Card>
    );
  }

  const config = getInterpretationConfig(ivData.statistics.interpretation);
  const IconComponent = config.icon;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header Controls */}
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#1a1a1a] flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-primary-400" />
                Historical IV Rank - {symbol}
              </h3>
              <p className="text-sm text-[#3C3C3C] mt-1">
                Track implied volatility over time and identify mean reversion opportunities
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant={timeframe === '30'  ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeframe('30')}
                className="text-sm"
              >
                30 Days
              </Button>
              <Button
                variant={timeframe === '60'  ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeframe('60')}
                className="text-sm"
              >
                60 Days
              </Button>
              <Button
                variant={timeframe === '90'  ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeframe('90')}
                className="text-sm"
              >
                90 Days
              </Button>

              <Button onClick={fetchHistoricalIV} variant="outline" size="sm" disabled={isLoading}>
                <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* IV Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
        <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
          <CardContent className="p-3">
            <div className="flex items-center gap-2.5 mb-1">
              <Activity className="w-4 h-4 text-primary-400" />
              <span className="text-sm text-[#3C3C3C]">Current IV</span>
            </div>
            <div className="text-sm font-bold text-[#1a1a1a]">
              {ivData.statistics.current.toFixed(1)}%
            </div>
            <div className="text-sm text-[#3C3C3C] mt-1">At-the-money</div>
          </CardContent>
        </Card>

        <Card className={cn('border', config.borderColor, config.bgColor)}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2.5 mb-1">
              <Target className={cn('w-4 h-4', config.color)} />
              <span className="text-sm text-[#3C3C3C]">IV Rank</span>
            </div>
            <div className={cn('text-sm font-bold', config.color)}>
              {ivData.statistics.ivRank.toFixed(0)}
            </div>
            <div className="text-sm text-[#3C3C3C] mt-1">
              {config.label}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
          <CardContent className="p-3">
            <div className="flex items-center gap-2.5 mb-1">
              <Zap className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-[#3C3C3C]">IV Percentile</span>
            </div>
            <div className="text-sm font-bold text-[#1a1a1a]">
              {ivData.statistics.ivPercentile.toFixed(0)}
            </div>
            <div className="text-sm text-[#3C3C3C] mt-1">
              Days below current
            </div>
          </CardContent>
        </Card>

        <Card className="bg-playful-cream border-2 border-black">
          <CardContent className="p-3">
            <div className="flex items-center gap-2.5 mb-1">
              <Activity className="w-4 h-4 text-[#3C3C3C]" />
              <span className="text-sm text-[#3C3C3C]">Mean IV</span>
            </div>
            <div className="text-sm font-bold text-[#1a1a1a]">
              {ivData.statistics.mean.toFixed(1)}%
            </div>
            <div className="text-sm text-[#3C3C3C] mt-1">
              {timeframe}-day average
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interpretation Card */}
      <Card className={cn('border', config.borderColor, config.bgColor)}>
        <CardContent className="p-3">
          <div className="flex items-start gap-10">
            <IconComponent className={cn('w-8 h-8', config.color)} />
            <div className="flex-1">
              <div className="flex items-center gap-2.5 mb-2">
                <h4 className="font-semibold text-[#1a1a1a]">{config.label}</h4>
                <Badge variant="outline" className={cn('text-sm', config.bgColor, config.color)}>
                  {config.action}
                </Badge>
              </div>
              <p className="text-sm text-[#1a1a1a]">{config.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* IV History Chart */}
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-primary-400" />
            Implied Volatility History ({timeframe} Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={history} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                style={{ fontSize: '13px' }}
                label={{ value: 'Date', position: 'bottom', fill: '#9ca3af', fontSize: 11 }}
                tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis
                stroke="#9ca3af"
                style={{ fontSize: '13px' }}
                label={{ value: 'Implied Volatility (%)', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 11 }}
                tickFormatter={(value) => `${value.toFixed(0)}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '2px solid #000000',
                  borderRadius: '8px'
                }}
                labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                formatter={(value: number) => [`${value.toFixed(2)}%`, 'IV']}
              />
              <Legend wrapperStyle={{ fontSize: '14px' }} />

              {/* Mean line */}
              <ReferenceLine
                y={ivData.statistics.mean}
                stroke="#6b7280"
                strokeDasharray="5 5"
                label={{ value: `Mean: ${ivData.statistics.mean.toFixed(1)}%`, fill: '#6b7280', fontSize: 10 }}
              />

              {/* High/Low bands */}
              <ReferenceLine y={ivData.statistics.min} stroke="#3b82f6" strokeDasharray="2 2" opacity={0.5} />
              <ReferenceLine y={ivData.statistics.max} stroke="#ef4444" strokeDasharray="2 2" opacity={0.5} />

              <Area
                type="monotone"
                dataKey="atmIV"
                name="ATM IV"
                stroke="#8b5cf6"
                fill="url(#colorIV)"
                strokeWidth={2}
                fillOpacity={0.6}
              />

              <defs>
                <linearGradient id="colorIV" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.2}/>
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>

          <div className="mt-3 p-3 bg-playful-cream border-2 border-black rounded-lg">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-primary-400 mt-0.5" />
              <div className="text-sm text-[#1a1a1a]">
                <p className="font-semibold text-[#1a1a1a] mb-1">How to Read IV History:</p>
                <ul className="space-y-1 text-[#3C3C3C]">
                  <li>• <strong>Gray dashed line:</strong> Mean IV over {timeframe} days</li>
                  <li>• <strong>Blue dashed line:</strong> Minimum IV (bottom of range)</li>
                  <li>• <strong>Red dashed line:</strong> Maximum IV (top of range)</li>
                  <li>• <strong>Current position:</strong> Where IV is now relative to historical range</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* IV Rank Gauge */}
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2.5">
            <Target className="w-5 h-5 text-blue-400" />
            IV Rank Gauge (0-100)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative h-40">
            {/* Gauge Background */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 200 120">
                {/* Background arc */}
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="#374151"
                  strokeWidth="20"
                  strokeLinecap="round"
                />

                {/* Color segments */}
                <path
                  d="M 20 100 A 80 80 0 0 1 68 32"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="20"
                  strokeLinecap="round"
                  opacity="0.7"
                />
                <path
                  d="M 68 32 A 80 80 0 0 1 100 20"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="20"
                  strokeLinecap="round"
                  opacity="0.7"
                />
                <path
                  d="M 100 20 A 80 80 0 0 1 132 32"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="20"
                  strokeLinecap="round"
                  opacity="0.7"
                />
                <path
                  d="M 132 32 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="20"
                  strokeLinecap="round"
                  opacity="0.7"
                />

                {/* Needle */}
                <g transform={`rotate(${-90 + (ivData.statistics.ivRank / 100) * 180}, 100, 100)`}>
                  <line
                    x1="100"
                    y1="100"
                    x2="100"
                    y2="35"
                    stroke={config.color.replace('text-', '#')}
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <circle cx="100" cy="100" r="8" fill="#ffffff" />
                </g>
              </svg>
            </div>

            {/* Labels */}
            <div className="absolute bottom-0 left-0 text-sm text-green-400">Very Low (0-20)</div>
            <div className="absolute bottom-0 left-1/4 text-sm text-blue-400">Low (20-40)</div>
            <div className="absolute bottom-0 right-1/4 text-sm text-orange-400">High (60-80)</div>
            <div className="absolute bottom-0 right-0 text-sm text-red-400">Very High (80-100)</div>

            {/* Current Value */}
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-center">
              <div className={cn('text-sm font-bold', config.color)}>
                {ivData.statistics.ivRank.toFixed(0)}
              </div>
              <div className="text-sm text-[#3C3C3C]">IV Rank</div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-10">
            <div className="p-3 bg-playful-cream border-2 border-black rounded-lg">
              <div className="text-sm text-[#3C3C3C] mb-1">Range</div>
              <div className="text-sm font-semibold text-[#1a1a1a]">
                {ivData.statistics.min.toFixed(1)}% - {ivData.statistics.max.toFixed(1)}%
              </div>
              <div className="text-sm text-[#3C3C3C] mt-1">
                {timeframe}-day min/max
              </div>
            </div>

            <div className="p-3 bg-playful-cream border-2 border-black rounded-lg">
              <div className="text-sm text-[#3C3C3C] mb-1">Standard Deviation</div>
              <div className="text-sm font-semibold text-[#1a1a1a]">
                ±{ivData.statistics.stdDev.toFixed(1)}%
              </div>
              <div className="text-sm text-[#3C3C3C] mt-1">
                Volatility of IV
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading Strategy Recommendations */}
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle className="text-sm">Trading Strategies Based on IV Rank</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-10">
            <Badge
              variant="outline"
              className={cn(
                'text-sm mt-0.5',
                ivData.statistics.ivRank > 70 ? 'bg-playful-cream text-green-400' : 'bg-playful-cream text-[#3C3C3C]'
              )}
            >
              {ivData.statistics.ivRank > 70 ? 'ACTIVE' : 'WAIT'}
            </Badge>
            <div className="text-sm text-[#1a1a1a]">
              <p className="font-semibold text-[#1a1a1a]">High IV Rank (&gt;70):</p>
              <p>
                Sell premium strategies: Covered calls, cash-secured puts, credit spreads, iron condors.
                Options are expensive - collect premium and let IV crush work in your favor.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-10">
            <Badge
              variant="outline"
              className={cn(
                'text-sm mt-0.5',
                ivData.statistics.ivRank < 30 ? 'bg-playful-cream text-blue-400' : 'bg-playful-cream text-[#3C3C3C]'
              )}
            >
              {ivData.statistics.ivRank < 30 ? 'ACTIVE' : 'WAIT'}
            </Badge>
            <div className="text-sm text-[#1a1a1a]">
              <p className="font-semibold text-[#1a1a1a]">Low IV Rank (&lt;30):</p>
              <p>
                Buy options strategies: Long calls, long puts, debit spreads, calendars.
                Options are cheap - buy delta and benefit from potential IV expansion.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-10">
            <Badge variant="outline" className="text-sm mt-0.5 bg-playful-cream text-yellow-400">
              CAUTION
            </Badge>
            <div className="text-sm text-[#1a1a1a]">
              <p className="font-semibold text-[#1a1a1a]">Mean Reversion:</p>
              <p>
                IV tends to revert to the mean. When IV Rank is extreme (very high or very low),
                expect potential mean reversion. Position accordingly and manage risk.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Educational Info */}
      <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
        <CardContent className="p-3">
          <div className="flex items-start gap-10">
            <Info className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-[#1a1a1a] space-y-1">
              <p className="font-semibold text-[#1a1a1a]">Understanding IV Rank & Percentile:</p>
              <p><strong>IV Rank:</strong> Where current IV sits in the min-max range over lookback period. Formula: (Current IV - Min IV) / (Max IV - Min IV) × 100</p>
              <p><strong>IV Percentile:</strong> Percentage of days where IV was below current level. More robust than IV Rank for long-term analysis.</p>
              <p><strong>Mean Reversion:</strong> IV tends to oscillate around historical mean. Extreme IV often reverts to average.</p>
              <p><strong>Trading Rule:</strong> Sell options when IV Rank &gt; 50, buy options when IV Rank &lt; 50. Adjust based on your strategy.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HistoricalIVRank;
