import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { cn } from '../../../lib/utils';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Zap,
  Clock,
  RefreshCw,
  AlertTriangle,
  Activity,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Info
} from 'lucide-react';
import { ENV } from '../../../config/env';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';

interface UnusualActivityAlert {
  symbol: string;
  type: 'CALL' | 'PUT';
  strike: number;
  expiration: string;
  volume: number;
  openInterest: number;
  volumeOIRatio: number;
  impliedVolatility: number;
  lastPrice: number;
  percentChange: number;
  timestamp?: number;
}

interface UnusualActivityData {
  unusualActivity: UnusualActivityAlert[];
  count: number;
  timestamp: number;
}

interface FlowData {
  totalCallVolume: number;
  totalPutVolume: number;
  totalCallPremium: number;
  totalPutPremium: number;
  netFlow: number;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  callPutRatio: number;
  recentTrades: UnusualActivityAlert[];
  topTradesByPremium: Array<UnusualActivityAlert & { premium: number }>;
  hourlyFlow: Array<{
    time: string;
    callVolume: number;
    putVolume: number;
    callPremium: number;
    putPremium: number;
  }>;
}

interface OptionsFlowProps {
  className?: string;
}

/**
 * Options Flow Component
 * Features:
 * - Real-time flow of large options trades
 * - Call vs Put flow visualization (volume and premium)
 * - Flow direction indicators (bullish/bearish)
 * - Time-series visualization of options flow
 * - Premium spent on calls vs puts
 * - Sentiment gauge based on flow
 * - Top trades by premium size
 * - Live feed-style layout for recent trades
 */
