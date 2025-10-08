import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
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
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  AlertCircle,
  Info,
  Calculator,
  Target,
  Shield
} from 'lucide-react';

// Spread Types
type SpreadType =
  | 'vertical_bull_call'
  | 'vertical_bear_put'
  | 'vertical_bear_call'
  | 'vertical_bull_put'
  | 'iron_condor'
  | 'iron_butterfly'
  | 'calendar'
  | 'diagonal';

interface OptionLeg {
  type: 'CALL' | 'PUT';
  action: 'BUY' | 'SELL';
  strike: number;
  expiration: string;
  price: number;
  quantity: number;
  impliedVolatility?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

interface SpreadAnalysis {
  spreadType: SpreadType;
  legs: OptionLeg[];
  netDebit: number;
  netCredit: number;
  maxProfit: number;
  maxLoss: number;
  breakeven: number[];
  riskRewardRatio: number;
  probabilityOfProfit: number;
  netGreeks: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
  };
  payoffChart: Array<{
    stockPrice: number;
    profit: number;
    breakeven: boolean;
  }>;
}

interface SpreadAnalysisProps {
  symbol: string;
  currentPrice: number;
  availableOptions: {
    calls: OptionLeg[];
    puts: OptionLeg[];
  };
  className?: string;
}

// Spread strategy templates
const SPREAD_STRATEGIES = {
  vertical_bull_call: {
    name: 'Bull Call Spread',
    description: 'Buy lower strike call, sell higher strike call. Bullish, limited risk/reward.',
    riskLevel: 'Low',
    complexity: 'Beginner',
    icon: TrendingUp,
    color: 'text-green-400'
  },
  vertical_bear_put: {
    name: 'Bear Put Spread',
    description: 'Buy higher strike put, sell lower strike put. Bearish, limited risk/reward.',
    riskLevel: 'Low',
    complexity: 'Beginner',
    icon: TrendingDown,
    color: 'text-red-400'
  },
  vertical_bear_call: {
    name: 'Bear Call Spread',
    description: 'Sell lower strike call, buy higher strike call. Bearish, collect credit.',
    riskLevel: 'Moderate',
    complexity: 'Intermediate',
    icon: TrendingDown,
    color: 'text-orange-400'
  },
  vertical_bull_put: {
    name: 'Bull Put Spread',
    description: 'Sell higher strike put, buy lower strike put. Bullish, collect credit.',
    riskLevel: 'Moderate',
    complexity: 'Intermediate',
    icon: TrendingUp,
    color: 'text-blue-400'
  },
  iron_condor: {
    name: 'Iron Condor',
    description: 'Sell OTM put spread + sell OTM call spread. Neutral, high probability.',
    riskLevel: 'Moderate',
    complexity: 'Advanced',
    icon: Activity,
    color: 'text-primary-400'
  },
  iron_butterfly: {
    name: 'Iron Butterfly',
    description: 'Sell ATM put + call, buy OTM put + call. Neutral, high premium.',
    riskLevel: 'High',
    complexity: 'Advanced',
    icon: Shield,
    color: 'text-yellow-400'
  },
  calendar: {
    name: 'Calendar Spread',
    description: 'Sell near-term option, buy far-term option. Neutral, theta play.',
    riskLevel: 'Moderate',
    complexity: 'Advanced',
    icon: Activity,
    color: 'text-cyan-400'
  },
  diagonal: {
    name: 'Diagonal Spread',
    description: 'Calendar spread with different strikes. Directional + theta play.',
    riskLevel: 'Moderate',
    complexity: 'Advanced',
    icon: Calculator,
    color: 'text-danger-400'
  }
};

/**
 * Multi-Leg Spread Analysis Component
 * Features:
 * - 8 pre-configured spread strategies
 * - Custom multi-leg builder
 * - Risk/Reward visualization
 * - Breakeven calculation
 * - P&L at expiration chart
 * - Net Greeks for portfolio
 * - Probability of profit
 */
