import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { cn } from '../../../lib/utils';
import { ENV } from '../../../config/env';
import {
  Shield,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Zap,
  RefreshCw,
  Info,
  AlertCircle,
  Layers
} from 'lucide-react';

interface OptionGreeks {
  strike: number;
  lastPrice: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  inTheMoney: boolean;
  moneyness: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

interface GreeksData {
  calls: OptionGreeks[];
  puts: OptionGreeks[];
}

interface GreeksAggregate {
  totalCallDelta: number;
  totalPutDelta: number;
  netDelta: number;
  totalGamma: number;
  totalTheta: number;
  totalVega: number;
}

interface GreeksInterpretations {
  delta: string;
  gamma: string;
  theta: string;
  vega: string;
}

interface GreeksResponse {
  symbol: string;
  realSymbol: string;
  currentPrice: number;
  expiration: string;
  availableExpirations: string[];
  greeksData: GreeksData;
  aggregate: GreeksAggregate;
  interpretations: GreeksInterpretations;
  note: string;
  timestamp: number;
}

interface GreeksAnalysisProps {
  symbol: string;
  selectedExpiration: string;
  availableExpirations: string[];
  onExpirationChange: (expiration: string) => void;
  currentPrice: number;
  className?: string;
}

/**
 * Greeks Analysis Component
 * Features:
 * - Delta, Gamma, Theta, Vega for all options
 * - Aggregated portfolio Greeks
 * - Educational interpretations
 * - Greeks distribution charts
 * - Strike-by-strike breakdown
 * - Moneyness indicators
 * - Real-time refresh
 */
export const GreeksAnalysis: React.FC<GreeksAnalysisProps> = ({
  symbol,
  selectedExpiration,
  availableExpirations,
  onExpirationChange,
  currentPrice,
  className
}) => {
  const [greeksData, setGreeksData] = useState<GreeksResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [selectedGreek, setSelectedGreek] = useState<'delta' | 'gamma' | 'theta' | 'vega'>('delta');

  // Fetch Greeks data
  const fetchGreeks = async () => {
    if (!symbol || !selectedExpiration) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${ENV.INTEL_API_URL}/api/options/greeks/${symbol}?expiration=${selectedExpiration}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch Greeks: ${response.statusText}`);
      }

      const apiResponse = await response.json();
      setGreeksData(apiResponse);
    } catch (err) {
      console.error('Error fetching Greeks:', err);
      setError(err instanceof Error ? err.message : 'Failed to load Greeks');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGreeks();
  }, [symbol, selectedExpiration]);

  // Prepare chart data for selected Greek
  const prepareChartData = () => {
    if (!greeksData) return [];

    const allStrikes = Array.from(
      new Set([
        ...greeksData.greeksData.calls.map(c => c.strike),
        ...greeksData.greeksData.puts.map(p => p.strike)
      ])
    ).sort((a, b) => a - b);

    return allStrikes.map(strike => {
      const call = greeksData.greeksData.calls.find(c => c.strike === strike);
      const put = greeksData.greeksData.puts.find(p => p.strike === strike);

      return {
        strike: strike,
        callGreek: call?.[selectedGreek] || 0,
        putGreek: put?.[selectedGreek] || 0,
        isATM: Math.abs(strike - currentPrice) / currentPrice < 0.05
      };
    });
  };

  const chartData = prepareChartData();

  // Get Greek-specific configuration
  const getGreekConfig = (greek: string) => {
    switch (greek) {
      case 'delta':
        return {
          icon: TrendingUp,
          color: 'text-blue-400',
          bgColor: 'bg-playful-cream',
          borderColor: 'border-blue-500/30',
          chartColor: '#3b82f6',
          label: 'Delta (Δ)',
          description: 'Rate of change in option price per $1 move in underlying',
          interpretation: greeksData?.interpretations.delta || ''
        };
      case 'gamma':
        return {
          icon: Activity,
          color: 'text-green-400',
          bgColor: 'bg-playful-cream',
          borderColor: 'border-green-500/30',
          chartColor: '#10b981',
          label: 'Gamma (Γ)',
          description: 'Rate of change in Delta per $1 move in underlying',
          interpretation: greeksData?.interpretations.gamma || ''
        };
      case 'theta':
        return {
          icon: Clock,
          color: 'text-red-400',
          bgColor: 'bg-playful-cream',
          borderColor: 'border-red-500/30',
          chartColor: '#ef4444',
          label: 'Theta (Θ)',
          description: 'Daily time decay (how much value options lose per day)',
          interpretation: greeksData?.interpretations.theta || ''
        };
      case 'vega':
        return {
          icon: Zap,
          color: 'text-primary-400',
          bgColor: 'bg-playful-cream',
          borderColor: 'border-playful-green/30',
          chartColor: '#a855f7',
          label: 'Vega (ν)',
          description: 'Sensitivity to 1% change in implied volatility',
          interpretation: greeksData?.interpretations.vega || ''
        };
      default:
        return {
          icon: Shield,
          color: 'text-[#3C3C3C]',
          bgColor: 'bg-playful-cream',
          borderColor: 'border-gray-500/30',
          chartColor: '#6b7280',
          label: 'Greek',
          description: '',
          interpretation: ''
        };
    }
  };

  const currentConfig = getGreekConfig(selectedGreek);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-playful-cream/95 border border-2 border-black rounded-lg p-3 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-10">
              <span className="text-sm text-[#3C3C3C]">Strike:</span>
              <span className="text-[#1a1a1a] font-semibold">${data.strike.toFixed(2)}</span>
            </div>
            {data.isATM && (
              <Badge variant="outline" className="bg-playful-cream text-yellow-400 text-sm">
                ATM
              </Badge>
            )}
            <div className="flex items-center justify-between gap-10">
              <span className="text-sm text-[#3C3C3C]">Call {selectedGreek}:</span>
              <span className="text-green-400 font-semibold">{data.callGreek.toFixed(4)}</span>
            </div>
            <div className="flex items-center justify-between gap-10">
              <span className="text-sm text-[#3C3C3C]">Put {selectedGreek}:</span>
              <span className="text-red-400 font-semibold">{data.putGreek.toFixed(4)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md border-2 border-black">
        <CardContent className="p-3 text-center">
          <Shield className="w-12 h-12 mx-auto mb-3 text-blue-400 animate-pulse" />
          <p className="text-[#3C3C3C]">Loading Greeks analysis...</p>
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
          <Button onClick={fetchGreeks} variant="outline" size="sm" className="mt-3">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!greeksData) {
    return (
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md border-2 border-black">
        <CardContent className="p-3 text-center">
          <Shield className="w-12 h-12 mx-auto mb-3 text-[#3C3C3C]" />
          <p className="text-[#3C3C3C]">Select an expiration date to view Greeks</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Controls */}
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md border-2 border-black">
        <CardContent className="p-3">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-10">
            <div className="flex items-center gap-10">
              <div>
                <label className="text-sm text-[#3C3C3C] mb-1 block">Expiration Date</label>
                <Select value={selectedExpiration} onValueChange={onExpirationChange}>
                  <SelectTrigger className="w-[180px] bg-white border-2 border-black">
                    <SelectValue placeholder="Select expiration" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-2 border-black">
                    {availableExpirations.map((exp) => (
                      <SelectItem key={exp} value={exp}>
                        {new Date(exp).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={fetchGreeks} variant="outline" size="sm" disabled={isLoading}>
                <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
                Refresh
              </Button>
            </div>

            <div className="flex items-center gap-10">
              <div className="text-right">
                <div className="text-sm text-[#3C3C3C]">Current Price</div>
                <div className="text-sm font-bold text-[#1a1a1a]">${greeksData.currentPrice.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Portfolio Greeks Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
        <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
          <CardContent className="p-3">
            <div className="flex items-center gap-2.5 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-[#3C3C3C]">Net Delta</span>
            </div>
            <div className={cn(
              'text-sm font-bold',
              greeksData.aggregate.netDelta > 0 ? 'text-green-400' : greeksData.aggregate.netDelta < 0 ? 'text-red-400' : 'text-[#3C3C3C]'
            )}>
              {greeksData.aggregate.netDelta.toFixed(2)}
            </div>
            <div className="text-sm text-[#3C3C3C] mt-1">
              Directional exposure
            </div>
          </CardContent>
        </Card>

        <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
          <CardContent className="p-3">
            <div className="flex items-center gap-2.5 mb-1">
              <Activity className="w-4 h-4 text-green-400" />
              <span className="text-sm text-[#3C3C3C]">Total Gamma</span>
            </div>
            <div className="text-sm font-bold text-[#1a1a1a]">
              {greeksData.aggregate.totalGamma.toFixed(4)}
            </div>
            <div className="text-sm text-[#3C3C3C] mt-1">
              Delta acceleration
            </div>
          </CardContent>
        </Card>

        <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
          <CardContent className="p-3">
            <div className="flex items-center gap-2.5 mb-1">
              <Clock className="w-4 h-4 text-red-400" />
              <span className="text-sm text-[#3C3C3C]">Total Theta</span>
            </div>
            <div className="text-sm font-bold text-red-400">
              {greeksData.aggregate.totalTheta.toFixed(2)}
            </div>
            <div className="text-sm text-[#3C3C3C] mt-1">
              Daily time decay
            </div>
          </CardContent>
        </Card>

        <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
          <CardContent className="p-3">
            <div className="flex items-center gap-2.5 mb-1">
              <Zap className="w-4 h-4 text-primary-400" />
              <span className="text-sm text-[#3C3C3C]">Total Vega</span>
            </div>
            <div className="text-sm font-bold text-[#1a1a1a]">
              {greeksData.aggregate.totalVega.toFixed(2)}
            </div>
            <div className="text-sm text-[#3C3C3C] mt-1">
              Volatility exposure
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delta Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-sm text-[#3C3C3C]">Total Call Delta</span>
              </div>
              <div className="text-sm font-bold text-green-400">
                {greeksData.aggregate.totalCallDelta.toFixed(2)}
              </div>
            </div>
            <p className="text-sm text-[#3C3C3C]">
              Bullish directional exposure from calls
            </p>
          </CardContent>
        </Card>

        <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <TrendingDown className="w-4 h-4 text-red-400" />
                <span className="text-sm text-[#3C3C3C]">Total Put Delta</span>
              </div>
              <div className="text-sm font-bold text-red-400">
                {greeksData.aggregate.totalPutDelta.toFixed(2)}
              </div>
            </div>
            <p className="text-sm text-[#3C3C3C]">
              Bearish directional exposure from puts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Greek Selector and Chart */}
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md border-2 border-black">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2.5">
              <currentConfig.icon className={cn('w-5 h-5', currentConfig.color)} />
              {currentConfig.label} Distribution
            </CardTitle>
            <div className="flex items-center gap-2.5">
              <Button
                variant={selectedGreek === 'delta' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedGreek('delta')}
                className="text-sm"
              >
                <TrendingUp className="w-3 h-3 mr-1" />
                Delta
              </Button>
              <Button
                variant={selectedGreek === 'gamma' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedGreek('gamma')}
                className="text-sm"
              >
                <Activity className="w-3 h-3 mr-1" />
                Gamma
              </Button>
              <Button
                variant={selectedGreek === 'theta' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedGreek('theta')}
                className="text-sm"
              >
                <Clock className="w-3 h-3 mr-1" />
                Theta
              </Button>
              <Button
                variant={selectedGreek === 'vega' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedGreek('vega')}
                className="text-sm"
              >
                <Zap className="w-3 h-3 mr-1" />
                Vega
              </Button>
            </div>
          </div>
          <p className="text-sm text-[#3C3C3C] mt-1">{currentConfig.description}</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="strike"
                stroke="#9ca3af"
                style={{ fontSize: '13px' }}
                label={{
                  value: 'Strike Price ($)',
                  position: 'bottom',
                  fill: '#9ca3af',
                  fontSize: 11
                }}
                tickFormatter={(value) => `$${value}`}
              />
              <YAxis
                stroke="#9ca3af"
                style={{ fontSize: '13px' }}
                label={{
                  value: currentConfig.label,
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#9ca3af',
                  fontSize: 11
                }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} />
              <Legend wrapperStyle={{ fontSize: '14px' }} />

              <ReferenceLine
                x={currentPrice}
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{
                  value: `Current: $${currentPrice.toFixed(2)}`,
                  fill: '#f59e0b',
                  fontSize: 11,
                  position: 'top'
                }}
              />

              <Bar dataKey="callGreek" name={`Call ${selectedGreek}`} fill="#10b981">
                {chartData.map((entry, index) => (
                  <Cell
                    key={`call-${index}`}
                    fill={entry.isATM ? '#fbbf24' : '#10b981'}
                    fillOpacity={entry.isATM ? 0.9 : 0.7}
                  />
                ))}
              </Bar>
              <Bar dataKey="putGreek" name={`Put ${selectedGreek}`} fill="#ef4444">
                {chartData.map((entry, index) => (
                  <Cell
                    key={`put-${index}`}
                    fill={entry.isATM ? '#fbbf24' : '#ef4444'}
                    fillOpacity={entry.isATM ? 0.9 : 0.7}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Greek Interpretation */}
      <Card className={cn('border', currentConfig.borderColor, currentConfig.bgColor)}>
        <CardContent className="p-3">
          <div className="flex items-start gap-10">
            <currentConfig.icon className={cn('w-8 h-8', currentConfig.color)} />
            <div>
              <div className="font-semibold text-[#1a1a1a] mb-1">{currentConfig.label} Interpretation</div>
              <div className="text-sm text-[#1a1a1a]">{currentConfig.interpretation}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Options Table */}
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md border-2 border-black">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-blue-400" />
            Greeks by Strike - {greeksData.realSymbol}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white border-b-2 border-2 border-black">
                <tr>
                  {/* Calls Header */}
                  <th colSpan={7} className="text-center py-2.5 text-sm font-semibold text-green-400 border-r border-2 border-black">
                    CALLS
                  </th>
                  {/* Strike Header */}
                  <th className="text-center py-2.5 text-sm font-semibold text-[#1a1a1a] px-3">
                    STRIKE
                  </th>
                  {/* Puts Header */}
                  <th colSpan={7} className="text-center py-2.5 text-sm font-semibold text-red-400 border-l border-2 border-black">
                    PUTS
                  </th>
                </tr>
                <tr className="text-sm text-[#3C3C3C]">
                  {/* Calls Columns */}
                  <th className="px-3 py-2 text-left">Last</th>
                  <th className="px-3 py-2 text-left">Volume</th>
                  <th className="px-3 py-2 text-left">OI</th>
                  <th className="px-3 py-2 text-left">Delta</th>
                  <th className="px-3 py-2 text-left">Gamma</th>
                  <th className="px-3 py-2 text-left">Theta</th>
                  <th className="px-3 py-2 text-left border-r border-2 border-black">Vega</th>

                  {/* Strike */}
                  <th className="px-3 py-2.5 text-center">Price</th>

                  {/* Puts Columns */}
                  <th className="px-3 py-2 text-left border-l border-2 border-black">Delta</th>
                  <th className="px-3 py-2 text-left">Gamma</th>
                  <th className="px-3 py-2 text-left">Theta</th>
                  <th className="px-3 py-2 text-left">Vega</th>
                  <th className="px-3 py-2 text-left">Last</th>
                  <th className="px-3 py-2 text-left">Volume</th>
                  <th className="px-3 py-2 text-left">OI</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(
                  new Set([
                    ...greeksData.greeksData.calls.map(c => c.strike),
                    ...greeksData.greeksData.puts.map(p => p.strike)
                  ])
                )
                  .sort((a, b) => a - b)
                  .map((strike) => {
                    const call = greeksData.greeksData.calls.find(c => c.strike === strike);
                    const put = greeksData.greeksData.puts.find(p => p.strike === strike);
                    const isATM = Math.abs(strike - currentPrice) / currentPrice < 0.05;

                    return (
                      <tr
                        key={strike}
                        className={cn(
                          'border-b border-2 border-black hover:bg-white border-2 border-black rounded-2xl shadow-md transition-colors',
                          isATM && 'bg-playful-cream'
                        )}
                      >
                        {/* Call Data */}
                        {call ? (
                          <>
                            <td className="px-3 py-2 text-sm text-[#1a1a1a] font-semibold">
                              ${call.lastPrice.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-sm text-[#3C3C3C]">{call.volume.toLocaleString()}</td>
                            <td className="px-3 py-2 text-sm text-[#3C3C3C]">{call.openInterest.toLocaleString()}</td>
                            <td className="px-3 py-2 text-sm">
                              <span className={cn(
                                'font-medium',
                                (call.delta ?? 0) > 0 ? 'text-green-400' : 'text-red-400'
                              )}>
                                {call.delta?.toFixed(3) ?? 'N/A'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-sm text-[#1a1a1a]">
                              {call.gamma?.toFixed(4) ?? 'N/A'}
                            </td>
                            <td className="px-3 py-2 text-sm">
                              <span className={cn(
                                'font-medium',
                                (call.theta ?? 0) < 0 ? 'text-red-400' : 'text-green-400'
                              )}>
                                {call.theta?.toFixed(3) ?? 'N/A'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-sm text-[#1a1a1a] border-r border-2 border-black">
                              {call.vega?.toFixed(3) ?? 'N/A'}
                            </td>
                          </>
                        ) : (
                          <td colSpan={7} className="px-3 py-2 text-sm text-[#3C3C3C] text-center border-r border-2 border-black">
                            No data
                          </td>
                        )}

                        {/* Strike */}
                        <td className={cn(
                          'px-3 py-2.5 text-center font-bold',
                          isATM ? 'text-yellow-400 text-sm' : 'text-[#1a1a1a] text-sm'
                        )}>
                          <div className="flex items-center justify-center gap-2.5">
                            {call?.inTheMoney && (
                              <Badge variant="outline" className="bg-playful-cream text-green-400 text-sm px-1 py-0">
                                ITM
                              </Badge>
                            )}
                            ${strike.toFixed(2)}
                            {isATM && (
                              <Badge variant="outline" className="bg-playful-cream text-yellow-400 text-sm px-1 py-0">
                                ATM
                              </Badge>
                            )}
                            {put?.inTheMoney && (
                              <Badge variant="outline" className="bg-playful-cream text-red-400 text-sm px-1 py-0">
                                ITM
                              </Badge>
                            )}
                          </div>
                        </td>

                        {/* Put Data */}
                        {put ? (
                          <>
                            <td className="px-3 py-2 text-sm border-l border-2 border-black">
                              <span className={cn(
                                'font-medium',
                                (put.delta ?? 0) < 0 ? 'text-red-400' : 'text-green-400'
                              )}>
                                {put.delta?.toFixed(3) ?? 'N/A'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-sm text-[#1a1a1a]">
                              {put.gamma?.toFixed(4) ?? 'N/A'}
                            </td>
                            <td className="px-3 py-2 text-sm">
                              <span className={cn(
                                'font-medium',
                                (put.theta ?? 0) < 0 ? 'text-red-400' : 'text-green-400'
                              )}>
                                {put.theta?.toFixed(3) ?? 'N/A'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-sm text-[#1a1a1a]">
                              {put.vega?.toFixed(3) ?? 'N/A'}
                            </td>
                            <td className="px-3 py-2 text-sm text-[#1a1a1a] font-semibold">
                              ${put.lastPrice.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-sm text-[#3C3C3C]">{put.volume.toLocaleString()}</td>
                            <td className="px-3 py-2 text-sm text-[#3C3C3C]">{put.openInterest.toLocaleString()}</td>
                          </>
                        ) : (
                          <td colSpan={7} className="px-3 py-2 text-sm text-[#3C3C3C] text-center border-l border-2 border-black">
                            No data
                          </td>
                        )}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Greeks Educational Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
          <CardContent className="p-3">
            <div className="flex items-start gap-10">
              <TrendingUp className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-[#1a1a1a] space-y-1">
                <p className="font-semibold text-[#1a1a1a]">Delta (Δ)</p>
                <p>Measures how much an option's price changes per $1 move in the underlying stock.</p>
                <p><strong>Calls:</strong> 0 to +1 (ITM calls closer to +1)</p>
                <p><strong>Puts:</strong> -1 to 0 (ITM puts closer to -1)</p>
                <p><strong>Example:</strong> Delta of 0.50 means option moves $0.50 for every $1 stock move</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
          <CardContent className="p-3">
            <div className="flex items-start gap-10">
              <Activity className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-[#1a1a1a] space-y-1">
                <p className="font-semibold text-[#1a1a1a]">Gamma (Γ)</p>
                <p>Measures how fast Delta changes as the stock price moves.</p>
                <p>Highest for ATM options, lowest for deep ITM/OTM options.</p>
                <p><strong>High Gamma:</strong> Delta changes rapidly (more risk/reward)</p>
                <p><strong>Low Gamma:</strong> Delta stable (less volatility)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
          <CardContent className="p-3">
            <div className="flex items-start gap-10">
              <Clock className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-[#1a1a1a] space-y-1">
                <p className="font-semibold text-[#1a1a1a]">Theta (Θ)</p>
                <p>Measures daily time decay - how much value an option loses each day.</p>
                <p><strong>Always negative</strong> for long options (you lose premium daily)</p>
                <p>Accelerates as expiration approaches (especially last 30 days)</p>
                <p><strong>Theta = -0.05:</strong> Option loses $5 in value per day (per 100 shares)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
          <CardContent className="p-3">
            <div className="flex items-start gap-10">
              <Zap className="w-5 h-5 text-primary-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-[#1a1a1a] space-y-1">
                <p className="font-semibold text-[#1a1a1a]">Vega (ν)</p>
                <p>Measures sensitivity to implied volatility (IV) changes.</p>
                <p><strong>Vega = 0.10:</strong> Option gains $10 if IV increases by 1%</p>
                <p>Highest for ATM options with longer expiration</p>
                <p><strong>Rising IV:</strong> Options become more expensive (good for buyers)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trading Strategy Info */}
      <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
        <CardContent className="p-3">
          <div className="flex items-start gap-10">
            <Info className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-[#1a1a1a] space-y-2">
              <p className="font-semibold text-[#1a1a1a]">Using Greeks in Your Trading Strategy:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li><strong>Bullish:</strong> Buy high positive Delta (calls), manage Theta decay</li>
                <li><strong>Bearish:</strong> Buy high negative Delta (puts), manage Theta decay</li>
                <li><strong>Neutral:</strong> Sell options to collect Theta (Iron Condor, Straddles)</li>
                <li><strong>High IV:</strong> Sell options (positive Theta, negative Vega)</li>
                <li><strong>Low IV:</strong> Buy options (negative Theta, positive Vega)</li>
                <li><strong>Scalping:</strong> Trade high Gamma options for quick Delta changes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Note */}
      {greeksData.note && (
        <Card className="bg-white border-2 border-black rounded-2xl shadow-md border-2 border-black">
          <CardContent className="p-3">
            <p className="text-sm text-[#3C3C3C]">{greeksData.note}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GreeksAnalysis;