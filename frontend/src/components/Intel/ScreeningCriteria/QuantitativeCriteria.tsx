import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { cn } from '../../../lib/utils';
import {
  Brain,
  Star,
  Users,
  TrendingUp,
  Shield,
  Eye,
  Award,
  Zap,
  Target,
  Briefcase,
  X,
  Calculator
} from 'lucide-react';

interface QuantitativeCriteria {
  analystRatingMin?: number;
  analystRatingMax?: number;
  earningsSurpriseMin?: number;
  earningsSurpriseMax?: number;
  shortInterestMin?: number;
  shortInterestMax?: number;
  insiderOwnershipMin?: number;
  insiderOwnershipMax?: number;
  institutionalOwnershipMin?: number;
  institutionalOwnershipMax?: number;
  putCallRatioMin?: number;
  putCallRatioMax?: number;
}

interface QuantitativeCriteriaProps {
  criteria: QuantitativeCriteria;
  onChange: (criteria: QuantitativeCriteria) => void;
  className?: string;
}

interface CriterionConfig {
  key: keyof QuantitativeCriteria;
  label: string;
  description: string;
  icon: React.ReactNode;
  unit: string;
  min?: number;
  max?: number;
  step?: number;
  color: string;
  presets?: { label: string; value: number | string | undefined }[];
  type: 'range' | 'select';
}

const criteriaConfig: CriterionConfig[] = [
  {
    key: 'analystRatingMin',
    label: 'Analyst Rating (Min)',
    description: 'Minimum analyst consensus rating',
    icon: <Star className="w-4 h-4" />,
    unit: '/5',
    min: 1,
    max: 5,
    step: 0.1,
    color: 'text-yellow-400',
    type: 'range',
    presets: [
      { label: 'Any', value: undefined },
      { label: 'Sell (1+)', value: 1 },
      { label: 'Hold (2+)', value: 2 },
      { label: 'Buy (4+)', value: 4 }
    ]
  },
  {
    key: 'analystRatingMax',
    label: 'Analyst Rating (Max)',
    description: 'Maximum analyst consensus rating',
    icon: <Star className="w-4 h-4" />,
    unit: '/5',
    min: 1,
    max: 5,
    step: 0.1,
    color: 'text-yellow-400',
    type: 'range',
    presets: [
      { label: 'Sell (1)', value: 1 },
      { label: 'Hold (2)', value: 2 },
      { label: 'Buy (4)', value: 4 },
      { label: 'Any', value: undefined }
    ]
  },
  {
    key: 'earningsSurpriseMin',
    label: 'Earnings Surprise (Min)',
    description: 'Minimum earnings surprise percentage',
    icon: <TrendingUp className="w-4 h-4" />,
    unit: '%',
    min: -50,
    max: 100,
    step: 1,
    color: 'text-green-400',
    type: 'range',
    presets: [
      { label: 'Any', value: undefined },
      { label: 'Positive (0%+)', value: 0 },
      { label: 'Strong (5%+)', value: 5 },
      { label: 'Exceptional (15%+)', value: 15 }
    ]
  },
  {
    key: 'earningsSurpriseMax',
    label: 'Earnings Surprise (Max)',
    description: 'Maximum earnings surprise percentage',
    icon: <TrendingUp className="w-4 h-4" />,
    unit: '%',
    min: -50,
    max: 100,
    step: 1,
    color: 'text-green-400',
    type: 'range',
    presets: [
      { label: 'Negative (0%)', value: 0 },
      { label: 'Moderate (5%)', value: 5 },
      { label: 'Strong (15%)', value: 15 },
      { label: 'Any', value: undefined }
    ]
  },
  {
    key: 'shortInterestMin',
    label: 'Short Interest (Min)',
    description: 'Minimum short interest percentage',
    icon: <TrendingUp className="w-4 h-4" />,
    unit: '%',
    min: 0,
    max: 50,
    step: 0.5,
    color: 'text-red-400',
    type: 'range',
    presets: [
      { label: 'Any', value: undefined },
      { label: 'Low (2%+)', value: 2 },
      { label: 'Moderate (5%+)', value: 5 },
      { label: 'High (10%+)', value: 10 }
    ]
  },
  {
    key: 'shortInterestMax',
    label: 'Short Interest (Max)',
    description: 'Maximum short interest percentage',
    icon: <TrendingUp className="w-4 h-4" />,
    unit: '%',
    min: 0,
    max: 50,
    step: 0.5,
    color: 'text-red-400',
    type: 'range',
    presets: [
      { label: 'Low (2%)', value: 2 },
      { label: 'Moderate (5%)', value: 5 },
      { label: 'High (10%)', value: 10 },
      { label: 'Any', value: undefined }
    ]
  },
  {
    key: 'insiderOwnershipMin',
    label: 'Insider Ownership (Min)',
    description: 'Minimum insider ownership percentage',
    icon: <Users className="w-4 h-4" />,
    unit: '%',
    min: 0,
    max: 100,
    step: 1,
    color: 'text-blue-400',
    type: 'range',
    presets: [
      { label: 'Any', value: undefined },
      { label: 'Low (5%+)', value: 5 },
      { label: 'Moderate (15%+)', value: 15 },
      { label: 'High (25%+)', value: 25 }
    ]
  },
  {
    key: 'insiderOwnershipMax',
    label: 'Insider Ownership (Max)',
    description: 'Maximum insider ownership percentage',
    icon: <Users className="w-4 h-4" />,
    unit: '%',
    min: 0,
    max: 100,
    step: 1,
    color: 'text-blue-400',
    type: 'range',
    presets: [
      { label: 'Low (5%)', value: 5 },
      { label: 'Moderate (15%)', value: 15 },
      { label: 'High (25%)', value: 25 },
      { label: 'Any', value: undefined }
    ]
  },
  {
    key: 'institutionalOwnershipMin',
    label: 'Institutional Ownership (Min)',
    description: 'Minimum institutional ownership percentage',
    icon: <Briefcase className="w-4 h-4" />,
    unit: '%',
    min: 0,
    max: 100,
    step: 1,
    color: 'text-primary-400',
    type: 'range',
    presets: [
      { label: 'Any', value: undefined },
      { label: 'Low (20%+)', value: 20 },
      { label: 'Moderate (50%+)', value: 50 },
      { label: 'High (75%+)', value: 75 }
    ]
  },
  {
    key: 'institutionalOwnershipMax',
    label: 'Institutional Ownership (Max)',
    description: 'Maximum institutional ownership percentage',
    icon: <Briefcase className="w-4 h-4" />,
    unit: '%',
    min: 0,
    max: 100,
    step: 1,
    color: 'text-primary-400',
    type: 'range',
    presets: [
      { label: 'Low (20%)', value: 20 },
      { label: 'Moderate (50%)', value: 50 },
      { label: 'High (75%)', value: 75 },
      { label: 'Any', value: undefined }
    ]
  },
  {
    key: 'putCallRatioMin',
    label: 'Put/Call Ratio (Min)',
    description: 'Minimum put/call ratio from options activity',
    icon: <Calculator className="w-4 h-4" />,
    unit: '',
    min: 0,
    max: 5,
    step: 0.1,
    color: 'text-cyan-400',
    type: 'range',
    presets: [
      { label: 'Any', value: undefined },
      { label: 'Bullish (<0.7)', value: 0 },
      { label: 'Neutral (0.7-1.3)', value: 0.7 },
      { label: 'Bearish (>1.3)', value: 1.3 }
    ]
  },
  {
    key: 'putCallRatioMax',
    label: 'Put/Call Ratio (Max)',
    description: 'Maximum put/call ratio from options activity',
    icon: <Calculator className="w-4 h-4" />,
    unit: '',
    min: 0,
    max: 5,
    step: 0.1,
    color: 'text-cyan-400',
    type: 'range',
    presets: [
      { label: 'Bullish (<0.7)', value: 0.7 },
      { label: 'Neutral (0.7-1.3)', value: 1.3 },
      { label: 'Bearish (>1.3)', value: 5 },
      { label: 'Any', value: undefined }
    ]
  },
];

