import React from 'react';
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
import { cn } from '../../../lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  AlertTriangle,
  Award
} from 'lucide-react';

interface BacktestResult {
  summary: {
    totalReturn: number;
    annualReturn: number;
    annualVolatility: number;
    sharpeRatio: number;
    sortinoRatio: number;
    maxDrawdown: number;
    winRate: number;
    finalValue: number;
  };
  portfolioHistory: Array<{
    date: string;
    value: number;
    benchmarkValue?: number;
    drawdown?: number;
    returns?: number;
  }>;
  yearlyReturns?: Array<{
    year: string;
    return: number;
  }>;
}

interface BacktestChartProps {
  data: BacktestResult;
  className?: string;
  benchmarkSymbol?: string; // xStock benchmark symbol (e.g., "AVGOx")
}

/**
 * Professional Backtest Results Chart Component
 * Features:
 * - Portfolio value vs benchmark line chart
 * - Drawdown underwater equity chart
 * - Returns distribution histogram
 * - Performance metrics cards
 */
export const BacktestChart: React.FC<BacktestChartProps> = ({ data, className, benchmarkSymbol = 'AAPLx' }) => {
  const { summary, portfolioHistory, yearlyReturns } = data;

  // Custom tooltip for portfolio value chart
  const PortfolioTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800/95 border border-black/10 rounded-lg p-3 shadow-xl">
          <p className="text-sm text-[#3C3C3C] mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2.5 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-[#1a1a1a]">{entry.name}:</span>
              <span className="text-[#1a1a1a] font-semibold">
                ${entry.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for drawdown chart
  const DrawdownTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800/95 border border-black/10 rounded-lg p-3 shadow-xl">
          <p className="text-sm text-[#3C3C3C] mb-2">{label}</p>
          <div className="flex items-center gap-2.5 text-sm">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-[#1a1a1a]">Drawdown:</span>
            <span className="text-red-400 font-semibold">
              {payload[0].value.toFixed(2)}%
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const getMetricColor = (value: number, type: 'return' | 'sharpe' | 'drawdown' | 'winrate') => {
    switch (type) {
      case 'return':
        return value > 0 ? 'text-green-400' : 'text-red-400';
      case 'sharpe':
        if (value > 2) return 'text-green-400';
        if (value > 1) return 'text-blue-400';
        if (value > 0.5) return 'text-yellow-400';
        return 'text-red-400';
      case 'drawdown':
        if (Math.abs(value) < 10) return 'text-green-400';
        if (Math.abs(value) < 20) return 'text-yellow-400';
        return 'text-red-400';
      case 'winrate':
        if (value > 60) return 'text-green-400';
        if (value > 50) return 'text-blue-400';
        return 'text-yellow-400';
      default:
        return 'text-[#3C3C3C]';
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Performance Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
        {/* Total Return */}
        <Card className="glass-card border-black/10/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#3C3C3C]">Total Return</span>
              {summary.totalReturn > 0 ? (
                <TrendingUp className="w-4 h-4 text-green-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
            </div>
            <div className={cn('text-sm font-bold', getMetricColor(summary.totalReturn, 'return'))}>
              {summary.totalReturn > 0 ? '+' : ''}{summary.totalReturn.toFixed(2)}%
            </div>
            <div className="text-sm text-[#3C3C3C] mt-1">
              Final: ${summary.finalValue.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        {/* Sharpe Ratio */}
        <Card className="glass-card border-black/10/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#3C3C3C]">Sharpe Ratio</span>
              <Target className="w-4 h-4 text-blue-400" />
            </div>
            <div className={cn('text-sm font-bold', getMetricColor(summary.sharpeRatio, 'sharpe'))}>
              {summary.sharpeRatio.toFixed(2)}
            </div>
            <div className="text-sm text-[#3C3C3C] mt-1">
              {summary.sharpeRatio > 2 ? 'Excellent' : summary.sharpeRatio > 1 ? 'Good' : summary.sharpeRatio > 0.5 ? 'Average' : 'Poor'}
            </div>
          </CardContent>
        </Card>

        {/* Max Drawdown */}
        <Card className="glass-card border-black/10/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#3C3C3C]">Max Drawdown</span>
              <AlertTriangle className="w-4 h-4 text-orange-400" />
            </div>
            <div className={cn('text-sm font-bold', getMetricColor(summary.maxDrawdown, 'drawdown'))}>
              {summary.maxDrawdown.toFixed(2)}%
            </div>
            <div className="text-sm text-[#3C3C3C] mt-1">
              Worst decline
            </div>
          </CardContent>
        </Card>

        {/* Win Rate */}
        <Card className="glass-card border-black/10/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#3C3C3C]">Win Rate</span>
              <Award className="w-4 h-4 text-primary-400" />
            </div>
            <div className={cn('text-sm font-bold', getMetricColor(summary.winRate, 'winrate'))}>
              {summary.winRate.toFixed(1)}%
            </div>
            <div className="text-sm text-[#3C3C3C] mt-1">
              Success rate
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Value vs Benchmark Chart */}
      <Card className="glass-card border-black/10/50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-blue-400" />
            Portfolio Value Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={portfolioHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                style={{ fontSize: '14px' }}
              />
              <YAxis
                stroke="#9ca3af"
                style={{ fontSize: '14px' }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip content={<PortfolioTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '14px' }}
                iconType="line"
              />
              <Line
                type="monotone"
                dataKey="value"
                name="Portfolio"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
              {portfolioHistory[0]?.benchmarkValue && (
                <Line
                  type="monotone"
                  dataKey="benchmarkValue"
                  name={`Benchmark (${benchmarkSymbol})`}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Drawdown Chart (Underwater Equity) */}
      <Card className="glass-card border-black/10/50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2.5">
            <TrendingDown className="w-5 h-5 text-red-400" />
            Drawdown (Underwater Equity)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={portfolioHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                style={{ fontSize: '14px' }}
              />
              <YAxis
                stroke="#9ca3af"
                style={{ fontSize: '14px' }}
                tickFormatter={(value) => `${value.toFixed(2)}%`}
              />
              <Tooltip content={<DrawdownTooltip />} />
              <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="drawdown"
                name="Drawdown"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Yearly Returns Bar Chart */}
      {yearlyReturns && yearlyReturns.length > 0 && (
        <Card className="glass-card border-black/10/50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2.5">
              <BarChart className="w-5 h-5 text-primary-400" />
              Yearly Returns Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={yearlyReturns}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="year"
                  stroke="#9ca3af"
                  style={{ fontSize: '14px' }}
                />
                <YAxis
                  stroke="#9ca3af"
                  style={{ fontSize: '14px' }}
                  tickFormatter={(value) => `${value.toFixed(2)}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value.toFixed(2)}%`, 'Return']}
                />
                <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="3 3" />
                <Bar
                  dataKey="return"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                >
                  {yearlyReturns.map((entry, index) => (
                    <Bar
                      key={index}
                      fill={entry.return > 0 ? '#10b981' : '#ef4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Additional Risk Metrics */}
      <Card className="glass-card border-black/10/50">
        <CardHeader>
          <CardTitle className="text-sm">Risk-Adjusted Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-10">
            <div>
              <div className="text-sm text-[#3C3C3C] mb-1">Annual Return</div>
              <div className={cn('text-sm font-semibold', getMetricColor(summary.annualReturn, 'return'))}>
                {summary.annualReturn.toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-sm text-[#3C3C3C] mb-1">Annual Volatility</div>
              <div className="text-sm font-semibold text-[#1a1a1a]">
                {summary.annualVolatility.toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-sm text-[#3C3C3C] mb-1">Sortino Ratio</div>
              <div className={cn('text-sm font-semibold', getMetricColor(summary.sortinoRatio, 'sharpe'))}>
                {summary.sortinoRatio.toFixed(2)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BacktestChart;