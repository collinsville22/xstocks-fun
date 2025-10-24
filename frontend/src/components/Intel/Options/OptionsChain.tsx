import React, { useState, useEffect } from 'react';
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
  Layers,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Info,
  DollarSign,
  Activity
} from 'lucide-react';

interface OptionContract {
  strike: number;
  lastPrice: number;
  bid: number;
  ask: number;
  change: number;
  percentChange: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  inTheMoney: boolean;
  contractSymbol: string;
  moneyness: string;
  intrinsicValue: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

interface OptionsChainData {
  symbol: string;
  realSymbol: string;
  currentPrice: number;
  expiration: string;
  availableExpirations: string[];
  calls: OptionContract[];
  puts: OptionContract[];
  callsCount: number;
  putsCount: number;
  timestamp: number;
}

interface OptionsChainProps {
  symbol: string;
  selectedExpiration: string;
  availableExpirations: string[];
  onExpirationChange: (expiration: string) => void;
  currentPrice: number;
  className?: string;
}

/**
 * Options Chain Component
 * Features:
 * - Complete calls and puts display
 * - Strike prices with bid/ask spreads
 * - Volume and open interest
 * - Implied volatility per contract
 * - Greeks (Delta, Gamma, Theta, Vega)
 * - Moneyness indicators (ITM/OTM)
 * - Interactive expiration selector
 */
export const OptionsChain: React.FC<OptionsChainProps> = ({
  symbol,
  selectedExpiration,
  availableExpirations,
  onExpirationChange,
  currentPrice,
  className
}) => {
  const [chainData, setChainData] = useState<OptionsChainData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [selectedStrike, setSelectedStrike] = useState<number | null>(null);
  const [showGreeks, setShowGreeks] = useState<boolean>(false);

  // Fetch options chain data
  useEffect(() => {
    const fetchOptionsChain = async () => {
      if (!symbol || !selectedExpiration) return;

      setIsLoading(true);
      setError('');

      try {
        const response = await fetch(
          `${ENV.INTEL_API_URL}/api/options/chain/${symbol}?expiration=${selectedExpiration}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch options chain: ${response.statusText}`);
        }

        const apiResponse = await response.json();
        setChainData(apiResponse);
      } catch (err) {
        console.error('Error fetching options chain:', err);
        setError(err instanceof Error ? err.message : 'Failed to load options chain');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOptionsChain();
  }, [symbol, selectedExpiration]);

  // Render option row
  const renderOptionRow = (option: OptionContract, type: 'call' | 'put') => {
    const isSelected = selectedStrike === option.strike;
    const isATM = Math.abs(option.strike - currentPrice) / currentPrice < 0.05; // Within 5%

    return (
      <tr
        key={`${type}-${option.strike}`}
        className={cn(
          'border-b border-2 border-black hover:bg-white border-2 border-black rounded-2xl shadow-md cursor-pointer transition-colors',
          isSelected && 'bg-blue-500/10',
          isATM && 'bg-playful-cream'
        )}
        onClick={() => setSelectedStrike(isSelected ? null : option.strike)}
      >
        {/* Calls Section */}
        {type === 'call' && (
          <>
            <td className="px-3 py-2 text-sm text-[#3C3C3C]">{option.volume.toLocaleString()}</td>
            <td className="px-3 py-2 text-sm text-[#3C3C3C]">{option.openInterest.toLocaleString()}</td>
            <td className="px-3 py-2 text-sm">
              <span className={cn(
                'font-semibold',
                option.change >= 0 ? 'text-green-400' : 'text-red-400'
              )}>
                ${option.lastPrice.toFixed(2)}
              </span>
            </td>
            <td className="px-3 py-2 text-sm text-[#3C3C3C]">
              ${option.bid.toFixed(2)} × ${option.ask.toFixed(2)}
            </td>
            <td className="px-3 py-2 text-sm">
              <span className={cn(
                'font-medium',
                option.percentChange >= 0 ? 'text-green-400' : 'text-red-400'
              )}>
                {option.percentChange >= 0 ? '+' : ''}{option.percentChange.toFixed(2)}%
              </span>
            </td>
            <td className="px-3 py-2 text-sm text-[#1a1a1a]">
              {(option.impliedVolatility * 100).toFixed(1)}%
            </td>
            {showGreeks && option.delta !== undefined && (
              <td className="px-3 py-2 text-sm text-[#1a1a1a]">
                {option.delta.toFixed(2)}
              </td>
            )}
          </>
        )}

        {/* Strike Price (Center) */}
        <td className={cn(
          'px-3 py-2.5 text-center font-bold',
          isATM ? 'text-yellow-400 text-sm' : 'text-[#1a1a1a] text-sm'
        )}>
          <div className="flex items-center justify-center gap-2.5">
            {option.inTheMoney && (
              <Badge variant="outline" className={cn(
                'text-sm px-1 py-0',
                type === 'call' ? 'bg-playful-cream text-green-400' : 'bg-playful-cream text-red-400'
              )}>
                ITM
              </Badge>
            )}
            ${option.strike.toFixed(2)}
            {isATM && (
              <Badge variant="outline" className="bg-playful-cream text-yellow-400 text-sm px-1 py-0">
                ATM
              </Badge>
            )}
          </div>
        </td>

        {/* Puts Section */}
        {type === 'put' && (
          <>
            {showGreeks && option.delta !== undefined && (
              <td className="px-3 py-2 text-sm text-[#1a1a1a]">
                {option.delta.toFixed(2)}
              </td>
            )}
            <td className="px-3 py-2 text-sm text-[#1a1a1a]">
              {(option.impliedVolatility * 100).toFixed(1)}%
            </td>
            <td className="px-3 py-2 text-sm">
              <span className={cn(
                'font-medium',
                option.percentChange >= 0 ? 'text-green-400' : 'text-red-400'
              )}>
                {option.percentChange >= 0 ? '+' : ''}{option.percentChange.toFixed(2)}%
              </span>
            </td>
            <td className="px-3 py-2 text-sm text-[#3C3C3C]">
              ${option.bid.toFixed(2)} × ${option.ask.toFixed(2)}
            </td>
            <td className="px-3 py-2 text-sm">
              <span className={cn(
                'font-semibold',
                option.change >= 0 ? 'text-green-400' : 'text-red-400'
              )}>
                ${option.lastPrice.toFixed(2)}
              </span>
            </td>
            <td className="px-3 py-2 text-sm text-[#3C3C3C]">{option.openInterest.toLocaleString()}</td>
            <td className="px-3 py-2 text-sm text-[#3C3C3C]">{option.volume.toLocaleString()}</td>
          </>
        )}
      </tr>
    );
  };

  if (isLoading) {
    return (
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md border-2 border-black">
        <CardContent className="p-3 text-center">
          <Activity className="w-12 h-12 mx-auto mb-3 text-blue-400 animate-pulse" />
          <p className="text-[#3C3C3C]">Loading options chain...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
        <CardContent className="p-3 text-center">
          <p className="text-red-400">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!chainData) {
    return (
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md border-2 border-black">
        <CardContent className="p-3 text-center">
          <Layers className="w-12 h-12 mx-auto mb-3 text-[#3C3C3C]" />
          <p className="text-[#3C3C3C]">Select an expiration date to view options chain</p>
        </CardContent>
      </Card>
    );
  }

  // Combine calls and puts by strike price
  const allStrikes = Array.from(
    new Set([...chainData.calls.map(c => c.strike), ...chainData.puts.map(p => p.strike)])
  ).sort((a, b) => a - b);

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

              <div className="flex items-center gap-2.5">
                <Button
                  variant={showGreeks  ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowGreeks(!showGreeks)}
                  className="text-sm"
                >
                  {showGreeks ? 'Hide Greeks' : 'Show Greeks'}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-10">
              <div className="text-right">
                <div className="text-sm text-[#3C3C3C]">Current Price</div>
                <div className="text-sm font-bold text-[#1a1a1a]">${chainData.currentPrice.toFixed(2)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-[#3C3C3C]">Expiration</div>
                <div className="text-sm font-semibold text-[#1a1a1a]">
                  {new Date(chainData.expiration).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
        <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
          <CardContent className="p-3">
            <div className="flex items-center gap-2.5 mb-1">
              <TrendingUp className="w-4 h-4 text-playful-green" />
              <span className="text-sm text-[#3C3C3C] font-medium">Total Calls</span>
            </div>
            <div className="text-xl font-bold text-white bg-playful-green px-3 py-1 rounded border-2 border-black inline-block">{chainData.callsCount}</div>
          </CardContent>
        </Card>

        <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
          <CardContent className="p-3">
            <div className="flex items-center gap-2.5 mb-1">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-sm text-[#3C3C3C] font-medium">Total Puts</span>
            </div>
            <div className="text-xl font-bold text-white bg-red-500 px-3 py-1 rounded border-2 border-black inline-block">{chainData.putsCount}</div>
          </CardContent>
        </Card>

        <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
          <CardContent className="p-3">
            <div className="flex items-center gap-2.5 mb-1">
              <Activity className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-[#3C3C3C] font-medium">Total Volume</span>
            </div>
            <div className="text-xl font-bold text-white bg-blue-500 px-3 py-1 rounded border-2 border-black inline-block">
              {(chainData.calls.reduce((sum, c) => sum + c.volume, 0) +
                chainData.puts.reduce((sum, p) => sum + p.volume, 0)).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
          <CardContent className="p-3">
            <div className="flex items-center gap-2.5 mb-1">
              <DollarSign className="w-4 h-4 text-playful-orange" />
              <span className="text-sm text-[#3C3C3C] font-medium">Open Interest</span>
            </div>
            <div className="text-xl font-bold text-white bg-playful-orange px-3 py-1 rounded border-2 border-black inline-block">
              {(chainData.calls.reduce((sum, c) => sum + c.openInterest, 0) +
                chainData.puts.reduce((sum, p) => sum + p.openInterest, 0)).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Options Chain Table */}
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md border-2 border-black">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-blue-400" />
            Options Chain - {chainData.realSymbol}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white border-b-2 border-2 border-black">
                <tr>
                  {/* Calls Header */}
                  <th colSpan={showGreeks ? 7 : 6} className="text-center py-2.5 text-sm font-semibold text-green-400 border-r border-2 border-black">
                    CALLS
                  </th>
                  {/* Strike Header */}
                  <th className="text-center py-2.5 text-sm font-semibold text-[#1a1a1a] px-3">
                    STRIKE
                  </th>
                  {/* Puts Header */}
                  <th colSpan={showGreeks ? 7 : 6} className="text-center py-2.5 text-sm font-semibold text-red-400 border-l border-2 border-black">
                    PUTS
                  </th>
                </tr>
                <tr className="text-sm text-[#3C3C3C]">
                  {/* Calls Columns */}
                  <th className="px-3 py-2 text-left">Volume</th>
                  <th className="px-3 py-2 text-left">OI</th>
                  <th className="px-3 py-2 text-left">Last</th>
                  <th className="px-3 py-2 text-left">Bid×Ask</th>
                  <th className="px-3 py-2 text-left">Change</th>
                  <th className="px-3 py-2 text-left">IV</th>
                  {showGreeks && <th className="px-3 py-2 text-left border-r border-2 border-black">Delta</th>}

                  {/* Strike */}
                  <th className="px-3 py-2.5 text-center">Price</th>

                  {/* Puts Columns */}
                  {showGreeks && <th className="px-3 py-2 text-left border-l border-2 border-black">Delta</th>}
                  <th className="px-3 py-2 text-left">IV</th>
                  <th className="px-3 py-2 text-left">Change</th>
                  <th className="px-3 py-2 text-left">Bid×Ask</th>
                  <th className="px-3 py-2 text-left">Last</th>
                  <th className="px-3 py-2 text-left">OI</th>
                  <th className="px-3 py-2 text-left">Volume</th>
                </tr>
              </thead>
              <tbody>
                {allStrikes.map((strike) => {
                  const call = chainData.calls.find(c => c.strike === strike);
                  const put = chainData.puts.find(p => p.strike === strike);

                  if (!call && !put) return null;

                  return (
                    <tr key={strike} className="border-b border-2 border-black">
                      {/* Call Data */}
                      {call ? (
                        <>
                          <td className="px-3 py-2 text-sm text-[#3C3C3C]">{call.volume.toLocaleString()}</td>
                          <td className="px-3 py-2 text-sm text-[#3C3C3C]">{call.openInterest.toLocaleString()}</td>
                          <td className="px-3 py-2 text-sm">
                            <span className={cn(
                              'font-semibold',
                              call.change >= 0 ? 'text-green-400' : 'text-red-400'
                            )}>
                              ${call.lastPrice.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-sm text-[#3C3C3C]">
                            ${call.bid.toFixed(2)} × ${call.ask.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-sm">
                            <span className={cn(
                              'font-medium',
                              call.percentChange >= 0 ? 'text-green-400' : 'text-red-400'
                            )}>
                              {call.percentChange >= 0 ? '+' : ''}{call.percentChange.toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-3 py-2 text-sm text-[#1a1a1a]">
                            {(call.impliedVolatility * 100).toFixed(1)}%
                          </td>
                          {showGreeks && call.delta !== undefined && (
                            <td className="px-3 py-2 text-sm text-[#1a1a1a] border-r border-2 border-black">
                              {call.delta.toFixed(2)}
                            </td>
                          )}
                        </>
                      ) : (
                        <>
                          <td colSpan={showGreeks ? 7 : 6} className="px-3 py-2 text-sm text-[#3C3C3C] text-center">
                            No data
                          </td>
                        </>
                      )}

                      {/* Strike */}
                      <td className={cn(
                        'px-3 py-2.5 text-center font-bold',
                        Math.abs(strike - currentPrice) / currentPrice < 0.05 ? 'text-yellow-400 text-sm' : 'text-[#1a1a1a] text-sm'
                      )}>
                        ${strike.toFixed(2)}
                      </td>

                      {/* Put Data */}
                      {put ? (
                        <>
                          {showGreeks && put.delta !== undefined && (
                            <td className="px-3 py-2 text-sm text-[#1a1a1a] border-l border-2 border-black">
                              {put.delta.toFixed(2)}
                            </td>
                          )}
                          <td className="px-3 py-2 text-sm text-[#1a1a1a]">
                            {(put.impliedVolatility * 100).toFixed(1)}%
                          </td>
                          <td className="px-3 py-2 text-sm">
                            <span className={cn(
                              'font-medium',
                              put.percentChange >= 0 ? 'text-green-400' : 'text-red-400'
                            )}>
                              {put.percentChange >= 0 ? '+' : ''}{put.percentChange.toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-3 py-2 text-sm text-[#3C3C3C]">
                            ${put.bid.toFixed(2)} × ${put.ask.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-sm">
                            <span className={cn(
                              'font-semibold',
                              put.change >= 0 ? 'text-green-400' : 'text-red-400'
                            )}>
                              ${put.lastPrice.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-sm text-[#3C3C3C]">{put.openInterest.toLocaleString()}</td>
                          <td className="px-3 py-2 text-sm text-[#3C3C3C]">{put.volume.toLocaleString()}</td>
                        </>
                      ) : (
                        <>
                          <td colSpan={showGreeks ? 7 : 6} className="px-3 py-2 text-sm text-[#3C3C3C] text-center">
                            No data
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
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
              <p><strong className="text-[#1a1a1a]">ITM (In The Money):</strong> Call strike &lt; current price | Put strike &gt; current price</p>
              <p><strong className="text-[#1a1a1a]">ATM (At The Money):</strong> Strike price within 5% of current price (typically highest liquidity)</p>
              <p><strong className="text-[#1a1a1a]">IV (Implied Volatility):</strong> Market's expectation of future volatility (higher = more expensive options)</p>
              <p><strong className="text-[#1a1a1a]">OI (Open Interest):</strong> Total open contracts (indicates liquidity and interest)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OptionsChain;