import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { getStockLogo } from '../../utils/stockImages';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  BarChart3,
  DollarSign,
  Activity,
  Users,
  Filter,
  Star
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
}

interface SectorCompositionProps {
  sectorName: string;
  stocks: SectorStock[];
  totalMarketCap: number;
  className?: string;
}

type SortField = 'symbol' | 'price' | 'changePercent' | 'volume' | 'marketCap' | 'weight' | 'peRatio';
type SortOrder = 'asc' | 'desc';

const SectorComposition: React.FC<SectorCompositionProps> = ({
  sectorName,
  stocks,
  totalMarketCap,
  className
}) => {
  const [sortField, setSortField] = useState<SortField>('marketCap');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterType, setFilterType] = useState<'all' | 'gainers' | 'losers'>('all');

  const formatCurrency = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value?.toFixed(2) || '0.00'}`;
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value?.toFixed(2) || '0.00'}%`;
  };

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value?.toString() || '0';
  };

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
      <TrendingUp className="w-4 h-4 text-blue-400" />
    ) : (
      <TrendingDown className="w-4 h-4 text-blue-400" />
    );
  };

  const filteredAndSortedStocks = stocks
    .filter(stock => {
      switch (filterType) {
        case 'gainers':
          return stock.changePercent > 0;
        case 'losers':
          return stock.changePercent < 0;
        default:
          return true;
      }
    })
    .sort((a, b) => {
      const aValue = a[sortField] || 0;
      const bValue = b[sortField] || 0;

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const gainers = stocks.filter(stock => stock.changePercent > 0).length;
  const losers = stocks.filter(stock => stock.changePercent < 0).length;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Sector Summary */}
      <Card className="glass-card border-black/10/50">
        <CardHeader>
          <CardTitle className="text-[#1a1a1a] flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-green-400" />
            {sectorName} Sector Composition
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            <div className="text-center">
              <p className="text-sm font-bold text-green-400">
                {formatCurrency(totalMarketCap)}
              </p>
              <p className="text-sm text-[#3C3C3C]">Total Market Cap</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-blue-400">{stocks.length}</p>
              <p className="text-sm text-[#3C3C3C]">Total Stocks</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-green-400">{gainers}</p>
              <p className="text-sm text-[#3C3C3C]">Gainers</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-red-400">{losers}</p>
              <p className="text-sm text-[#3C3C3C]">Losers</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Controls */}
      <Card className="glass-card border-black/10/50">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Filter className="w-4 h-4 text-[#3C3C3C]" />
              <span className="text-sm text-[#3C3C3C]">Filter:</span>
              <div className="flex gap-2.5">
                {[
                  { id: 'all', label: 'All Stocks', count: stocks.length },
                  { id: 'gainers', label: 'Gainers', count: gainers },
                  { id: 'losers', label: 'Losers', count: losers }
                ].map((filter) => (
                  <Button
                    key={filter.id}
                    size="sm"
                    variant={filterType === filter.id ? "default" : "outline"}
                    onClick={() => setFilterType(filter.id as any)}
                    className={cn(
                      "text-sm",
                      filterType === filter.id
                        ? "bg-blue-500 text-[#1a1a1a]"
                        : "bg-gray-700/50 text-[#1a1a1a] border-black/10/50 hover:bg-gray-600/50"
                    )}
                  >
                    {filter.label} ({filter.count})
                  </Button>
                ))}
              </div>
            </div>
            <Badge variant="outline" className="text-blue-400 border-blue-400/50">
              {filteredAndSortedStocks.length} stocks shown
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Stock Table */}
      <Card className="glass-card border-black/10/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-black/10/50">
                  <th className="text-left p-3 text-sm font-medium text-[#1a1a1a]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('symbol')}
                      className="h-auto p-0 text-[#1a1a1a] hover:text-[#1a1a1a]"
                    >
                      Symbol {getSortIcon('symbol')}
                    </Button>
                  </th>
                  <th className="text-right p-3 text-sm font-medium text-[#1a1a1a]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('price')}
                      className="h-auto p-0 text-[#1a1a1a] hover:text-[#1a1a1a]"
                    >
                      Price {getSortIcon('price')}
                    </Button>
                  </th>
                  <th className="text-right p-3 text-sm font-medium text-[#1a1a1a]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('changePercent')}
                      className="h-auto p-0 text-[#1a1a1a] hover:text-[#1a1a1a]"
                    >
                      Change {getSortIcon('changePercent')}
                    </Button>
                  </th>
                  <th className="text-right p-3 text-sm font-medium text-[#1a1a1a]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('volume')}
                      className="h-auto p-0 text-[#1a1a1a] hover:text-[#1a1a1a]"
                    >
                      Volume {getSortIcon('volume')}
                    </Button>
                  </th>
                  <th className="text-right p-3 text-sm font-medium text-[#1a1a1a]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('marketCap')}
                      className="h-auto p-0 text-[#1a1a1a] hover:text-[#1a1a1a]"
                    >
                      Market Cap {getSortIcon('marketCap')}
                    </Button>
                  </th>
                  <th className="text-right p-3 text-sm font-medium text-[#1a1a1a]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('weight')}
                      className="h-auto p-0 text-[#1a1a1a] hover:text-[#1a1a1a]"
                    >
                      Weight {getSortIcon('weight')}
                    </Button>
                  </th>
                  <th className="text-right p-3 text-sm font-medium text-[#1a1a1a]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('peRatio')}
                      className="h-auto p-0 text-[#1a1a1a] hover:text-[#1a1a1a]"
                    >
                      P/E {getSortIcon('peRatio')}
                    </Button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedStocks.map((stock, index) => (
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
                          onError={(e) => {
                            // Fallback to gradient placeholder on error
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const placeholder = target.nextElementSibling as HTMLElement;
                            if (placeholder) placeholder.style.display = 'flex';
                          }}
                        />
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-playful-green rounded-lg items-center justify-center hidden">
                          <span className="text-sm font-bold text-[#1a1a1a]">
                            {stock.symbol.replace('x', '').substring(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-[#1a1a1a]">
                            {stock.symbol.replace('x', '')}
                          </p>
                          <p className="text-sm text-[#3C3C3C] truncate max-w-[150px]">
                            {stock.name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <span className="font-medium text-[#1a1a1a]">
                        {formatCurrency(stock.price)}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className={cn(
                          "font-medium",
                          stock.changePercent >= 0 ? "text-green-400" : "text-red-400"
                        )}>
                          {formatPercent(stock.changePercent)}
                        </span>
                        {stock.changePercent >= 0 ? (
                          <TrendingUp className="w-3 h-3 text-green-400" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-red-400" />
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <span className="text-[#1a1a1a]">
                        {formatVolume(stock.volume)}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <span className="text-blue-400 font-medium">
                        {formatCurrency(stock.marketCap)}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-playful-green to-playful-orange h-2 rounded-full shadow-sm"
                            style={{ width: `${Math.min(stock.weight * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm text-[#1a1a1a] font-semibold w-10">
                          {(stock.weight * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <span className="text-primary-400">
                        {stock.peRatio ? stock.peRatio.toFixed(1) : 'N/A'}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { SectorComposition };