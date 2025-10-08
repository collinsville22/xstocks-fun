import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { cn } from '../../../lib/utils';
import { getStockLogo } from '../../../utils/stockImages';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Download,
  Filter,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  BarChart3,
  Eye,
  Calendar,
  DollarSign,
  Percent,
  Users,
  Building2,
  Target,
  Activity,
  Zap
} from 'lucide-react';

interface Stock {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  pe: number;
  pb: number;
  dividendYield: number;
  epsGrowth: number;
  debtToEquity: number;
  rsi: number;
  macdSignal: 'bullish' | 'bearish' | 'neutral';
  volatility: number;
  analystRating: number;
  earningsSurprise: number;
  shortInterest: number;
  insiderOwnership: number;
  institutionalOwnership: number;
  esgScore: number;
  priceHistory: number[];
  volumeHistory: number[];
  performanceScore: number;
  recommendation: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';
}

interface ResultsTableProps {
  stocks: Stock[];
  onExport: () => void;
  className?: string;
}

type SortField = keyof Stock;
type SortDirection = 'asc' | 'desc';

interface ColumnConfig {
  key: SortField;
  label: string;
  icon: React.ReactNode;
  format: (value: any, stock?: Stock) => React.ReactNode;
  sortable: boolean;
  width: string;
  align: 'left' | 'center' | 'right';
  category: 'basic' | 'fundamental' | 'technical' | 'quantitative';
}

