import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
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
  ReferenceLine,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { cn } from '../../../lib/utils';
import {
  Target,
  TrendingUp,
  TrendingDown,
  Activity,
  Calculator,
  Info,
  RefreshCw,
  Percent,
  DollarSign
} from 'lucide-react';

interface ProbabilityMetrics {
  probITM: number; // Probability of expiring In-The-Money
  probOTM: number; // Probability of expiring Out-The-Money
  probTouch: number; // Probability of touching strike before expiration
  expectedMove: number; // Expected price move (1 std dev)
  expectedMoveDollar: number; // Expected move in dollars
  stdDev1Range: { low: number; high: number }; // 68% probability range
  stdDev2Range: { low: number; high: number }; // 95% probability range
  stdDev3Range: { low: number; high: number }; // 99.7% probability range
  winRate: number; // Estimated win rate
  breakeven: number; // Breakeven price for option
}

interface ProbabilityData {
  strike: number;
  optionType: 'CALL' | 'PUT';
  optionPrice: number;
  currentPrice: number;
  daysToExpiration: number;
  impliedVolatility: number;
  delta: number;
  metrics: ProbabilityMetrics;
  priceDistribution: Array<{
    price: number;
    probability: number;
    cumulativeProbability: number;
  }>;
}

interface ProbabilityCalculatorProps {
  symbol: string;
  currentPrice: number;
  className?: string;
}

/**
 * Options Probability Calculator Component
 * Features:
 * - Probability of expiring ITM/OTM
 * - Probability of touching strike
 * - Expected move calculation (1, 2, 3 standard deviations)
 * - Win rate estimation
 * - Breakeven calculation
 * - Monte Carlo simulation visualization
 * - Price distribution chart
 */
