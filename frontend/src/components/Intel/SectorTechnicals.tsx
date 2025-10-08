import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { getStockLogo } from '../../utils/stockImages';
import { useMarketData } from '../../contexts/MarketDataContext';
import { ENV } from '../../config/env';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Target,
  Zap,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Minus
} from 'lucide-react';

interface SectorStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  weight: number;
  rsi?: number;
  macd?: number;
  sma20?: number;
  sma50?: number;
  sma200?: number;
  relativeStrength?: number;
  moneyFlow?: number;
  volatility?: number;
  momentum?: number;
  beta?: number;
}

interface SectorTechnicalsProps {
  sectorName: string;
  stocks: SectorStock[];
  className?: string;
}

type SortField = 'symbol' | 'rsi' | 'relativeStrength' | 'momentum' | 'volatility' | 'moneyFlow';
type SortOrder = 'asc' | 'desc';

const SectorTechnicals: React.FC<SectorTechnicalsProps> = ({
  sectorName,
  stocks,
  className
}) => {
  const { period } = useMarketData();
  const [sortField, setSortField] = useState<SortField>('rsi');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [activeIndicator, setActiveIndicator] = useState<'momentum' | 'trend' | 'volatility' | 'flow'>('momentum');
  const [technicalData, setTechnicalData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  // Fetch real technical indicators from backend
  useEffect(() => {
    const fetchTechnicalIndicators = async () => {
      try {
        setLoading(true);
        const symbols = stocks.map(s => s.symbol);

        const response = await fetch(`${ENV.INTEL_API_URL}/api/market/technical/batch?period=${period}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(symbols)
        });

        const apiResponse = await response.json();
        if (data.success) {
          setTechnicalData(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch technical indicators:', error);
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
      } finally {
        setLoading(false);
      }
    };

    fetchTechnicalIndicators();
  }, [stocks, period]);

  // Enrich stocks with real technical data from backend
  const enrichedStocks = stocks.map(stock => {
    const technical = technicalData[stock.symbol];
    const beta = stock.beta || 1.0;

    if (technical) {
      // Use real technical indicators from backend
      return {
        ...stock,
        rsi: technical.rsi,
        macd: technical.macd,
        sma20: technical.sma20,
        sma50: technical.sma50,
        sma200: technical.sma200,
        relativeStrength: technical.relativeStrength,
        moneyFlow: technical.moneyFlow,
        volatility: technical.volatility,
        momentum: technical.momentum,
        beta
      };
    }

    // Fallback to stock data if technical not available
    const changePercent = stock.changePercent || 0;
    return {
      ...stock,
      rsi: Math.max(0, Math.min(100, 50 + (changePercent * 2))),
      macd: changePercent,
      sma20: stock.price * (1 - (changePercent * 0.01)),
      sma50: stock.price * (1 - (changePercent * 0.02)),
      sma200: stock.price * (1 - (changePercent * 0.05)),
      relativeStrength: Math.abs(changePercent) * 10,
      moneyFlow: Math.max(0, Math.min(100, 50 + changePercent)),
      volatility: Math.abs(changePercent) * 3,
      momentum: changePercent,
      beta
    };
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 opacity-50" />;
    }
    return sortOrder === 'asc' ? (
      <TrendingUp className="w-4 h-4 text-orange-400" />
    ) : (
      <TrendingDown className="w-4 h-4 text-orange-400" />
    );
  };

  const sortedStocks = enrichedStocks
    .filter(stock => stock[sortField] !== undefined && stock[sortField] !== null)
    .sort((a, b) => {
      const aValue = a[sortField] || 0;
      const bValue = b[sortField] || 0;

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Calculate sector technical averages
  const sectorMetrics = {
    avgRSI: enrichedStocks.reduce((sum, s) => sum + s.rsi, 0) / enrichedStocks.length,
    avgMomentum: enrichedStocks.reduce((sum, s) => sum + s.momentum, 0) / enrichedStocks.length,
    avgVolatility: enrichedStocks.reduce((sum, s) => sum + s.volatility, 0) / enrichedStocks.length,
    avgMoneyFlow: enrichedStocks.reduce((sum, s) => sum + s.moneyFlow, 0) / enrichedStocks.length,
    bullishCount: enrichedStocks.filter(s => s.rsi > 50 && s.momentum > 0).length,
    bearishCount: enrichedStocks.filter(s => s.rsi < 50 && s.momentum < 0).length,
    oversoldCount: enrichedStocks.filter(s => s.rsi < 30).length,
    overboughtCount: enrichedStocks.filter(s => s.rsi > 70).length
  };

  const getRSIColor = (rsi: number) => {
    if (rsi > 70) return 'text-red-400';
    if (rsi < 30) return 'text-green-400';
    return 'text-yellow-400';
  };

  const getMomentumColor = (momentum: number) => {
    if (momentum > 5) return 'text-green-400';
    if (momentum < -5) return 'text-red-400';
    return 'text-[#3C3C3C]';
  };

  const getTrendDirection = (stock: SectorStock) => {
    const price = stock.price;
    const sma20 = stock.sma20 || price;
    const sma50 = stock.sma50 || price;

    if (price > sma20 && sma20 > sma50) return { icon: <ChevronUp className="w-4 h-4" />, color: 'text-green-400', label: 'Bullish' };
    if (price < sma20 && sma20 < sma50) return { icon: <ChevronDown className="w-4 h-4" />, color: 'text-red-400', label: 'Bearish' };
    return { icon: <Minus className="w-4 h-4" />, color: 'text-[#3C3C3C]', label: 'Neutral' };
  };

  const indicators = [
    {
      id: 'momentum',
      title: 'Momentum',
      icon: <Zap className="w-5 h-5" />,
      color: 'from-yellow-500 to-orange-500',
      data: [
        { label: 'Avg RSI', value: sectorMetrics.avgRSI.toFixed(1), color: getRSIColor(sectorMetrics.avgRSI) },
        { label: 'Bullish Stocks', value: sectorMetrics.bullishCount.toString(), color: 'text-green-400' },
        { label: 'Bearish Stocks', value: sectorMetrics.bearishCount.toString(), color: 'text-red-400' }
      ]
    },
    {
      id: 'trend',
      title: 'Trend Analysis',
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'from-blue-500 to-cyan-500',
      data: [
        { label: 'Above SMA20', value: enrichedStocks.filter(s => s.price > s.sma20).length.toString(), color: 'text-green-400' },
        { label: 'Below SMA50', value: enrichedStocks.filter(s => s.price < s.sma50).length.toString(), color: 'text-red-400' }
      ]
    },
    {
      id: 'volatility',
      title: 'Volatility',
      icon: <Activity className="w-5 h-5" />,
      color: 'primary',
      data: [
        { label: 'Avg Volatility', value: `${sectorMetrics.avgVolatility.toFixed(1)}%`, color: 'text-primary-400' },
        { label: 'High Vol Stocks', value: enrichedStocks.filter(s => s.volatility > 30).length.toString(), color: 'text-red-400' }
      ]
    },
    {
      id: 'flow',
      title: 'Money Flow',
      icon: <Target className="w-5 h-5" />,
      color: 'from-green-500 to-emerald-500',
      data: [
        { label: 'Avg Money Flow', value: sectorMetrics.avgMoneyFlow.toFixed(1), color: 'text-green-400' },
        { label: 'Strong Inflow', value: enrichedStocks.filter(s => s.moneyFlow > 60).length.toString(), color: 'text-green-400' }
      ]
    }
  ];

  return (
    <div className={cn("space-y-3", className)}>
      {/* Technical Overview */}
      <Card className="glass-card border-black/10/50">
        <CardHeader>
          <CardTitle className="text-[#1a1a1a] flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-orange-400" />
            {sectorName} Technical Analysis & Momentum
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            {indicators.map((indicator) => (
              <Button
                key={indicator.id}
                variant={activeIndicator === indicator.id ? "default" : "outline"}
                onClick={() => setActiveIndicator(indicator.id as any)}
                className={cn(
                  "h-auto p-3 flex flex-col items-center gap-10",
                  activeIndicator === indicator.id
                    ? `bg-gradient-to-r ${indicator.color} text-[#1a1a1a]`
                    : "glass-card text-[#1a1a1a] border-black/10/50 hover:bg-gray-700/50"
                )}
              >
                <div className="flex items-center gap-2.5">
                  {indicator.icon}
                  <span className="font-medium">{indicator.title}</span>
                </div>
                <div className="text-center">
                  {indicator.data.map((item, idx) => (
                    <div key={idx} className="text-sm opacity-80">
                      <span className="block">{item.label}</span>
                      <span className={cn("font-bold", activeIndicator === indicator.id ? "text-[#1a1a1a]" : item.color)}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sector Signal Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
        <Card className="glass-card border-black/10/50">
          <CardContent className="p-3 text-center">
            <div className="text-sm font-bold text-green-400 mb-1">
              {sectorMetrics.oversoldCount}
            </div>
            <div className="text-sm text-[#3C3C3C]">Oversold Opportunities</div>
            <Badge variant="outline" className="mt-2 text-green-400 border-green-400/50">
              RSI &lt; 30
            </Badge>
          </CardContent>
        </Card>

        <Card className="glass-card border-black/10/50">
          <CardContent className="p-3 text-center">
            <div className="text-sm font-bold text-red-400 mb-1">
              {sectorMetrics.overboughtCount}
            </div>
            <div className="text-sm text-[#3C3C3C]">Overbought Signals</div>
            <Badge variant="outline" className="mt-2 text-red-400 border-red-400/50">
              RSI &gt; 70
            </Badge>
          </CardContent>
        </Card>

        <Card className="glass-card border-black/10/50">
          <CardContent className="p-3 text-center">
            <div className="text-sm font-bold text-yellow-400 mb-1">
              {sectorMetrics.avgMomentum.toFixed(1)}%
            </div>
            <div className="text-sm text-[#3C3C3C]">Avg Momentum</div>
            <Badge variant="outline" className={cn(
              "mt-2",
              sectorMetrics.avgMomentum > 0 ? "text-green-400 border-green-400/50" : "text-red-400 border-red-400/50"
            )}>
              {sectorMetrics.avgMomentum > 0 ? 'Positive' : 'Negative'}
            </Badge>
          </CardContent>
        </Card>

        <Card className="glass-card border-black/10/50">
          <CardContent className="p-3 text-center">
            <div className="text-sm font-bold text-blue-400 mb-1">
              {((sectorMetrics.bullishCount / enrichedStocks.length) * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-[#3C3C3C]">Bullish Signals</div>
            <Badge variant="outline" className="mt-2 text-blue-400 border-blue-400/50">
              Technical Score
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Technical Table */}
      <Card className="glass-card border-black/10/50">
        <CardHeader>
          <CardTitle className="text-[#1a1a1a] flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-orange-400" />
            Stock Technical Indicators
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-black/10/50">
                  <th className="text-left p-3 text-sm font-medium text-[#1a1a1a]">Stock</th>
                  <th className="text-right p-3 text-sm font-medium text-[#1a1a1a]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('rsi')}
                      className="h-auto p-0 text-[#1a1a1a] hover:text-[#1a1a1a]"
                    >
                      RSI {getSortIcon('rsi')}
                    </Button>
                  </th>
                  <th className="text-right p-3 text-sm font-medium text-[#1a1a1a]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('momentum')}
                      className="h-auto p-0 text-[#1a1a1a] hover:text-[#1a1a1a]"
                    >
                      Momentum {getSortIcon('momentum')}
                    </Button>
                  </th>
                  <th className="text-center p-3 text-sm font-medium text-[#1a1a1a]">Trend</th>
                  <th className="text-right p-3 text-sm font-medium text-[#1a1a1a]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('volatility')}
                      className="h-auto p-0 text-[#1a1a1a] hover:text-[#1a1a1a]"
                    >
                      Volatility {getSortIcon('volatility')}
                    </Button>
                  </th>
                  <th className="text-right p-3 text-sm font-medium text-[#1a1a1a]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('moneyFlow')}
                      className="h-auto p-0 text-[#1a1a1a] hover:text-[#1a1a1a]"
                    >
                      Money Flow {getSortIcon('moneyFlow')}
                    </Button>
                  </th>
                  <th className="text-center p-3 text-sm font-medium text-[#1a1a1a]">Signal</th>
                </tr>
              </thead>
              <tbody>
                {sortedStocks.map((stock, index) => {
                  const trend = getTrendDirection(stock);
                  const signal = stock.rsi < 30 ? 'BUY' : stock.rsi > 70 ? 'SELL' : 'HOLD';
                  const signalColor = signal === 'BUY' ? 'text-green-400' : signal === 'SELL' ? 'text-red-400' : 'text-yellow-400';

                  return (
                    <motion.tr
                      key={stock.symbol}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-black/10/30 hover:bg-gray-700/20 transition-colors"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={getStockLogo(stock.symbol)}
                            alt={stock.symbol}
                            className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                          />
                          <div>
                            <p className="font-medium text-[#1a1a1a]">
                              {stock.symbol.replace('x', '')}
                            </p>
                            <p className="text-sm text-[#3C3C3C] truncate max-w-[120px]">
                              {stock.name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <span className={cn("font-medium", getRSIColor(stock.rsi))}>
                          {stock.rsi.toFixed(1)}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className={cn("font-medium", getMomentumColor(stock.momentum))}>
                          {stock.momentum > 0 ? '+' : ''}{stock.momentum.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className={cn("flex items-center justify-center gap-1.5", trend.color)}>
                          {trend.icon}
                          <span className="text-sm">{trend.label}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-primary-400 font-medium">
                          {stock.volatility.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <div className="w-12 bg-gray-700 rounded-full h-1.5">
                            <div
                              className="bg-gradient-to-r from-green-500 to-blue-500 h-1.5 rounded-full"
                              style={{ width: `${stock.moneyFlow}%` }}
                            />
                          </div>
                          <span className="text-sm text-[#1a1a1a] w-8">
                            {stock.moneyFlow.toFixed(0)}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className={cn("text-sm", signalColor, signalColor.replace('text-', 'border-') + '/50')}>
                          {signal}
                        </Badge>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { SectorTechnicals };