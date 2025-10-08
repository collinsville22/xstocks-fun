import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { cn } from '../../../lib/utils';
import {
  DollarSign,
  Percent,
  TrendingUp,
  Building2,
  Calculator,
  Award,
  Plus,
  X
} from 'lucide-react';

interface FundamentalCriteria {
  marketCapMin?: number;
  marketCapMax?: number;
  peRatioMin?: number;
  peRatioMax?: number;
  pbRatioMin?: number;
  pbRatioMax?: number;
  dividendYieldMin?: number;
  dividendYieldMax?: number;
  epsGrowthMin?: number;
  epsGrowthMax?: number;
  debtEquityMax?: number;
  revenueGrowthMin?: number;
}

interface FundamentalCriteriaProps {
  criteria: FundamentalCriteria;
  onChange: (criteria: FundamentalCriteria) => void;
  className?: string;
}

interface CriterionConfig {
  key: keyof FundamentalCriteria;
  label: string;
  description: string;
  icon: React.ReactNode;
  unit: string;
  min?: number;
  max?: number;
  step?: number;
  color: string;
  presets?: { label: string; value: number | undefined }[];
}

const criteriaConfig: CriterionConfig[] = [
  {
    key: 'marketCapMin',
    label: 'Market Cap (Min)',
    description: 'Minimum market capitalization',
    icon: <Building2 className="w-4 h-4" />,
    unit: 'B',
    min: 0,
    step: 1,
    color: 'text-blue-400',
    presets: [
      { label: 'Micro (<$300M)', value: undefined },
      { label: 'Small ($300M-$2B)', value: 0.3 },
      { label: 'Mid ($2B-$10B)', value: 2 },
      { label: 'Large ($10B+)', value: 10 }
    ]
  },
  {
    key: 'marketCapMax',
    label: 'Market Cap (Max)',
    description: 'Maximum market capitalization',
    icon: <Building2 className="w-4 h-4" />,
    unit: 'B',
    min: 0,
    step: 1,
    color: 'text-blue-400',
    presets: [
      { label: 'Micro (<$300M)', value: 0.3 },
      { label: 'Small ($300M-$2B)', value: 2 },
      { label: 'Mid ($2B-$10B)', value: 10 },
      { label: 'Large ($10B+)', value: undefined }
    ]
  },
  {
    key: 'peRatioMin',
    label: 'P/E Ratio (Min)',
    description: 'Minimum price-to-earnings ratio',
    icon: <Calculator className="w-4 h-4" />,
    unit: 'x',
    min: 0,
    step: 0.5,
    color: 'text-green-400',
    presets: [
      { label: 'Any', value: undefined },
      { label: 'Value (<15)', value: 0 },
      { label: 'Moderate (15-25)', value: 15 },
      { label: 'High (25+)', value: 25 }
    ]
  },
  {
    key: 'peRatioMax',
    label: 'P/E Ratio (Max)',
    description: 'Maximum price-to-earnings ratio',
    icon: <Calculator className="w-4 h-4" />,
    unit: 'x',
    min: 0,
    step: 0.5,
    color: 'text-green-400',
    presets: [
      { label: 'Value (<15)', value: 15 },
      { label: 'Moderate (15-25)', value: 25 },
      { label: 'High (25+)', value: undefined },
      { label: 'Any', value: undefined }
    ]
  },
  {
    key: 'pbRatioMin',
    label: 'P/B Ratio (Min)',
    description: 'Minimum price-to-book ratio',
    icon: <Award className="w-4 h-4" />,
    unit: 'x',
    min: 0,
    step: 0.1,
    color: 'text-primary-400',
    presets: [
      { label: 'Any', value: undefined },
      { label: 'Deep Value (<1)', value: 0 },
      { label: 'Value (1-3)', value: 1 },
      { label: 'Growth (3+)', value: 3 }
    ]
  },
  {
    key: 'pbRatioMax',
    label: 'P/B Ratio (Max)',
    description: 'Maximum price-to-book ratio',
    icon: <Award className="w-4 h-4" />,
    unit: 'x',
    min: 0,
    step: 0.1,
    color: 'text-primary-400',
    presets: [
      { label: 'Deep Value (<1)', value: 1 },
      { label: 'Value (1-3)', value: 3 },
      { label: 'Growth (3+)', value: undefined },
      { label: 'Any', value: undefined }
    ]
  },
  {
    key: 'dividendYieldMin',
    label: 'Dividend Yield (Min)',
    description: 'Minimum dividend yield',
    icon: <Percent className="w-4 h-4" />,
    unit: '%',
    min: 0,
    max: 15,
    step: 0.5,
    color: 'text-orange-400',
    presets: [
      { label: 'Any', value: undefined },
      { label: 'Low (1%+)', value: 1 },
      { label: 'Moderate (3%+)', value: 3 },
      { label: 'High (5%+)', value: 5 }
    ]
  },
  {
    key: 'dividendYieldMax',
    label: 'Dividend Yield (Max)',
    description: 'Maximum dividend yield',
    icon: <Percent className="w-4 h-4" />,
    unit: '%',
    min: 0,
    max: 15,
    step: 0.5,
    color: 'text-orange-400',
    presets: [
      { label: 'Low (1%)', value: 1 },
      { label: 'Moderate (3%)', value: 3 },
      { label: 'High (5%)', value: 5 },
      { label: 'Any', value: undefined }
    ]
  },
  {
    key: 'epsGrowthMin',
    label: 'EPS Growth (Min)',
    description: 'Minimum earnings per share growth',
    icon: <TrendingUp className="w-4 h-4" />,
    unit: '%',
    min: -50,
    max: 100,
    step: 1,
    color: 'text-cyan-400',
    presets: [
      { label: 'Any', value: undefined },
      { label: 'Positive (0%+)', value: 0 },
      { label: 'Moderate (10%+)', value: 10 },
      { label: 'High (20%+)', value: 20 }
    ]
  },
  {
    key: 'epsGrowthMax',
    label: 'EPS Growth (Max)',
    description: 'Maximum earnings per share growth',
    icon: <TrendingUp className="w-4 h-4" />,
    unit: '%',
    min: -50,
    max: 100,
    step: 1,
    color: 'text-cyan-400',
    presets: [
      { label: 'Negative (<0%)', value: 0 },
      { label: 'Moderate (10%)', value: 10 },
      { label: 'High (20%)', value: 20 },
      { label: 'Any', value: undefined }
    ]
  },
  {
    key: 'debtEquityMax',
    label: 'Debt/Equity (Max)',
    description: 'Maximum debt-to-equity ratio',
    icon: <DollarSign className="w-4 h-4" />,
    unit: 'x',
    min: 0,
    max: 5,
    step: 0.1,
    color: 'text-red-400',
    presets: [
      { label: 'Conservative (<0.3)', value: 0.3 },
      { label: 'Moderate (<0.6)', value: 0.6 },
      { label: 'Aggressive (<1.0)', value: 1.0 },
      { label: 'Any', value: undefined }
    ]
  },
  {
    key: 'revenueGrowthMin',
    label: 'Revenue Growth (Min)',
    description: 'Minimum revenue growth rate',
    icon: <TrendingUp className="w-4 h-4" />,
    unit: '%',
    min: -30,
    max: 50,
    step: 1,
    color: 'text-emerald-400',
    presets: [
      { label: 'Any', value: undefined },
      { label: 'Positive (0%+)', value: 0 },
      { label: 'Moderate (5%+)', value: 5 },
      { label: 'High (15%+)', value: 15 }
    ]
  }
];

const FundamentalCriteriaComponent: React.FC<FundamentalCriteriaProps> = ({
  criteria,
  onChange,
  className
}) => {
  const updateCriteria = (key: keyof FundamentalCriteria, value: number | undefined) => {
    onChange({
      ...criteria,
      [key]: value
    });
  };

  const clearCriterion = (key: keyof FundamentalCriteria) => {
    const newCriteria = { ...criteria };
    delete newCriteria[key];
    onChange(newCriteria);
  };

  const clearAllCriteria = () => {
    onChange({});
  };

  const formatValue = (value: number | undefined, unit: string) => {
    if (value === undefined) return '';
    if (unit === 'B' && value >= 1) return `$${value}B`;
    if (unit === 'B' && value < 1) return `$${(value * 1000).toFixed(0)}M`;
    return `${value}${unit}`;
  };

  const activeCriteriaCount = Object.keys(criteria).filter(key => criteria[key as keyof FundamentalCriteria] !== undefined).length;

  return (
    <Card className={cn("glass-card border-black/10/50", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#1a1a1a] flex items-center gap-2.5">
            <DollarSign className="w-5 h-5 text-green-400" />
            Fundamental Criteria
            {activeCriteriaCount > 0 && (
              <Badge variant="outline" className="text-green-400 border-green-400/50">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
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

                  {hasValue && (
                    <div className="text-sm text-[#3C3C3C] flex items-center gap-1.5">
                      Current: <span className={config.color}>{formatValue(value, config.unit)}</span>
                    </div>
                  )}

                  {config.presets && (
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
                              ? `bg-gradient-to-r from-primary-500/20 to-primary-600/20 backdrop-blur-md border border-primary-500/30 text-[#1a1a1a] border-transparent`
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

        {/* Active Criteria Summary */}
        {activeCriteriaCount > 0 && (
          <div className="border-t border-black/10/50 pt-4 mt-3">
            <div className="flex items-center gap-2.5 mb-3">
              <Calculator className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-blue-400">Active Criteria Summary</span>
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
                    className={cn("text-sm", config.color, `border-current`)}
                  >
                    {config.label}: {formatValue(value, config.unit)}
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

export { FundamentalCriteriaComponent, type FundamentalCriteria };