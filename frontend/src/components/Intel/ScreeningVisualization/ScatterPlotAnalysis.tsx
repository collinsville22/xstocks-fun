import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { cn } from '../../../lib/utils';
import {
  BarChart3,
  Target,
  TrendingUp,
  LineChart,
  DollarSign,
  Percent,
  Activity,
  Brain,
  Star,
  Users,
  Building2,
  Eye,
  Zap,
  Shield,
  ArrowRight,
  ArrowUp
} from 'lucide-react';
import { Stock } from '../ScreeningResults/ResultsTable';

interface ScatterPlotAnalysisProps {
  stocks: Stock[];
  className?: string;
}

interface PlotConfig {
  id: string;
  name: string;
  xField: keyof Stock;
  yField: keyof Stock;
  xLabel: string;
  yLabel: string;
  description: string;
  category: 'valuation' | 'performance' | 'risk' | 'quality';
  quadrants: {
    topRight: { label: string; color: string; description: string };
    topLeft: { label: string; color: string; description: string };
    bottomRight: { label: string; color: string; description: string };
    bottomLeft: { label: string; color: string; description: string };
  };
}

const plotConfigs: PlotConfig[] = [
  {
    id: 'pe-growth',
    name: 'Valuation vs Growth',
    xField: 'pe',
    yField: 'epsGrowth',
    xLabel: 'P/E Ratio',
    yLabel: 'EPS Growth (%)',
    description: 'Identify undervalued growth stocks vs expensive value traps',
    category: 'valuation',
    quadrants: {
      topRight: { label: 'Expensive Growth', color: 'bg-yellow-500', description: 'High growth but expensive' },
      topLeft: { label: 'Value Growth', color: 'bg-green-500', description: 'High growth at reasonable price' },
      bottomRight: { label: 'Value Trap', color: 'bg-red-500', description: 'Low growth and expensive' },
      bottomLeft: { label: 'Deep Value', color: 'bg-blue-500', description: 'Low growth but cheap' }
    }
  },
  {
    id: 'risk-return',
    name: 'Risk vs Return',
    xField: 'volatility',
    yField: 'changePercent',
    xLabel: 'Volatility (%)',
    yLabel: 'Price Change (%)',
    description: 'Risk-adjusted performance analysis',
    category: 'performance',
    quadrants: {
      topRight: { label: 'High Risk/High Return', color: 'bg-orange-500', description: 'Volatile gainers' },
      topLeft: { label: 'Low Risk/High Return', color: 'bg-green-500', description: 'Stable gainers' },
      bottomRight: { label: 'High Risk/Low Return', color: 'bg-red-500', description: 'Volatile losers' },
      bottomLeft: { label: 'Low Risk/Low Return', color: 'bg-blue-500', description: 'Stable but flat' }
    }
  },
  {
    id: 'momentum-quality',
    name: 'Momentum vs Quality',
    xField: 'rsi',
    yField: 'analystRating',
    xLabel: 'RSI',
    yLabel: 'Analyst Rating (inverted)',
    description: 'Technical momentum vs fundamental quality',
    category: 'quality',
    quadrants: {
      topRight: { label: 'Overbought Quality', color: 'bg-yellow-500', description: 'High quality but overbought' },
      topLeft: { label: 'Oversold Quality', color: 'bg-green-500', description: 'High quality and oversold' },
      bottomRight: { label: 'Overbought Speculative', color: 'bg-red-500', description: 'Low quality and overbought' },
      bottomLeft: { label: 'Oversold Speculative', color: 'bg-orange-500', description: 'Low quality but oversold' }
    }
  },
  {
    id: 'ownership-performance',
    name: 'Ownership vs Performance',
    xField: 'institutionalOwnership',
    yField: 'performanceScore',
    xLabel: 'Institutional Ownership (%)',
    yLabel: 'Performance Score',
    description: 'Smart money vs performance correlation',
    category: 'quality',
    quadrants: {
      topRight: { label: 'Institutional Favorites', color: 'bg-green-500', description: 'High ownership & performance' },
      topLeft: { label: 'Hidden Gems', color: 'bg-blue-500', description: 'High performance, low ownership' },
      bottomRight: { label: 'Institutional Disappointments', color: 'bg-red-500', description: 'High ownership, low performance' },
      bottomLeft: { label: 'Neglected Stocks', color: 'bg-gray-500', description: 'Low ownership & performance' }
    }
  }
];

const ScatterPlot: React.FC<{
  config: PlotConfig;
  stocks: Stock[];
  selectedStock: Stock | null;
  onStockSelect: (stock: Stock | null) => void;
}> = ({ config, stocks, selectedStock, onStockSelect }) => {
  const { xValues, yValues, xMin, xMax, yMin, yMax } = useMemo(() => {

    const xVals = stocks.map(s => Number(s[config.xField]) || 0);
    const yVals = stocks.map(s => {
      let val = Number(s[config.yField]) || 0;
      // Invert analyst rating for better visualization (lower rating = better)
      if (config.yField === 'analystRating') {
        val = 6 - val;
      }
      return val;
    });

    return {
      xValues: xVals,
      yValues: yVals,
      xMin: Math.min(...xVals),
      xMax: Math.max(...xVals),
      yMin: Math.min(...yVals),
      yMax: Math.max(...yVals)
    };
  }, [stocks, config]);

  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;
  const xMidpoint = xMin + xRange / 2;
  const yMidpoint = yMin + yRange / 2;

  const getQuadrant = (x: number, y: number) => {
    if (x >= xMidpoint && y >= yMidpoint) return 'topRight';
    if (x < xMidpoint && y >= yMidpoint) return 'topLeft';
    if (x >= xMidpoint && y < yMidpoint) return 'bottomRight';
    return 'bottomLeft';
  };

  const getPointPosition = (stock: Stock) => {
    let x = Number(stock[config.xField]) || 0;
    let y = Number(stock[config.yField]) || 0;

    if (config.yField === 'analystRating') {
      y = 6 - y;
    }

    return {
      x: ((x - xMin) / xRange) * 360 + 20,
      y: 360 - (((y - yMin) / yRange) * 360) + 20
    };
  };

  const quadrantCounts = useMemo(() => {
    const counts = { topRight: 0, topLeft: 0, bottomRight: 0, bottomLeft: 0 };
    stocks.forEach(stock => {
      let x = Number(stock[config.xField]) || 0;
      let y = Number(stock[config.yField]) || 0;
      if (config.yField === 'analystRating') y = 6 - y;

      const quadrant = getQuadrant(x, y);
      counts[quadrant as keyof typeof counts]++;
    });
    return counts;
  }, [stocks, config]);

  return (
    <div className="space-y-3">
      {/* Plot Area */}
      <div className="relative bg-white/80 rounded-2xl p-3 border-3 border-black">
        <svg width="400" height="400" className="overflow-visible">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E5E5E5" strokeWidth="1" opacity="0.5"/>
            </pattern>
          </defs>
          <rect width="360" height="360" x="20" y="20" fill="url(#grid)" />

          {/* Quadrant dividers */}
          <line x1="200" y1="20" x2="200" y2="380" stroke="#1a1a1a" strokeWidth="2" strokeDasharray="8,4" />
          <line x1="20" y1="200" x2="380" y2="200" stroke="#1a1a1a" strokeWidth="2" strokeDasharray="8,4" />

          {/* Quadrant backgrounds - vibrant Trugly style */}
          <rect x="200" y="20" width="180" height="180"
                fill={config.quadrants.topRight.color.includes('yellow') ? '#eab308' :
                      config.quadrants.topRight.color.includes('green') ? '#7EC850' :
                      config.quadrants.topRight.color.includes('orange') ? '#FF8C42' : '#7EC850'}
                opacity="0.15" />
          <rect x="20" y="20" width="180" height="180"
                fill={config.quadrants.topLeft.color.includes('blue') ? '#60A5FA' :
                      config.quadrants.topLeft.color.includes('green') ? '#7EC850' :
                      config.quadrants.topLeft.color.includes('orange') ? '#FF8C42' : '#60A5FA'}
                opacity="0.15" />
          <rect x="200" y="200" width="180" height="180"
                fill={config.quadrants.bottomRight.color.includes('red') ? '#EF4444' :
                      config.quadrants.bottomRight.color.includes('yellow') ? '#eab308' : '#EF4444'}
                opacity="0.15" />
          <rect x="20" y="200" width="180" height="180"
                fill={config.quadrants.bottomLeft.color.includes('blue') ? '#60A5FA' :
                      config.quadrants.bottomLeft.color.includes('orange') ? '#FF8C42' :
                      config.quadrants.bottomLeft.color.includes('gray') ? '#9CA3AF' : '#F59E0B'}
                opacity="0.15" />

          {/* Data points with labels */}
          {stocks.map((stock, index) => {
            const { x, y } = getPointPosition(stock);
            const isSelected = selectedStock?.symbol === stock.symbol;
            const quadrant = getQuadrant(
              Number(stock[config.xField]) || 0,
              config.yField === 'analystRating' ? 6 - (Number(stock[config.yField]) || 0) : Number(stock[config.yField]) || 0
            );

            const quadrantColors = {
              topRight: config.quadrants.topRight.color.includes('yellow') ? '#eab308' :
                        config.quadrants.topRight.color.includes('green') ? '#7EC850' :
                        config.quadrants.topRight.color.includes('orange') ? '#FF8C42' : '#7EC850',
              topLeft: config.quadrants.topLeft.color.includes('blue') ? '#60A5FA' :
                       config.quadrants.topLeft.color.includes('green') ? '#7EC850' :
                       config.quadrants.topLeft.color.includes('orange') ? '#FF8C42' : '#60A5FA',
              bottomRight: config.quadrants.bottomRight.color.includes('red') ? '#EF4444' :
                           config.quadrants.bottomRight.color.includes('yellow') ? '#eab308' : '#EF4444',
              bottomLeft: config.quadrants.bottomLeft.color.includes('blue') ? '#60A5FA' :
                          config.quadrants.bottomLeft.color.includes('orange') ? '#FF8C42' :
                          config.quadrants.bottomLeft.color.includes('gray') ? '#9CA3AF' : '#F59E0B'
            };

            return (
              <g key={stock.symbol}>
                <g>
                  <motion.circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 10 : 6}
                    fill={isSelected ? '#1a1a1a' : quadrantColors[quadrant as keyof typeof quadrantColors]}
                    stroke={isSelected ? '#7EC850' : '#1a1a1a'}
                    strokeWidth={isSelected ? 3 : 1.5}
                    className="cursor-pointer transition-all duration-200"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={() => onStockSelect(isSelected ? null : stock)}
                    whileHover={{ scale: 1.3 }}
                  />
                  <title>{stock.symbol} - {stock.name}</title>
                </g>
              </g>
            );
          })}

          {/* Axis labels */}
          <text x="200" y="395" textAnchor="middle" className="fill-[#1a1a1a] text-sm font-semibold">
            {config.xLabel}
          </text>
          <text x="10" y="200" textAnchor="middle" className="fill-[#1a1a1a] text-sm font-semibold" transform="rotate(-90 10 200)">
            {config.yLabel}
          </text>
        </svg>

        {/* Selected stock info */}
        {selectedStock && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-8 right-4 bg-white border-3 border-black rounded-2xl p-3 min-w-[200px] shadow-2xl"
          >
            <div className="font-bold text-[#1a1a1a] mb-1 text-lg">{selectedStock.symbol}</div>
            <div className="text-sm text-[#3C3C3C] mb-2 font-medium">{selectedStock.name}</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-[#3C3C3C] font-medium">{config.xLabel}:</span>
                <span className="text-[#1a1a1a] font-bold">{Number(selectedStock[config.xField]).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#3C3C3C] font-medium">{config.yLabel}:</span>
                <span className="text-[#1a1a1a] font-bold">{Number(selectedStock[config.yField]).toFixed(2)}</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Quadrant legend */}
      <div className="grid grid-cols-2 gap-2.5">
        {Object.entries(config.quadrants).map(([key, quadrant]) => (
          <div key={key} className="flex items-center gap-2.5 p-2 bg-white/80 rounded-2xl border-2 border-black">
            <div className={cn("w-4 h-4 rounded-full border-2 border-black", quadrant.color)} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-[#1a1a1a]">{quadrant.label}</div>
              <div className="text-xs text-[#3C3C3C]">{quadrant.description}</div>
              <div className="text-xs text-[#3C3C3C] font-semibold">
                {quadrantCounts[key as keyof typeof quadrantCounts]} stocks
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Stock categorization list */}
      <div className="bg-playful-cream rounded-2xl p-3 border-3 border-black">
        <h4 className="text-sm font-semibold text-[#1a1a1a] mb-3 flex items-center gap-2.5">
          <Target className="w-4 h-4 text-blue-400" />
          Stock Categories
        </h4>
        <div className="grid grid-cols-2 gap-10">
          {Object.entries(config.quadrants).map(([key, quadrant]) => {
            const categoryStocks = stocks.filter(stock => {
              let x = Number(stock[config.xField]) || 0;
              let y = Number(stock[config.yField]) || 0;
              if (config.yField === 'analystRating') y = 6 - y;

              // Use the SAME midpoints as the scatter plot visualization
              const quadrant = getQuadrant(x, y);

              // Debug logging
              if (key === 'topRight' && quadrant === 'topRight') {
 console.log(`🟡 ${stock.symbol}: x=${x.toFixed(2)}, y=${y.toFixed(2)}, xMid=${xMidpoint.toFixed(2)}, yMid=${yMidpoint.toFixed(2)}, quadrant=${quadrant}`);
              }

              return quadrant === key;
            });

            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className={cn("w-2 h-2 rounded", quadrant.color)} />
                  <span className="text-sm font-medium text-[#1a1a1a]">{quadrant.label}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {categoryStocks.length > 0 ? (
                    categoryStocks.map(stock => (
                      <button
                        key={stock.symbol}
                        onClick={() => onStockSelect(stock)}
                        className={cn(
                          "px-2 py-0.5 rounded text-[30px] font-medium transition-all",
                          selectedStock?.symbol === stock.symbol
                            ? "bg-blue-500 text-[#1a1a1a]"
                            : "bg-gray-700/50 text-[#1a1a1a] hover:bg-gray-600/50"
                        )}
                      >
                        {stock.symbol}
                      </button>
                    ))
                  ) : (
                    <span className="text-sm text-[#3C3C3C]">No stocks</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const ScatterPlotAnalysis: React.FC<ScatterPlotAnalysisProps> = ({
  stocks,
  className
}) => {
  const [selectedPlot, setSelectedPlot] = useState(plotConfigs[0]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'valuation': return 'text-green-400 border-green-400/50';
      case 'performance': return 'text-blue-400 border-blue-400/50';
      case 'risk': return 'text-orange-400 border-orange-400/50';
      case 'quality': return 'text-primary-400 border-primary-400/50';
      default: return 'text-[#3C3C3C] border-gray-400/50';
    }
  };

  return (
    <Card className={cn("glass-card border-black/10/50", className)}>
      <CardHeader>
        <CardTitle className="text-[#1a1a1a] flex items-center gap-2.5">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          Scatter Plot Analysis
          <Badge variant="outline" className="text-blue-400 border-blue-400/50">
            {stocks.length} stocks
          </Badge>
        </CardTitle>

        {/* Plot selector */}
        <div className="flex flex-wrap gap-2.5 mt-3">
          {plotConfigs.map((config) => (
            <Button
              key={config.id}
              onClick={() => {
                setSelectedPlot(config);
                setSelectedStock(null);
              }}
              variant="outline"
              size="sm"
              className={cn(
                "h-8 text-sm",
                selectedPlot.id === config.id
                  ? getCategoryColor(config.category) + " bg-current/10"
                  : "text-[#3C3C3C] border-black/10/50 hover:bg-gray-700/50"
              )}
            >
              {config.name}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Current plot info */}
        <div className="bg-playful-cream rounded-2xl p-3 border-2 border-black">
          <h3 className="text-lg font-bold text-[#1a1a1a] mb-2">{selectedPlot.name}</h3>
          <p className="text-sm text-[#3C3C3C] mb-3 font-medium">{selectedPlot.description}</p>

          <div className="flex items-center gap-10 text-sm">
            <div className="flex items-center gap-2.5">
              <ArrowRight className="w-4 h-4 text-playful-green" />
              <span className="text-[#1a1a1a] font-semibold">X-Axis: {selectedPlot.xLabel}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <ArrowUp className="w-4 h-4 text-playful-green" />
              <span className="text-[#1a1a1a] font-semibold">Y-Axis: {selectedPlot.yLabel}</span>
            </div>
          </div>
        </div>

        {/* Scatter plot */}
        <ScatterPlot
          config={selectedPlot}
          stocks={stocks}
          selectedStock={selectedStock}
          onStockSelect={setSelectedStock}
        />

        {/* Insights */}
        <div className="bg-white/80 rounded-2xl p-3 border-2 border-black">
          <h4 className="text-md font-bold text-[#1a1a1a] mb-3 flex items-center gap-2.5">
            <Brain className="w-5 h-5 text-playful-orange" />
            Key Insights
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-sm">
            {Object.entries(selectedPlot.quadrants).map(([key, quadrant]) => {
              // Calculate midpoints ONCE for all stocks (same as scatter plot uses)
              const xValues = stocks.map(s => Number(s[selectedPlot.xField]) || 0);
              const yValues = stocks.map(s => {
                let val = Number(s[selectedPlot.yField]) || 0;
                if (selectedPlot.yField === 'analystRating') val = 6 - val;
                return val;
              });

              const xMin = Math.min(...xValues);
              const xMax = Math.max(...xValues);
              const yMin = Math.min(...yValues);
              const yMax = Math.max(...yValues);
              const xRange = xMax - xMin || 1;
              const yRange = yMax - yMin || 1;
              const xMidpoint = xMin + xRange / 2;
              const yMidpoint = yMin + yRange / 2;

              const count = stocks.filter(stock => {
                let x = Number(stock[selectedPlot.xField]) || 0;
                let y = Number(stock[selectedPlot.yField]) || 0;
                if (selectedPlot.yField === 'analystRating') y = 6 - y;

                if (key === 'topRight') return x >= xMidpoint && y >= yMidpoint;
                if (key === 'topLeft') return x < xMidpoint && y >= yMidpoint;
                if (key === 'bottomRight') return x >= xMidpoint && y < yMidpoint;
                return x < xMidpoint && y < yMidpoint;
              }).length;

              const percentage = ((count / stocks.length) * 100).toFixed(1);

              return (
                <div key={key} className="flex items-center gap-2.5">
                  <div className={cn("w-2 h-2 rounded", quadrant.color)} />
                  <span className="text-[#1a1a1a]">
                    <span className="font-medium">{percentage}%</span> in {quadrant.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export { ScatterPlotAnalysis };