const QuantitativeCriteriaComponent: React.FC<QuantitativeCriteriaProps> = ({
  criteria,
  onChange,
  className
}) => {
  const updateCriteria = (key: keyof QuantitativeCriteria, value: any) => {
    onChange({
      ...criteria,
      [key]: value
    });
  };

  const clearCriterion = (key: keyof QuantitativeCriteria) => {
    const newCriteria = { ...criteria };
    delete newCriteria[key];
    onChange(newCriteria);
  };

  const clearAllCriteria = () => {
    onChange({});
  };

  const formatValue = (value: number | string | undefined, unit: string) => {
    if (value === undefined) return '';
    if (typeof value === 'string') return value;
    return `${value}${unit}`;
  };

  const activeCriteriaCount = Object.keys(criteria).filter(key =>
    criteria[key as keyof QuantitativeCriteria] !== undefined
  ).length;

  return (
    <Card className={cn("glass-card border-black/10/50", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#1a1a1a] flex items-center gap-2.5">
            <Brain className="w-5 h-5 text-primary-400" />
            Quantitative Criteria
            {activeCriteriaCount > 0 && (
              <Badge variant="outline" className="text-primary-400 border-primary-400/50">
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
                              ? `bg-gradient-to-r from-playful-green to-pink-500 text-[#1a1a1a] border-transparent`
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
                              ? `bg-gradient-to-r from-playful-green to-pink-500 text-[#1a1a1a] border-transparent`
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
          <div className="border-t border-black/10/50 pt-4">
            <div className="flex items-center gap-2.5 mb-3">
              <Brain className="w-4 h-4 text-primary-400" />
              <span className="text-sm font-medium text-primary-400">Active Quantitative Criteria</span>
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
                    {config.label}: {formatValue(value as number, config.unit) || value}
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

export { QuantitativeCriteriaComponent, type QuantitativeCriteria };