export const SpreadAnalysis: React.FC<SpreadAnalysisProps> = ({
  symbol,
  currentPrice,
  availableOptions,
  className
}) => {
  const [selectedSpread, setSelectedSpread] = useState<SpreadType>('vertical_bull_call');
  const [customLegs, setCustomLegs] = useState<OptionLeg[]>([]);
  const [spreadAnalysis, setSpreadAnalysis] = useState<SpreadAnalysis | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [optionsData, setOptionsData] = useState<{ calls: OptionLeg[]; puts: OptionLeg[] }>(availableOptions || { calls: [], puts: [] });
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [selectedExpiration, setSelectedExpiration] = useState<string>('');
  const [availableExpirations, setAvailableExpirations] = useState<string[]>([]);
  const [lastFetchedSymbol, setLastFetchedSymbol] = useState<string>('');

  // Fetch real options data from API if not provided
  useEffect(() => {
    const fetchOptionsData = async () => {
      // Only skip fetch if availableOptions is provided AND has data
      const hasAvailableOptions = availableOptions &&
        (availableOptions.calls.length > 0 || availableOptions.puts.length > 0);

      // Skip if no symbol or has available options
      if (!symbol || hasAvailableOptions) return;

      // If we don't have expirations yet, fetch them first
      if (availableExpirations.length === 0) {
 console.log(' SpreadAnalysis - Fetching available expirations for:', symbol);
        try {
          const response = await fetch(
            `${ENV.INTEL_API_URL}/api/options/chain/${symbol}`
          );

          if (!response.ok) {
            throw new Error('Failed to fetch options data');
          }

          const apiResponse = await response.json();
 console.log(' Received expirations:', data.availableExpirations?.length || 0);

          // Set available expirations - prefer dates at least 7 days out
          if (data.availableExpirations && data.availableExpirations.length > 0) {
            setAvailableExpirations(data.availableExpirations);

            // Find first expiration at least 7 days out for better Greeks
            const today = new Date();
            const minDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

            const preferredExpiration = data.availableExpirations.find((exp: string) => {
              const expDate = new Date(exp);
              return expDate >= minDate;
            }) || data.availableExpirations[1] || data.availableExpirations[0];

 console.log(' Selected expiration:', preferredExpiration, '(at least 7 days out)');
            setSelectedExpiration(preferredExpiration);
            // Don't fetch options here - let the second useEffect handle it
            return;
          }
        } catch (error) {
 console.error(' Error fetching expirations:', error);
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
          setIsLoadingOptions(false);
          return;
        }
      }

      // If we have a selected expiration, fetch options for it
      if (!selectedExpiration) return;

 console.log(' SpreadAnalysis - Fetching options data for:', symbol, 'expiration:', selectedExpiration);
      setIsLoadingOptions(true);
      try {
        const response = await fetch(
          `${ENV.INTEL_API_URL}/api/options/chain/${symbol}?expiration=${selectedExpiration}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch options data');
        }

        const apiResponse = await response.json();
 console.log(' SpreadAnalysis - Received options data for expiration:', selectedExpiration, {
          calls: data.calls?.length || 0,
          puts: data.puts?.length || 0
        });

        // Transform calls data
        const calls: OptionLeg[] = (data.calls || []).map((call: any) => ({
          type: 'CALL' as const,
          action: 'BUY' as const,
          strike: call.strike,
          expiration: data.expiration || '',
          price: call.lastPrice || 0,
          quantity: 1,
          impliedVolatility: call.impliedVolatility || 0,
          delta: call.delta || 0,
          gamma: call.gamma || 0,
          theta: call.theta || 0,
          vega: call.vega || 0
        }));

        // Transform puts data
        const puts: OptionLeg[] = (data.puts || []).map((put: any) => ({
          type: 'PUT' as const,
          action: 'BUY' as const,
          strike: put.strike,
          expiration: data.expiration || '',
          price: put.lastPrice || 0,
          quantity: 1,
          impliedVolatility: put.impliedVolatility || 0,
          delta: put.delta || 0,
          gamma: put.gamma || 0,
          theta: put.theta || 0,
          vega: put.vega || 0
        }));

        // Log first call option to see what Greeks data we have
        if (calls.length > 0) {
 console.log(' Sample call option Greeks:', {
            strike: calls[0].strike,
            delta: calls[0].delta,
            gamma: calls[0].gamma,
            theta: calls[0].theta,
            vega: calls[0].vega
          });
        }

 console.log(' SpreadAnalysis - Transformed options data:', {
          calls: calls.length,
          puts: puts.length
        });

        setOptionsData({ calls, puts });
        setLastFetchedSymbol(symbol); // Mark this symbol as fetched
      } catch (error) {
 console.error('Error fetching options data:', error);
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
      } finally {
        setIsLoadingOptions(false);
      }
    };

    fetchOptionsData();
  }, [symbol, selectedExpiration, availableOptions]);

  // Calculate spread analysis
  const calculateSpread = (spreadType: SpreadType, legs: OptionLeg[]) => {
 console.log(' calculateSpread called:', {
      spreadType,
      legCount: legs.length,
      legs: legs.map(l => ({
        type: l.type,
        action: l.action,
        strike: l.strike,
        price: l.price,
        delta: l.delta,
        gamma: l.gamma,
        theta: l.theta,
        vega: l.vega
      }))
    });

    setIsCalculating(true);

    try {
      // Calculate net debit/credit
      let netCost = 0;
      legs.forEach(leg => {
        const cost = leg.price * leg.quantity * 100; // Options contract = 100 shares
        netCost += leg.action === 'BUY' ? cost : -cost;
      });

      const netDebit = netCost > 0 ? netCost : 0;
      const netCredit = netCost < 0 ? -netCost : 0;

      // Calculate max profit/loss
      let maxProfit = 0;
      let maxLoss = 0;
      let breakeven: number[] = [];

      // Calculate based on spread type
      switch (spreadType) {
        case 'vertical_bull_call': {
          // Buy lower strike, sell higher strike
          const longLeg = legs.find(l => l.action === 'BUY' && l.type === 'CALL');
          const shortLeg = legs.find(l => l.action === 'SELL' && l.type === 'CALL');
          if (longLeg && shortLeg) {
            maxLoss = netDebit;
            maxProfit = (shortLeg.strike - longLeg.strike) * 100 - netDebit;
            breakeven = [longLeg.strike + (netDebit / 100)];
          }
          break;
        }

        case 'vertical_bear_put': {
          // Buy higher strike, sell lower strike
          const longLeg = legs.find(l => l.action === 'BUY' && l.type === 'PUT');
          const shortLeg = legs.find(l => l.action === 'SELL' && l.type === 'PUT');
          if (longLeg && shortLeg) {
            maxLoss = netDebit;
            maxProfit = (longLeg.strike - shortLeg.strike) * 100 - netDebit;
            breakeven = [longLeg.strike - (netDebit / 100)];
          }
          break;
        }

        case 'vertical_bear_call': {
          // Sell lower strike, buy higher strike (credit spread)
          const shortLeg = legs.find(l => l.action === 'SELL' && l.type === 'CALL');
          const longLeg = legs.find(l => l.action === 'BUY' && l.type === 'CALL');
          if (shortLeg && longLeg) {
            maxProfit = netCredit;
            maxLoss = (longLeg.strike - shortLeg.strike) * 100 - netCredit;
            breakeven = [shortLeg.strike + (netCredit / 100)];
          }
          break;
        }

        case 'vertical_bull_put': {
          // Sell higher strike, buy lower strike (credit spread)
          const shortLeg = legs.find(l => l.action === 'SELL' && l.type === 'PUT');
          const longLeg = legs.find(l => l.action === 'BUY' && l.type === 'PUT');
          if (shortLeg && longLeg) {
            maxProfit = netCredit;
            maxLoss = (shortLeg.strike - longLeg.strike) * 100 - netCredit;
            breakeven = [shortLeg.strike - (netCredit / 100)];
          }
          break;
        }

        case 'iron_condor': {
          // 4-leg strategy: Bull put spread + Bear call spread
          maxProfit = netCredit;
          const strikes = legs.map(l => l.strike).sort((a, b) => a - b);
          maxLoss = Math.max(
            (strikes[1] - strikes[0]) * 100,
            (strikes[3] - strikes[2]) * 100
          ) - netCredit;
          breakeven = [
            strikes[1] - (netCredit / 100),
            strikes[2] + (netCredit / 100)
          ];
          break;
        }

        case 'iron_butterfly': {
          // 4-leg strategy: ATM butterfly
          maxProfit = netCredit;
          const strikes = legs.map(l => l.strike).sort((a, b) => a - b);
          const atmStrike = strikes[1]; // Middle strikes are ATM
          maxLoss = (strikes[2] - atmStrike) * 100 - netCredit;
          breakeven = [
            atmStrike - (netCredit / 100),
            atmStrike + (netCredit / 100)
          ];
          break;
        }

        default:
          maxProfit = netCredit || ((currentPrice * 0.1) * 100); // Estimate
          maxLoss = netDebit || ((currentPrice * 0.1) * 100); // Estimate
          breakeven = [currentPrice];
      }

      // Calculate risk/reward ratio
      const riskRewardRatio = maxLoss > 0 ? maxProfit / maxLoss : 0;

      // Calculate net Greeks
      const netGreeks = legs.reduce((acc, leg) => {
        const multiplier = leg.action === 'BUY' ? 1 : -1;
        return {
          delta: acc.delta + (leg.delta || 0) * multiplier * leg.quantity,
          gamma: acc.gamma + (leg.gamma || 0) * multiplier * leg.quantity,
          theta: acc.theta + (leg.theta || 0) * multiplier * leg.quantity,
          vega: acc.vega + (leg.vega || 0) * multiplier * leg.quantity
        };
      }, { delta: 0, gamma: 0, theta: 0, vega: 0 });

      // Estimate probability of profit (simplified using delta)
      const probabilityOfProfit = netDebit > 0
        ? Math.min(Math.abs(netGreeks.delta) * 100, 70) // Debit spread
        : Math.min(100 - Math.abs(netGreeks.delta) * 100, 70); // Credit spread

      // Generate payoff chart
      const minPrice = currentPrice * 0.7;
      const maxPrice = currentPrice * 1.3;
      const step = (maxPrice - minPrice) / 50;

      const payoffChart = [];
      for (let price = minPrice; price <= maxPrice; price += step) {
        let profit = netCredit - netDebit; // Start with initial credit/debit

        legs.forEach(leg => {
          const intrinsicValue = leg.type === 'CALL'
            ? Math.max(0, price - leg.strike)
            : Math.max(0, leg.strike - price);

          const legProfit = leg.action === 'BUY'
            ? (intrinsicValue - leg.price) * 100 * leg.quantity
            : (leg.price - intrinsicValue) * 100 * leg.quantity;

          profit += legProfit;
        });

        payoffChart.push({
          stockPrice: price,
          profit: profit,
          breakeven: breakeven.some(be => Math.abs(price - be) < step)
        });
      }

      const analysis: SpreadAnalysis = {
        spreadType,
        legs,
        netDebit,
        netCredit,
        maxProfit,
        maxLoss,
        breakeven,
        riskRewardRatio,
        probabilityOfProfit,
        netGreeks,
        payoffChart
      };

      setSpreadAnalysis(analysis);
    } catch (error) {
 console.error('Error calculating spread:', error);
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
    } finally {
      setIsCalculating(false);
    }
  };

  // Auto-calculate when legs change
  useEffect(() => {
    if (customLegs.length >= 2) {
      calculateSpread(selectedSpread, customLegs);
    }
  }, [customLegs, selectedSpread]);

  // Auto-build spread when options data is loaded (debounced)
  useEffect(() => {
 console.log(' Spread Analysis - Options data updated:', {
      calls: optionsData.calls.length,
      puts: optionsData.puts.length,
      selectedSpread
    });

    if (optionsData.calls.length === 0 && optionsData.puts.length === 0) return;

    // Debounce spread building to avoid rapid recalculations
    const timeoutId = setTimeout(() => {
 console.log(' Building spread from template:', selectedSpread);
      buildSpreadFromTemplate(selectedSpread);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [optionsData, selectedSpread]);

  // Build spread from template
  const buildSpreadFromTemplate = (spreadType: SpreadType) => {
    const calls = optionsData.calls.filter(c => c.price > 0);
    const puts = optionsData.puts.filter(p => p.price > 0);

    if (calls.length === 0 && puts.length === 0) return;

    let legs: OptionLeg[] = [];

    switch (spreadType) {
      case 'vertical_bull_call': {
        // Buy ATM call, sell OTM call
        const atmCall = calls.find(c => c.strike >= currentPrice) || calls[0];
        const otmCall = calls.find(c => c.strike > atmCall.strike) || calls[calls.length - 1];
 console.log(' Building vertical_bull_call:', {
          currentPrice,
          atmCall: { strike: atmCall.strike, delta: atmCall.delta },
          otmCall: { strike: otmCall.strike, delta: otmCall.delta }
        });
        legs = [
          { ...atmCall, action: 'BUY', quantity: 1 },
          { ...otmCall, action: 'SELL', quantity: 1 }
        ];
        break;
      }

      case 'vertical_bear_put': {
        // Buy ATM put, sell OTM put
        const atmPut = puts.find(p => p.strike <= currentPrice) || puts[0];
        const otmPut = puts.find(p => p.strike < atmPut.strike) || puts[puts.length - 1];
        legs = [
          { ...atmPut, action: 'BUY', quantity: 1 },
          { ...otmPut, action: 'SELL', quantity: 1 }
        ];
        break;
      }

      case 'iron_condor': {
        // Sell OTM put spread + sell OTM call spread
        const otmPuts = puts.filter(p => p.strike < currentPrice * 0.95);
        const otmCalls = calls.filter(c => c.strike > currentPrice * 1.05);

        if (otmPuts.length >= 2 && otmCalls.length >= 2) {
          legs = [
            { ...otmPuts[0], action: 'SELL', quantity: 1 },
            { ...otmPuts[1], action: 'BUY', quantity: 1 },
            { ...otmCalls[0], action: 'SELL', quantity: 1 },
            { ...otmCalls[1], action: 'BUY', quantity: 1 }
          ];
        }
        break;
      }

      case 'vertical_bear_call': {
        // Sell ATM call, buy OTM call (credit spread)
        const atmCall = calls.find(c => c.strike >= currentPrice) || calls[0];
        const otmCall = calls.find(c => c.strike > atmCall.strike) || calls[calls.length - 1];
        legs = [
          { ...atmCall, action: 'SELL', quantity: 1 },
          { ...otmCall, action: 'BUY', quantity: 1 }
        ];
        break;
      }

      case 'straddle': {
        // Buy ATM call and ATM put
        const atmCall = calls.find(c => c.strike >= currentPrice) || calls[0];
        const atmPut = puts.find(p => p.strike <= currentPrice) || puts[0];
        legs = [
          { ...atmCall, action: 'BUY', quantity: 1 },
          { ...atmPut, action: 'BUY', quantity: 1 }
        ];
        break;
      }

      default:
        // For unimplemented spreads, create a simple 2-leg call spread
        if (calls.length >= 2) {
          legs = [
            { ...calls[0], action: 'BUY', quantity: 1 },
            { ...calls[1], action: 'SELL', quantity: 1 }
          ];
        }
    }

 console.log(' Built spread legs:', {
      spreadType,
      legCount: legs.length,
      legs: legs.map(l => ({ type: l.type, action: l.action, strike: l.strike, delta: l.delta }))
    });

    if (legs.length > 0) {
      setCustomLegs(legs);
    }
  };

  const strategy = SPREAD_STRATEGIES[selectedSpread];
  const StrategyIcon = strategy.icon;

  return (
    <div className={cn('space-y-3', className, 'relative')}>
      {/* Loading Overlay */}
      {(isLoadingOptions || isCalculating) && (
        <div className="absolute inset-0 bg-black/10 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
          <div className="bg-playful-cream border border-2 border-black rounded-lg p-3 flex flex-col items-center gap-10">
            <Activity className="w-8 h-8 text-blue-400 animate-spin" />
            <p className="text-[#1a1a1a] font-semibold">
              {isLoadingOptions ? 'Loading Options Data' : 'Calculating Spread'}
            </p>
            <p className="text-sm text-[#3C3C3C]">
              {isLoadingOptions
                ? `Fetching real-time options chain for ${symbol}...`
                : 'Analyzing P/L, Greeks, and risk metrics...'}
            </p>
          </div>
        </div>
      )}

      {/* Strategy Selector */}
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md border-2 border-black">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2.5">
            <Calculator className="w-5 h-5 text-blue-400" />
            Multi-Leg Spread Builder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-[#3C3C3C] mb-2 block">Select Spread Strategy</label>
              <Select
                value={selectedSpread}
                onValueChange={(value) => {
                  setSelectedSpread(value as SpreadType);
                  buildSpreadFromTemplate(value as SpreadType);
                }}
              >
                <SelectTrigger className="w-full bg-white border-2 border-black">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-2 border-black">
                  {Object.entries(SPREAD_STRATEGIES).map(([key, strat]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2.5">
                        <strat.icon className={cn('w-4 h-4', strat.color)} />
                        <span>{strat.name}</span>
                        <Badge variant="secondary" className="text-sm ml-2">
                          {strat.complexity}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Strategy Description */}
            <Card className={cn('border',
              strategy.riskLevel === 'Low' && 'bg-playful-cream border-2 border-black rounded-2xl shadow-md',
              strategy.riskLevel === 'Moderate' && 'bg-playful-cream border-2 border-black rounded-2xl shadow-md',
              strategy.riskLevel === 'High' && 'bg-playful-cream border-2 border-black rounded-2xl shadow-md'
            )}>
              <CardContent className="p-3">
                <div className="flex items-start gap-10">
                  <StrategyIcon className={cn('w-8 h-8 mt-0.5', strategy.color)} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2.5 mb-2">
                      <h4 className="font-semibold text-[#1a1a1a]">{strategy.name}</h4>
                      <Badge variant="secondary" className="text-sm">
                        {strategy.riskLevel} Risk
                      </Badge>
                    </div>
                    <p className="text-sm text-[#1a1a1a]">{strategy.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Spread Analysis Results */}
      {spreadAnalysis && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            <Card className={cn('border',
              spreadAnalysis.netDebit > 0 ? 'bg-playful-cream border-2 border-black rounded-2xl shadow-md' : 'bg-playful-cream border-2 border-black rounded-2xl shadow-md'
            )}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2.5 mb-1">
                  <DollarSign className={cn('w-4 h-4', spreadAnalysis.netDebit > 0 ? 'text-red-400' : 'text-green-400')} />
                  <span className="text-sm text-[#3C3C3C]">
                    {spreadAnalysis.netDebit > 0 ? 'Net Debit' : 'Net Credit'}
                  </span>
                </div>
                <div className={cn('text-sm font-bold',
                  spreadAnalysis.netDebit > 0 ? 'text-red-400' : 'text-green-400'
                )}>
                  ${Math.abs(spreadAnalysis.netDebit || spreadAnalysis.netCredit).toFixed(0)}
                </div>
                <div className="text-sm text-[#3C3C3C] mt-1">
                  {spreadAnalysis.netDebit > 0 ? 'Initial cost' : 'Premium received'}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
              <CardContent className="p-3">
                <div className="flex items-center gap-2.5 mb-1">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-[#3C3C3C]">Max Profit</span>
                </div>
                <div className="text-sm font-bold text-green-400">
                  ${spreadAnalysis.maxProfit.toFixed(0)}
                </div>
                <div className="text-sm text-[#3C3C3C] mt-1">
                  Best case scenario
                </div>
              </CardContent>
            </Card>

            <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
              <CardContent className="p-3">
                <div className="flex items-center gap-2.5 mb-1">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-[#3C3C3C]">Max Loss</span>
                </div>
                <div className="text-sm font-bold text-red-400">
                  ${spreadAnalysis.maxLoss.toFixed(0)}
                </div>
                <div className="text-sm text-[#3C3C3C] mt-1">
                  Worst case scenario
                </div>
              </CardContent>
            </Card>

            <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
              <CardContent className="p-3">
                <div className="flex items-center gap-2.5 mb-1">
                  <Target className="w-4 h-4 text-primary-400" />
                  <span className="text-sm text-[#3C3C3C]">Risk/Reward</span>
                </div>
                <div className="text-sm font-bold text-[#1a1a1a]">
                  {spreadAnalysis.riskRewardRatio.toFixed(2)}
                </div>
                <div className="text-sm text-[#3C3C3C] mt-1">
                  {spreadAnalysis.riskRewardRatio >= 2 ? 'Excellent' : spreadAnalysis.riskRewardRatio >= 1 ? 'Good' : 'Poor'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Breakeven & Probability */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
              <CardContent className="p-3">
                <div className="flex items-center gap-2.5 mb-3">
                  <Target className="w-5 h-5 text-blue-400" />
                  <span className="text-sm font-semibold text-[#1a1a1a]">Breakeven Price(s)</span>
                </div>
                <div className="space-y-2">
                  {spreadAnalysis.breakeven.map((be, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-[#3C3C3C]">
                        {spreadAnalysis.breakeven.length > 1 ? `Breakeven ${index + 1}` : 'Breakeven'}
                      </span>
                      <span className="text-sm font-bold text-blue-400">
                        ${be.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-2 border-black">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#3C3C3C]">Current Price</span>
                      <span className="text-sm text-[#1a1a1a]">${currentPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
              <CardContent className="p-3">
                <div className="flex items-center gap-2.5 mb-3">
                  <Activity className="w-5 h-5 text-primary-400" />
                  <span className="text-sm font-semibold text-[#1a1a1a]">Probability of Profit</span>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-primary-400 mb-2">
                    {spreadAnalysis.probabilityOfProfit.toFixed(0)}%
                  </div>
                  <div className="w-full bg-playful-cream rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-playful-green to-blue-500 h-full transition-all"
                      style={{ width: `${spreadAnalysis.probabilityOfProfit}%` }}
                    />
                  </div>
                  <p className="text-sm text-[#3C3C3C] mt-2">
                    {spreadAnalysis.probabilityOfProfit > 60 ? 'High probability trade' :
                     spreadAnalysis.probabilityOfProfit > 40 ? 'Moderate probability' :
                     'Low probability (high risk/reward)'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payoff Chart */}
          <Card className="bg-white border-2 border-black rounded-2xl shadow-md border-2 border-black">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2.5">
                <Activity className="w-5 h-5 text-blue-400" />
                Profit/Loss at Expiration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={spreadAnalysis.payoffChart} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="stockPrice"
                    stroke="#9ca3af"
                    style={{ fontSize: '13px' }}
                    label={{ value: 'Stock Price at Expiration ($)', position: 'bottom', fill: '#9ca3af', fontSize: 11 }}
                    tickFormatter={(value) => `$${value.toFixed(0)}`}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    style={{ fontSize: '13px' }}
                    label={{ value: 'Profit/Loss ($)', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 11 }}
                    tickFormatter={(value) => `$${value.toFixed(0)}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '2px solid #000000',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`$${value.toFixed(0)}`, 'P/L']}
                    labelFormatter={(label) => `Stock Price: $${parseFloat(label).toFixed(2)}`}
                  />
                  <ReferenceLine y={0} stroke="#6b7280" strokeWidth={2} />
                  <ReferenceLine x={currentPrice} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: 'Current', fill: '#f59e0b', fontSize: 10 }} />

                  {spreadAnalysis.breakeven.map((be, index) => (
                    <ReferenceLine
                      key={`breakeven-${index}`}
                      x={be}
                      stroke="#3b82f6"
                      strokeDasharray="3 3"
                      label={{ value: `BE${index + 1}`, fill: '#3b82f6', fontSize: 10 }}
                    />
                  ))}

                  <Area
                    type="monotone"
                    dataKey="profit"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#colorProfit)"
                    fillOpacity={0.6}
                  />

                  <defs>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="50%" stopColor="#6b7280" stopOpacity={0.3}/>
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>

              <div className="mt-3 p-3 bg-playful-cream border-2 border-black rounded-lg">
                <div className="flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-400 mt-0.5" />
                  <div className="text-sm text-[#1a1a1a]">
                    <p className="font-semibold text-[#1a1a1a] mb-1">How to Read This Chart:</p>
                    <ul className="space-y-1 text-[#3C3C3C]">
                      <li>• <strong>Green area above $0:</strong> Profitable region</li>
                      <li>• <strong>Red area below $0:</strong> Loss region</li>
                      <li>• <strong>Blue dashed lines:</strong> Breakeven points</li>
                      <li>• <strong>Orange line:</strong> Current stock price</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Net Greeks */}
          <Card className="bg-white border-2 border-black rounded-2xl shadow-md border-2 border-black">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-primary-400" />
                Portfolio Greeks (Net Exposure)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
                <div className="p-3 bg-playful-cream border-2 border-black rounded-lg">
                  <div className="text-sm text-[#3C3C3C] mb-1">Net Delta (Δ)</div>
                  <div className={cn('text-sm font-bold',
                    spreadAnalysis.netGreeks.delta > 0 ? 'text-green-400' :
                    spreadAnalysis.netGreeks.delta < 0 ? 'text-red-400' : 'text-[#3C3C3C]'
                  )}>
                    {spreadAnalysis.netGreeks.delta.toFixed(2)}
                  </div>
                  <div className="text-sm text-[#3C3C3C] mt-1">Directional</div>
                </div>

                <div className="p-3 bg-playful-cream border-2 border-black rounded-lg">
                  <div className="text-sm text-[#3C3C3C] mb-1">Net Gamma (Γ)</div>
                  <div className="text-sm font-bold text-[#1a1a1a]">
                    {spreadAnalysis.netGreeks.gamma.toFixed(4)}
                  </div>
                  <div className="text-sm text-[#3C3C3C] mt-1">Acceleration</div>
                </div>

                <div className="p-3 bg-playful-cream border-2 border-black rounded-lg">
                  <div className="text-sm text-[#3C3C3C] mb-1">Net Theta (Θ)</div>
                  <div className="text-sm font-bold text-red-400">
                    {spreadAnalysis.netGreeks.theta.toFixed(2)}
                  </div>
                  <div className="text-sm text-[#3C3C3C] mt-1">Daily decay</div>
                </div>

                <div className="p-3 bg-playful-cream border-2 border-black rounded-lg">
                  <div className="text-sm text-[#3C3C3C] mb-1">Net Vega (ν)</div>
                  <div className="text-sm font-bold text-[#1a1a1a]">
                    {spreadAnalysis.netGreeks.vega.toFixed(2)}
                  </div>
                  <div className="text-sm text-[#3C3C3C] mt-1">IV sensitivity</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Spread Legs Breakdown */}
          <Card className="bg-white border-2 border-black rounded-2xl shadow-md border-2 border-black">
            <CardHeader>
              <CardTitle className="text-sm">Spread Legs</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white border-b border-2 border-black">
                    <tr className="text-sm text-[#3C3C3C]">
                      <th className="px-3 py-2.5 text-left">Action</th>
                      <th className="px-3 py-2.5 text-left">Type</th>
                      <th className="px-3 py-2.5 text-right">Strike</th>
                      <th className="px-3 py-2.5 text-right">Price</th>
                      <th className="px-3 py-2.5 text-right">Quantity</th>
                      <th className="px-3 py-2.5 text-right">Cost/Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spreadAnalysis.legs.map((leg, index) => {
                      const cost = leg.price * leg.quantity * 100;
                      const isDebit = leg.action === 'BUY';

                      return (
                        <tr key={index} className="border-b border-2 border-black hover:bg-white border-2 border-black rounded-2xl shadow-md">
                          <td className="px-3 py-2.5 text-sm">
                            <Badge variant="secondary" className={cn(
                              isDebit ? 'bg-playful-cream text-red-400' : 'bg-playful-cream text-green-400'
                            )}>
                              {leg.action}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 text-sm">
                            <Badge variant="secondary" className={cn(
                              leg.type === 'CALL' ? 'bg-playful-cream text-green-400' : 'bg-playful-cream text-red-400'
                            )}>
                              {leg.type}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 text-sm text-right text-[#1a1a1a] font-semibold">
                            ${leg.strike.toFixed(2)}
                          </td>
                          <td className="px-3 py-2.5 text-sm text-right text-[#1a1a1a]">
                            ${leg.price.toFixed(2)}
                          </td>
                          <td className="px-3 py-2.5 text-sm text-right text-[#1a1a1a]">
                            {leg.quantity}
                          </td>
                          <td className="px-3 py-2.5 text-sm text-right font-semibold">
                            <span className={cn(isDebit ? 'text-red-400' : 'text-green-400')}>
                              {isDebit ? '-' : '+'}${cost.toFixed(0)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Info Card */}
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
        <CardContent className="p-3">
          <div className="flex items-start gap-10">
            <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-[#1a1a1a] space-y-1">
              <p className="font-semibold text-[#1a1a1a]">Multi-Leg Spread Trading Tips:</p>
              <p><strong>Vertical Spreads:</strong> Limited risk/reward. Great for beginners. Use in trending markets.</p>
              <p><strong>Iron Condor:</strong> Profit from low volatility. Best when IV is high and you expect range-bound movement.</p>
              <p><strong>Calendar Spreads:</strong> Profit from time decay. Best with stable underlying and high IV.</p>
              <p><strong>Risk Management:</strong> Never risk more than 2-5% of portfolio on a single spread.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SpreadAnalysis;