export const OptionsFlow: React.FC<OptionsFlowProps> = ({ className }) => {
  const [flowData, setFlowData] = useState<FlowData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [timeFilter, setTimeFilter] = useState<'hour' | 'day' | 'week'>('day');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // Fetch and process unusual activity data to create flow metrics
  const fetchOptionsFlow = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${ENV.INTEL_API_URL}/api/options/unusual-activity`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch options flow: ${response.statusText}`);
      }

      const data: UnusualActivityData = await response.json();
      console.log(' Options Flow - Raw data:', data);

      // If backend is still scanning, retry after 5 seconds
      if ((data as any).status === 'scanning') {
        console.log('⏳ Backend still scanning, will retry in 5 seconds...');
        setTimeout(() => fetchOptionsFlow(), 5000);
        setIsLoading(false);
        return;
      }

      // Process data to create flow metrics
      const processedFlow = processFlowData(data);
      console.log(' Options Flow - Processed flow:', processedFlow);
      setFlowData(processedFlow);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching options flow:', err);
      setError(err instanceof Error ? err.message : 'Failed to load options flow');
    } finally {
      setIsLoading(false);
    }
  };

  // Process unusual activity data into flow metrics
  const processFlowData = (data: UnusualActivityData): FlowData => {
    const calls = data.unusualActivity.filter(a => a.type === 'CALL');
    const puts = data.unusualActivity.filter(a => a.type === 'PUT');

    // Calculate volumes
    const totalCallVolume = calls.reduce((sum, c) => sum + c.volume, 0);
    const totalPutVolume = puts.reduce((sum, p) => sum + p.volume, 0);

    // Calculate premiums (volume * lastPrice * 100 per contract)
    const totalCallPremium = calls.reduce((sum, c) => sum + (c.volume * c.lastPrice * 100), 0);
    const totalPutPremium = puts.reduce((sum, p) => sum + (p.volume * p.lastPrice * 100), 0);

    // Calculate net flow and sentiment
    const netFlow = totalCallPremium - totalPutPremium;
    const callPutRatio = totalPutVolume > 0 ? totalCallVolume / totalPutVolume : totalCallVolume;

    let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (callPutRatio > 1.5) sentiment = 'BULLISH';
    else if (callPutRatio < 0.67) sentiment = 'BEARISH';

    // Sort by recency (most recent first) for feed
    const recentTrades = [...data.unusualActivity]
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);

    // Calculate premium for each trade and sort by size
    const tradesWithPremium = data.unusualActivity.map(trade => ({
      ...trade,
      premium: trade.volume * trade.lastPrice * 100
    }));
    const topTradesByPremium = tradesWithPremium
      .sort((a, b) => b.premium - a.premium)
      .slice(0, 5);

    // Generate hourly flow data (simulated for demonstration)
    const hourlyFlow = generateHourlyFlow(calls, puts);

    return {
      totalCallVolume,
      totalPutVolume,
      totalCallPremium,
      totalPutPremium,
      netFlow,
      sentiment,
      callPutRatio,
      recentTrades,
      topTradesByPremium,
      hourlyFlow
    };
  };

  // Generate hourly flow data for time-series chart using actual timestamps
  const generateHourlyFlow = (
    calls: UnusualActivityAlert[],
    puts: UnusualActivityAlert[]
  ) => {
    const hours = ['9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm'];
    const now = Date.now();
    const marketOpenHour = 9; // 9 AM

    return hours.map((time, index) => {
      const hourStart = new Date();
      hourStart.setHours(marketOpenHour + index, 0, 0, 0);
      const hourEnd = new Date(hourStart);
      hourEnd.setHours(hourEnd.getHours() + 1);

      const hourStartMs = hourStart.getTime();
      const hourEndMs = hourEnd.getTime();

      // Filter calls and puts that have timestamps within this hour
      const callsInHour = calls.filter(c =>
        c.timestamp && c.timestamp >= hourStartMs && c.timestamp < hourEndMs
      );
      const putsInHour = puts.filter(p =>
        p.timestamp && p.timestamp >= hourStartMs && p.timestamp < hourEndMs
      );

      return {
        time,
        callVolume: callsInHour.reduce((sum, c) => sum + c.volume, 0),
        putVolume: putsInHour.reduce((sum, p) => sum + p.volume, 0),
        callPremium: callsInHour.reduce((sum, c) => sum + (c.volume * c.lastPrice * 100), 0),
        putPremium: putsInHour.reduce((sum, p) => sum + (p.volume * p.lastPrice * 100), 0)
      };
    });
  };

  // Initial fetch
  useEffect(() => {
    fetchOptionsFlow();
  }, []);

  // Auto-refresh every 30 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchOptionsFlow();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Format currency
  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  // Format volume
  const formatVolume = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  // Render sentiment gauge
  const renderSentimentGauge = () => {
    if (!flowData) return null;

    const { sentiment, callPutRatio } = flowData;

    // Calculate gauge angle (-90 to 90 degrees)
    // Ratio < 0.5 = -90 (max bearish), Ratio = 1 = 0 (neutral), Ratio > 2 = 90 (max bullish)
    let angle = 0;
    if (callPutRatio < 1) {
      angle = -90 * (1 - callPutRatio);
    } else {
      angle = 45 * Math.min((callPutRatio - 1), 2);
    }

    return (
      <div className="relative w-full h-40 flex items-center justify-center">
        {/* Gauge Arc Background */}
        <svg className="absolute w-full h-full" viewBox="0 0 200 120">
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#374151"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Bearish section (red) */}
          <path
            d="M 20 100 A 80 80 0 0 1 100 20"
            fill="none"
            stroke="#ef4444"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.3"
          />
          {/* Bullish section (green) */}
          <path
            d="M 100 20 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#22c55e"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.3"
          />
          {/* Needle */}
          <g transform={`rotate(${angle}, 100, 100)`}>
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="35"
              stroke={sentiment === 'BULLISH' ? '#22c55e' : sentiment === 'BEARISH' ? '#ef4444' : '#6b7280'}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="100" cy="100" r="6" fill="#ffffff" />
          </g>
        </svg>

        {/* Sentiment Label */}
        <div className="absolute bottom-0 text-center">
          <Badge
            variant="secondary"
            className={cn(
              'text-sm font-bold px-3 py-1',
              sentiment === "BULLISH" && "bg-playful-cream text-green-400",
              sentiment === "BEARISH" && "bg-playful-cream text-red-400",
              sentiment === "NEUTRAL" && "bg-playful-cream text-[#3C3C3C]"
            )}
          >
            {sentiment}
          </Badge>
          <div className="text-sm text-[#3C3C3C] mt-1">
            Call/Put Ratio: {callPutRatio.toFixed(2)}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading && !flowData) {
    return (
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
        <CardContent className="p-3 text-center">
          <Activity className="w-12 h-12 mx-auto mb-3 text-blue-400 animate-pulse" />
          <p className="text-[#3C3C3C]">Loading options flow data...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
        <CardContent className="p-3 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-400" />
          <p className="text-red-400">{error}</p>
          <Button
            onClick={fetchOptionsFlow}
            variant="outline"
            size="sm"
            className="mt-3"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!flowData) {
    return null;
  }

  // Prepare flow comparison data for bar chart
  const flowComparisonData = [
    {
      name: 'Volume',
      Calls: flowData.totalCallVolume,
      Puts: flowData.totalPutVolume
    },
    {
      name: 'Premium',
      Calls: flowData.totalCallPremium / 1000000, // Convert to millions
      Puts: flowData.totalPutPremium / 1000000
    }
  ];

  // Prepare premium distribution data for pie chart
  const premiumDistributionData = [
    { name: 'Calls', value: flowData.totalCallPremium, color: '#22c55e' },
    { name: 'Puts', value: flowData.totalPutPremium, color: '#ef4444' }
  ];

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header Controls */}
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
        <CardContent className="p-3">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-10">
            <div>
              <h3 className="text-sm font-semibold text-[#1a1a1a] flex items-center gap-2.5">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                Real-Time Options Flow
              </h3>
              <p className="text-sm text-[#3C3C3C] mt-1">
                Live tracking of large institutional options trades
              </p>
            </div>

            <div className="flex items-center gap-10">
              <div className="flex items-center gap-2.5">
                <Button
                  variant={timeFilter === 'hour' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setTimeFilter('hour')}
                  className="text-sm"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  Last Hour
                </Button>
                <Button
                  variant={timeFilter === 'day' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setTimeFilter('day')}
                  className="text-sm"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  Today
                </Button>
                <Button
                  variant={timeFilter === 'week' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setTimeFilter('week')}
                  className="text-sm"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  This Week
                </Button>
              </div>

              <Button
                onClick={() => setAutoRefresh(!autoRefresh)}
                variant={autoRefresh ? 'secondary' : 'outline'}
                size="sm"
                className="text-sm"
              >
                <Activity className={cn('w-4 h-4 mr-2', autoRefresh && 'animate-pulse')} />
                Auto-Refresh
              </Button>

              <Button
                onClick={fetchOptionsFlow}
                variant="outline"
                size="sm"
                disabled={isLoading}
                className="text-sm"
              >
                <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          </div>

          {lastUpdate && (
            <div className="mt-2 text-sm text-[#3C3C3C]">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
        <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-sm text-[#3C3C3C]">Call Premium</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-sm font-bold text-[#1a1a1a]">
              {formatCurrency(flowData.totalCallPremium)}
            </div>
            <div className="text-sm text-[#3C3C3C] mt-1">
              {formatVolume(flowData.totalCallVolume)} contracts
            </div>
          </CardContent>
        </Card>

        <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <TrendingDown className="w-4 h-4 text-red-400" />
                <span className="text-sm text-[#3C3C3C]">Put Premium</span>
              </div>
              <ArrowDownRight className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-sm font-bold text-[#1a1a1a]">
              {formatCurrency(flowData.totalPutPremium)}
            </div>
            <div className="text-sm text-[#3C3C3C] mt-1">
              {formatVolume(flowData.totalPutVolume)} contracts
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          'border',
          flowData.netFlow > 0 ? 'bg-playful-cream border-2 border-black rounded-2xl shadow-md' : 'bg-playful-cream border-2 border-black rounded-2xl shadow-md'
        )}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <DollarSign className={cn(
                  'w-4 h-4',
                  flowData.netFlow > 0 ? 'text-green-400' : 'text-red-400'
                )} />
                <span className="text-sm text-[#3C3C3C]">Net Flow</span>
              </div>
              {flowData.netFlow > 0 ? (
                <TrendingUp className="w-4 h-4 text-green-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
            </div>
            <div className={cn(
              'text-sm font-bold',
              flowData.netFlow > 0 ? 'text-green-400' : 'text-red-400'
            )}>
              {flowData.netFlow > 0 ? '+' : ''}{formatCurrency(flowData.netFlow)}
            </div>
            <div className="text-sm text-[#3C3C3C] mt-1">
              {flowData.netFlow > 0 ? 'Bullish flow' : 'Bearish flow'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <Activity className="w-4 h-4 text-primary-400" />
                <span className="text-sm text-[#3C3C3C]">C/P Ratio</span>
              </div>
              <Zap className="w-4 h-4 text-primary-400" />
            </div>
            <div className="text-sm font-bold text-[#1a1a1a]">
              {flowData.callPutRatio.toFixed(2)}
            </div>
            <div className="text-sm text-[#3C3C3C] mt-1">
              {flowData.sentiment} sentiment
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sentiment Gauge and Flow Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Sentiment Gauge */}
        <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-[#1a1a1a] flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-blue-400" />
              Market Sentiment Gauge
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderSentimentGauge()}
            <div className="mt-3 pt-4 border-t border-black/10 text-sm text-[#3C3C3C]">
              <p>
                Sentiment is calculated based on the call/put ratio of unusual options activity.
                Ratio &gt; 1.5 indicates bullish sentiment, &lt; 0.67 indicates bearish sentiment.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Premium Distribution Pie Chart */}
        <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-[#1a1a1a] flex items-center gap-2.5">
              <DollarSign className="w-4 h-4 text-blue-400" />
              Premium Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={premiumDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {premiumDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '2px solid #000000',
                    borderRadius: '8px',
                    color: '#1a1a1a'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-10 mt-3">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm text-[#3C3C3C]">Calls: {formatCurrency(flowData.totalCallPremium)}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm text-[#3C3C3C]">Puts: {formatCurrency(flowData.totalPutPremium)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call vs Put Flow Bar Chart */}
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-[#1a1a1a] flex items-center gap-2.5">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            Call vs Put Flow Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={flowComparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '2px solid #000000',
                  borderRadius: '8px',
                  color: '#1a1a1a'
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'Calls' || name === 'Puts') {
                    const dataKey = flowComparisonData.find(d => d.name === 'Premium');
                    if (dataKey && value > 1000) {
                      return `$${value.toFixed(2)}M`;
                    }
                    return formatVolume(value);
                  }
                  return value;
                }}
              />
              <Legend />
              <Bar dataKey="Calls" fill="#22c55e" radius={[8, 8, 0, 0]} />
              <Bar dataKey="Puts" fill="#ef4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Trades by Premium */}
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-[#1a1a1a] flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-yellow-400" />
            Top Trades by Premium
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {flowData.topTradesByPremium.map((trade, index) => (
              <div
                key={`${trade.symbol}-${trade.strike}-${index}`}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border transition-all hover:scale-[1.01]',
                  trade.type === 'CALL'
                    ? 'bg-playful-cream border-2 border-black'
                    : 'bg-playful-cream border-2 border-black'
                )}
              >
                <div className="flex items-center gap-10">
                  <div className="text-sm font-bold text-[#3C3C3C]">#{index + 1}</div>
                  <div>
                    <div className="flex items-center gap-2.5 mb-1">
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-sm font-bold',
                          trade.type === 'CALL'
                            ? 'bg-playful-cream text-green-400'
                            : 'bg-playful-cream text-red-400'
                        )}
                      >
                        {trade.type}
                      </Badge>
                      <span className="text-sm font-bold text-[#1a1a1a]">{trade.symbol}</span>
                    </div>
                    <div className="text-sm text-[#3C3C3C]">
                      ${trade.strike.toFixed(2)} • {new Date(trade.expiration).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm text-[#3C3C3C]">Premium</div>
                  <div className="text-sm font-bold text-[#1a1a1a]">
                    {formatCurrency(trade.premium)}
                  </div>
                  <div className="text-sm text-[#3C3C3C]">
                    {formatVolume(trade.volume)} contracts @ ${trade.lastPrice.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Real-Time Flow Feed */}
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-[#1a1a1a] flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-blue-400 animate-pulse" />
            Live Options Flow Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {flowData.recentTrades.map((trade, index) => (
              <div
                key={`${trade.symbol}-${trade.strike}-${index}`}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border',
                  trade.type === 'CALL'
                    ? 'bg-playful-cream border-2 border-black'
                    : 'bg-playful-cream border-2 border-black'
                )}
              >
                <div className="flex items-center gap-10">
                  {trade.type === 'CALL' ? (
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-400" />
                  )}
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-bold text-[#1a1a1a]">{trade.symbol}</span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-sm',
                          trade.type === 'CALL'
                            ? 'bg-playful-cream text-green-400'
                            : 'bg-playful-cream text-red-400'
                        )}
                      >
                        {trade.type}
                      </Badge>
                      <span className="text-sm text-[#3C3C3C]">
                        ${trade.strike.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-sm text-[#3C3C3C]">
                      {formatVolume(trade.volume)} vol • {trade.volumeOIRatio.toFixed(2)}x Vol/OI
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold text-[#1a1a1a]">
                    {formatCurrency(trade.volume * trade.lastPrice * 100)}
                  </div>
                  <div className="text-sm text-[#3C3C3C]">premium</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
        <CardContent className="p-3">
          <div className="flex items-start gap-10">
            <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-[#1a1a1a] space-y-1">
              <p className="font-semibold text-[#1a1a1a]">Understanding Options Flow</p>
              <p>
                <strong>Options Flow:</strong> Tracks the direction and size of institutional options trades in real-time.
                Large premium flows can signal institutional positioning before major market moves.
              </p>
              <p>
                <strong>Call Flow:</strong> Heavy call buying often indicates bullish sentiment or hedging against upside risk.
                Unusual call activity may precede positive catalysts or breakouts.
              </p>
              <p>
                <strong>Put Flow:</strong> Large put purchases can signal bearish positioning or portfolio hedging.
                Elevated put flow may indicate concerns about downside risk or market volatility.
              </p>
              <p>
                <strong>Net Flow:</strong> The difference between call and put premium. Positive net flow suggests
                bullish positioning, while negative net flow indicates bearish sentiment or hedging activity.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OptionsFlow;