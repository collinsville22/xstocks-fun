import React from 'react';
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
import { cn } from '../../../lib/utils';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';

interface PositionAttribution {
  symbol: string;
  contribution: number;
  gain: number;
  weight: number;
  gainPercent: number;
}

interface PerformanceAttributionBarProps {
  positions: PositionAttribution[];
  className?: string;
}

/**
 * Performance Attribution Bar Chart Component
 * Features:
 * - Horizontal bar chart showing position-level contribution to performance
 * - X-axis: Contribution to return (%)
 * - Y-axis: Stock symbols
 * - Bars colored green for positive, red for negative
 * - Sorted by contribution (highest to lowest)
 * - Tooltip with symbol, contribution %, gain $, weight %
 * - Reference line at 0%
 * - Responsive design with dark theme
 */
export const PerformanceAttributionBar: React.FC<PerformanceAttributionBarProps> = ({
  positions,
  className
}) => {
  // Sort positions by contribution (highest to lowest)
  const sortedPositions = [...positions].sort((a, b) => b.contribution - a.contribution);

  // Prepare chart data
  const chartData = sortedPositions.map((position) => ({
    symbol: position.symbol,
    contribution: position.contribution,
    gain: position.gain,
    weight: position.weight,
    gainPercent: position.gainPercent,
    isPositive: position.contribution > 0
  }));

  // Calculate total contribution for validation
  const totalContribution = positions.reduce((sum, pos) => sum + pos.contribution, 0);
  const positiveContributors = positions.filter(pos => pos.contribution > 0).length;
  const negativeContributors = positions.filter(pos => pos.contribution < 0).length;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/95 border-2 border-black rounded-lg p-3 shadow-xl">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-10 mb-2 pb-2 border-b-2 border-black/20">
              <span className="text-sm font-bold text-[#1a1a1a]">{data.symbol}</span>
              <Badge
                variant="secondary"
                className={cn(
                  'text-sm border-2',
                  data.isPositive
                    ? 'bg-playful-green/20 text-playful-green border-playful-green'
                    : 'bg-playful-orange/20 text-playful-orange border-playful-orange'
                )}
              >
                {data.isPositive ? 'Positive' : 'Negative'}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-10">
              <span className="text-sm text-[#3C3C3C] font-medium">Contribution:</span>
              <span className={cn(
                'font-bold',
                data.isPositive ? 'text-playful-green' : 'text-playful-orange'
              )}>
                {data.contribution > 0 ? '+' : ''}{data.contribution.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center justify-between gap-10">
              <span className="text-sm text-[#3C3C3C] font-medium">Position Gain:</span>
              <span className={cn(
                'font-semibold',
                data.gain > 0 ? 'text-playful-green' : data.gain < 0 ? 'text-playful-orange' : 'text-[#3C3C3C]'
              )}>
                {data.gain > 0 ? '+' : ''}${data.gain.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between gap-10">
              <span className="text-sm text-[#3C3C3C] font-medium">Position Return:</span>
              <span className={cn(
                'font-semibold',
                data.gainPercent > 0 ? 'text-playful-green' : data.gainPercent < 0 ? 'text-playful-orange' : 'text-[#3C3C3C]'
              )}>
                {data.gainPercent > 0 ? '+' : ''}{data.gainPercent.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center justify-between gap-10">
              <span className="text-sm text-[#3C3C3C]">Portfolio Weight:</span>
              <span className="text-[#1a1a1a] font-semibold">
                {data.weight.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!positions || positions.length === 0) {
    return (
      <Card className="glass-card border-black/10/50">
        <CardContent className="p-3 text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 text-[#3C3C3C]" />
          <p className="text-[#3C3C3C]">No performance attribution data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('glass-card border-black/10/50', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2.5">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              Performance Attribution by Position
            </CardTitle>
            <p className="text-sm text-[#3C3C3C] mt-1">
              Each position's contribution to overall portfolio return
            </p>
          </div>
          <div className="flex items-center gap-10">
            <div className="text-right">
              <div className="text-sm text-[#3C3C3C]">Total Contribution</div>
              <div className={cn(
                'text-sm font-bold',
                totalContribution > 0 ? 'text-green-400' : totalContribution < 0 ? 'text-red-400' : 'text-[#3C3C3C]'
              )}>
                {totalContribution > 0 ? '+' : ''}{totalContribution.toFixed(2)}%
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-[#3C3C3C]">Contributors</div>
              <div className="text-sm text-[#1a1a1a]">
                <span className="text-green-400 font-semibold">{positiveContributors}</span>
                {' / '}
                <span className="text-red-400 font-semibold">{negativeContributors}</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(400, chartData.length * 35)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 80, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
            <XAxis
              type="number"
              stroke="#9ca3af"
              style={{ fontSize: '14px' }}
              label={{
                value: 'Contribution to Portfolio Return (%)',
                position: 'insideBottom',
                offset: -10,
                fill: '#9ca3af',
                fontSize: 12
              }}
              tickFormatter={(value) => `${value}%`}
            />
            <YAxis
              type="category"
              dataKey="symbol"
              stroke="#9ca3af"
              style={{ fontSize: '14px', fontWeight: 600 }}
              width={70}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} />
            <ReferenceLine
              x={0}
              stroke="#6b7280"
              strokeWidth={2}
              label={{
                value: 'Break Even',
                fill: '#6b7280',
                fontSize: 11,
                position: 'top'
              }}
            />
            <Bar
              dataKey="contribution"
              name="Contribution"
              radius={[0, 4, 4, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isPositive ? '#10b981' : '#ef4444'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Top Contributors/Detractors Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-3">
          {/* Top Contributors */}
          <div className="bg-playful-cream border-2 border-black rounded-lg p-3">
            <div className="flex items-center gap-2.5 mb-3">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <span className="text-sm font-semibold text-[#1a1a1a]">Top Contributors</span>
            </div>
            <div className="space-y-2">
              {sortedPositions
                .filter(pos => pos.contribution > 0)
                .slice(0, 3)
                .map((pos, index) => (
                  <div
                    key={pos.symbol}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-[#3C3C3C]">#{index + 1}</span>
                      <span className="text-[#1a1a1a] font-semibold">{pos.symbol}</span>
                    </div>
                    <span className="text-green-400 font-bold">
                      +{pos.contribution.toFixed(2)}%
                    </span>
                  </div>
                ))}
              {sortedPositions.filter(pos => pos.contribution > 0).length === 0 && (
                <p className="text-sm text-[#3C3C3C] italic">No positive contributors</p>
              )}
            </div>
          </div>

          {/* Top Detractors */}
          <div className="bg-playful-cream border-2 border-black rounded-lg p-3">
            <div className="flex items-center gap-2.5 mb-3">
              <TrendingDown className="w-5 h-5 text-red-400" />
              <span className="text-sm font-semibold text-[#1a1a1a]">Top Detractors</span>
            </div>
            <div className="space-y-2">
              {sortedPositions
                .filter(pos => pos.contribution < 0)
                .sort((a, b) => a.contribution - b.contribution) // Sort by most negative
                .slice(0, 3)
                .map((pos, index) => (
                  <div
                    key={pos.symbol}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-[#3C3C3C]">#{index + 1}</span>
                      <span className="text-[#1a1a1a] font-semibold">{pos.symbol}</span>
                    </div>
                    <span className="text-red-400 font-bold">
                      {pos.contribution.toFixed(2)}%
                    </span>
                  </div>
                ))}
              {sortedPositions.filter(pos => pos.contribution < 0).length === 0 && (
                <p className="text-sm text-[#3C3C3C] italic">No negative contributors</p>
              )}
            </div>
          </div>
        </div>

        {/* Attribution Insight */}
        <div className="mt-3 p-3 bg-white border-2 border-black rounded-lg">
          <div className="flex items-start gap-10">
            <BarChart3 className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-[#1a1a1a]">
              <p className="font-semibold text-[#1a1a1a] mb-1">Understanding Attribution</p>
              <p>
                Performance attribution shows how much each position contributed to your overall portfolio return.
                Contribution = Position Return × Portfolio Weight.
              </p>
              <p className="mt-1">
                {positiveContributors > negativeContributors ? (
                  <span className="text-green-400">
                    Strong performance: {positiveContributors} positions are adding value
                  </span>
                ) : positiveContributors < negativeContributors ? (
                  <span className="text-red-400">
                    Weak performance: {negativeContributors} positions are detracting value
                  </span>
                ) : (
                  <span className="text-yellow-400">
                    Balanced performance: Equal positive and negative contributors
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceAttributionBar;