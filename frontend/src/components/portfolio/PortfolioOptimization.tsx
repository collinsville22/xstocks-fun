import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Target,
  TrendingUp,
  Shield,
  PieChart,
  Zap,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Percent,
  BarChart3,
  Activity
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Token } from '../../types';

interface XStockData {
  [key: string]: {
    symbol: string;
    name: string;
    sector: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    xstockSymbol: string;
    lastUpdate: string | number;
  };
}

interface TokenHolding {
  token: Token;
  balance: number;
  usdValue: number;
  marketData: any;
  change24h: number;
  changePercent24h: number;
  weight: number;
}

interface OptimizationSuggestion {
  type: 'rebalance' | 'diversify' | 'risk_reduce' | 'performance_improve';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expectedImpact: {
    returnImprovement?: number;
    riskReduction?: number;
    diversificationImprovement?: number;
  };
  actions: Array<{
    type: 'buy' | 'sell' | 'hold';
    token: string;
    currentWeight: number;
    targetWeight: number;
    usdAmount: number;
  }>;
}

interface PortfolioOptimizationProps {
  holdings: TokenHolding[];
  analytics: any;
  intelData: XStockData;
  tokens: Token[];
  totalPortfolioValue: number;
}

export const PortfolioOptimization: React.FC<PortfolioOptimizationProps> = ({
  holdings,
  analytics,
  intelData,
  tokens,
  totalPortfolioValue
}) => {
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [optimizedPortfolio, setOptimizedPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [targetReturn, setTargetReturn] = useState(0.12); // 12% target annual return
  const [riskTolerance, setRiskTolerance] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate');

  // Calculate efficient frontier and optimal portfolio
  const calculateOptimalPortfolio = useCallback(() => {
    if (holdings.length === 0) return null;

    // Extract returns and create correlation matrix
    const symbols = holdings.map(h => h.token.symbol);
    const returns = holdings.map(h => h.changePercent24h / 100);
    const weights = holdings.map(h => h.weight / 100);

    // Calculate portfolio metrics
    const portfolioReturn = returns.reduce((sum, ret, i) => sum + (ret * weights[i]), 0);
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const portfolioVol = Math.sqrt(variance);

    // Modern Portfolio Theory optimization
    // Simplified implementation - in production would use numerical optimization
    const riskFreeRate = 0.02 / 252; // Daily risk-free rate
    const currentSharpe = portfolioVol > 0 ? (portfolioReturn - riskFreeRate) / portfolioVol : 0;

    // Generate optimal weights based on risk tolerance and market data
    const optimalWeights = generateOptimalWeights(holdings, riskTolerance, intelData);

    // Calculate metrics for optimized portfolio
    const optimizedReturn = optimalWeights.reduce((sum, weight, i) => sum + (weight * returns[i]), 0);
    const optimizedVol = calculatePortfolioVolatility(optimalWeights, returns);
    const optimizedSharpe = optimizedVol > 0 ? (optimizedReturn - riskFreeRate) / optimizedVol : 0;

    return {
      current: {
        weights,
        return: portfolioReturn * 252, // Annualized
        volatility: portfolioVol * Math.sqrt(252),
        sharpe: currentSharpe * Math.sqrt(252)
      },
      optimized: {
        weights: optimalWeights,
        return: optimizedReturn * 252,
        volatility: optimizedVol * Math.sqrt(252),
        sharpe: optimizedSharpe * Math.sqrt(252)
      },
      improvement: {
        returnGain: (optimizedReturn - portfolioReturn) * 252,
        riskReduction: (portfolioVol - optimizedVol) * Math.sqrt(252),
        sharpeImprovement: (optimizedSharpe - currentSharpe) * Math.sqrt(252)
      }
    };
  }, [holdings, riskTolerance, intelData]);

  // Generate optimal weights using Modern Portfolio Theory
  const generateOptimalWeights = (holdings: TokenHolding[], risk: string, marketData: XStockData): number[] => {
    const n = holdings.length;
    if (n === 0) return [];

    // Risk tolerance parameters
    const riskParams = {
      conservative: { maxWeight: 0.15, sectorLimit: 0.25, volatilityPenalty: 2.0 },
      moderate: { maxWeight: 0.25, sectorLimit: 0.35, volatilityPenalty: 1.0 },
      aggressive: { maxWeight: 0.40, sectorLimit: 0.50, volatilityPenalty: 0.5 }
    };

    const params = riskParams[risk];

    // Sector diversification
    const sectorAllocation: { [sector: string]: number } = {};
    const sectorCounts: { [sector: string]: number } = {};

    holdings.forEach(holding => {
      const sector = holding.marketData.sector || 'Unknown';
      sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
    });

    // Calculate optimal weights
    const weights = new Array(n).fill(0);
    const scores = holdings.map((holding, i) => {
      const marketData = Object.values(intelData).find(data =>
        data.xstockSymbol === holding.token.symbol
      );

      if (!marketData) return 0;

      // Score based on multiple factors
      const returnScore = marketData.changePercent > 0 ? Math.log(1 + marketData.changePercent / 100) : -0.1;
      const volumeScore = Math.log(1 + marketData.volume / 1000000) * 0.1; // Liquidity preference
      const volatilityPenalty = Math.abs(marketData.changePercent) / 100 * params.volatilityPenalty;

      return returnScore + volumeScore - volatilityPenalty;
    });

    // Normalize scores and apply constraints
    const maxScore = Math.max(...scores);
    const normalizedScores = scores.map(score => Math.max(0, score / maxScore));

    let totalWeight = 0;

    // First pass: assign weights based on scores
    normalizedScores.forEach((score, i) => {
      weights[i] = Math.min(score * 0.3, params.maxWeight); // Base allocation
      totalWeight += weights[i];
    });

    // Second pass: ensure diversification and full allocation
    const remaining = 1 - totalWeight;
    if (remaining > 0) {
      const equalWeight = remaining / n;
      weights.forEach((weight, i) => {
        weights[i] = Math.min(weight + equalWeight, params.maxWeight);
      });
    }

    // Normalize to sum to 1
    const finalTotal = weights.reduce((sum, w) => sum + w, 0);
    return weights.map(w => w / finalTotal);
  };

  // Calculate portfolio volatility given weights and returns
  const calculatePortfolioVolatility = (weights: number[], returns: number[]): number => {
    // Simplified - assumes uncorrelated assets for demonstration
    const variance = weights.reduce((sum, weight, i) => {
      const assetReturn = returns[i] || 0;
      return sum + Math.pow(weight * assetReturn, 2);
    }, 0);
    return Math.sqrt(variance);
  };

  // Generate optimization suggestions
  const generateSuggestions = useCallback(() => {
    if (!optimizedPortfolio || holdings.length === 0) return [];

    const suggestions: OptimizationSuggestion[] = [];

    // Rebalancing suggestions
    const rebalanceActions: any[] = [];
    optimizedPortfolio.optimized.weights.forEach((targetWeight: number, i: number) => {
      const holding = holdings[i];
      const currentWeight = holding.weight / 100;
      const difference = targetWeight - currentWeight;

      if (Math.abs(difference) > 0.05) { // 5% threshold
        rebalanceActions.push({
          type: difference > 0 ? 'buy' : 'sell',
          token: holding.token.symbol,
          currentWeight: currentWeight * 100,
          targetWeight: targetWeight * 100,
          usdAmount: Math.abs(difference) * totalPortfolioValue
        });
      }
    });

    if (rebalanceActions.length > 0) {
      suggestions.push({
        type: 'rebalance',
        priority: 'high',
        title: 'Portfolio Rebalancing Recommended',
        description: `Optimize your allocation to improve risk-adjusted returns by ${(optimizedPortfolio.improvement.sharpeImprovement * 100).toFixed(1)}%`,
        expectedImpact: {
          returnImprovement: optimizedPortfolio.improvement.returnGain,
          riskReduction: Math.abs(optimizedPortfolio.improvement.riskReduction),
          diversificationImprovement: 15
        },
        actions: rebalanceActions
      });
    }

    // Diversification suggestions
    const sectorCounts: { [sector: string]: number } = {};
    holdings.forEach(holding => {
      const sector = holding.marketData.sector || 'Unknown';
      sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
    });

    const totalHoldings = holdings.length;
    const dominantSectors = Object.entries(sectorCounts).filter(([, count]) => count / totalHoldings > 0.4);

    if (dominantSectors.length > 0) {
      suggestions.push({
        type: 'diversify',
        priority: 'medium',
        title: 'Improve Sector Diversification',
        description: `Your portfolio is concentrated in ${dominantSectors[0][0]}. Consider diversifying across more sectors.`,
        expectedImpact: {
          riskReduction: 0.05,
          diversificationImprovement: 25
        },
        actions: []
      });
    }

    // Risk reduction suggestions
    if (analytics?.volatility > 0.25) { // High volatility threshold
      suggestions.push({
        type: 'risk_reduce',
        priority: 'medium',
        title: 'High Portfolio Volatility Detected',
        description: `Portfolio volatility is ${(analytics.volatility * 100).toFixed(1)}%. Consider adding more stable assets.`,
        expectedImpact: {
          riskReduction: 0.1
        },
        actions: []
      });
    }

    // Performance improvement suggestions
    if (optimizedPortfolio.improvement.returnGain > 0.02) {
      suggestions.push({
        type: 'performance_improve',
        priority: 'high',
        title: 'Potential Return Enhancement',
        description: `Mathematical optimization suggests potential for ${(optimizedPortfolio.improvement.returnGain * 100).toFixed(1)}% additional annual return`,
        expectedImpact: {
          returnImprovement: optimizedPortfolio.improvement.returnGain
        },
        actions: []
      });
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [optimizedPortfolio, holdings, analytics, totalPortfolioValue]);

  // Calculate optimization on data change
  useEffect(() => {
    if (holdings.length > 0) {
      setLoading(true);
      const optimal = calculateOptimalPortfolio();
      setOptimizedPortfolio(optimal);

      if (optimal) {
        const newSuggestions = generateSuggestions();
        setSuggestions(newSuggestions);
      }

      setLoading(false);
    }
  }, [holdings, calculateOptimalPortfolio, generateSuggestions]);

  // Get priority badge color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-[#2C2C2C] border-black/20';
    }
  };

  // Get suggestion icon
  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'rebalance': return <Target className="w-5 h-5" />;
      case 'diversify': return <PieChart className="w-5 h-5" />;
      case 'risk_reduce': return <Shield className="w-5 h-5" />;
      case 'performance_improve': return <TrendingUp className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  if (holdings.length === 0) {
    return (
      <div className="bg-white/95 border-4 border-black rounded-[32px] p-16 shadow-2xl text-center">
        <div className="w-24 h-24 bg-playful-orange/10 rounded-2xl border-2 border-black flex items-center justify-center mx-auto mb-3">
          <Target className="w-12 h-12 text-playful-orange" />
        </div>
        <h3 className="text-xs font-display font-bold text-[#2C2C2C] mb-3">No Holdings to Optimize</h3>
        <p className="text-[#5C5C5C] font-body">Start trading to build a portfolio that can be optimized</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Optimization Controls */}
      <Card className="p-3">
        <h3 className="text-xs font-semibold text-[#2C2C2C] mb-3 flex items-center">
          <Target className="w-5 h-5 text-blue-500 mr-2" />
          Portfolio Optimization Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <label className="block text-xs font-medium text-[#3C3C3C] mb-2">Risk Tolerance</label>
            <select
              value={riskTolerance}
              onChange={(e) => setRiskTolerance(e.target.value as any)}
              className="w-full px-3 py-2 border border-black/30 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="conservative">Conservative</option>
              <option value="moderate">Moderate</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#3C3C3C] mb-2">Target Annual Return</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={targetReturn}
              onChange={(e) => setTargetReturn(parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-black/30 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-end">
            <Button
              onClick={() => {
                const optimal = calculateOptimalPortfolio();
                setOptimizedPortfolio(optimal);
                if (optimal) {
                  setSuggestions(generateSuggestions());
                }
              }}
              disabled={loading}
              className="w-full"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Recalculate
            </Button>
          </div>
        </div>
      </Card>

      {/* Optimization Results */}
      {optimizedPortfolio && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <Card className="p-3">
            <h4 className="text-xs font-semibold text-[#2C2C2C] mb-3 flex items-center">
              <BarChart3 className="w-5 h-5 text-blue-500 mr-2" />
              Current Portfolio
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-[#5C5C5C]">Expected Return</span>
                <span className="font-semibold">{(optimizedPortfolio.current.return * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5C5C5C]">Volatility</span>
                <span className="font-semibold">{(optimizedPortfolio.current.volatility * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5C5C5C]">Sharpe Ratio</span>
                <span className="font-semibold">{optimizedPortfolio.current.sharpe.toFixed(3)}</span>
              </div>
            </div>
          </Card>

          <Card className="p-3">
            <h4 className="text-xs font-semibold text-[#2C2C2C] mb-3 flex items-center">
              <Target className="w-5 h-5 text-green-500 mr-2" />
              Optimized Portfolio
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-[#5C5C5C]">Expected Return</span>
                <span className="font-semibold text-green-600">{(optimizedPortfolio.optimized.return * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5C5C5C]">Volatility</span>
                <span className="font-semibold text-green-600">{(optimizedPortfolio.optimized.volatility * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5C5C5C]">Sharpe Ratio</span>
                <span className="font-semibold text-green-600">{optimizedPortfolio.optimized.sharpe.toFixed(3)}</span>
              </div>
            </div>
          </Card>

          <Card className="p-3">
            <h4 className="text-xs font-semibold text-[#2C2C2C] mb-3 flex items-center">
              <TrendingUp className="w-5 h-5 text-playful-green mr-2" />
              Potential Improvement
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-[#5C5C5C]">Return Gain</span>
                <span className={`font-semibold ${optimizedPortfolio.improvement.returnGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {optimizedPortfolio.improvement.returnGain >= 0 ? '+' : ''}{(optimizedPortfolio.improvement.returnGain * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5C5C5C]">Risk Reduction</span>
                <span className={`font-semibold ${optimizedPortfolio.improvement.riskReduction >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {optimizedPortfolio.improvement.riskReduction >= 0 ? '+' : ''}{(optimizedPortfolio.improvement.riskReduction * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5C5C5C]">Sharpe Improvement</span>
                <span className={`font-semibold ${optimizedPortfolio.improvement.sharpeImprovement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {optimizedPortfolio.improvement.sharpeImprovement >= 0 ? '+' : ''}{optimizedPortfolio.improvement.sharpeImprovement.toFixed(3)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Optimization Suggestions */}
      <Card className="p-3">
        <h3 className="text-xs font-semibold text-[#2C2C2C] mb-3 flex items-center">
          <Zap className="w-5 h-5 text-yellow-500 mr-2" />
          Optimization Suggestions
        </h3>

        {suggestions.length > 0 ? (
          <div className="space-y-3">
            {suggestions.map((suggestion, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="border border-black/20 rounded-lg p-3"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      suggestion.type === 'rebalance' ? 'bg-blue-100 text-blue-600' :
                      suggestion.type === 'diversify' ? 'bg-playful-green/10 text-playful-green' :
                      suggestion.type === 'risk_reduce' ? 'bg-orange-100 text-orange-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      {getSuggestionIcon(suggestion.type)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#2C2C2C]">{suggestion.title}</h4>
                      <p className="text-xs text-[#5C5C5C]">{suggestion.description}</p>
                    </div>
                  </div>
                  <Badge className={getPriorityColor(suggestion.priority)}>
                    {suggestion.priority.toUpperCase()}
                  </Badge>
                </div>

                {/* Expected Impact */}
                {Object.keys(suggestion.expectedImpact).length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <h5 className="font-medium text-[#2C2C2C] mb-2">Expected Impact:</h5>
                    <div className="grid grid-cols-3 gap-10 text-xs">
                      {suggestion.expectedImpact.returnImprovement && (
                        <div>
                          <span className="text-[#5C5C5C]">Return: </span>
                          <span className="font-semibold text-green-600">
                            +{(suggestion.expectedImpact.returnImprovement * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                      {suggestion.expectedImpact.riskReduction && (
                        <div>
                          <span className="text-[#5C5C5C]">Risk: </span>
                          <span className="font-semibold text-blue-600">
                            -{(suggestion.expectedImpact.riskReduction * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                      {suggestion.expectedImpact.diversificationImprovement && (
                        <div>
                          <span className="text-[#5C5C5C]">Diversification: </span>
                          <span className="font-semibold text-playful-green">
                            +{suggestion.expectedImpact.diversificationImprovement}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {suggestion.actions.length > 0 && (
                  <div>
                    <h5 className="font-medium text-[#2C2C2C] mb-2">Recommended Actions:</h5>
                    <div className="space-y-2">
                      {suggestion.actions.map((action, actionIndex) => (
                        <div key={actionIndex} className="flex items-center justify-between bg-white border border-black/20 rounded p-3">
                          <div className="flex items-center space-x-3">
                            {action.type === 'buy' ? (
                              <ArrowUpRight className="w-4 h-4 text-green-500" />
                            ) : (
                              <ArrowDownRight className="w-4 h-4 text-red-500" />
                            )}
                            <span className="font-medium">{action.type.toUpperCase()} {action.token}</span>
                          </div>
                          <div className="text-right text-xs">
                            <div className="text-[#5C5C5C]">
                              {action.currentWeight.toFixed(1)}% → {action.targetWeight.toFixed(1)}%
                            </div>
                            <div className="font-semibold">${action.usdAmount.toLocaleString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-2.5">
            <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-3" />
            <h4 className="text-xs font-semibold text-[#2C2C2C] mb-2">Portfolio Well Optimized</h4>
            <p className="text-[#5C5C5C]">Your current allocation appears to be well balanced for your risk profile</p>
          </div>
        )}
      </Card>
    </div>
  );
};