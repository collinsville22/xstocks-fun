import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ZAxis,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { cn } from '../../../lib/utils';
import {
  Target,
  Shield,
  Award,
  TrendingUp
} from 'lucide-react';

interface PortfolioPoint {
  return: number;
  volatility: number;
  sharpe: number;
  weights?: { [symbol: string]: number };
}

interface OptimizationResult {
  efficientFrontier: PortfolioPoint[];
  optimalSharpe: PortfolioPoint;
  optimalMinVol: PortfolioPoint;
}

interface EfficientFrontierChartProps {
  data: OptimizationResult;
  className?: string;
}

/**
 * Efficient Frontier Chart Component
 * Features:
 * - Scatter plot of 500 portfolio simulations (return vs volatility)
 * - Highlighted optimal Sharpe ratio portfolio
 * - Highlighted minimum volatility portfolio
 * - Color gradient by Sharpe ratio
 * - Interactive tooltips with weight allocations
 */
export const EfficientFrontierChart: React.FC<EfficientFrontierChartProps> = ({
  data,
  className
}) => {
  const { efficientFrontier, optimalSharpe, optimalMinVol } = data;

  // Prepare data for scatter chart
  const scatterData = efficientFrontier.map((point) => ({
    volatility: point.volatility, // Already in percentage from backend
    return: point.return, // Already in percentage from backend
    sharpe: point.sharpe,
    weights: point.weights,
  }));

  // Get color based on Sharpe ratio
  const getColor = (sharpe: number) => {
    if (sharpe > 2) return '#10b981'; // Green - Excellent
    if (sharpe > 1.5) return '#3b82f6'; // Blue - Very Good
    if (sharpe > 1) return '#f59e0b'; // Orange - Good
    if (sharpe > 0.5) return '#f97316'; // Orange-Red - Average
    return '#ef4444'; // Red - Poor
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      return (
        <div className="bg-white border-3 border-black rounded-2xl p-3 shadow-xl max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#1a1a1a]">Return:</span>
              <span className="text-green-600 font-semibold">{point.return.toFixed(2)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#1a1a1a]">Volatility:</span>
              <span className="text-orange-600 font-semibold">{point.volatility.toFixed(2)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#1a1a1a]">Sharpe Ratio:</span>
              <span className="text-blue-600 font-semibold">{point.sharpe.toFixed(2)}</span>
            </div>
            {point.weights && (
              <div className="mt-3 pt-2 border-t-2 border-black">
                <div className="text-sm text-[#1a1a1a] font-semibold mb-2">Allocation:</div>
                {Object.entries(point.weights).map(([symbol, weight]: [string, any]) => (
                  <div key={symbol} className="flex items-center justify-between text-sm">
                    <span className="text-[#1a1a1a]">{symbol}:</span>
                    <span className="text-[#1a1a1a] font-semibold">{(weight * 100).toFixed(1)}%</span>
                  </div>
                ))}
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
      {/* Optimal Portfolios Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Optimal Sharpe Portfolio */}
        <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
          <CardContent className="p-3">
            <div className="flex items-center gap-10 mb-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#1a1a1a]">Optimal Sharpe Portfolio</div>
                <div className="text-sm text-[#3C3C3C]">Maximum risk-adjusted return</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#3C3C3C]">Expected Return:</span>
                <span className="text-green-400 font-semibold">
                  {(optimalSharpe.return).toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#3C3C3C]">Volatility:</span>
                <span className="text-orange-400 font-semibold">
                  {(optimalSharpe.volatility).toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#3C3C3C]">Sharpe Ratio:</span>
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
                  {optimalSharpe.sharpe.toFixed(2)}
                </Badge>
              </div>
            </div>
            {optimalSharpe.weights && (
              <div className="mt-3 pt-3 border-t border-black/10/50">
                <div className="text-sm text-[#3C3C3C] mb-2">Recommended Allocation:</div>
                <div className="space-y-1">
                  {Object.entries(optimalSharpe.weights)
                    .sort(([, a]: any, [, b]: any) => b - a)
                    .map(([symbol, weight]: [string, any]) => (
                      <div key={symbol} className="flex items-center justify-between text-sm">
                        <span className="text-[#1a1a1a]">{symbol}:</span>
                        <div className="flex items-center gap-2.5">
                          <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500"
                              style={{ width: `${weight * 100}%` }}
                            />
                          </div>
                          <span className="text-[#1a1a1a] font-semibold w-12 text-right">
                            {(weight * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Minimum Volatility Portfolio */}
        <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
          <CardContent className="p-3">
            <div className="flex items-center gap-10 mb-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#1a1a1a]">Minimum Volatility Portfolio</div>
                <div className="text-sm text-[#3C3C3C]">Lowest risk option</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#3C3C3C]">Expected Return:</span>
                <span className="text-green-400 font-semibold">
                  {(optimalMinVol.return).toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#3C3C3C]">Volatility:</span>
                <span className="text-orange-400 font-semibold">
                  {(optimalMinVol.volatility).toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#3C3C3C]">Sharpe Ratio:</span>
                <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                  {optimalMinVol.sharpe.toFixed(2)}
                </Badge>
              </div>
            </div>
            {optimalMinVol.weights && (
              <div className="mt-3 pt-3 border-t border-black/10/50">
                <div className="text-sm text-[#3C3C3C] mb-2">Recommended Allocation:</div>
                <div className="space-y-1">
                  {Object.entries(optimalMinVol.weights)
                    .sort(([, a]: any, [, b]: any) => b - a)
                    .map(([symbol, weight]: [string, any]) => (
                      <div key={symbol} className="flex items-center justify-between text-sm">
                        <span className="text-[#1a1a1a]">{symbol}:</span>
                        <div className="flex items-center gap-2.5">
                          <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500"
                              style={{ width: `${weight * 100}%` }}
                            />
                          </div>
                          <span className="text-[#1a1a1a] font-semibold w-12 text-right">
                            {(weight * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Efficient Frontier Scatter Plot */}
      <Card className="glass-card border-black/10/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2.5">
              <Target className="w-5 h-5 text-primary-400" />
              Efficient Frontier
            </CardTitle>
            <div className="flex items-center gap-2.5 text-sm text-[#3C3C3C]">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Sharpe &gt; 2</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Sharpe &gt; 1.5</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span>Sharpe &gt; 1</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>Sharpe &lt; 1</span>
              </div>
            </div>
          </div>
          <p className="text-sm text-[#3C3C3C] mt-1">
            {scatterData.length} portfolio simulations • Higher return + Lower volatility = Better
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart
              margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                type="number"
                dataKey="volatility"
                name="Volatility"
                unit="%"
                stroke="#9ca3af"
                style={{ fontSize: '14px' }}
                label={{ value: 'Volatility (Risk)', position: 'insideBottom', offset: -10, fill: '#9ca3af', fontSize: 12 }}
              />
              <YAxis
                type="number"
                dataKey="return"
                name="Return"
                unit="%"
                stroke="#9ca3af"
                style={{ fontSize: '14px' }}
                label={{ value: 'Expected Return', angle: -90, position: 'left', fill: '#9ca3af', fontSize: 12 }}
              />
              <ZAxis type="number" dataKey="sharpe" range={[30, 150]} />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />

              {/* All portfolios */}
              <Scatter
                name="Portfolios"
                data={scatterData}
                fill="#3b82f6"
                shape="circle"
              >
                {scatterData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getColor(entry.sharpe)} fillOpacity={0.6} />
                ))}
              </Scatter>

              {/* Optimal Sharpe portfolio (highlighted) */}
              <Scatter
                name="Optimal Sharpe"
                data={[{
                  volatility: optimalSharpe.volatility,
                  return: optimalSharpe.return,
                  sharpe: optimalSharpe.sharpe,
                  weights: optimalSharpe.weights
                }]}
                fill="#3b82f6"
                shape="star"
                legendType="star"
              />

              {/* Minimum Volatility portfolio (highlighted) */}
              <Scatter
                name="Min Volatility"
                data={[{
                  volatility: optimalMinVol.volatility,
                  return: optimalMinVol.return,
                  sharpe: optimalMinVol.sharpe,
                  weights: optimalMinVol.weights
                }]}
                fill="#10b981"
                shape="triangle"
                legendType="triangle"
              />

              <Legend
                wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }}
                iconType="circle"
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
              />
            </ScatterChart>
          </ResponsiveContainer>

          <div className="mt-3 p-3 bg-white border-2 border-black rounded-lg">
            <div className="flex items-start gap-2.5">
              <TrendingUp className="w-4 h-4 text-blue-400 mt-0.5" />
              <div className="text-sm text-[#1a1a1a]">
                <p className="font-semibold text-[#1a1a1a] mb-1">How to Read This Chart:</p>
                <ul className="space-y-1 text-[#3C3C3C]">
                  <li>• <strong>Left side</strong>: Lower risk (lower volatility)</li>
                  <li>• <strong>Top side</strong>: Higher returns</li>
                  <li>• <strong>Color</strong>: Sharpe ratio (green = better risk-adjusted return)</li>
                  <li>• <strong>Star</strong>: Best Sharpe ratio portfolio (recommended)</li>
                  <li>• <strong>Triangle</strong>: Lowest risk portfolio (conservative)</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EfficientFrontierChart;