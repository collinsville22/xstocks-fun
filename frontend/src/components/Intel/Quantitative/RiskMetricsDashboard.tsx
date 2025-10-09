import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { cn } from '../../../lib/utils';
import {
  Shield,
  AlertTriangle,
  Activity,
  TrendingUp,
  Target,
  Gauge
} from 'lucide-react';

interface RiskMetrics {
  var95: number;
  var99: number;
  cvar95: number;
  cvar99: number;
  sharpeRatio: number;
  sortinoRatio: number;
  beta: number;
  alpha: number;
  correlationMatrix?: {
    symbols: string[];
    matrix: number[][];
  };
  volatility: number;
  downsideVolatility: number;
}

interface RiskMetricsDashboardProps {
  data: RiskMetrics;
  className?: string;
}

/**
 * Risk Metrics Dashboard Component
 * Features:
 * - VaR and CVaR gauge visualizations
 * - Sharpe, Sortino, Beta, Alpha metric cards
 * - Correlation matrix heatmap
 * - Risk level indicators
 * - Interpretation guide
 */
export const RiskMetricsDashboard: React.FC<RiskMetricsDashboardProps> = ({
  data,
  className
}) => {
  const {
    var95,
    var99,
    cvar95,
    cvar99,
    sharpeRatio,
    sortinoRatio,
    beta,
    alpha,
    correlationMatrix,
    volatility,
    downsideVolatility
  } = data;

  // Get risk level based on VaR
  const getRiskLevel = (var95Value: number): {
    level: string;
    color: string;
    bgColor: string;
  } => {
    const absVar = Math.abs(var95Value);
    if (absVar < 5) return { level: 'Low', color: 'text-green-400', bgColor: 'bg-green-500/20' };
    if (absVar < 10) return { level: 'Moderate', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' };
    if (absVar < 15) return { level: 'High', color: 'text-orange-400', bgColor: 'bg-orange-500/20' };
    return { level: 'Very High', color: 'text-red-400', bgColor: 'bg-red-500/20' };
  };

  const riskLevel = getRiskLevel(var95);

  // Get color for Sharpe ratio
  const getSharpeColor = (sharpe: number) => {
    if (sharpe > 2) return 'text-green-400';
    if (sharpe > 1) return 'text-blue-400';
    if (sharpe > 0.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Get color for Beta
  const getBetaColor = (betaValue: number) => {
    if (betaValue < 0.8) return 'text-blue-400'; // Defensive
    if (betaValue < 1.2) return 'text-green-400'; // Market-like
    return 'text-orange-400'; // Aggressive
  };

  // Get color for Alpha
  const getAlphaColor = (alphaValue: number) => {
    if (alphaValue > 0) return 'text-green-400'; // Outperformance
    return 'text-red-400'; // Underperformance
  };

  // Prepare gauge data for VaR
  const varGaugeData = [
    { name: 'VaR 95%', value: Math.abs(var95), color: '#3b82f6' },
    { name: 'VaR 99%', value: Math.abs(var99), color: '#ef4444' }
  ];

  // Prepare gauge data for CVaR
  const cvarGaugeData = [
    { name: 'CVaR 95%', value: Math.abs(cvar95), color: '#3b82f6' },
    { name: 'CVaR 99%', value: Math.abs(cvar99), color: '#ef4444' }
  ];

  // Custom tooltip for gauges
  const GaugeTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800/95 border border-black/10 rounded-lg p-3 shadow-xl">
          <div className="text-sm text-[#3C3C3C] mb-1">{payload[0].name}</div>
          <div className="text-[#1a1a1a] font-semibold">{payload[0].value.toFixed(2)}%</div>
          <div className="text-sm text-[#3C3C3C] mt-1">Maximum expected loss</div>
        </div>
      );
    }
    return null;
  };

  // Correlation heatmap colors
  const getCorrelationColor = (correlation: number) => {
    // Strong positive: green
    if (correlation > 0.7) return '#10b981';
    if (correlation > 0.3) return '#3b82f6';
    // Near zero: gray
    if (correlation > -0.3) return '#6b7280';
    // Negative: red
    if (correlation > -0.7) return '#f59e0b';
    return '#ef4444';
  };

  const getCorrelationLabel = (correlation: number) => {
    if (correlation > 0.7) return 'Strong +';
    if (correlation > 0.3) return 'Moderate +';
    if (correlation > -0.3) return 'Weak';
    if (correlation > -0.7) return 'Moderate -';
    return 'Strong -';
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Risk Level Summary Banner */}
      <Card className={cn('border-2', riskLevel.bgColor, `border-${riskLevel.color.replace('text-', '')}/50`)}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-10">
              <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', riskLevel.bgColor)}>
                <Shield className={cn('w-6 h-6', riskLevel.color)} />
              </div>
              <div>
                <div className="text-sm text-[#3C3C3C]">Overall Risk Level</div>
                <div className={cn('text-sm font-bold', riskLevel.color)}>{riskLevel.level}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-[#3C3C3C]">VaR (95%)</div>
              <div className={cn('text-sm font-semibold', riskLevel.color)}>
                {var95.toFixed(2)}%
              </div>
              <div className="text-sm text-[#3C3C3C] mt-1">Daily risk exposure</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Risk Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
        {/* Sharpe Ratio */}
        <Card className="glass-card border-black/10/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#3C3C3C]">Sharpe Ratio</span>
              <Target className="w-4 h-4 text-blue-400" />
            </div>
            <div className={cn('text-sm font-bold', getSharpeColor(sharpeRatio))}>
              {sharpeRatio.toFixed(2)}
            </div>
            <div className="text-sm text-[#3C3C3C] mt-1">
              {sharpeRatio > 2 ? 'Excellent' : sharpeRatio > 1 ? 'Good' : sharpeRatio > 0.5 ? 'Average' : 'Poor'}
            </div>
          </CardContent>
        </Card>

        {/* Sortino Ratio */}
        <Card className="glass-card border-black/10/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#3C3C3C]">Sortino Ratio</span>
              <TrendingUp className="w-4 h-4 text-primary-400" />
            </div>
            <div className={cn('text-sm font-bold', getSharpeColor(sortinoRatio))}>
              {sortinoRatio.toFixed(2)}
            </div>
            <div className="text-sm text-[#3C3C3C] mt-1">Downside risk-adjusted</div>
          </CardContent>
        </Card>

        {/* Beta */}
        <Card className="glass-card border-black/10/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#3C3C3C]">Beta</span>
              <Activity className="w-4 h-4 text-orange-400" />
            </div>
            <div className={cn('text-sm font-bold', getBetaColor(beta))}>
              {beta.toFixed(2)}
            </div>
            <div className="text-sm text-[#3C3C3C] mt-1">
              {beta < 0.8 ? 'Defensive' : beta < 1.2 ? 'Market-like' : 'Aggressive'}
            </div>
          </CardContent>
        </Card>

        {/* Alpha */}
        <Card className="glass-card border-black/10/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#3C3C3C]">Alpha</span>
              <Gauge className="w-4 h-4 text-green-400" />
            </div>
            <div className={cn('text-sm font-bold', getAlphaColor(alpha))}>
              {alpha > 0 ? '+' : ''}{alpha.toFixed(2)}%
            </div>
            <div className="text-sm text-[#3C3C3C] mt-1">
              {alpha > 0 ? 'Outperforming' : 'Underperforming'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* VaR and CVaR Visualizations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Value at Risk (VaR) */}
        <Card className="glass-card border-black/10/50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              Value at Risk (VaR)
            </CardTitle>
            <p className="text-sm text-[#3C3C3C] mt-1">Maximum expected loss at confidence levels</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={varGaugeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" style={{ fontSize: '14px' }} unit="%" />
                <YAxis type="category" dataKey="name" stroke="#9ca3af" style={{ fontSize: '14px' }} width={80} />
                <Tooltip content={<GaugeTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {varGaugeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 p-3 bg-white border-2 border-black rounded-lg">
              <div className="text-sm text-[#1a1a1a]">
                <p><strong>VaR 95%:</strong> {Math.abs(var95).toFixed(2)}% - 95% confidence that daily loss won't exceed this</p>
                <p className="mt-1"><strong>VaR 99%:</strong> {Math.abs(var99).toFixed(2)}% - 99% confidence (more conservative)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conditional VaR (CVaR) */}
        <Card className="glass-card border-black/10/50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Conditional VaR (CVaR)
            </CardTitle>
            <p className="text-sm text-[#3C3C3C] mt-1">Expected loss when VaR threshold is breached</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={cvarGaugeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" style={{ fontSize: '14px' }} unit="%" />
                <YAxis type="category" dataKey="name" stroke="#9ca3af" style={{ fontSize: '14px' }} width={80} />
                <Tooltip content={<GaugeTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {cvarGaugeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 p-3 bg-playful-cream border-2 border-black rounded-lg">
              <div className="text-sm text-[#1a1a1a]">
                <p><strong>CVaR 95%:</strong> {Math.abs(cvar95).toFixed(2)}% - Average loss in worst 5% of cases</p>
                <p className="mt-1"><strong>CVaR 99%:</strong> {Math.abs(cvar99).toFixed(2)}% - Average loss in worst 1% of cases</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Volatility Metrics */}
      <Card className="glass-card border-black/10/50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-primary-400" />
            Volatility Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-10">
            <div>
              <div className="text-sm text-[#3C3C3C] mb-2">Total Volatility</div>
              <div className="text-sm font-bold text-[#1a1a1a]">{volatility.toFixed(2)}%</div>
              <div className="text-sm text-[#3C3C3C] mt-1">Annual standard deviation of returns</div>
              <div className="mt-3 w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500/20 to-primary-600/20 backdrop-blur-md border border-primary-500/30"
                  style={{ width: `${Math.min(volatility, 50) * 2}%` }}
                />
              </div>
            </div>
            <div>
              <div className="text-sm text-[#3C3C3C] mb-2">Downside Volatility</div>
              <div className="text-sm font-bold text-orange-400">{downsideVolatility.toFixed(2)}%</div>
              <div className="text-sm text-[#3C3C3C] mt-1">Volatility of negative returns only</div>
              <div className="mt-3 w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                  style={{ width: `${Math.min(downsideVolatility, 50) * 2}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Correlation Matrix Heatmap */}
      {correlationMatrix && correlationMatrix.symbols && correlationMatrix.symbols.length > 0 && (
        <Card className="glass-card border-black/10/50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2.5">
              <Target className="w-5 h-5 text-cyan-400" />
              Correlation Matrix
            </CardTitle>
            <p className="text-sm text-[#3C3C3C] mt-1">
              Correlation between assets (-1 = inverse, 0 = uncorrelated, +1 = same direction)
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 text-sm text-[#3C3C3C] border border-black/10"></th>
                    {correlationMatrix.symbols.map((symbol) => (
                      <th key={symbol} className="p-2 text-sm text-[#3C3C3C] border border-black/10">
                        {symbol}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {correlationMatrix.symbols.map((symbol1, i) => (
                    <tr key={symbol1}>
                      <td className="p-2 text-sm text-[#3C3C3C] font-semibold border border-black/10">
                        {symbol1}
                      </td>
                      {correlationMatrix.symbols.map((symbol2, j) => {
                        const correlation = correlationMatrix.matrix[i][j];
                        return (
                          <td
                            key={`${symbol1}-${symbol2}`}
                            className="p-2 text-center border border-black/10 cursor-pointer hover:opacity-80 transition-opacity"
                            style={{
                              backgroundColor: getCorrelationColor(correlation) + '40',
                            }}
                            title={`${symbol1} vs ${symbol2}: ${correlation.toFixed(2)}`}
                          >
                            <div className="text-sm font-semibold text-[#1a1a1a]">
                              {correlation.toFixed(2)}
                            </div>
                            <div className="text-[30px] text-[#3C3C3C]">
                              {getCorrelationLabel(correlation)}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-center gap-10 text-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }} />
                <span className="text-[#3C3C3C]">Strong Positive (&gt;0.7)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#6b7280' }} />
                <span className="text-[#3C3C3C]">Weak (-0.3 to 0.3)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }} />
                <span className="text-[#3C3C3C]">Strong Negative (&lt;-0.7)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Interpretation Guide */}
      <div className="bg-white border-2 border-black rounded-lg p-3">
        <div className="flex items-start gap-2.5">
          <Shield className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-[#1a1a1a]">
            <p className="font-semibold text-[#1a1a1a] mb-2">Understanding Your Risk Metrics:</p>
            <ul className="space-y-1 text-[#3C3C3C]">
              <li>• <strong>VaR:</strong> Maximum expected loss at a given confidence level (e.g., 95% confidence = only 5% chance of losing more)</li>
              <li>• <strong>CVaR:</strong> Average loss when VaR threshold is exceeded (measures tail risk)</li>
              <li>• <strong>Sharpe Ratio:</strong> Return per unit of risk (&gt;2 excellent, &gt;1 good, &gt;0.5 average)</li>
              <li>• <strong>Sortino Ratio:</strong> Like Sharpe but only penalizes downside volatility (better for asymmetric returns)</li>
              <li>• <strong>Beta:</strong> Market sensitivity (&lt;1 defensive, =1 market-like, &gt;1 aggressive)</li>
              <li>• <strong>Alpha:</strong> Excess return vs benchmark (positive = outperformance)</li>
              <li>• <strong>Correlation:</strong> How assets move together (use negative correlation for diversification)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskMetricsDashboard;