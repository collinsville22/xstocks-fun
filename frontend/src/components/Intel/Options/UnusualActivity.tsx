import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { cn } from '../../../lib/utils';
import { ENV } from '../../../config/env';
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw,
  AlertTriangle,
  Info
} from 'lucide-react';

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
}

interface UnusualActivityData {
  unusualActivity: UnusualActivityAlert[];
  count: number;
  timestamp: number;
}

interface UnusualActivityProps {
  className?: string;
}

/**
 * Unusual Options Activity Component
 * Features:
 * - Scans all 63 xStocks for unusual activity
 * - Detects unusual volume patterns (2x+ volume vs OI)
 * - Filters for high implied volatility (>50%)
 * - Sorted by volume/OI ratio
 * - Real-time smart money tracking
 */
export const UnusualActivity: React.FC<UnusualActivityProps> = ({ className }) => {
  const [activityData, setActivityData] = useState<UnusualActivityData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'calls' | 'puts'>('all');

  // Fetch unusual activity data
  const fetchUnusualActivity = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${ENV.INTEL_API_URL}/api/options/unusual-activity`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch unusual activity: ${response.statusText}`);
      }

      const apiResponse = await response.json();
      setActivityData(data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching unusual activity:', err);
      setError(err instanceof Error ? err.message : 'Failed to load unusual activity');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchUnusualActivity();
  }, []);

  // Filter activity by type
  const filteredActivity = activityData?.unusualActivity.filter((alert) => {
    if (filterType === 'all') return true;
    if (filterType === 'calls') return alert.type === 'CALL';
    if (filterType === 'puts') return alert.type === 'PUT';
    return true;
  }) || [];

  // Calculate summary stats
  const totalCalls = activityData?.unusualActivity.filter(a => a.type === 'CALL').length || 0;
  const totalPuts = activityData?.unusualActivity.filter(a => a.type === 'PUT').length || 0;
  const avgVolumeOIRatio = activityData?.unusualActivity.reduce((sum, a) => sum + a.volumeOIRatio, 0) / (activityData?.unusualActivity.length || 1) || 0;
  const avgIV = activityData?.unusualActivity.reduce((sum, a) => sum + a.impliedVolatility, 0) / (activityData?.unusualActivity.length || 1) || 0;

  if (isLoading && !activityData) {
    return (
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
        <CardContent className="p-3 text-center">
          <Activity className="w-12 h-12 mx-auto mb-3 text-yellow-400 animate-pulse" />
          <p className="text-[#3C3C3C]">Scanning for unusual activity...</p>
          <p className="text-sm text-[#3C3C3C] mt-1">Analyzing all 63 xStocks for unusual activity</p>
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
            onClick={fetchUnusualActivity}
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

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header Controls */}
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
        <CardContent className="p-3">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-10">
            <div>
              <h3 className="text-sm font-semibold text-[#1a1a1a] flex items-center gap-2.5">
                <Zap className="w-5 h-5 text-yellow-400" />
                Unusual Options Activity
              </h3>
              <p className="text-sm text-[#3C3C3C] mt-1">
                {activityData?.count || 0} unusual alerts detected across all 63 xStocks
              </p>
            </div>

            <div className="flex items-center gap-10">
              <div className="flex items-center gap-2.5">
                <Button
                  variant={filterType === 'all' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('all')}
                  className="text-sm"
                >
                  All ({activityData?.count || 0})
                </Button>
                <Button
                  variant={filterType === 'calls' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('calls')}
                  className="text-sm text-green-400"
                >
                  Calls ({totalCalls})
                </Button>
                <Button
                  variant={filterType === 'puts' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('puts')}
                  className="text-sm text-red-400"
                >
                  Puts ({totalPuts})
                </Button>
              </div>

              <Button
                onClick={fetchUnusualActivity}
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

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
        <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
          <CardContent className="p-3">
            <div className="flex items-center gap-2.5 mb-1">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-[#3C3C3C]">Total Alerts</span>
            </div>
            <div className="text-sm font-bold text-[#1a1a1a]">{activityData?.count || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
          <CardContent className="p-3">
            <div className="flex items-center gap-2.5 mb-1">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-sm text-[#3C3C3C]">Bullish Calls</span>
            </div>
            <div className="text-sm font-bold text-[#1a1a1a]">{totalCalls}</div>
          </CardContent>
        </Card>

        <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
          <CardContent className="p-3">
            <div className="flex items-center gap-2.5 mb-1">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <span className="text-sm text-[#3C3C3C]">Bearish Puts</span>
            </div>
            <div className="text-sm font-bold text-[#1a1a1a]">{totalPuts}</div>
          </CardContent>
        </Card>

        <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
          <CardContent className="p-3">
            <div className="flex items-center gap-2.5 mb-1">
              <Activity className="w-4 h-4 text-primary-400" />
              <span className="text-sm text-[#3C3C3C]">Avg IV</span>
            </div>
            <div className="text-sm font-bold text-[#1a1a1a]">{avgIV.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Alerts List */}
      {filteredActivity.length === 0 ? (
        <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
          <CardContent className="p-3 text-center">
            <Zap className="w-12 h-12 mx-auto mb-3 text-[#3C3C3C]" />
            <p className="text-[#3C3C3C]">No unusual activity detected</p>
            <p className="text-sm text-[#3C3C3C] mt-1">
              Options with 2x+ volume/OI ratio and high IV will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredActivity.map((alert, index) => (
            <Card
              key={`${alert.symbol}-${alert.type}-${alert.strike}-${index}`}
              className={cn(
                'border transition-all hover:scale-[1.01]',
                alert.type === 'CALL'
                  ? 'bg-playful-cream border-2 border-black hover:bg-playful-cream'
                  : 'bg-playful-cream border-2 border-black hover:bg-playful-cream'
              )}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  {/* Left Section - Symbol & Type */}
                  <div className="flex items-center gap-10">
                    <div>
                      <div className="flex items-center gap-2.5 mb-1">
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-sm font-bold',
                            alert.type === 'CALL'
                              ? 'bg-playful-cream text-green-400'
                              : 'bg-playful-cream text-red-400'
                          )}
                        >
                          {alert.type}
                        </Badge>
                        <span className="text-sm font-bold text-[#1a1a1a]">{alert.symbol}</span>
                      </div>
                      <div className="text-sm text-[#3C3C3C]">
                        ${alert.strike.toFixed(2)} • Exp: {new Date(alert.expiration).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>

                  {/* Middle Section - Volume & OI */}
                  <div className="hidden md:grid grid-cols-3 gap-10">
                    <div>
                      <div className="text-sm text-[#3C3C3C]">Volume</div>
                      <div className="text-sm font-semibold text-[#1a1a1a]">
                        {alert.volume.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-[#3C3C3C]">Open Interest</div>
                      <div className="text-sm font-semibold text-[#1a1a1a]">
                        {alert.openInterest.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-[#3C3C3C]">Vol/OI Ratio</div>
                      <div className="text-sm font-bold text-yellow-400">
                        {alert.volumeOIRatio.toFixed(2)}x
                      </div>
                    </div>
                  </div>

                  {/* Right Section - Price & IV */}
                  <div className="flex items-center gap-10">
                    <div className="text-right">
                      <div className="text-sm text-[#3C3C3C]">Last Price</div>
                      <div className={cn(
                        'text-sm font-bold',
                        alert.percentChange >= 0 ? 'text-green-400' : 'text-red-400'
                      )}>
                        ${alert.lastPrice.toFixed(2)}
                      </div>
                      <div className={cn(
                        'text-sm font-semibold',
                        alert.percentChange >= 0 ? 'text-green-400' : 'text-red-400'
                      )}>
                        {alert.percentChange >= 0 ? '+' : ''}{alert.percentChange.toFixed(2)}%
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm text-[#3C3C3C]">Implied Vol</div>
                      <div className="text-sm font-bold text-primary-400">
                        {alert.impliedVolatility.toFixed(1)}%
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-sm mt-1',
                          alert.impliedVolatility > 70
                            ? 'bg-playful-cream text-red-400'
                            : alert.impliedVolatility > 60
                            ? 'bg-playful-cream text-orange-400'
                            : 'bg-playful-cream text-yellow-400'
                        )}
                      >
                        {alert.impliedVolatility > 70 ? 'Extreme' : alert.impliedVolatility > 60 ? 'High' : 'Elevated'}
                      </Badge>
                    </div>

                    {alert.type === 'CALL' ? (
                      <TrendingUp className="w-6 h-6 text-green-400" />
                    ) : (
                      <TrendingDown className="w-6 h-6 text-red-400" />
                    )}
                  </div>
                </div>

                {/* Mobile View - Additional Data */}
                <div className="md:hidden mt-3 pt-3 border-t border-black/10 grid grid-cols-3 gap-10">
                  <div>
                    <div className="text-sm text-[#3C3C3C]">Volume</div>
                    <div className="text-sm font-semibold text-[#1a1a1a]">
                      {alert.volume.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-[#3C3C3C]">OI</div>
                    <div className="text-sm font-semibold text-[#1a1a1a]">
                      {alert.openInterest.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-[#3C3C3C]">Vol/OI</div>
                    <div className="text-sm font-bold text-yellow-400">
                      {alert.volumeOIRatio.toFixed(2)}x
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info Card */}
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
        <CardContent className="p-3">
          <div className="flex items-start gap-10">
            <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-[#1a1a1a] space-y-1">
              <p className="font-semibold text-[#1a1a1a]">What is Unusual Activity?</p>
              <p>
                <strong>Detection Criteria:</strong> Volume/OI ratio ≥ 2.0x AND Implied Volatility &gt; 50%
              </p>
              <p>
                <strong>Why It Matters:</strong> Large institutional traders ("smart money") often move markets.
                Unusual activity can signal upcoming price moves, earnings beats/misses, or other catalysts.
              </p>
              <p>
                <strong>How to Use:</strong> High Vol/OI ratio + High IV suggests informed traders taking large positions.
                CALL activity may indicate bullish positioning, PUT activity may suggest hedging or bearish sentiment.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnusualActivity;