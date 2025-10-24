import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { getStockLogo } from '../../utils/stockImages';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Activity,
  BarChart3,
  ArrowUpDown,
  AlertTriangle,
  CheckCircle
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
  peRatio?: number;
  revenueGrowth?: number;
  eps?: number;
  beta?: number;
  dividendYield?: number;
  debtToEquity?: number;
  roe?: number;
  profitMargin?: number;
}

interface SectorFundamentalsProps {
  sectorName: string;
  stocks: SectorStock[];
  className?: string;
}

type SortField = 'symbol' | 'peRatio' | 'eps' | 'revenueGrowth' | 'roe' | 'profitMargin' | 'dividendYield';
type SortOrder = 'asc' | 'desc';

const SectorFundamentals: React.FC<SectorFundamentalsProps> = ({
  sectorName,
  stocks,
  className
}) => {
  const [sortField, setSortField] = useState<SortField>('peRatio');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [activeMetric, setActiveMetric] = useState<'valuation' | 'profitability' | 'growth' | 'efficiency'>('valuation');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 opacity-50" />;
    }
    return sortOrder === 'asc' ? (
      <TrendingUp className="w-4 h-4 text-primary-400" />
    ) : (
      <TrendingDown className="w-4 h-4 text-primary-400" />
    );
  };

  const sortedStocks = stocks
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

  // Calculate sector averages
  const sectorMetrics = {
    avgPE: stocks.reduce((sum, s) => sum + (s.peRatio || 0), 0) / stocks.filter(s => s.peRatio).length,
    avgROE: stocks.reduce((sum, s) => sum + (s.roe || 0), 0) / stocks.filter(s => s.roe).length,
    avgGrowth: stocks.reduce((sum, s) => sum + (s.revenueGrowth || 0), 0) / stocks.filter(s => s.revenueGrowth).length,
    avgMargin: stocks.reduce((sum, s) => sum + (s.profitMargin || 0), 0) / stocks.filter(s => s.profitMargin).length,
    avgDividend: stocks.reduce((sum, s) => sum + (s.dividendYield || 0), 0) / stocks.filter(s => s.dividendYield).length
  };

  const getHealthColor = (value: number, type: 'pe' | 'roe' | 'growth' | 'margin') => {
    switch (type) {
      case 'pe':
        if (value < 15) return 'text-green-400';
        if (value < 25) return 'text-yellow-400';
        return 'text-red-400';
      case 'roe':
        if (value > 15) return 'text-green-400';
        if (value > 10) return 'text-yellow-400';
        return 'text-red-400';
      case 'growth':
        if (value > 10) return 'text-green-400';
        if (value > 5) return 'text-yellow-400';
        return 'text-red-400';
      case 'margin':
        if (value > 20) return 'text-green-400';
        if (value > 10) return 'text-yellow-400';
        return 'text-red-400';
      default:
        return 'text-[#3C3C3C]';
    }
  };

  const metrics = [
    {
      id: 'valuation',
      title: 'Valuation',
      icon: <DollarSign className="w-5 h-5" />,
      color: 'from-green-500 to-emerald-500',
      data: [
        { label: 'Avg P/E Ratio', value: sectorMetrics.avgPE.toFixed(1), health: getHealthColor(sectorMetrics.avgPE, 'pe') },
        { label: 'Avg Dividend Yield', value: `${sectorMetrics.avgDividend.toFixed(2)}%`, health: 'text-blue-400' }
      ]
    },
    {
      id: 'profitability',
      title: 'Profitability',
      icon: <Target className="w-5 h-5" />,
      color: 'primary',
      data: [
        { label: 'Avg ROE', value: `${sectorMetrics.avgROE.toFixed(1)}%`, health: getHealthColor(sectorMetrics.avgROE, 'roe') },
        { label: 'Avg Profit Margin', value: `${sectorMetrics.avgMargin.toFixed(1)}%`, health: getHealthColor(sectorMetrics.avgMargin, 'margin') }
      ]
    },
    {
      id: 'growth',
      title: 'Growth',
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'from-blue-500 to-cyan-500',
      data: [
        { label: 'Avg Revenue Growth', value: `${sectorMetrics.avgGrowth.toFixed(1)}%`, health: getHealthColor(sectorMetrics.avgGrowth, 'growth') }
      ]
    },
    {
      id: 'efficiency',
      title: 'Efficiency',
      icon: <Activity className="w-5 h-5" />,
      color: 'from-orange-500 to-red-500',
      data: [
        { label: 'High-Performance Stocks', value: `${stocks.filter(s => (s.roe || 0) > 15).length}`, health: 'text-green-400' },
        { label: 'Value Opportunities', value: `${stocks.filter(s => (s.peRatio || 0) < 15).length}`, health: 'text-yellow-400' }
      ]
    }
  ];

  return (
    <div className={cn("space-y-3", className)}>
      {/* Sector Health Overview */}
      <Card className="glass-card border-black/10/50">
        <CardHeader>
          <CardTitle className="text-[#1a1a1a] flex items-center gap-2.5">
            <DollarSign className="w-5 h-5 text-primary-400" />
            {sectorName} Fundamentals & Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            {metrics.map((metric) => (
              <Button
                key={metric.id}
                variant={activeMetric === metric.id ? "default" : "outline"}
                onClick={() => setActiveMetric(metric.id as any)}
                className={cn(
                  "h-auto p-3 flex flex-col items-center gap-10",
                  activeMetric === metric.id
                    ? `bg-gradient-to-r ${metric.color} text-[#1a1a1a]`
                    : "glass-card text-[#1a1a1a] border-black/10/50 hover:bg-gray-700/50"
                )}
              >
                <div className="flex items-center gap-2.5">
                  {metric.icon}
                  <span className="font-medium">{metric.title}</span>
                </div>
                <div className="text-center">
                  {metric.data.map((item, idx) => (
                    <div key={idx} className="text-sm opacity-80">
                      <span className="block">{item.label}</span>
                      <span className={cn("font-bold", activeMetric === metric.id ? "text-[#1a1a1a]" : item.health)}>
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

      {/* Detailed Stock Fundamentals Table */}
      <Card className="glass-card border-black/10/50">
        <CardHeader>
          <CardTitle className="text-[#1a1a1a] flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-primary-400" />
            Stock-by-Stock Fundamentals
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
                      onClick={() => handleSort('peRatio')}
                      className="h-auto p-0 text-[#1a1a1a] hover:text-[#1a1a1a]"
                    >
                      P/E Ratio {getSortIcon('peRatio')}
                    </Button>
                  </th>
                  <th className="text-right p-3 text-sm font-medium text-[#1a1a1a]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('eps')}
                      className="h-auto p-0 text-[#1a1a1a] hover:text-[#1a1a1a]"
                    >
                      EPS {getSortIcon('eps')}
                    </Button>
                  </th>
                  <th className="text-right p-3 text-sm font-medium text-[#1a1a1a]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('roe')}
                      className="h-auto p-0 text-[#1a1a1a] hover:text-[#1a1a1a]"
                    >
                      ROE {getSortIcon('roe')}
                    </Button>
                  </th>
                  <th className="text-right p-3 text-sm font-medium text-[#1a1a1a]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('revenueGrowth')}
                      className="h-auto p-0 text-[#1a1a1a] hover:text-[#1a1a1a]"
                    >
                      Growth {getSortIcon('revenueGrowth')}
                    </Button>
                  </th>
                  <th className="text-right p-3 text-sm font-medium text-[#1a1a1a]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('dividendYield')}
                      className="h-auto p-0 text-[#1a1a1a] hover:text-[#1a1a1a]"
                    >
                      Dividend {getSortIcon('dividendYield')}
                    </Button>
                  </th>
                  <th className="text-center p-3 text-sm font-medium text-[#1a1a1a]">Health</th>
                </tr>
              </thead>
              <tbody>
                {sortedStocks.map((stock, index) => {
                  const healthScore = [
                    (stock.peRatio || 0) < 25 ? 1 : 0,
                    (stock.roe || 0) > 10 ? 1 : 0,
                    (stock.revenueGrowth || 0) > 0 ? 1 : 0,
                    (stock.profitMargin || 0) > 10 ? 1 : 0
                  ].reduce((a, b) => a + b, 0);

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
                            className="w-8 h-8 rounded-lg object-cover"
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
                        <span className={cn("font-medium", getHealthColor(stock.peRatio || 0, 'pe'))}>
                          {stock.peRatio ? stock.peRatio.toFixed(1) : 'N/A'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-blue-400 font-medium">
                          ${stock.eps ? stock.eps.toFixed(2) : 'N/A'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className={cn("font-medium", getHealthColor(stock.roe || 0, 'roe'))}>
                          {stock.roe ? `${(stock.roe * 100).toFixed(1)}%` : 'N/A'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className={cn("font-medium", getHealthColor(stock.revenueGrowth || 0, 'growth'))}>
                          {stock.revenueGrowth ? `${(stock.revenueGrowth * 100).toFixed(1)}%` : 'N/A'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-green-400 font-medium">
                          {stock.dividendYield ? `${(stock.dividendYield * 100).toFixed(2)}%` : 'N/A'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {healthScore >= 3 ? (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          ) : healthScore >= 2 ? (
                            <AlertTriangle className="w-5 h-5 text-yellow-400" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                          )}
                          <span className="text-sm text-[#3C3C3C]">{healthScore}/4</span>
                        </div>
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

export { SectorFundamentals };