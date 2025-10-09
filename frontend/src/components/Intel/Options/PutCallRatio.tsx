import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
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
  Minus,
  Activity,
  RefreshCw,
  Info,
  AlertCircle
} from 'lucide-react';

interface PCRatioExpiration {
  expiration: string;
  volumeRatio: number;
  openInterestRatio: number;
  callVolume: number;
  putVolume: number;
  callOI: number;
  putOI: number;
}

interface SentimentData {
  sentiment: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
  description: string;
}

interface PCRatioOverall {
  volumeRatio: number;
  openInterestRatio: number;
  totalCallVolume: number;
  totalPutVolume: number;
  totalCallOI: number;
  totalPutOI: number;
  volumeInterpretation: SentimentData;
  openInterestInterpretation: SentimentData;
}

interface PutCallRatioData {
  symbol: string;
  realSymbol: string;
  overall: PCRatioOverall;
  byExpiration: PCRatioExpiration[];
  timestamp: number;
}

interface PutCallRatioProps {
  symbol: string;
  className?: string;
}

/**
 * Put/Call Ratio Component
 * Features:
 * - Volume-based P/C ratio
 * - Open interest-based P/C ratio
 * - Per-expiration breakdown
 * - Sentiment interpretation (Bullish/Neutral/Bearish)
 * - Historical trend visualization
 */
export const PutCallRatio: React.FC<PutCallRatioProps> = ({ symbol, className }) => {
  const [pcRatioData, setPCRatioData] = useState<PutCallRatioData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Fetch P/C ratio data
  const fetchPCRatio = async () => {
    if (!symbol) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${ENV.INTEL_API_URL}/api/options/put-call-ratio/${symbol}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch P/C ratio: ${response.statusText}`);
      }

      const apiResponse = await response.json();
      setPCRatioData(apiResponse);
    } catch (err) {
      console.error('Error fetching P/C ratio:', err);
      setError(err instanceof Error ? err.message : 'Failed to load P/C ratio');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPCRatio();
  }, [symbol]);

  // Get sentiment color and icon
  const getSentimentConfig = (sentiment: 'BULLISH' | 'NEUTRAL' | 'BEARISH') => {
    switch (sentiment) {
      case 'BULLISH':
        return {
          color: 'text-green-400',
          bgColor: 'bg-playful-cream',
          borderColor: 'border-green-500/30',
          icon: TrendingUp
        };
      case 'BEARISH':
        return {
          color: 'text-red-400',
          bgColor: 'bg-playful-cream',
          borderColor: 'border-red-500/30',
          icon: TrendingDown
        };
      case 'NEUTRAL':
        return {
          color: 'text-[#3C3C3C]',
          bgColor: 'bg-playful-cream',
          borderColor: 'border-gray-500/30',
          icon: Minus
        };
    }
  };

  // Prepare chart data
  const chartData = pcRatioData?.byExpiration.map((exp) => ({
    expiration: new Date(exp.expiration).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    volumeRatio: exp.volumeRatio,
    oiRatio: exp.openInterestRatio,
    callVolume: exp.callVolume,
    putVolume: exp.putVolume,
    callOI: exp.callOI,
    putOI: exp.putOI
  })) || [];

  if (isLoading) {
    return (
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
        <CardContent className="p-3 text-center">
          <Activity className="w-12 h-12 mx-auto mb-3 text-blue-400 animate-pulse" />
          <p className="text-[#3C3C3C]">Loading Put/Call ratio...</p>
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
          <Button onClick={fetchPCRatio} variant="outline" size="sm" className="mt-3">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!pcRatioData) {
    return (
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
        <CardContent className="p-3 text-center">
          <Activity className="w-12 h-12 mx-auto mb-3 text-[#3C3C3C]" />
          <p className="text-[#3C3C3C]">No Put/Call ratio data available</p>
        </CardContent>
      </Card>
    );
  }

  const volumeConfig = getSentimentConfig(pcRatioData.overall.volumeInterpretation.sentiment);
  const oiConfig = getSentimentConfig(pcRatioData.overall.openInterestInterpretation.sentiment);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Overall P/C Ratio Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Volume-Based P/C Ratio */}
        <Card className={cn('border', volumeConfig.borderColor, volumeConfig.bgColor)}>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-blue-400" />
              Volume-Based P/C Ratio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-bold text-[#1a1a1a]">
                  {pcRatioData.overall.volumeRatio.toFixed(2)}
                </div>
                <div className="text-sm text-[#3C3C3C] mt-1">
                  Today's volume sentiment
                </div>
              </div>
              <volumeConfig.icon className={cn('w-12 h-12', volumeConfig.color)} />
            </div>

            <Badge variant="outline" className={cn('mb-3', volumeConfig.bgColor, volumeConfig.color)}>
              {pcRatioData.overall.volumeInterpretation.sentiment}
            </Badge>

            <p className="text-sm text-[#3C3C3C] mb-3">
              {pcRatioData.overall.volumeInterpretation.description}
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#3C3C3C]">Call Volume:</span>
                <span className="text-green-400 font-semibold">
                  {pcRatioData.overall.totalCallVolume.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#3C3C3C]">Put Volume:</span>
                <span className="text-red-400 font-semibold">
                  {pcRatioData.overall.totalPutVolume.toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Open Interest-Based P/C Ratio */}
        <Card className={cn('border', oiConfig.borderColor, oiConfig.bgColor)}>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2.5">
              <TrendingUp className="w-4 h-4 text-primary-400" />
              Open Interest-Based P/C Ratio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-bold text-[#1a1a1a]">
                  {pcRatioData.overall.openInterestRatio.toFixed(2)}
                </div>
                <div className="text-sm text-[#3C3C3C] mt-1">
                  Accumulated positions
                </div>
              </div>
              <oiConfig.icon className={cn('w-12 h-12', oiConfig.color)} />
            </div>

            <Badge variant="outline" className={cn('mb-3', oiConfig.bgColor, oiConfig.color)}>
              {pcRatioData.overall.openInterestInterpretation.sentiment}
            </Badge>

            <p className="text-sm text-[#3C3C3C] mb-3">
              {pcRatioData.overall.openInterestInterpretation.description}
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#3C3C3C]">Call OI:</span>
                <span className="text-green-400 font-semibold">
                  {pcRatioData.overall.totalCallOI.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#3C3C3C]">Put OI:</span>
                <span className="text-red-400 font-semibold">
                  {pcRatioData.overall.totalPutOI.toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* P/C Ratio Trend Chart */}
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-blue-400" />
            P/C Ratio by Expiration
          </CardTitle>
          <p className="text-sm text-[#3C3C3C] mt-1">
            How sentiment varies across different expiration dates
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="expiration"
                stroke="#9ca3af"
                style={{ fontSize: '14px' }}
              />
              <YAxis
                stroke="#9ca3af"
                style={{ fontSize: '14px' }}
                label={{ value: 'P/C Ratio', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '2px solid #000000',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '14px' }} />

              {/* Reference lines for sentiment zones */}
              <ReferenceLine y={0.7} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Bullish (<0.7)', fill: '#10b981', fontSize: 10 }} />
              <ReferenceLine y={1.0} stroke="#6b7280" strokeDasharray="3 3" label={{ value: 'Neutral (1.0)', fill: '#6b7280', fontSize: 10 }} />
              <ReferenceLine y={1.2} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Bearish (>1.2)', fill: '#ef4444', fontSize: 10 }} />

              <Line
                type="monotone"
                dataKey="volumeRatio"
                name="Volume P/C"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="oiRatio"
                name="OI P/C"
                stroke="#a855f7"
                strokeWidth={2}
                dot={{ fill: '#a855f7', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Volume & OI Comparison Chart */}
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2.5">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Calls vs Puts Volume & Open Interest
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="expiration"
                stroke="#9ca3af"
                style={{ fontSize: '14px' }}
              />
              <YAxis
                stroke="#9ca3af"
                style={{ fontSize: '14px' }}
                label={{ value: 'Contracts', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '2px solid #000000',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '14px' }} />

              <Bar dataKey="callVolume" name="Call Volume" fill="#10b981" />
              <Bar dataKey="putVolume" name="Put Volume" fill="#ef4444" />
              <Bar dataKey="callOI" name="Call OI" fill="#3b82f6" opacity={0.6} />
              <Bar dataKey="putOI" name="Put OI" fill="#f59e0b" opacity={0.6} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* By-Expiration Table */}
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle className="text-sm">P/C Ratio Breakdown by Expiration</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-playful-cream border-b border-black/10">
                <tr className="text-sm text-[#3C3C3C]">
                  <th className="px-3 py-2.5 text-left">Expiration</th>
                  <th className="px-3 py-2.5 text-right">Volume P/C</th>
                  <th className="px-3 py-2.5 text-right">OI P/C</th>
                  <th className="px-3 py-2.5 text-right">Call Volume</th>
                  <th className="px-3 py-2.5 text-right">Put Volume</th>
                  <th className="px-3 py-2.5 text-right">Call OI</th>
                  <th className="px-3 py-2.5 text-right">Put OI</th>
                </tr>
              </thead>
              <tbody>
                {pcRatioData.byExpiration.map((exp, index) => (
                  <tr
                    key={exp.expiration}
                    className={cn(
                      'border-b border-black/10 hover:glass-card transition-colors',
                      index % 2 === 0 ? 'bg-white' : ''
                    )}
                  >
                    <td className="px-3 py-2.5 text-sm text-[#1a1a1a] font-semibold">
                      {new Date(exp.expiration).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-right">
                      <span className={cn(
                        'font-semibold',
                        exp.volumeRatio < 0.7 ? 'text-green-400' : exp.volumeRatio > 1.0 ? 'text-red-400' : 'text-[#3C3C3C]'
                      )}>
                        {exp.volumeRatio.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-right">
                      <span className={cn(
                        'font-semibold',
                        exp.openInterestRatio < 0.7 ? 'text-green-400' : exp.openInterestRatio > 1.0 ? 'text-red-400' : 'text-[#3C3C3C]'
                      )}>
                        {exp.openInterestRatio.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-right text-green-400">
                      {exp.callVolume.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-right text-red-400">
                      {exp.putVolume.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-right text-blue-400">
                      {exp.callOI.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-right text-orange-400">
                      {exp.putOI.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
        <CardContent className="p-3">
          <div className="flex items-start gap-10">
            <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-[#1a1a1a] space-y-1">
              <p className="font-semibold text-[#1a1a1a]">How to Read Put/Call Ratio:</p>
              <p>
                <strong className="text-green-400">P/C &lt; 0.7:</strong> BULLISH - More calls than puts (traders expect price increase)
              </p>
              <p>
                <strong className="text-[#3C3C3C]">P/C 0.7-1.0:</strong> NEUTRAL - Balanced sentiment
              </p>
              <p>
                <strong className="text-red-400">P/C &gt; 1.0:</strong> BEARISH - More puts than calls (traders expect price decrease or hedging)
              </p>
              <p className="mt-2">
                <strong>Volume P/C:</strong> Today's sentiment (short-term) •{' '}
                <strong>OI P/C:</strong> Accumulated positions (longer-term trend)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PutCallRatio;