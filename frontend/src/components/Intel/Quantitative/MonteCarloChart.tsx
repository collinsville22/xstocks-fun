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
  Activity,
  BarChart3,
  Target,
  Percent
} from 'lucide-react';

interface MonteCarloResult {
  statistics: {
    mean: number;
    median: number;
    std: number;
    min: number;
    max: number;
    percentile5: number;
    percentile25: number;
    percentile75: number;
    percentile95: number;
    probPositive: number;
  };
  samplePaths: Array<{
    date: string;
    path1?: number;
    path2?: number;
    path3?: number;
    path4?: number;
    path5?: number;
    path6?: number;
    path7?: number;
    path8?: number;
    path9?: number;
    path10?: number;
    path11?: number;
    path12?: number;
    path13?: number;
    path14?: number;
    path15?: number;
    path16?: number;
    path17?: number;
    path18?: number;
    path19?: number;
    path20?: number;
    percentile5?: number;
    percentile25?: number;
    percentile50?: number;
    percentile75?: number;
    percentile95?: number;
  }>;
  distribution?: Array<{
    bin: string;
    count: number;
  }>;
  initialCapital: number;
  years: number;
  simulations: number;
}

interface MonteCarloChartProps {
  data: MonteCarloResult;
  className?: string;
}

/**
 * Monte Carlo Simulation Chart Component
 * Features:
 * - Line chart with 20 sample paths
 * - Shaded percentile zones (5th-95th percentile)
 * - Final distribution histogram
 * - Statistics summary cards
 */
export const MonteCarloChart: React.FC<MonteCarloChartProps> = ({ data, className }) => {
  const { statistics, samplePaths, distribution, initialCapital, years, simulations } = data;

  // Generate colors for sample paths
  const pathColors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#a855f7',
    '#6366f1', '#84cc16', '#eab308', '#f43f5e', '#22d3ee',
    '#a78bfa', '#34d399', '#fbbf24', '#fb923c', '#c084fc'
  ];

  // Custom tooltip for sample paths
  const SamplePathTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const filteredPayload = payload.filter((p: any) => !p.dataKey.startsWith('percentile'));
      return (
        <div className="bg-gray-800/95 border border-black/10 rounded-lg p-3 shadow-xl max-h-48 overflow-y-auto">
          <p className="text-sm text-[#3C3C3C] mb-2">{label}</p>
          <div className="space-y-1">
            {filteredPayload.slice(0, 5).map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-2.5 text-sm">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-[#1a1a1a]">{entry.name}:</span>
                <span className="text-[#1a1a1a] font-semibold">
                  ${entry.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            ))}
            {filteredPayload.length > 5 && (
              <div className="text-sm text-[#3C3C3C] mt-1">
                +{filteredPayload.length - 5} more paths...
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for percentile zones
  const PercentileTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const p5 = payload.find((p: any) => p.dataKey === 'percentile5');
      const p25 = payload.find((p: any) => p.dataKey === 'percentile25');
      const p50 = payload.find((p: any) => p.dataKey === 'percentile50');
      const p75 = payload.find((p: any) => p.dataKey === 'percentile75');
      const p95 = payload.find((p: any) => p.dataKey === 'percentile95');

      return (
        <div className="bg-gray-800/95 border border-black/10 rounded-lg p-3 shadow-xl">
          <p className="text-sm text-[#3C3C3C] mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            {p95 && (
              <div className="flex justify-between gap-10">
                <span className="text-[#1a1a1a]">95th Percentile:</span>
                <span className="text-green-400 font-semibold">
                  ${p95.value.toLocaleString()}
                </span>
              </div>
            )}
            {p75 && (
              <div className="flex justify-between gap-10">
                <span className="text-[#1a1a1a]">75th Percentile:</span>
                <span className="text-blue-400 font-semibold">
                  ${p75.value.toLocaleString()}
                </span>
              </div>
            )}
            {p50 && (
              <div className="flex justify-between gap-10">
                <span className="text-[#1a1a1a]">Median (50th):</span>
                <span className="text-[#1a1a1a] font-semibold">
                  ${p50.value.toLocaleString()}
                </span>
              </div>
            )}
            {p25 && (
              <div className="flex justify-between gap-10">
                <span className="text-[#1a1a1a]">25th Percentile:</span>
                <span className="text-orange-400 font-semibold">
                  ${p25.value.toLocaleString()}
                </span>
              </div>
            )}
            {p5 && (
              <div className="flex justify-between gap-10">
                <span className="text-[#1a1a1a]">5th Percentile:</span>
                <span className="text-red-400 font-semibold">
                  ${p5.value.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Statistics Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
        {/* Mean */}
        <Card className="glass-card border-black/10/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#3C3C3C]">Mean</span>
              <Target className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-sm font-bold text-[#1a1a1a]">
              ${statistics.mean.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-sm text-[#3C3C3C] mt-1">
              Average outcome
            </div>
          </CardContent>
        </Card>

        {/* Median */}
        <Card className="glass-card border-black/10/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#3C3C3C]">Median</span>
              <Activity className="w-4 h-4 text-primary-400" />
            </div>
            <div className="text-sm font-bold text-[#1a1a1a]">
              ${statistics.median.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-sm text-[#3C3C3C] mt-1">
              50th percentile
            </div>
          </CardContent>
        </Card>

        {/* 5th Percentile */}
        <Card className="glass-card border-black/10/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#3C3C3C]">5th %ile</span>
              <TrendingUp className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-sm font-bold text-red-400">
              ${statistics.percentile5.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-sm text-[#3C3C3C] mt-1">
              Worst 5%
            </div>
          </CardContent>
        </Card>

        {/* 95th Percentile */}
        <Card className="glass-card border-black/10/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#3C3C3C]">95th %ile</span>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-sm font-bold text-green-400">
              ${statistics.percentile95.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-sm text-[#3C3C3C] mt-1">
              Best 5%
            </div>
          </CardContent>
        </Card>

        {/* Probability Positive */}
        <Card className="glass-card border-black/10/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#3C3C3C]">Prob +</span>
              <Percent className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-sm font-bold text-cyan-400">
              {(statistics.probPositive * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-[#3C3C3C] mt-1">
              Chance of gain
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Simulation Info Banner */}
      <div className="bg-playful-cream border-2 border-black rounded-lg p-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-primary-400" />
            <span className="text-[#1a1a1a]">
              <span className="text-[#1a1a1a] font-semibold">{simulations.toLocaleString()}</span> simulations
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-[#1a1a1a]">
              Initial: <span className="text-[#1a1a1a] font-semibold">${initialCapital.toLocaleString()}</span>
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-[#1a1a1a]">
              Time: <span className="text-[#1a1a1a] font-semibold">{years} years</span>
            </span>
          </div>
        </div>
      </div>

      {/* Sample Paths Chart (20 paths) */}
      <Card className="glass-card border-black/10/50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-blue-400" />
            Sample Projection Paths (20 Scenarios)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={samplePaths}>
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
              <Tooltip content={<SamplePathTooltip />} />
              <ReferenceLine
                y={initialCapital}
                stroke="#6b7280"
                strokeDasharray="3 3"
                label={{ value: 'Initial', position: 'right', fill: '#9ca3af', fontSize: 11 }}
              />
              {/* Render 20 sample paths */}
              {Array.from({ length: 20 }, (_, i) => (
                <Line
                  key={`path${i + 1}`}
                  type="monotone"
                  dataKey={`path${i + 1}`}
                  name={`Path ${i + 1}`}
                  stroke={pathColors[i]}
                  strokeWidth={1.5}
                  dot={false}
                  strokeOpacity={0.4}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Percentile Zones Chart */}
      <Card className="glass-card border-black/10/50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-primary-400" />
            Percentile Zones (Outcome Ranges)
          </CardTitle>
          <p className="text-sm text-[#3C3C3C] mt-1">
            Shows the range of possible outcomes at each time point
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={samplePaths}>
              <defs>
                <linearGradient id="colorP95" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorP75" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorP25" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorP5" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                </linearGradient>
              </defs>
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
              <Tooltip content={<PercentileTooltip />} />
              <Legend wrapperStyle={{ fontSize: '14px' }} />
              <ReferenceLine
                y={initialCapital}
                stroke="#6b7280"
                strokeDasharray="3 3"
              />
              <Area
                type="monotone"
                dataKey="percentile95"
                name="95th Percentile"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorP95)"
              />
              <Area
                type="monotone"
                dataKey="percentile75"
                name="75th Percentile"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorP75)"
              />
              <Area
                type="monotone"
                dataKey="percentile50"
                name="Median"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="none"
              />
              <Area
                type="monotone"
                dataKey="percentile25"
                name="25th Percentile"
                stroke="#f59e0b"
                fillOpacity={1}
                fill="url(#colorP25)"
              />
              <Area
                type="monotone"
                dataKey="percentile5"
                name="5th Percentile"
                stroke="#ef4444"
                fillOpacity={1}
                fill="url(#colorP5)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Final Distribution Histogram */}
      {distribution && distribution.length > 0 && (
        <Card className="glass-card border-black/10/50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2.5">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              Final Value Distribution
            </CardTitle>
            <p className="text-sm text-[#3C3C3C] mt-1">
              Distribution of portfolio values after {years} years
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="bin"
                  stroke="#9ca3af"
                  style={{ fontSize: '14px' }}
                />
                <YAxis
                  stroke="#9ca3af"
                  style={{ fontSize: '14px' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="#06b6d4"
                  radius={[4, 4, 0, 0]}
                  opacity={0.8}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Interpretation Guide */}
      <div className="bg-white border-2 border-black rounded-lg p-3">
        <div className="flex items-start gap-10">
          <Target className="w-5 h-5 text-blue-400 mt-0.5" />
          <div className="text-sm text-[#1a1a1a]">
            <p className="font-semibold text-[#1a1a1a] mb-2">How to Interpret These Results:</p>
            <ul className="space-y-1 text-[#3C3C3C]">
              <li>• <strong>Median ({statistics.median.toLocaleString()})</strong>: The middle outcome - 50% chance to exceed this</li>
              <li>• <strong>5th Percentile ({statistics.percentile5.toLocaleString()})</strong>: Worst-case scenario (only 5% chance of doing worse)</li>
              <li>• <strong>95th Percentile ({statistics.percentile95.toLocaleString()})</strong>: Best-case scenario (only 5% chance of doing better)</li>
              <li>• <strong>Probability Positive ({(statistics.probPositive * 100).toFixed(1)}%)</strong>: Chance your portfolio will be worth more than initial capital</li>
              <li>• The shaded zones show the range of likely outcomes over time</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonteCarloChart;