import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { cn } from '../../../lib/utils';
import { TrendingUp, Activity } from 'lucide-react';
import { format } from 'date-fns';

interface PortfolioValueChartProps {
  startDate: string;
  endDate: string;
  portfolioData: Array<{ date: string; value: number }>;
  benchmarkData: Array<{ date: string; value: number }>;
  className?: string;
}

/**
 * Portfolio Value Chart Component
 * Features:
 * - Line chart showing portfolio value over time
 * - Comparison line for benchmark (S&P 500)
 * - Responsive design with dark theme
 * - Tooltip with date, portfolio value, benchmark value, difference
 * - Legend with color indicators
 */
export const PortfolioValueChart: React.FC<PortfolioValueChartProps> = ({
  startDate,
  endDate,
  portfolioData,
  benchmarkData,
  className
}) => {
  // Merge portfolio and benchmark data by date
  const chartData = portfolioData.map((portfolioPoint) => {
    const benchmarkPoint = benchmarkData.find(
      (bp) => bp.date === portfolioPoint.date
    );

    return {
      date: portfolioPoint.date,
      portfolioValue: portfolioPoint.value,
      benchmarkValue: benchmarkPoint?.value || null,
      difference: benchmarkPoint
        ? portfolioPoint.value - benchmarkPoint.value
        : null
    };
  });

  // Calculate overall performance metrics
  const startPortfolioValue = portfolioData[0]?.value || 0;
  const endPortfolioValue = portfolioData[portfolioData.length - 1]?.value || 0;
  const portfolioReturn = startPortfolioValue > 0
    ? ((endPortfolioValue - startPortfolioValue) / startPortfolioValue) * 100
    : 0;

  const startBenchmarkValue = benchmarkData[0]?.value || 0;
  const endBenchmarkValue = benchmarkData[benchmarkData.length - 1]?.value || 0;
  const benchmarkReturn = startBenchmarkValue > 0
    ? ((endBenchmarkValue - startBenchmarkValue) / startBenchmarkValue) * 100
    : 0;

  const outperformance = portfolioReturn - benchmarkReturn;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const portfolioValue = data.portfolioValue;
      const benchmarkValue = data.benchmarkValue;
      const difference = data.difference;

      return (
        <div className="bg-white/95 border-2 border-black rounded-lg p-3 shadow-xl">
          <div className="space-y-1.5">
            <div className="text-sm font-semibold text-[#1a1a1a] mb-2">
              {format(new Date(data.date), 'MMM dd, yyyy')}
            </div>
            <div className="flex items-center justify-between gap-10">
              <span className="text-sm text-blue-600 font-semibold">Portfolio:</span>
              <span className="text-[#1a1a1a] font-semibold">
                ${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {benchmarkValue !== null && (
              <>
                <div className="flex items-center justify-between gap-10">
                  <span className="text-sm text-[#3C3C3C]">Benchmark:</span>
                  <span className="text-[#1a1a1a] font-semibold">
                    ${benchmarkValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-10 pt-1 border-t border-black/10">
                  <span className="text-sm text-[#3C3C3C]">Difference:</span>
                  <span className={cn(
                    'font-semibold',
                    difference > 0 ? 'text-green-400' : difference < 0 ? 'text-red-400' : 'text-[#3C3C3C]'
                  )}>
                    {difference > 0 ? '+' : ''}${difference?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Format axis labels
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd');
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  if (!portfolioData || portfolioData.length === 0) {
    return (
      <Card className="glass-card border-black/10/50">
        <CardContent className="p-3 text-center">
          <Activity className="w-12 h-12 mx-auto mb-3 text-[#3C3C3C]" />
          <p className="text-[#3C3C3C]">No portfolio data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('glass-card border-black/10/50', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2.5">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            Portfolio Value vs Benchmark
          </CardTitle>
          <div className="flex items-center gap-10">
            <div className="text-right">
              <div className="text-sm text-[#3C3C3C]">Portfolio Return</div>
              <div className={cn(
                'text-sm font-bold',
                portfolioReturn > 0 ? 'text-green-400' : portfolioReturn < 0 ? 'text-red-400' : 'text-[#3C3C3C]'
              )}>
                {portfolioReturn > 0 ? '+' : ''}{portfolioReturn.toFixed(2)}%
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-[#3C3C3C]">Benchmark Return</div>
              <div className={cn(
                'text-sm font-bold',
                benchmarkReturn > 0 ? 'text-green-400' : benchmarkReturn < 0 ? 'text-red-400' : 'text-[#3C3C3C]'
              )}>
                {benchmarkReturn > 0 ? '+' : ''}{benchmarkReturn.toFixed(2)}%
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-[#3C3C3C]">Outperformance</div>
              <div className={cn(
                'text-sm font-bold',
                outperformance > 0 ? 'text-green-400' : outperformance < 0 ? 'text-red-400' : 'text-[#3C3C3C]'
              )}>
                {outperformance > 0 ? '+' : ''}{outperformance.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
        <p className="text-sm text-[#3C3C3C] mt-1">
          Comparing your portfolio performance against the S&P 500 index
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              style={{ fontSize: '14px' }}
              tickFormatter={formatDate}
              label={{
                value: 'Date',
                position: 'insideBottom',
                offset: -10,
                fill: '#9ca3af',
                fontSize: 12
              }}
            />
            <YAxis
              stroke="#9ca3af"
              style={{ fontSize: '14px' }}
              tickFormatter={formatCurrency}
              label={{
                value: 'Portfolio Value ($)',
                angle: -90,
                position: 'insideLeft',
                fill: '#9ca3af',
                fontSize: 12
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '14px' }}
              iconType="line"
            />
            <Line
              type="monotone"
              dataKey="portfolioValue"
              name="Portfolio"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, fill: '#3b82f6' }}
            />
            <Line
              type="monotone"
              dataKey="benchmarkValue"
              name="S&P 500 Benchmark"
              stroke="#9ca3af"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 6, fill: '#9ca3af' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default PortfolioValueChart;