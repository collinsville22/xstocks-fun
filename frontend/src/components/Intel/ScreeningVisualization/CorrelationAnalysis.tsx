import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { cn } from '../../../lib/utils';
import {
  Network,
  GitMerge,
  Target,
  BarChart3,
  TrendingUp,
  Activity,
  Users,
  Building2,
  DollarSign,
  Percent,
  Star,
  Eye,
  Zap,
  Shield,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw
} from 'lucide-react';
import { Stock } from '../ScreeningResults/ResultsTable';

interface CorrelationAnalysisProps {
  stocks: Stock[];
  className?: string;
}

interface CorrelationPair {
  metric1: string;
  metric2: string;
  correlation: number;
  significance: 'high' | 'moderate' | 'low';
  interpretation: string;
}

interface ClusterGroup {
  id: number;
  name: string;
  color: string;
  stocks: Stock[];
  characteristics: string[];
  avgMetrics: Record<string, number>;
}

const metrics = [
  { key: 'pe', label: 'P/E Ratio', category: 'valuation' },
  { key: 'pb', label: 'P/B Ratio', category: 'valuation' },
  { key: 'dividendYield', label: 'Dividend Yield', category: 'valuation' },
  { key: 'epsGrowth', label: 'EPS Growth', category: 'growth' },
  { key: 'debtToEquity', label: 'Debt/Equity', category: 'quality' },
  { key: 'rsi', label: 'RSI', category: 'technical' },
  { key: 'volatility', label: 'Volatility', category: 'risk' },
  { key: 'analystRating', label: 'Analyst Rating', category: 'quality' },
  { key: 'earningsSurprise', label: 'Earnings Surprise', category: 'quality' },
  { key: 'shortInterest', label: 'Short Interest', category: 'sentiment' },
  { key: 'insiderOwnership', label: 'Insider Ownership', category: 'ownership' },
  { key: 'institutionalOwnership', label: 'Institutional Ownership', category: 'ownership' },
  { key: 'performanceScore', label: 'Performance Score', category: 'performance' }
];

const calculateCorrelation = (x: number[], y: number[]): number => {
  const n = x.length;
  if (n < 2) return 0;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
};

const kMeansCluster = (
  data: number[][],
  k: number,
  maxIterations: number = 100
): number[] => {
  const n = data.length;
  const dimensions = data[0]?.length || 0;

  if (n === 0 || dimensions === 0) return [];

  // Initialize centroids using k-means++ for better convergence
  // Select first centroid from actual data
  let centroids: number[][] = [];
  if (n > 0 && dimensions > 0) {
    // First centroid: pick a random data point based on deterministic seed
    const firstIdx = Math.floor((13 * 17) % n);
    centroids.push([...data[firstIdx]]);

    // Remaining centroids: use k-means++ (select points far from existing centroids)
    while (centroids.length < k) {
      const distances = data.map(point => {
        const minDist = Math.min(...centroids.map(centroid => {
          return point.reduce((sum, val, dim) => {
            const diff = val - centroid[dim];
            return sum + diff * diff;
          }, 0);
        }));
        return minDist;
      });

      // Select point with maximum distance from existing centroids
      const maxDistIdx = distances.indexOf(Math.max(...distances));
      centroids.push([...data[maxDistIdx]]);
    }
  } else {
    // Fallback: use deterministic seeded values if no data
    centroids = Array.from({ length: k }, (_, i) =>
      Array.from({ length: dimensions }, (_, j) => ((i * 7 + j * 11) % 100) / 100)
    );
  }

  let assignments = new Array(n).fill(0);
  let hasChanged = true;

  for (let iter = 0; iter < maxIterations && hasChanged; iter++) {
    hasChanged = false;

    // Assign points to nearest centroid
    for (let i = 0; i < n; i++) {
      let minDistance = Infinity;
      let closestCentroid = 0;

      for (let c = 0; c < k; c++) {
        const distance = data[i].reduce((sum, val, dim) => {
          const diff = val - centroids[c][dim];
          return sum + diff * diff;
        }, 0);

        if (distance < minDistance) {
          minDistance = distance;
          closestCentroid = c;
        }
      }

      if (assignments[i] !== closestCentroid) {
        assignments[i] = closestCentroid;
        hasChanged = true;
      }
    }

    // Update centroids
    for (let c = 0; c < k; c++) {
      const clusterPoints = data.filter((_, i) => assignments[i] === c);
      if (clusterPoints.length > 0) {
        for (let dim = 0; dim < dimensions; dim++) {
          centroids[c][dim] = clusterPoints.reduce((sum, point) => sum + point[dim], 0) / clusterPoints.length;
        }
      }
    }
  }

  return assignments;
};

const CorrelationMatrix: React.FC<{
  correlations: CorrelationPair[];
  selectedMetrics: string[];
  onMetricSelect: (metrics: string[]) => void;
}> = ({ correlations, selectedMetrics, onMetricSelect }) => {
  const matrixSize = selectedMetrics.length;

  const getCorrelation = (metric1: string, metric2: string): number => {
    if (metric1 === metric2) return 1;
    const pair = correlations.find(
      c => (c.metric1 === metric1 && c.metric2 === metric2) ||
           (c.metric1 === metric2 && c.metric2 === metric1)
    );
    return pair?.correlation || 0;
  };

  const getCorrelationColor = (correlation: number): string => {
    const abs = Math.abs(correlation);

    // Return RGBA color strings for proper dynamic color display
    if (correlation > 0) {
      // Positive correlations - green gradient
      if (abs >= 0.8) return 'rgba(34, 197, 94, 0.9)';   // green-500 with 90% opacity
      if (abs >= 0.6) return 'rgba(74, 222, 128, 0.7)';  // green-400 with 70% opacity
      if (abs >= 0.4) return 'rgba(134, 239, 172, 0.5)'; // green-300 with 50% opacity
      if (abs >= 0.2) return 'rgba(187, 247, 208, 0.3)'; // green-200 with 30% opacity
    } else if (correlation < 0) {
      // Negative correlations - red gradient
      if (abs >= 0.8) return 'rgba(239, 68, 68, 0.9)';   // red-500 with 90% opacity
      if (abs >= 0.6) return 'rgba(248, 113, 113, 0.7)'; // red-400 with 70% opacity
      if (abs >= 0.4) return 'rgba(252, 165, 165, 0.5)'; // red-300 with 50% opacity
      if (abs >= 0.2) return 'rgba(254, 202, 202, 0.3)'; // red-200 with 30% opacity
    }

    // No correlation - gray with low opacity
    return 'rgba(209, 213, 219, 0.2)'; // gray-300 with 20% opacity
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="text-sm font-medium text-[#1a1a1a]">Select Metrics:</span>
        <div className="flex flex-wrap gap-1.5">
          {metrics.slice(0, 8).map((metric) => (
            <Button
              key={metric.key}
              onClick={() => {
                const newSelection = selectedMetrics.includes(metric.key)
                  ? selectedMetrics.filter(m => m !== metric.key)
                  : [...selectedMetrics, metric.key].slice(0, 6);
                onMetricSelect(newSelection);
              }}
              variant="outline"
              size="sm"
              className={cn(
                "h-6 text-sm px-2",
                selectedMetrics.includes(metric.key)
                  ? "bg-blue-500 text-[#1a1a1a] border-blue-500"
                  : "text-[#3C3C3C] border-black/10 hover:bg-gray-700"
              )}
            >
              {metric.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="bg-playful-cream rounded-2xl p-3 overflow-x-auto">
        <div className="inline-block min-w-max">
          {/* Headers */}
          <div className="grid gap-0 mb-1" style={{ gridTemplateColumns: `120px repeat(${matrixSize}, 80px)` }}>
            <div className="h-8"></div>
            {selectedMetrics.map((metric) => (
              <div key={metric} className="h-8 flex items-center justify-center px-1">
                <span className="text-sm text-[#1a1a1a] text-center transform -rotate-45 origin-center">
                  {metrics.find(m => m.key === metric)?.label}
                </span>
              </div>
            ))}
          </div>

          {/* Matrix rows */}
          {selectedMetrics.map((rowMetric) => (
            <div key={rowMetric} className="grid gap-0 mb-0" style={{ gridTemplateColumns: `120px repeat(${matrixSize}, 80px)` }}>
              <div className="h-12 flex items-center justify-end px-2">
                <span className="text-sm text-[#1a1a1a]">
                  {metrics.find(m => m.key === rowMetric)?.label}
                </span>
              </div>
              {selectedMetrics.map((colMetric) => {
                const correlation = getCorrelation(rowMetric, colMetric);
                return (
                  <div
                    key={`${rowMetric}-${colMetric}`}
                    className="h-12 border border-black/10/30 flex items-center justify-center relative group cursor-pointer"
                    style={{
                      backgroundColor: getCorrelationColor(correlation)
                    }}
                  >
                    <span className="text-sm font-medium text-[#1a1a1a] drop-shadow-sm">
                      {correlation.toFixed(2)}
                    </span>

                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-white text-[#1a1a1a] text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 whitespace-nowrap">
                      {metrics.find(m => m.key === rowMetric)?.label} vs {metrics.find(m => m.key === colMetric)?.label}
                      <br />
                      Correlation: {correlation.toFixed(3)}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-10 mt-3 text-sm">
          <span className="text-[#1a1a1a]">Correlation:</span>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.9)' }}></div>
            <span className="text-[#3C3C3C]">Strong Negative</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(252, 165, 165, 0.5)' }}></div>
            <span className="text-[#3C3C3C]">Weak Negative</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(209, 213, 219, 0.2)' }}></div>
            <span className="text-[#3C3C3C]">No Correlation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(134, 239, 172, 0.5)' }}></div>
            <span className="text-[#3C3C3C]">Weak Positive</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(34, 197, 94, 0.9)' }}></div>
            <span className="text-[#3C3C3C]">Strong Positive</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const ClusterAnalysis: React.FC<{
  clusters: ClusterGroup[];
  onClusterSelect: (cluster: ClusterGroup | null) => void;
  selectedCluster: ClusterGroup | null;
}> = ({ clusters, onClusterSelect, selectedCluster }) => {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {clusters.map((cluster) => (
          <motion.div
            key={cluster.id}
            whileHover={{ scale: 1.02 }}
            className={cn(
              "glass-card rounded-2xl p-3 border-2 cursor-pointer transition-all",
              selectedCluster?.id === cluster.id ? "border-blue-500" : "border-black/10/50 hover:border-gray-500"
            )}
            onClick={() => onClusterSelect(selectedCluster?.id === cluster.id ? null : cluster)}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div className={cn("w-4 h-4 rounded", cluster.color)}></div>
              <h4 className="font-semibold text-[#1a1a1a]">{cluster.name}</h4>
              <Badge variant="outline" className="text-[#3C3C3C] border-black/10">
                {cluster.stocks.length} stocks
              </Badge>
            </div>

            <div className="space-y-2 mb-3">
              {cluster.characteristics.slice(0, 3).map((char, index) => (
                <div key={index} className="text-sm text-[#1a1a1a] flex items-center gap-1.5">
                  <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                  {char}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-sm">
              <div>
                <span className="text-[#3C3C3C]">Avg P/E:</span>
                <span className="text-[#1a1a1a] ml-1">{cluster.avgMetrics.pe.toFixed(1)}</span>
              </div>
              <div>
                <span className="text-[#3C3C3C]">Avg RSI:</span>
                <span className="text-[#1a1a1a] ml-1">{cluster.avgMetrics.rsi.toFixed(1)}</span>
              </div>
              <div>
                <span className="text-[#3C3C3C]">Performance:</span>
                <span className="text-[#1a1a1a] ml-1">{cluster.avgMetrics.performanceScore.toFixed(0)}</span>
              </div>
              <div>
                <span className="text-[#3C3C3C]">Volatility:</span>
                <span className="text-[#1a1a1a] ml-1">{cluster.avgMetrics.volatility.toFixed(1)}%</span>
              </div>
            </div>

            {selectedCluster?.id === cluster.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 pt-3 border-t border-black/10/50"
              >
                <div className="text-sm text-[#1a1a1a] mb-2">Stocks in cluster:</div>
                <div className="flex flex-wrap gap-1.5">
                  {cluster.stocks.slice(0, 8).map((stock) => (
                    <Badge key={stock.symbol} variant="outline" className="text-sm text-[#1a1a1a] border-black/10">
                      {stock.symbol}
                    </Badge>
                  ))}
                  {cluster.stocks.length > 8 && (
                    <Badge variant="outline" className="text-sm text-[#3C3C3C] border-black/10">
                      +{cluster.stocks.length - 8} more
                    </Badge>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const CorrelationAnalysis: React.FC<CorrelationAnalysisProps> = ({
  stocks,
  className
}) => {
  const [activeTab, setActiveTab] = useState<'correlations' | 'clusters'>('correlations');
  const [selectedMetrics, setSelectedMetrics] = useState(['pe', 'epsGrowth', 'rsi', 'performanceScore']);
  const [selectedCluster, setSelectedCluster] = useState<ClusterGroup | null>(null);

  const { correlations, strongCorrelations } = useMemo(() => {
    const pairs: CorrelationPair[] = [];

    for (let i = 0; i < metrics.length; i++) {
      for (let j = i + 1; j < metrics.length; j++) {
        const metric1 = metrics[i];
        const metric2 = metrics[j];

        const values1 = stocks.map(stock => Number(stock[metric1.key as keyof Stock]) || 0);
        const values2 = stocks.map(stock => Number(stock[metric2.key as keyof Stock]) || 0);

        const correlation = calculateCorrelation(values1, values2);
        const abs = Math.abs(correlation);

        let significance: 'high' | 'moderate' | 'low' = 'low';
        let interpretation = '';

        if (abs >= 0.7) {
          significance = 'high';
          interpretation = correlation > 0 ? 'Strong positive relationship' : 'Strong negative relationship';
        } else if (abs >= 0.4) {
          significance = 'moderate';
          interpretation = correlation > 0 ? 'Moderate positive relationship' : 'Moderate negative relationship';
        } else {
          significance = 'low';
          interpretation = 'Weak or no relationship';
        }

        pairs.push({
          metric1: metric1.key,
          metric2: metric2.key,
          correlation,
          significance,
          interpretation
        });
      }
    }

    const strong = pairs
      .filter(p => Math.abs(p.correlation) >= 0.5)
      .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
      .slice(0, 10);

    return { correlations: pairs, strongCorrelations: strong };
  }, [stocks]);

  const clusters = useMemo(() => {
    if (stocks.length < 6) return [];

    // Prepare data for clustering - normalize values
    const clusterMetrics = ['pe', 'epsGrowth', 'rsi', 'volatility', 'performanceScore'];
    const chartData = stocks.map(stock => {
      return clusterMetrics.map(metric => {
        const value = Number(stock[metric as keyof Stock]) || 0;
        // Simple min-max normalization would go here in a real implementation
        return value;
      });
    });

    // Perform k-means clustering
    const k = Math.min(4, Math.floor(stocks.length / 5));
    const assignments = kMeansCluster(data, k);

    // Group stocks by cluster
    const clusterGroups: ClusterGroup[] = [];
    for (let i = 0; i < k; i++) {
      const clusterStocks = stocks.filter((_, idx) => assignments[idx] === i);
      if (clusterStocks.length === 0) continue;

      // Calculate average metrics
      const avgMetrics: Record<string, number> = {};
      clusterMetrics.forEach(metric => {
        const values = clusterStocks.map(stock => Number(stock[metric as keyof Stock]) || 0);
        avgMetrics[metric] = values.reduce((sum, val) => sum + val, 0) / values.length;
      });

      // Determine characteristics
      const characteristics = [];
      if (avgMetrics.pe < 15) characteristics.push('Low valuation (P/E < 15)');
      if (avgMetrics.pe > 25) characteristics.push('High valuation (P/E > 25)');
      if (avgMetrics.epsGrowth > 15) characteristics.push('High growth (EPS > 15%)');
      if (avgMetrics.epsGrowth < 5) characteristics.push('Low growth (EPS < 5%)');
      if (avgMetrics.rsi > 70) characteristics.push('Overbought (RSI > 70)');
      if (avgMetrics.rsi < 30) characteristics.push('Oversold (RSI < 30)');
      if (avgMetrics.volatility > 30) characteristics.push('High volatility (> 30%)');
      if (avgMetrics.volatility < 15) characteristics.push('Low volatility (< 15%)');
      if (avgMetrics.performanceScore > 70) characteristics.push('Strong performance');
      if (avgMetrics.performanceScore < 40) characteristics.push('Weak performance');

      if (characteristics.length === 0) {
        characteristics.push('Balanced metrics', 'Average performance', 'Moderate risk profile');
      }

      const colors = ['bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-playful-green'];

      clusterGroups.push({
        id: i,
        name: `Cluster ${i + 1}`,
        color: colors[i % colors.length],
        stocks: clusterStocks,
        characteristics,
        avgMetrics
      });
    }

    return clusterGroups;
  }, [stocks]);

  return (
    <Card className={cn("glass-card border-black/10/50", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#1a1a1a] flex items-center gap-2.5">
            <Network className="w-5 h-5 text-blue-400" />
            Correlation & Cluster Analysis
            <Badge variant="outline" className="text-blue-400 border-blue-400/50">
              {stocks.length} stocks
            </Badge>
          </CardTitle>

          <div className="flex items-center gap-2.5">
            <Button
              onClick={() => setActiveTab('correlations')}
              variant="outline"
              size="sm"
              className={cn(
                "h-8 text-sm",
                activeTab === 'correlations'
                  ? "bg-blue-500 text-[#1a1a1a] border-blue-500"
                  : "text-[#3C3C3C] border-black/10 hover:bg-gray-700"
              )}
            >
              <GitMerge className="w-3 h-3 mr-1" />
              Correlations
            </Button>
            <Button
              onClick={() => setActiveTab('clusters')}
              variant="outline"
              size="sm"
              className={cn(
                "h-8 text-sm",
                activeTab === 'clusters'
                  ? "bg-blue-500 text-[#1a1a1a] border-blue-500"
                  : "text-[#3C3C3C] border-black/10 hover:bg-gray-700"
              )}
            >
              <Users className="w-3 h-3 mr-1" />
              Clusters
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {activeTab === 'correlations' && (
          <>
            {/* Strong correlations summary */}
            <div className="bg-playful-cream rounded-2xl p-3">
              <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3 flex items-center gap-2.5">
                <TrendingUp className="w-4 h-4 text-green-400" />
                Strongest Correlations
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {strongCorrelations.slice(0, 6).map((corr, index) => {
                  const metric1Label = metrics.find(m => m.key === corr.metric1)?.label;
                  const metric2Label = metrics.find(m => m.key === corr.metric2)?.label;
                  const isPositive = corr.correlation > 0;

                  return (
                    <div key={index} className="flex items-center gap-10 p-2 glass-card rounded">
                      <div className={cn(
                        "w-8 h-8 rounded flex items-center justify-center",
                        isPositive ? "bg-green-500/20" : "bg-red-500/20"
                      )}>
                        {isPositive ?
                          <ArrowUpRight className="w-4 h-4 text-green-400" /> :
                          <ArrowDownRight className="w-4 h-4 text-red-400" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[#1a1a1a]">
                          {metric1Label} ↔ {metric2Label}
                        </div>
                        <div className="text-sm text-[#3C3C3C]">{corr.interpretation}</div>
                      </div>
                      <div className={cn(
                        "text-sm font-bold",
                        isPositive ? "text-green-400" : "text-red-400"
                      )}>
                        {corr.correlation.toFixed(3)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Correlation matrix */}
            <div className="bg-playful-cream rounded-2xl p-3">
              <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3 flex items-center gap-2.5">
                <Target className="w-4 h-4 text-blue-400" />
                Correlation Matrix
              </h3>
              <CorrelationMatrix
                correlations={correlations}
                selectedMetrics={selectedMetrics}
                onMetricSelect={setSelectedMetrics}
              />
            </div>
          </>
        )}

        {activeTab === 'clusters' && (
          <>
            <div className="bg-playful-cream rounded-2xl p-3">
              <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3 flex items-center gap-2.5">
                <Users className="w-4 h-4 text-primary-400" />
                Stock Clusters
              </h3>
              <p className="text-sm text-[#3C3C3C] mb-3">
                Stocks grouped by similar characteristics using machine learning clustering
              </p>
              <ClusterAnalysis
                clusters={clusters}
                onClusterSelect={setSelectedCluster}
                selectedCluster={selectedCluster}
              />
            </div>
          </>
        )}

        {/* Key insights */}
        <div className="bg-playful-cream rounded-2xl p-3">
          <h4 className="text-md font-semibold text-[#1a1a1a] mb-3 flex items-center gap-2.5">
            <Eye className="w-4 h-4 text-amber-400" />
            Key Insights
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-sm">
            {activeTab === 'correlations' ? (
              <>
                <div className="space-y-2">
                  <div className="font-medium text-[#1a1a1a]">Positive Correlations:</div>
                  {strongCorrelations.filter(c => c.correlation > 0.5).length > 0 ? (
                    strongCorrelations
                      .filter(c => c.correlation > 0.5)
                      .slice(0, 3)
                      .map((corr, index) => (
                        <div key={index} className="text-[#1a1a1a] flex items-center justify-between gap-2.5">
                          <div className="flex items-center gap-1.5">
                            <ArrowUpRight className="w-3 h-3 text-green-400" />
                            <span>{metrics.find(m => m.key === corr.metric1)?.label} & {metrics.find(m => m.key === corr.metric2)?.label}</span>
                          </div>
                          <span className="text-green-400 font-semibold text-sm">{corr.correlation.toFixed(2)}</span>
                        </div>
                      ))
                  ) : (
                    <div className="text-[#3C3C3C] text-sm italic">No strong positive correlations found</div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="font-medium text-[#1a1a1a]">Negative Correlations:</div>
                  {strongCorrelations.filter(c => c.correlation < -0.5).length > 0 ? (
                    strongCorrelations
                      .filter(c => c.correlation < -0.5)
                      .slice(0, 3)
                      .map((corr, index) => (
                        <div key={index} className="text-[#1a1a1a] flex items-center justify-between gap-2.5">
                          <div className="flex items-center gap-1.5">
                            <ArrowDownRight className="w-3 h-3 text-red-400" />
                            <span>{metrics.find(m => m.key === corr.metric1)?.label} & {metrics.find(m => m.key === corr.metric2)?.label}</span>
                          </div>
                          <span className="text-red-400 font-semibold text-sm">{corr.correlation.toFixed(2)}</span>
                        </div>
                      ))
                  ) : (
                    <div className="text-[#3C3C3C] text-sm italic">No strong negative correlations found</div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="font-medium text-[#1a1a1a]">Cluster Summary:</div>
                  <div className="text-[#1a1a1a]">
                    Found {clusters.length} distinct groups with unique characteristics
                  </div>
                  <div className="text-[#1a1a1a]">
                    Average cluster size: {clusters.length > 0 ? Math.round(stocks.length / clusters.length) : 0} stocks
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="font-medium text-[#1a1a1a]">Cluster Types:</div>
                  {clusters.slice(0, 3).map((cluster) => (
                    <div key={cluster.id} className="text-[#1a1a1a] flex items-center gap-2.5">
                      <div className={cn("w-2 h-2 rounded", cluster.color)}></div>
                      {cluster.characteristics[0] || 'Mixed characteristics'}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export { CorrelationAnalysis };