export const ProbabilityCalculator: React.FC<ProbabilityCalculatorProps> = ({
  symbol,
  currentPrice,
  className
}) => {
  const [strike, setStrike] = useState<number>(currentPrice);
  const [optionType, setOptionType] = useState<'CALL' | 'PUT'>('CALL');
  const [optionPrice, setOptionPrice] = useState<number>(currentPrice * 0.05);
  const [daysToExpiration, setDaysToExpiration] = useState<number>(30);
  const [impliedVolatility, setImpliedVolatility] = useState<number>(30);
  const [delta, setDelta] = useState<number>(0.5);
  const [probabilityData, setProbabilityData] = useState<ProbabilityData | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Calculate probability metrics
  const calculateProbabilities = () => {
    setIsCalculating(true);

    try {
      // Convert IV from percentage to decimal
      const iv = impliedVolatility / 100;

      // Convert days to years
      const timeToExpiration = daysToExpiration / 365;

      // Calculate expected move (1 standard deviation)
      // Expected Move = Stock Price × IV × √(Days to Expiration / 365)
      const expectedMove = iv * Math.sqrt(timeToExpiration);
      const expectedMoveDollar = currentPrice * expectedMove;

      // Calculate standard deviation ranges
      const stdDev1Range = {
        low: currentPrice * (1 - expectedMove),
        high: currentPrice * (1 + expectedMove)
      };

      const stdDev2Range = {
        low: currentPrice * (1 - 2 * expectedMove),
        high: currentPrice * (1 + 2 * expectedMove)
      };

      const stdDev3Range = {
        low: currentPrice * (1 - 3 * expectedMove),
        high: currentPrice * (1 + 3 * expectedMove)
      };

      // Probability of expiring ITM using Delta approximation
      // Delta is a good approximation of ITM probability
      let probITM = 0;
      if (optionType === 'CALL') {
        // For calls, use delta directly
        probITM = Math.abs(delta) * 100;
      } else {
        // For puts, delta is negative, so convert
        probITM = Math.abs(delta) * 100;
      }

      // Probability of expiring OTM
      const probOTM = 100 - probITM;

      // Probability of touching strike (approximately 2x probability of expiring ITM)
      // This is a rule of thumb in options trading
      const probTouch = Math.min(probITM * 2, 100);

      // Calculate breakeven
      const breakeven = optionType === 'CALL'
        ? strike + optionPrice
        : strike - optionPrice;

      // Estimate win rate (probability of profit)
      // For buyers: need price to move beyond breakeven
      // Using normal distribution to estimate
      const d1 = (Math.log(currentPrice / breakeven) + (0.5 * iv * iv * timeToExpiration)) / (iv * Math.sqrt(timeToExpiration));
      const N_d1 = normalCDF(d1);
      const winRate = optionType === 'CALL'
        ? N_d1 * 100
        : (1 - N_d1) * 100;

      // Generate price distribution (Monte Carlo style visualization)
      const priceDistribution = [];
      const numPoints = 50;
      const priceRange = stdDev3Range.high - stdDev3Range.low;
      const priceStep = priceRange / numPoints;

      let cumulativeProb = 0;
      for (let i = 0; i <= numPoints; i++) {
        const price = stdDev3Range.low + (i * priceStep);

        // Calculate probability using normal distribution
        const d = (Math.log(price / currentPrice) - (0.5 * iv * iv * timeToExpiration)) / (iv * Math.sqrt(timeToExpiration));
        const normalPdf = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * d * d);

        // Normalize probability
        const probability = normalPdf * 2; // Scaling factor for visualization

        cumulativeProb += probability;

        priceDistribution.push({
          price,
          probability,
          cumulativeProbability: cumulativeProb
        });
      }

      const metrics: ProbabilityMetrics = {
        probITM,
        probOTM,
        probTouch,
        expectedMove: expectedMove * 100,
        expectedMoveDollar,
        stdDev1Range,
        stdDev2Range,
        stdDev3Range,
        winRate,
        breakeven
      };

      const data: ProbabilityData = {
        strike,
        optionType,
        optionPrice,
        currentPrice,
        daysToExpiration,
        impliedVolatility,
        delta,
        metrics,
        priceDistribution
      };

      setProbabilityData(data);
    } catch (error) {
      console.error('Error calculating probabilities:', error);
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

  // Normal CDF (cumulative distribution function) approximation
  const normalCDF = (x: number): number => {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

    return x > 0 ? 1 - prob : prob;
  };

  // Auto-calculate on input change
  useEffect(() => {
    calculateProbabilities();
  }, [strike, optionType, optionPrice, daysToExpiration, impliedVolatility, delta, currentPrice]);

  // Custom tooltip for distribution chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border-3 border-black rounded-lg p-3 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-10">
              <span className="text-sm text-[#3C3C3C]">Price:</span>
              <span className="text-[#1a1a1a] font-semibold">${data.price.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between gap-10">
              <span className="text-sm text-[#3C3C3C]">Probability:</span>
              <span className="text-blue-400 font-semibold">{(data.probability * 10).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Input Controls */}
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2.5">
            <Calculator className="w-5 h-5 text-blue-400" />
            Probability Calculator Inputs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Option Type */}
            <div>
              <label className="text-sm text-[#3C3C3C] mb-2 block">Option Type</label>
              <div className="flex gap-2.5">
                <Button
                  variant={optionType === 'CALL'  ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setOptionType('CALL')}
                  className={cn('flex-1', optionType === "CALL" && "bg-playful-cream text-green-400")}
                >
                  CALL
                </Button>
                <Button
                  variant={optionType === 'PUT'  ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setOptionType('PUT')}
                  className={cn('flex-1', optionType === 'PUT' && 'bg-playful-cream text-red-400')}
                >
                  PUT
                </Button>
              </div>
            </div>

            {/* Strike Price */}
            <div>
              <label className="text-sm text-[#3C3C3C] mb-2 block">Strike Price ($)</label>
              <Input
                type="number"
                value={strike}
                onChange={(e) => setStrike(parseFloat(e.target.value) || currentPrice)}
                className="bg-white border-2 border-black"
                step="0.50"
              />
            </div>

            {/* Option Price */}
            <div>
              <label className="text-sm text-[#3C3C3C] mb-2 block">Option Price ($)</label>
              <Input
                type="number"
                value={optionPrice}
                onChange={(e) => setOptionPrice(parseFloat(e.target.value) || 0)}
                className="bg-white border-2 border-black"
                step="0.05"
              />
            </div>

            {/* Days to Expiration */}
            <div>
              <label className="text-sm text-[#3C3C3C] mb-2 block">Days to Expiration</label>
              <Input
                type="number"
                value={daysToExpiration}
                onChange={(e) => setDaysToExpiration(parseInt(e.target.value) || 30)}
                className="bg-white border-2 border-black"
                min="1"
                max="365"
              />
            </div>

            {/* Implied Volatility */}
            <div>
              <label className="text-sm text-[#3C3C3C] mb-2 block">Implied Volatility (%)</label>
              <Input
                type="number"
                value={impliedVolatility}
                onChange={(e) => setImpliedVolatility(parseFloat(e.target.value) || 30)}
                className="bg-white border-2 border-black"
                step="1"
                min="1"
                max="200"
              />
            </div>

            {/* Delta */}
            <div>
              <label className="text-sm text-[#3C3C3C] mb-2 block">Delta</label>
              <Input
                type="number"
                value={delta}
                onChange={(e) => setDelta(parseFloat(e.target.value) || 0.5)}
                className="bg-white border-2 border-black"
                step="0.01"
                min="-1"
                max="1"
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm text-[#3C3C3C]">
              Current Stock Price: <span className="text-[#1a1a1a] font-semibold">${currentPrice.toFixed(2)}</span>
            </div>
            <Button
              onClick={calculateProbabilities}
              variant="outline"
              size="sm"
              disabled={isCalculating}
            >
              <RefreshCw className={cn('w-4 h-4 mr-2', isCalculating && 'animate-spin')} />
              Recalculate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Probability Metrics */}
      {probabilityData && (
        <>
          {/* Key Probabilities */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            <Card className={cn('border',
              probabilityData.metrics.probITM > 50 ? 'bg-playful-cream border-2 border-black rounded-2xl shadow-md' : 'bg-playful-cream border-2 border-black rounded-2xl shadow-md'
            )}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2.5 mb-1">
                  <Target className={cn('w-4 h-4', probabilityData.metrics.probITM > 50 ? 'text-green-400' : 'text-red-400')} />
                  <span className="text-sm text-[#3C3C3C]">Prob ITM</span>
                </div>
                <div className={cn('text-sm font-bold',
                  probabilityData.metrics.probITM > 50 ? 'text-green-400' : 'text-red-400'
                )}>
                  {probabilityData.metrics.probITM.toFixed(1)}%
                </div>
                <div className="text-sm text-[#3C3C3C] mt-1">At expiration</div>
              </CardContent>
            </Card>

            <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
              <CardContent className="p-3">
                <div className="flex items-center gap-2.5 mb-1">
                  <Activity className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-[#3C3C3C]">Prob Touch</span>
                </div>
                <div className="text-sm font-bold text-blue-400">
                  {probabilityData.metrics.probTouch.toFixed(1)}%
                </div>
                <div className="text-sm text-[#3C3C3C] mt-1">Before expiration</div>
              </CardContent>
            </Card>

            <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
              <CardContent className="p-3">
                <div className="flex items-center gap-2.5 mb-1">
                  <Percent className="w-4 h-4 text-primary-400" />
                  <span className="text-sm text-[#3C3C3C]">Win Rate</span>
                </div>
                <div className="text-sm font-bold text-primary-400">
                  {probabilityData.metrics.winRate.toFixed(1)}%
                </div>
                <div className="text-sm text-[#3C3C3C] mt-1">Probability of profit</div>
              </CardContent>
            </Card>

            <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
              <CardContent className="p-3">
                <div className="flex items-center gap-2.5 mb-1">
                  <DollarSign className="w-4 h-4 text-orange-400" />
                  <span className="text-sm text-[#3C3C3C]">Breakeven</span>
                </div>
                <div className="text-sm font-bold text-[#1a1a1a]">
                  ${probabilityData.metrics.breakeven.toFixed(2)}
                </div>
                <div className="text-sm text-[#3C3C3C] mt-1">
                  {((probabilityData.metrics.breakeven - currentPrice) / currentPrice * 100).toFixed(1)}% move needed
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Expected Move */}
          <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2.5">
                <Activity className="w-5 h-5 text-blue-400" />
                Expected Price Move
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* 1 Standard Deviation (68% probability) */}
                <div className="p-3 bg-playful-cream border-2 border-black rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <Badge variant="outline" className="bg-playful-cream text-green-400 text-sm">
                        68% Probability
                      </Badge>
                      <span className="text-sm text-[#3C3C3C]">1 Standard Deviation</span>
                    </div>
                    <span className="text-sm font-semibold text-[#1a1a1a]">
                      ±{probabilityData.metrics.expectedMove.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#3C3C3C]">Price Range:</span>
                    <span className="text-[#1a1a1a] font-semibold">
                      ${probabilityData.metrics.stdDev1Range.low.toFixed(2)} - ${probabilityData.metrics.stdDev1Range.high.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-sm text-[#3C3C3C] mt-1">
                    Stock has 68% chance of staying within this range
                  </div>
                </div>

                {/* 2 Standard Deviations (95% probability) */}
                <div className="p-3 bg-playful-cream border-2 border-black rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <Badge variant="outline" className="bg-playful-cream text-yellow-400 text-sm">
                        95% Probability
                      </Badge>
                      <span className="text-sm text-[#3C3C3C]">2 Standard Deviations</span>
                    </div>
                    <span className="text-sm font-semibold text-[#1a1a1a]">
                      ±{(probabilityData.metrics.expectedMove * 2).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#3C3C3C]">Price Range:</span>
                    <span className="text-[#1a1a1a] font-semibold">
                      ${probabilityData.metrics.stdDev2Range.low.toFixed(2)} - ${probabilityData.metrics.stdDev2Range.high.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-sm text-[#3C3C3C] mt-1">
                    Stock has 95% chance of staying within this range
                  </div>
                </div>

                {/* 3 Standard Deviations (99.7% probability) */}
                <div className="p-3 bg-playful-cream border-2 border-black rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <Badge variant="outline" className="bg-playful-cream text-red-400 text-sm">
                        99.7% Probability
                      </Badge>
                      <span className="text-sm text-[#3C3C3C]">3 Standard Deviations</span>
                    </div>
                    <span className="text-sm font-semibold text-[#1a1a1a]">
                      ±{(probabilityData.metrics.expectedMove * 3).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#3C3C3C]">Price Range:</span>
                    <span className="text-[#1a1a1a] font-semibold">
                      ${probabilityData.metrics.stdDev3Range.low.toFixed(2)} - ${probabilityData.metrics.stdDev3Range.high.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-sm text-[#3C3C3C] mt-1">
                    Stock has 99.7% chance of staying within this range
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Price Distribution Chart */}
          <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2.5">
                <Activity className="w-5 h-5 text-primary-400" />
                Price Probability Distribution
              </CardTitle>
              <p className="text-sm text-[#3C3C3C] mt-1">
                Normal distribution showing likely price outcomes at expiration
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={probabilityData.priceDistribution} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="price"
                    stroke="#9ca3af"
                    style={{ fontSize: '13px' }}
                    label={{ value: 'Stock Price ($)', position: 'bottom', fill: '#9ca3af', fontSize: 11 }}
                    tickFormatter={(value) => `$${value.toFixed(0)}`}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    style={{ fontSize: '13px' }}
                    label={{ value: 'Probability Density', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 11 }}
                  />
                  <Tooltip content={<CustomTooltip />} />

                  <ReferenceLine x={currentPrice} stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" label={{ value: 'Current', fill: '#f59e0b', fontSize: 10 }} />
                  <ReferenceLine x={strike} stroke="#ef4444" strokeWidth={2} label={{ value: 'Strike', fill: '#ef4444', fontSize: 10 }} />
                  <ReferenceLine x={probabilityData.metrics.breakeven} stroke="#3b82f6" strokeWidth={2} strokeDasharray="3 3" label={{ value: 'Breakeven', fill: '#3b82f6', fontSize: 10 }} />

                  {/* 1 Std Dev Range */}
                  <ReferenceLine x={probabilityData.metrics.stdDev1Range.low} stroke="#10b981" strokeDasharray="2 2" opacity={0.5} />
                  <ReferenceLine x={probabilityData.metrics.stdDev1Range.high} stroke="#10b981" strokeDasharray="2 2" opacity={0.5} />

                  <Area
                    type="monotone"
                    dataKey="probability"
                    stroke="#8b5cf6"
                    fill="url(#colorProbability)"
                    fillOpacity={0.8}
                  />

                  <defs>
                    <linearGradient id="colorProbability" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9}/>
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>

              <div className="mt-3 p-3 bg-playful-cream border-2 border-black rounded-lg">
                <div className="flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-primary-400 mt-0.5" />
                  <div className="text-sm text-[#1a1a1a]">
                    <p className="font-semibold text-[#1a1a1a] mb-1">How to Read This Chart:</p>
                    <ul className="space-y-1 text-[#3C3C3C]">
                      <li>• <strong>Orange line:</strong> Current stock price</li>
                      <li>• <strong>Red line:</strong> Your option strike price</li>
                      <li>• <strong>Blue dashed line:</strong> Breakeven price</li>
                      <li>• <strong>Green dashed lines:</strong> ±1 std dev range (68% probability)</li>
                      <li>• <strong>Higher curve:</strong> More likely the stock will end at that price</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trading Insights */}
          <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
            <CardHeader>
              <CardTitle className="text-sm">Trading Insights Based on Probabilities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-10">
                <Badge
                  variant="outline"
                  className={cn(
                    'text-sm mt-0.5',
                    probabilityData.metrics.probITM > 60 ? 'bg-playful-cream text-green-400' : 'bg-playful-cream text-red-400'
                  )}
                >
                  {probabilityData.metrics.probITM > 60 ? 'HIGH' : 'LOW'}
                </Badge>
                <div className="text-sm text-[#1a1a1a]">
                  <p className="font-semibold text-[#1a1a1a]">ITM Probability:</p>
                  <p>
                    {probabilityData.metrics.probITM > 60
                      ? 'High probability option. Consider selling premium or conservative buying strategy.'
                      : 'Low probability option. High risk/reward. Consider lottery-style play or avoid.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-10">
                <Badge
                  variant="outline"
                  className={cn(
                    'text-sm mt-0.5',
                    probabilityData.metrics.winRate > 50 ? 'bg-playful-cream text-green-400' : 'bg-playful-cream text-yellow-400'
                  )}
                >
                  {probabilityData.metrics.winRate > 50 ? 'FAVOR' : 'RISK'}
                </Badge>
                <div className="text-sm text-[#1a1a1a]">
                  <p className="font-semibold text-[#1a1a1a]">Win Rate ({probabilityData.metrics.winRate.toFixed(1)}%):</p>
                  <p>
                    {probabilityData.metrics.winRate > 50
                      ? 'Probability favors this trade. Risk management still essential.'
                      : 'Low win rate. Only trade with strong conviction and proper position sizing.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-10">
                <Badge variant="outline" className="text-sm mt-0.5 bg-playful-cream text-blue-400">
                  MOVE
                </Badge>
                <div className="text-sm text-[#1a1a1a]">
                  <p className="font-semibold text-[#1a1a1a]">Expected Move:</p>
                  <p>
                    Stock expected to move ±${probabilityData.metrics.expectedMoveDollar.toFixed(2)} ({probabilityData.metrics.expectedMove.toFixed(1)}%)
                    by expiration. Position accordingly.
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
                  <p className="font-semibold text-[#1a1a1a]">Understanding Option Probabilities:</p>
                  <p><strong>Probability ITM:</strong> Chance option expires in-the-money (has intrinsic value). Approximated using Delta.</p>
                  <p><strong>Probability of Touch:</strong> Chance stock price touches strike before expiration. Roughly 2x ITM probability.</p>
                  <p><strong>Expected Move:</strong> 1 standard deviation price range. Stock has 68% chance of staying within this range.</p>
                  <p><strong>Win Rate:</strong> Probability of making a profit (price beyond breakeven). Uses normal distribution.</p>
                  <p className="mt-2 text-yellow-400"><strong>Important:</strong> These are estimates based on implied volatility and option pricing models. Actual outcomes may vary.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ProbabilityCalculator;
