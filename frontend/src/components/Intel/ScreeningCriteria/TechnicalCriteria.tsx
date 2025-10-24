import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { cn } from '../../../lib/utils';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Zap,
  Target,
  Radio,
  Crosshair,
  Plus,
  X,
  Waves
} from 'lucide-react';

interface TechnicalCriteria {
  priceChangeMin?: number;
  priceChangeMax?: number;
  volumeMin?: number;
  volumeMax?: number;
  rsiMin?: number;
  rsiMax?: number;
  macdSignal?: 'bullish' | 'bearish' | 'neutral';
  priceVsMA?: 'above' | 'below' | 'neutral';
  volatilityMin?: number;
  volatilityMax?: number;
  pattern?: string[];
}

interface TechnicalCriteriaProps {
  criteria: TechnicalCriteria;
  onChange: (criteria: TechnicalCriteria) => void;
  className?: string;
}

interface CriterionConfig {
  key: keyof TechnicalCriteria;
  label: string;
  description: string;
  icon: React.ReactNode;
  unit: string;
  min?: number;
  max?: number;
  step?: number;
  color: string;
  presets?: { label: string; value: number | string | undefined }[];
  type: 'range' | 'select' | 'multiselect';
}

const criteriaConfig: CriterionConfig[] = [
  {
    key: 'priceChangeMin',
    label: 'Price Change (Min)',
    description: 'Minimum price change percentage',
    icon: <TrendingUp className="w-4 h-4" />,
    unit: '%',
    min: -50,
    max: 100,
    step: 0.5,
    color: 'text-green-400',
    type: 'range',
    presets: [
      { label: 'Any', value: undefined },
      { label: 'Positive (0%+)', value: 0 },
      { label: 'Strong (+5%)', value: 5 },
      { label: 'Very Strong (+10%)', value: 10 }
    ]
  },
  {
    key: 'priceChangeMax',
    label: 'Price Change (Max)',
    description: 'Maximum price change percentage',
    icon: <TrendingDown className="w-4 h-4" />,
    unit: '%',
    min: -50,
    max: 100,
    step: 0.5,
    color: 'text-red-400',
    type: 'range',
    presets: [
      { label: 'Negative (<0%)', value: 0 },
      { label: 'Weak (-5%)', value: -5 },
      { label: 'Very Weak (-10%)', value: -10 },
      { label: 'Any', value: undefined }
    ]
  },
  {
    key: 'volumeMin',
    label: 'Volume (Min)',
    description: 'Minimum trading volume',
    icon: <BarChart3 className="w-4 h-4" />,
    unit: 'M',
    min: 0,
    step: 0.1,
    color: 'text-blue-400',
    type: 'range',
    presets: [
      { label: 'Any', value: undefined },
      { label: 'Low (1M+)', value: 1 },
      { label: 'Moderate (5M+)', value: 5 },
      { label: 'High (10M+)', value: 10 }
    ]
  },
  {
    key: 'volumeMax',
    label: 'Volume (Max)',
    description: 'Maximum trading volume',
    icon: <BarChart3 className="w-4 h-4" />,
    unit: 'M',
    min: 0,
    step: 0.1,
    color: 'text-blue-400',
    type: 'range',
    presets: [
      { label: 'Low (1M)', value: 1 },
      { label: 'Moderate (5M)', value: 5 },
      { label: 'High (10M)', value: 10 },
      { label: 'Any', value: undefined }
    ]
  },
  {
    key: 'rsiMin',
    label: 'RSI (Min)',
    description: 'Minimum Relative Strength Index',
    icon: <Target className="w-4 h-4" />,
    unit: '',
    min: 0,
    max: 100,
    step: 1,
    color: 'text-primary-400',
    type: 'range',
    presets: [
      { label: 'Any', value: undefined },
      { label: 'Oversold (30+)', value: 30 },
      { label: 'Neutral (50+)', value: 50 },
      { label: 'Overbought (70+)', value: 70 }
    ]
  },
  {
    key: 'rsiMax',
    label: 'RSI (Max)',
    description: 'Maximum Relative Strength Index',
    icon: <Target className="w-4 h-4" />,
    unit: '',
    min: 0,
    max: 100,
    step: 1,
    color: 'text-primary-400',
    type: 'range',
    presets: [
      { label: 'Oversold (30)', value: 30 },
      { label: 'Neutral (50)', value: 50 },
      { label: 'Overbought (70)', value: 70 },
      { label: 'Any', value: undefined }
    ]
  },
  {
    key: 'macdSignal',
    label: 'MACD Signal',
    description: 'MACD momentum indicator signal',
    icon: <Waves className="w-4 h-4" />,
    unit: '',
    color: 'text-cyan-400',
    type: 'select',
    presets: [
      { label: 'Any', value: undefined },
      { label: 'Bullish', value: 'bullish' },
      { label: 'Bearish', value: 'bearish' },
      { label: 'Neutral', value: 'neutral' }
    ]
  },
  {
    key: 'priceVsMA',
    label: 'Price vs Moving Average',
    description: 'Price position relative to moving average',
    icon: <Radio className="w-4 h-4" />,
    unit: '',
    color: 'text-yellow-400',
    type: 'select',
    presets: [
      { label: 'Any', value: undefined },
      { label: 'Above MA', value: 'above' },
      { label: 'Below MA', value: 'below' },
      { label: 'Near MA', value: 'neutral' }
    ]
  },
  {
    key: 'volatilityMin',
    label: 'Volatility (Min)',
    description: 'Minimum price volatility',
    icon: <Zap className="w-4 h-4" />,
    unit: '%',
    min: 0,
    max: 100,
    step: 1,
    color: 'text-orange-400',
    type: 'range',
    presets: [
      { label: 'Any', value: undefined },
      { label: 'Low (10%+)', value: 10 },
      { label: 'Moderate (25%+)', value: 25 },
      { label: 'High (50%+)', value: 50 }
    ]
  },
  {
    key: 'volatilityMax',
    label: 'Volatility (Max)',
    description: 'Maximum price volatility',
    icon: <Zap className="w-4 h-4" />,
    unit: '%',
    min: 0,
    max: 100,
    step: 1,
    color: 'text-orange-400',
    type: 'range',
    presets: [
      { label: 'Low (10%)', value: 10 },
      { label: 'Moderate (25%)', value: 25 },
      { label: 'High (50%)', value: 50 },
      { label: 'Any', value: undefined }
    ]
  }
];

// Technical patterns
const technicalPatterns = [
  'Double Bottom', 'Double Top', 'Head & Shoulders', 'Inverse H&S',
  'Triangle', 'Flag', 'Pennant', 'Cup & Handle',
  'Breakout', 'Support Break', 'Resistance Break', 'Gap Up',
  'Gap Down', 'Hammer', 'Doji', 'Engulfing'
];

const TechnicalCriteriaComponent: React.FC<TechnicalCriteriaProps> = ({
  criteria,
  onChange,
  className
}) => {
  const updateCriteria = (key: keyof TechnicalCriteria, value: any) => {
    onChange({
      ...criteria,
      [key]: value
    });
  };

  const clearCriterion = (key: keyof TechnicalCriteria) => {
    const newCriteria = { ...criteria };
    delete newCriteria[key];
    onChange(newCriteria);
  };

  const clearAllCriteria = () => {
    onChange({});
  };

  const togglePattern = (pattern: string) => {
    const currentPatterns = criteria.pattern || [];
    const newPatterns = currentPatterns.includes(pattern)
      ? currentPatterns.filter(p => p !== pattern)
      : [...currentPatterns, pattern];

    updateCriteria('pattern', newPatterns.length > 0 ? newPatterns : undefined);
  };

  const formatValue = (value: number | string | undefined, unit: string) => {
    if (value === undefined) return '';
    if (typeof value === 'string') return value;
    if (unit === 'M' && value >= 1) return `${value}M`;
    if (unit === 'M' && value < 1) return `${(value * 1000).toFixed(0)}K`;
    return `${value}${unit}`;
  };

  const activeCriteriaCount = Object.keys(criteria).filter(key =>
    criteria[key as keyof TechnicalCriteria] !== undefined
  ).length;

  return (
    <Card className={cn("glass-card border-black/10/50", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#1a1a1a] flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-orange-400" />
            Technical Criteria
            {activeCriteriaCount > 0 && (
              <Badge variant="outline" className="text-orange-400 border-orange-400/50">
                {activeCriteriaCount} active
              </Badge>
            )}
          </CardTitle>
          <Button
            onClick={clearAllCriteria}
            variant="outline"
            size="sm"
            className="border-red-400/50 text-red-400 hover:bg-red-400/10"
          >
            Clear All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {criteriaConfig.map((config) => {
            const value = criteria[config.key];
            const hasValue = value !== undefined;

            return (
              <div key={config.key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className={cn("flex items-center gap-2.5 font-medium", config.color)}>
                    {config.icon}
                    {config.label}
                  </Label>
                  {hasValue && (
                    <Button
                      onClick={() => clearCriterion(config.key)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-[#3C3C3C] hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  {config.type === 'range' && (
                    <Input
                      type="number"
                      placeholder={`Enter ${config.label.toLowerCase()}`}
                      value={value || ''}
                      onChange={(e) => {
                        const newValue = e.target.value === '' ? undefined : parseFloat(e.target.value);
                        updateCriteria(config.key, newValue);
                      }}
                      min={config.min}
                      max={config.max}
                      step={config.step}
                      className="bg-gray-900/50 border-black/10/50 text-[#1a1a1a] placeholder-gray-400"
                    />
                  )}

                  {config.type === 'select' && (
                    <div className="flex flex-wrap gap-1.5">
                      {config.presets?.map((preset, idx) => (
                        <Button
                          key={idx}
                          onClick={() => updateCriteria(config.key, preset.value)}
                          variant="outline"
                          size="sm"
                          className={cn(
                            "h-8 text-sm px-3",
                            value === preset.value
                              ? `bg-gradient-to-r from-orange-500 to-red-500 text-[#1a1a1a] border-transparent`
                              : "glass-card text-[#1a1a1a] border-black/10/50 hover:bg-gray-700/50"
                          )}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  )}

                  {hasValue && config.type === 'range' && (
                    <div className="text-sm text-[#3C3C3C] flex items-center gap-1.5">
                      Current: <span className={config.color}>{formatValue(value as number, config.unit)}</span>
                    </div>
                  )}

                  {config.type === 'range' && config.presets && (
                    <div className="flex flex-wrap gap-1.5">
                      {config.presets.map((preset, idx) => (
                        <Button
                          key={idx}
                          onClick={() => updateCriteria(config.key, preset.value)}
                          variant="outline"
                          size="sm"
                          className={cn(
                            "h-6 text-sm px-2 py-0",
                            value === preset.value
                              ? `bg-gradient-to-r from-orange-500 to-red-500 text-[#1a1a1a] border-transparent`
                              : "glass-card text-[#1a1a1a] border-black/10/50 hover:bg-gray-700/50"
                          )}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-sm text-[#3C3C3C]">{config.description}</p>
              </div>
            );
          })}
        </div>

        {/* Pattern Recognition Section */}
        <div className="border-t border-black/10/50 pt-6">
          <div className="flex items-center gap-2.5 mb-3">
            <Crosshair className="w-4 h-4 text-danger-400" />
            <Label className="text-danger-400 font-medium">Pattern Recognition</Label>
            {criteria.pattern && criteria.pattern.length > 0 && (
              <Badge variant="outline" className="text-danger-400 border-pink-400/50">
                {criteria.pattern.length} patterns
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {technicalPatterns.map((pattern) => (
              <Button
                key={pattern}
                onClick={() => togglePattern(pattern)}
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 text-sm",
                  criteria.pattern?.includes(pattern)
                    ? "bg-gradient-to-r from-pink-500 to-playful-green text-[#1a1a1a] border-transparent"
                    : "glass-card text-[#1a1a1a] border-black/10/50 hover:bg-gray-700/50"
                )}
              >
                {pattern}
              </Button>
            ))}
          </div>
        </div>

        {/* Active Criteria Summary */}
        {activeCriteriaCount > 0 && (
          <div className="border-t border-black/10/50 pt-4">
            <div className="flex items-center gap-2.5 mb-3">
              <Activity className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-medium text-orange-400">Active Technical Criteria</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {Object.entries(criteria).map(([key, value]) => {
                if (value === undefined) return null;
                const config = criteriaConfig.find(c => c.key === key);
                if (!config) return null;

                return (
                  <Badge
                    key={key}
                    variant="outline"
                    className={cn("text-sm", config.color, "border-current")}
                  >
                    {config.label}: {
                      Array.isArray(value)
                        ? `${value.length} patterns`
                        : formatValue(value as number, config.unit) || value
                    }
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export { TechnicalCriteriaComponent, type TechnicalCriteria };