const MiniSparkline: React.FC<{ data: number[]; color: string; height?: number }> = ({
  data,
  color,
  height = 30
}) => {
  if (!data || data.length === 0) return <div className="w-16 h-6" />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 64;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const trend = data[data.length - 1] > data[0] ? 'up' : 'down';
  const sparklineColor = trend === 'up' ? '#10b981' : '#ef4444';

  return (
    <div className="w-16 h-6 flex items-center">
      <svg width="64" height={height} className="overflow-visible">
        <polyline
          points={points}
          fill="none"
          stroke={sparklineColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        />
        <circle
          cx={64 * (data.length - 1) / (data.length - 1)}
          cy={height - ((data[data.length - 1] - min) / range) * height}
          r="2"
          fill={sparklineColor}
          opacity="0.9"
        />
      </svg>
    </div>
  );
};

const formatCurrency = (value: number) => {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
};

const formatPercent = (value: number) => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

const formatVolume = (value: number) => {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toString();
};

const getRecommendationColor = (rec: string) => {
  switch (rec) {
    case 'Strong Buy': return 'text-green-400 bg-green-400/10';
    case 'Buy': return 'text-green-300 bg-green-300/10';
    case 'Hold': return 'text-yellow-400 bg-yellow-400/10';
    case 'Sell': return 'text-orange-400 bg-orange-400/10';
    case 'Strong Sell': return 'text-red-400 bg-red-400/10';
    default: return 'text-[#3C3C3C] bg-gray-400/10';
  }
};

const columns: ColumnConfig[] = [
  {
    key: 'symbol',
    label: 'Symbol',
    icon: <Building2 className="w-3 h-3" />,
    format: (value, stock) => (
      <div className="flex items-center gap-2.5">
        <img
          src={getStockLogo(value)}
          alt={value}
          className="w-8 h-8 rounded object-cover flex-shrink-0"
        />
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-[#1a1a1a]">{value}</span>
          <span className="text-sm text-[#3C3C3C] truncate">{stock?.name}</span>
        </div>
      </div>
    ),
    sortable: true,
    width: 'w-40',
    align: 'left',
    category: 'basic'
  },
  {
    key: 'price',
    label: 'Price',
    icon: <DollarSign className="w-3 h-3" />,
    format: (value, stock) => (
      <div className="flex items-center gap-2.5">
        <div className="flex flex-col">
          <span className="font-medium text-[#1a1a1a]">{formatCurrency(value)}</span>
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "text-sm flex items-center gap-1.5",
              stock?.changePercent && stock.changePercent >= 0 ? "text-green-400" : "text-red-400"
            )}>
              {stock?.changePercent && stock.changePercent >= 0 ?
                <TrendingUp className="w-3 h-3" /> :
                <TrendingDown className="w-3 h-3" />
              }
              {stock?.changePercent && formatPercent(stock.changePercent)}
            </span>
          </div>
        </div>
        <MiniSparkline
          data={stock?.priceHistory || []}
          color={stock?.changePercent && stock.changePercent >= 0 ? '#10b981' : '#ef4444'}
        />
      </div>
    ),
    sortable: true,
    width: 'w-40',
    align: 'right',
    category: 'basic'
  },
  {
    key: 'volume',
    label: 'Volume',
    icon: <BarChart3 className="w-3 h-3" />,
    format: (value, stock) => (
      <div className="flex items-center gap-2.5">
        <span className="font-medium text-[#1a1a1a]">{formatVolume(value)}</span>
        <MiniSparkline data={stock?.volumeHistory || []} color="#3b82f6" />
      </div>
    ),
    sortable: true,
    width: 'w-32',
    align: 'right',
    category: 'basic'
  },
  {
    key: 'marketCap',
    label: 'Market Cap',
    icon: <Building2 className="w-3 h-3" />,
    format: (value) => (
      <span className="font-medium text-[#1a1a1a]">{formatCurrency(value)}</span>
    ),
    sortable: true,
    width: 'w-28',
    align: 'right',
    category: 'fundamental'
  },
  {
    key: 'pe',
    label: 'P/E',
    icon: <Target className="w-3 h-3" />,
    format: (value) => (
      <span className={cn(
        "font-medium",
        !value || value === 0 ? "text-[#3C3C3C]" :
        value < 15 ? "text-green-400" : value < 25 ? "text-yellow-400" : "text-red-400"
      )}>
        {value && value !== 0 ? value.toFixed(1) : 'N/A'}
      </span>
    ),
    sortable: true,
    width: 'w-20',
    align: 'right',
    category: 'fundamental'
  },
  {
    key: 'pb',
    label: 'P/B',
    icon: <Target className="w-3 h-3" />,
    format: (value) => (
      <span className={cn(
        "font-medium",
        !value || value === 0 ? "text-[#3C3C3C]" :
        value < 1 ? "text-green-400" : value < 3 ? "text-yellow-400" : "text-red-400"
      )}>
        {value && value !== 0 ? value.toFixed(1) : 'N/A'}
      </span>
    ),
    sortable: true,
    width: 'w-20',
    align: 'right',
    category: 'fundamental'
  },
  {
    key: 'dividendYield',
    label: 'Div Yield',
    icon: <Percent className="w-3 h-3" />,
    format: (value) => (
      <span className={cn(
        "font-medium",
        !value || value === 0 ? "text-[#3C3C3C]" :
        value > 3 ? "text-green-400" : value > 1 ? "text-yellow-400" : "text-[#3C3C3C]"
      )}>
        {value && value !== 0 ? `${value.toFixed(2)}%` : 'N/A'}
      </span>
    ),
    sortable: true,
    width: 'w-24',
    align: 'right',
    category: 'fundamental'
  },
  {
    key: 'rsi',
    label: 'RSI',
    icon: <Activity className="w-3 h-3" />,
    format: (value) => (
      <span className={cn(
        "font-medium",
        !value ? "text-[#3C3C3C]" :
        value < 30 ? "text-green-400" : value > 70 ? "text-red-400" : "text-yellow-400"
      )}>
        {value ? value.toFixed(1) : 'N/A'}
      </span>
    ),
    sortable: true,
    width: 'w-20',
    align: 'right',
    category: 'technical'
  },
  {
    key: 'macdSignal',
    label: 'MACD',
    icon: <Zap className="w-3 h-3" />,
    format: (value) => (
      <Badge variant="outline" className={cn(
        "text-sm",
        value === 'bullish' ? "text-green-400 border-green-400/50" :
        value === 'bearish' ? "text-red-400 border-red-400/50" :
        "text-yellow-400 border-yellow-400/50"
      )}>
        {value === 'bullish' ? '↗' : value === 'bearish' ? '↘' : '→'}
      </Badge>
    ),
    sortable: true,
    width: 'w-20',
    align: 'center',
    category: 'technical'
  },
  {
    key: 'analystRating',
    label: 'Rating',
    icon: <Star className="w-3 h-3" />,
    format: (value) => (
      <div className="flex items-center gap-1.5">
        {value ? (
          <>
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={cn(
                  "w-3 h-3",
                  i < Math.floor(6 - value) ? "text-yellow-400 fill-current" : "text-[#3C3C3C]"
                )}
              />
            ))}
            <span className="text-sm text-[#3C3C3C] ml-1">{value.toFixed(1)}</span>
          </>
        ) : (
          <span className="text-sm text-[#3C3C3C]">N/A</span>
        )}
      </div>
    ),
    sortable: true,
    width: 'w-32',
    align: 'left',
    category: 'quantitative'
  },
  {
    key: 'recommendation',
    label: 'Rec',
    icon: <Eye className="w-3 h-3" />,
    format: (value) => (
      <Badge variant="outline" className={cn("text-sm", getRecommendationColor(value))}>
        {value === 'Strong Buy' ? 'S.Buy' :
         value === 'Strong Sell' ? 'S.Sell' :
         value}
      </Badge>
    ),
    sortable: true,
    width: 'w-20',
    align: 'center',
    category: 'quantitative'
  },
  {
    key: 'performanceScore',
    label: 'Score',
    icon: <Target className="w-3 h-3" />,
    format: (value) => (
      <div className="flex items-center gap-2.5">
        <span className={cn(
          "font-bold",
          value >= 80 ? "text-green-400" :
          value >= 60 ? "text-yellow-400" :
          value >= 40 ? "text-orange-400" : "text-red-400"
        )}>
          {value}
        </span>
        <div className="w-12 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-300",
              value >= 80 ? "bg-green-400" :
              value >= 60 ? "bg-yellow-400" :
              value >= 40 ? "bg-orange-400" : "bg-red-400"
            )}
            style={{ width: `${value}%` }}
          />
        </div>
      </div>
    ),
    sortable: true,
    width: 'w-28',
    align: 'left',
    category: 'quantitative'
  }
];

const ResultsTable: React.FC<ResultsTableProps> = ({
  stocks,
  onExport,
  className
}) => {
  const [sortField, setSortField] = useState<SortField>('performanceScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCategories, setVisibleCategories] = useState<string[]>(['basic', 'fundamental', 'technical', 'quantitative']);

  const filteredAndSortedStocks = useMemo(() => {
    let filtered = stocks.filter(stock =>
      stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.sector.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortField) {
      filtered.sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        const numA = Number(aValue) || 0;
        const numB = Number(bValue) || 0;

        return sortDirection === 'asc' ? numA - numB : numB - numA;
      });
    }

    return filtered;
  }, [stocks, sortField, sortDirection, searchTerm]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const visibleColumns = columns.filter(col => visibleCategories.includes(col.category));

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'basic': return 'text-blue-400 border-blue-400/50';
      case 'fundamental': return 'text-green-400 border-green-400/50';
      case 'technical': return 'text-orange-400 border-orange-400/50';
      case 'quantitative': return 'text-primary-400 border-primary-400/50';
      default: return 'text-[#3C3C3C] border-gray-400/50';
    }
  };

  const toggleCategory = (category: string) => {
    setVisibleCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  return (
    <Card className={cn("glass-card border-black/10/50", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#1a1a1a] flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Screening Results
            <Badge variant="outline" className="text-blue-400 border-blue-400/50">
              {filteredAndSortedStocks.length} stocks
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-10">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#3C3C3C]" />
              <Input
                placeholder="Search stocks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64 bg-gray-900/50 border-black/10/50 text-[#1a1a1a] placeholder-gray-400"
              />
            </div>
            <Button
              onClick={onExport}
              variant="outline"
              size="sm"
              className="border-green-400/50 text-green-400 hover:bg-green-400/10"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2.5 mt-3">
          {['basic', 'fundamental', 'technical', 'quantitative'].map(category => (
            <Button
              key={category}
              onClick={() => toggleCategory(category)}
              variant="outline"
              size="sm"
              className={cn(
                "h-8 text-sm capitalize",
                visibleCategories.includes(category)
                  ? getCategoryColor(category) + " bg-current/10"
                  : "text-[#3C3C3C] border-black/10/50 hover:bg-gray-700/50"
              )}
            >
              <Filter className="w-3 h-3 mr-1" />
              {category}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/10/50">
                {visibleColumns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      "p-3 text-left font-medium text-[#1a1a1a] cursor-pointer hover:bg-gray-700/30 transition-colors",
                      column.width,
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right'
                    )}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className={cn(
                      "flex items-center gap-2.5",
                      column.align === 'center' && 'justify-center',
                      column.align === 'right' && 'justify-end'
                    )}>
                      {column.icon}
                      <span>{column.label}</span>
                      {column.sortable && (
                        <div className="flex flex-col">
                          {sortField === column.key ? (
                            sortDirection === 'asc' ?
                              <ArrowUp className="w-3 h-3 text-blue-400" /> :
                              <ArrowDown className="w-3 h-3 text-blue-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-[#3C3C3C]" />
                          )}
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedStocks.map((stock, index) => (
                <motion.tr
                  key={stock.symbol}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="border-b border-black/10/30 hover:bg-gray-700/20 transition-colors"
                >
                  {visibleColumns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        "p-3",
                        column.width,
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right'
                      )}
                    >
                      {column.format(stock[column.key], stock)}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>

          {filteredAndSortedStocks.length === 0 && (
            <div className="text-center py-2.5">
              <div className="text-[#3C3C3C] mb-2">No stocks match your criteria</div>
              <div className="text-sm text-[#3C3C3C]">
                Try adjusting your filters or search terms
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export { ResultsTable, type Stock };