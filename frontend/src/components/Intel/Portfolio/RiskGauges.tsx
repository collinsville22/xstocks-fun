import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { cn } from '../../../lib/utils';
import { Shield, Activity, TrendingUp, AlertCircle, Info } from 'lucide-react';

interface RiskGaugesProps {
  sharpeRatio: number;
  beta: number;
  alpha?: number;
  volatility?: number;
  maxDrawdown?: number;
  className?: string;
}

/**
 * Risk Gauges Component
 * Features:
 * - Custom SVG gauge charts for Sharpe Ratio and Beta
 * - Sharpe Ratio: Range -1 to 3, color zones (red/orange/yellow/green)
 * - Beta: Range 0 to 2, color zones (green/yellow/orange/red)
 * - Additional risk metric cards (Alpha, Volatility, Max Drawdown)
 * - Tooltips explaining metrics
 * - Responsive design with dark theme
 */
export const RiskGauges: React.FC<RiskGaugesProps> = ({
  sharpeRatio,
  beta,
  alpha,
  volatility,
  maxDrawdown,
  className
}) => {
  /**
   * Gauge Component
   * Draws a semicircular gauge with colored zones and a needle
   */
  interface GaugeProps {
    value: number;
    min: number;
    max: number;
    zones: Array<{ threshold: number; color: string; label: string }>;
    label: string;
    description: string;
  }

  const Gauge: React.FC<GaugeProps> = ({ value, min, max, zones, label, description }) => {
    const size = 200;
    const strokeWidth = 20;
    const center = size / 2;
    const radius = (size - strokeWidth) / 2;
    const startAngle = -180;
    const endAngle = 0;
    const angleRange = endAngle - startAngle;

    // Clamp value to min/max
    const clampedValue = Math.max(min, Math.min(max, value));

    // Calculate needle angle
    const valueRatio = (clampedValue - min) / (max - min);
    const needleAngle = startAngle + valueRatio * angleRange;

    // Get current zone
    const currentZone = [...zones].reverse().find(z => clampedValue >= z.threshold) || zones[0];

    // Create arc path
    const createArc = (startRatio: number, endRatio: number, color: string) => {
      const start = startAngle + startRatio * angleRange;
      const end = startAngle + endRatio * angleRange;

      const startRad = (start * Math.PI) / 180;
      const endRad = (end * Math.PI) / 180;

      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);

      const largeArcFlag = end - start > 180 ? 1 : 0;

      return {
        path: `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        color
      };
    };

    // Create zone arcs
    const zoneArcs = zones.map((zone, index) => {
      const startRatio = index === 0 ? 0 : (zones[index - 1].threshold - min) / (max - min);
      const endRatio = (zone.threshold - min) / (max - min);
      return createArc(startRatio, endRatio, zone.color);
    });

    // Needle coordinates
    const needleRad = (needleAngle * Math.PI) / 180;
    const needleLength = radius - 10;
    const needleX = center + needleLength * Math.cos(needleRad);
    const needleY = center + needleLength * Math.sin(needleRad);

    return (
      <div className="flex flex-col items-center">
        <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`}>
          {/* Background arc */}
          <path
            d={createArc(0, 1, '#374151').path}
            fill="none"
            stroke="#374151"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Zone arcs */}
          {zoneArcs.map((arc, index) => (
            <path
              key={index}
              d={arc.path}
              fill="none"
              stroke={arc.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          ))}

          {/* Needle */}
          <line
            x1={center}
            y1={center}
            x2={needleX}
            y2={needleY}
            stroke="#ffffff"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <circle cx={center} cy={center} r={8} fill="#ffffff" />
          <circle cx={center} cy={center} r={4} fill="#1f2937" />
        </svg>

        {/* Value display */}
        <div className="text-center mt-2">
          <div className="text-sm font-bold text-neutral-100 mb-1">
            {value.toFixed(2)}
          </div>
          <div className="text-sm font-semibold text-neutral-100 mb-1">
            {label}
          </div>
          <Badge
            variant="outline"
            className={cn('text-sm', 'border')}
            style={{
              backgroundColor: currentZone.color + '20',
              borderColor: currentZone.color + '50',
              color: currentZone.color
            }}
          >
            {currentZone.label}
          </Badge>
          <div className="text-sm text-[#3C3C3C] mt-2 max-w-xs">
            {description}
          </div>
        </div>
      </div>
    );
  };

  // Sharpe Ratio zones
  const sharpeZones = [
    { threshold: -1, color: '#ef4444', label: 'Poor' },
    { threshold: 0, color: '#f59e0b', label: 'Below Average' },
    { threshold: 1, color: '#eab308', label: 'Average' },
    { threshold: 2, color: '#10b981', label: 'Good' },
    { threshold: 3, color: '#10b981', label: 'Excellent' }
  ];

  // Beta zones
  const betaZones = [
    { threshold: 0, color: '#10b981', label: 'Low Risk' },
    { threshold: 0.5, color: '#eab308', label: 'Moderate' },
    { threshold: 1.0, color: '#f59e0b', label: 'Market Risk' },
    { threshold: 1.5, color: '#ef4444', label: 'High Risk' },
    { threshold: 2.0, color: '#ef4444', label: 'Very High' }
  ];

  // Get interpretation for Sharpe Ratio
  const getSharpeInterpretation = (value: number): string => {
    if (value < 0) return 'Negative returns relative to risk. Consider reviewing this portfolio.';
    if (value < 1) return 'Below average risk-adjusted returns. Room for improvement.';
    if (value < 2) return 'Good risk-adjusted returns. Performing well.';
    return 'Excellent risk-adjusted returns. Outstanding performance.';
  };

  // Get interpretation for Beta
  const getBetaInterpretation = (value: number): string => {
    if (value < 0.5) return 'Low correlation with market. Less volatile than market.';
    if (value < 1.0) return 'Moderate correlation with market. Below market volatility.';
    if (value < 1.5) return 'High correlation with market. Similar or higher volatility.';
    return 'Very high correlation with market. Significantly more volatile.';
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Main Gauges */}
      <Card className="glass-card border-black/10/50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-blue-400" />
            Risk Metrics Dashboard
          </CardTitle>
          <p className="text-sm text-[#3C3C3C] mt-1">
            Key risk indicators for your portfolio performance
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Sharpe Ratio Gauge */}
            <div className="flex flex-col items-center p-3 bg-playful-cream/40 rounded-lg border-2 border-black/20">
              <Gauge
                value={sharpeRatio}
                min={-1}
                max={3}
                zones={sharpeZones}
                label="Sharpe Ratio"
                description="Risk-adjusted return measure"
              />
              <div className="mt-3 p-3 bg-white border-2 border-black rounded-lg w-full">
                <div className="flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-[#1a1a1a]">
                    {getSharpeInterpretation(sharpeRatio)}
                  </p>
                </div>
              </div>
            </div>

            {/* Beta Gauge */}
            <div className="flex flex-col items-center p-3 bg-playful-cream/40 rounded-lg border-2 border-black/20">
              <Gauge
                value={beta}
                min={0}
                max={2}
                zones={betaZones}
                label="Beta"
                description="Market sensitivity measure"
              />
              <div className="mt-3 p-3 bg-playful-cream border-2 border-black rounded-lg w-full">
                <div className="flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-playful-green mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-[#1a1a1a]">
                    {getBetaInterpretation(beta)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Risk Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Alpha Card */}
        {alpha !== undefined && (
          <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
            <CardContent className="p-3">
              <div className="flex items-center gap-2.5 mb-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <span className="text-sm text-[#3C3C3C]">Alpha</span>
              </div>
              <div className={cn(
                'text-sm font-bold mb-1',
                alpha > 0 ? 'text-green-400' : alpha < 0 ? 'text-red-400' : 'text-[#3C3C3C]'
              )}>
                {alpha > 0 ? '+' : ''}{alpha.toFixed(2)}%
              </div>
              <div className="text-sm text-[#3C3C3C] mb-2">
                Excess return vs benchmark
              </div>
              <div className="text-sm text-[#1a1a1a]">
                {alpha > 0 ? (
                  <span className="text-green-400">Outperforming the market</span>
                ) : alpha < 0 ? (
                  <span className="text-red-400">Underperforming the market</span>
                ) : (
                  <span className="text-[#3C3C3C]">Matching the market</span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Volatility Card */}
        {volatility !== undefined && (
          <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
            <CardContent className="p-3">
              <div className="flex items-center gap-2.5 mb-2">
                <Activity className="w-5 h-5 text-orange-400" />
                <span className="text-sm text-[#3C3C3C]">Volatility</span>
              </div>
              <div className={cn(
                'text-sm font-bold mb-1',
                volatility < 15 ? 'text-green-400' : volatility < 25 ? 'text-yellow-400' : 'text-red-400'
              )}>
                {volatility.toFixed(2)}%
              </div>
              <div className="text-sm text-[#3C3C3C] mb-2">
                Annualized standard deviation
              </div>
              <div className="text-sm text-[#1a1a1a]">
                {volatility < 15 ? (
                  <span className="text-green-400">Low volatility - Stable returns</span>
                ) : volatility < 25 ? (
                  <span className="text-yellow-400">Moderate volatility - Average risk</span>
                ) : (
                  <span className="text-red-400">High volatility - Significant swings</span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Max Drawdown Card */}
        {maxDrawdown !== undefined && (
          <Card className="bg-playful-cream border-2 border-black rounded-2xl shadow-md">
            <CardContent className="p-3">
              <div className="flex items-center gap-2.5 mb-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-sm text-[#3C3C3C]">Max Drawdown</span>
              </div>
              <div className={cn(
                'text-sm font-bold mb-1',
                Math.abs(maxDrawdown) < 10 ? 'text-green-400' : Math.abs(maxDrawdown) < 20 ? 'text-yellow-400' : 'text-red-400'
              )}>
                {maxDrawdown.toFixed(2)}%
              </div>
              <div className="text-sm text-[#3C3C3C] mb-2">
                Largest peak-to-trough decline
              </div>
              <div className="text-sm text-[#1a1a1a]">
                {Math.abs(maxDrawdown) < 10 ? (
                  <span className="text-green-400">Minimal drawdown - Strong resilience</span>
                ) : Math.abs(maxDrawdown) < 20 ? (
                  <span className="text-yellow-400">Moderate drawdown - Average risk</span>
                ) : (
                  <span className="text-red-400">Significant drawdown - High risk</span>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Risk Metrics Explanation */}
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
        <CardContent className="p-3">
          <div className="flex items-start gap-10">
            <Shield className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-[#1a1a1a] space-y-2">
              <p className="font-semibold text-neutral-100 text-sm">Understanding Risk Metrics:</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-3">
                <div>
                  <p className="font-semibold text-neutral-100">Sharpe Ratio</p>
                  <p>
                    Measures return per unit of risk. Higher is better.
                  </p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li className="text-red-400">&lt; 0: Poor (losing money)</li>
                    <li className="text-orange-400">0-1: Below average</li>
                    <li className="text-yellow-400">1-2: Good</li>
                    <li className="text-green-400">&gt; 2: Excellent</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold text-neutral-100">Beta</p>
                  <p>
                    Measures portfolio volatility vs market.
                  </p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li className="text-green-400">&lt; 1: Less volatile than market</li>
                    <li className="text-yellow-400">= 1: Moves with market</li>
                    <li className="text-red-400">&gt; 1: More volatile than market</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold text-neutral-100">Alpha</p>
                  <p>
                    Excess return vs benchmark after adjusting for risk.
                  </p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li className="text-green-400">Positive: Outperforming</li>
                    <li className="text-[#3C3C3C]">Zero: Matching market</li>
                    <li className="text-red-400">Negative: Underperforming</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold text-neutral-100">Volatility & Drawdown</p>
                  <p>
                    Volatility measures return consistency. Drawdown shows worst decline.
                  </p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li>Lower volatility = more stable</li>
                    <li>Smaller drawdown = better downside protection</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RiskGauges;