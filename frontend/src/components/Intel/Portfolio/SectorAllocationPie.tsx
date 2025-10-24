import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { cn } from '../../../lib/utils';
import { PieChart as PieChartIcon } from 'lucide-react';

interface SectorAllocationPieProps {
  sectorAllocation: { [sector: string]: number };
  className?: string;
}

/**
 * Sector Allocation Pie Chart Component
 * Features:
 * - Pie chart showing sector allocation percentages
 * - Color-coded by sector with consistent colors
 * - Labels with sector name and percentage
 * - Center text showing "Sector Allocation"
 * - Tooltip with sector name, value, percentage
 * - Legend on the right side
 * - Responsive design with dark theme
 */
export const SectorAllocationPie: React.FC<SectorAllocationPieProps> = ({
  sectorAllocation,
  className
}) => {
  // Sector color mapping (consistent with Market Intelligence dashboard)
  const SECTOR_COLORS: { [key: string]: string } = {
    'Technology': '#3b82f6',
    'Healthcare': '#10b981',
    'Financial Services': '#f59e0b',
    'Consumer Cyclical': '#8b5cf6',
    'Communication Services': '#06b6d4',
    'Industrials': '#ef4444',
    'Energy': '#eab308',
    'Consumer Defensive': '#ec4899',
    'Real Estate': '#14b8a6',
    'Basic Materials': '#f97316',
    'Utilities': '#84cc16',
    'Other': '#6b7280'
  };

  // Prepare chart data
  const chartData = Object.entries(sectorAllocation)
    .map(([sector, value]) => ({
      sector,
      value,
      percentage: value,
      color: SECTOR_COLORS[sector] || SECTOR_COLORS['Other']
    }))
    .sort((a, b) => b.value - a.value); // Sort by value descending

  // Calculate total for validation
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  // Custom label renderer
  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Only show label if percentage is above 3% to avoid clutter
    if (percent < 0.03) return null;

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        style={{ fontSize: '14px', fontWeight: 600 }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/95 border-2 border-black rounded-lg p-3 shadow-xl">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 mb-2">
              <div
                className="w-3 h-3 rounded-full border border-black/20"
                style={{ backgroundColor: data.color }}
              />
              <span className="text-sm font-semibold text-[#1a1a1a]">
                {data.sector}
              </span>
            </div>
            <div className="flex items-center justify-between gap-10">
              <span className="text-sm text-[#3C3C3C] font-medium">Allocation:</span>
              <span className="text-[#1a1a1a] font-bold">
                {data.percentage.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center justify-between gap-10">
              <span className="text-sm text-[#3C3C3C] font-medium">Value:</span>
              <span className="text-[#1a1a1a] font-bold">
                ${(data.value * 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom legend renderer
  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-col gap-2.5 text-sm">
        {payload.map((entry: any, index: number) => (
          <div key={`legend-${index}`} className="flex items-center gap-2.5">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-[#1a1a1a] truncate">{entry.value}</span>
            <span className="text-[#3C3C3C] ml-auto">
              {chartData[index].percentage.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (!chartData || chartData.length === 0) {
    return (
      <Card className="glass-card border-black/10/50">
        <CardContent className="p-3 text-center">
          <PieChartIcon className="w-12 h-12 mx-auto mb-3 text-[#3C3C3C]" />
          <p className="text-[#3C3C3C]">No sector allocation data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('glass-card border-black/10/50', className)}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2.5">
          <PieChartIcon className="w-5 h-5 text-blue-400" />
          Sector Allocation
        </CardTitle>
        <p className="text-sm text-[#3C3C3C] mt-1">
          Portfolio diversification across market sectors
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Pie Chart */}
          <div className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={120}
                  innerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                  paddingAngle={2}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center text overlay */}
            <div className="absolute top-1/2 left-1/3 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none hidden lg:block">
              <div className="text-sm text-[#3C3C3C]">Total</div>
              <div className="text-sm font-bold text-[#1a1a1a]">100%</div>
            </div>
          </div>

          {/* Legend */}
          <div className="lg:col-span-1">
            <div className="bg-playful-cream/40 rounded-lg p-3 border-2 border-black/20">
              <div className="text-sm font-semibold text-[#1a1a1a] mb-3">
                Sectors
              </div>
              {renderLegend({ payload: chartData.map((item, index) => ({
                value: item.sector,
                color: item.color,
                type: 'circle'
              })) })}
            </div>
          </div>
        </div>

        {/* Top Holdings Summary */}
        <div className="mt-3 pt-6 border-t border-black/10/50">
          <div className="text-sm font-semibold text-[#1a1a1a] mb-3">
            Top 3 Sectors
          </div>
          <div className="grid grid-cols-3 gap-10">
            {chartData.slice(0, 3).map((sector, index) => (
              <div
                key={sector.sector}
                className="bg-playful-cream/40 rounded-lg p-3 border-2 border-black/20"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div
                    className="w-2 h-2 rounded-full border border-black/20"
                    style={{ backgroundColor: sector.color }}
                  />
                  <span className="text-sm text-[#3C3C3C] font-medium">
                    #{index + 1}
                  </span>
                </div>
                <div className="text-sm font-semibold text-[#1a1a1a] mb-1 truncate">
                  {sector.sector}
                </div>
                <div className="text-sm font-bold text-playful-green">
                  {sector.percentage.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Diversification Indicator */}
        <div className="mt-3 p-3 bg-white border-2 border-black rounded-lg">
          <div className="flex items-start gap-10">
            <PieChartIcon className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-[#1a1a1a]">
              <p className="font-semibold text-[#1a1a1a] mb-1">Diversification Score</p>
              <p>
                {chartData.length >= 8 ? (
                  <span className="text-green-400">
                    Well diversified - {chartData.length} sectors
                  </span>
                ) : chartData.length >= 5 ? (
                  <span className="text-yellow-400">
                    Moderately diversified - {chartData.length} sectors
                  </span>
                ) : (
                  <span className="text-red-400">
                    Concentrated - {chartData.length} sectors
                  </span>
                )}
              </p>
              {chartData[0]?.percentage > 40 && (
                <p className="text-yellow-400 mt-1">
                  Note: {chartData[0].sector} represents {chartData[0].percentage.toFixed(1)}% of your portfolio
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SectorAllocationPie;