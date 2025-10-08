import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { cn } from '../../lib/utils';
import { useMarketData } from '../../contexts/MarketDataContext';
import { StockChart } from './StockChart';
import { FundamentalAnalysis } from './FundamentalAnalysis';
import { EarningsAnalystData } from './EarningsAnalystData';
import { NewsHeadlines } from './NewsHeadlines';
import { CompanyOverview } from './CompanyOverview';
import { getStockLogo } from '../../utils/stockImages';
import { ENV } from '../../config/env';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Eye,
  Bell,
  Star,
  Plus,
  BarChart3,
  Activity,
  DollarSign,
  Users,
  Target,
  Building2,
  Calendar,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  ChartCandlestick,
  Volume2,
  PieChart,
  Calculator,
  Briefcase,
  FileText,
  Settings,
  RefreshCw,
  ExternalLink,
  TrendingUpIcon,
  ShoppingCart,
  MoreVertical
} from 'lucide-react';

// OPTION 1: Use environment variable for unified API
const API_BASE_URL = `${ENV.INTEL_API_URL}`;

// Real data interfaces based on backend service
interface RealStockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  sector: string;
  avgVolume: number;
  volumeRatio: number;
  dayHigh: number;
  dayLow: number;
  week52High: number;
  week52Low: number;
  lastUpdated: number;
}

interface RealTechnicalData {
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  sma20: number;
  sma50: number;
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
  };
}

interface RealEarningsData {
  symbol: string;
  earnings: {
    quarterlyEarnings?: Array<{
      quarter: string;
      actual: number;
      estimate: number;
      date: string;
    }>;
    annualEarnings?: Array<{
      year: string;
      actual: number;
      estimate: number;
    }>;
  };
  success: boolean;
}

interface RealNewsData {
  symbol: string;
  news: Array<{
    title: string;
    summary: string;
    url: string;
    time_published: string;
    sentiment_score: number;
  }>;
  sentiment: {
    overall_sentiment_score: number;
    overall_sentiment_label: string;
  };
  success: boolean;
}

interface RealCompanyOverview {
  symbol: string;
  overview: {
    Name?: string;
    Description?: string;
    Industry?: string;
    Sector?: string;
    MarketCapitalization?: string;
    PERatio?: string;
    EPS?: string;
    DividendYield?: string;
    Beta?: string;
    '52WeekHigh'?: string;
    '52WeekLow'?: string;
    Exchange?: string;
  };
  success: boolean;
}

// Transform shared context data to component format
const transformStockData = (stock: any): RealStockData | null => {
  if (!stock) return null;

  return {
    symbol: stock.symbol,
    name: stock.name,
    price: stock.price,
    change: stock.change,
    changePercent: stock.changePercent,
    volume: stock.volume,
    marketCap: stock.marketCap || 0,
    sector: stock.sector,
    avgVolume: stock.avgVolume || stock.volume,
    volumeRatio: stock.volumeRatio || 1,
    dayHigh: stock.dayHigh || stock.price,
    dayLow: stock.dayLow || stock.price,
    week52High: stock.week52High || stock.price * 1.2,
    week52Low: stock.week52Low || stock.price * 0.8,
    lastUpdated: stock.lastUpdate || Date.now()
  };
};

// Fetch technical indicators for individual stock from chart endpoint
const fetchTechnicalIndicators = async (symbol: string): Promise<RealTechnicalData | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chart/${symbol}?timeframe=3M`);
    if (!response.ok) {
      console.error(`Failed to fetch technical indicators for ${symbol}`);
      return null;
    }

    const apiResponse = await response.json();
    const technicals = data.technicals;

    if (!technicals) {
      console.warn(`No technical data available for ${symbol}`);
      return null;
    }

    // Extract latest values from time-series data
    const getLatestValue = (series: any[]) => series?.[series.length - 1]?.value || 0;

    return {
      rsi: getLatestValue(technicals.rsi),
      macd: {
        macd: getLatestValue(technicals.macd?.macd),
        signal: getLatestValue(technicals.macd?.signal),
        histogram: getLatestValue(technicals.macd?.histogram)
      },
      sma20: getLatestValue(technicals.sma20),
      sma50: getLatestValue(technicals.sma50),
      bollinger: {
        upper: getLatestValue(technicals.bollinger?.upper),
        middle: getLatestValue(technicals.bollinger?.middle),
        lower: getLatestValue(technicals.bollinger?.lower)
      }
    };
  } catch (error) {
    console.error(`Error fetching technical indicators for ${symbol}:`, error);
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
    return null;
  }
};

const fetchRealEarningsData = async (symbol: string): Promise<RealEarningsData | null> => {
  try {
    // Earnings data not available without Alpha Vantage
    return { symbol, earnings: {}, success: false };
  } catch (error) {
    console.error('Error fetching real earnings data:', error);
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
    return null;
  }
};

const fetchRealNewsData = async (symbol: string): Promise<RealNewsData | null> => {
  try {
    // News data not available without Alpha Vantage
    return { symbol, news: [], sentiment: {}, success: false };
  } catch (error) {
    console.error('Error fetching real news data:', error);
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
    return null;
  }
};

const fetchRealCompanyOverview = async (symbol: string): Promise<RealCompanyOverview | null> => {
  try {
    // Company overview data not available without Alpha Vantage
    return { symbol, overview: {}, success: false };
  } catch (error) {
    console.error('Error fetching real company overview:', error);
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
    return null;
  }
};

const RealIndividualStockAnalysis: React.FC = () => {
  // Use shared market data context - no API calls needed!
  const { allStocks, indices, isLoading: contextLoading, getStockBySymbol } = useMarketData();

  // State management for real data
  const [selectedSymbol, setSelectedSymbol] = useState<string>('AAPLx');  // Fixed: Use xStock symbol

  // Handle buy button click - just navigate to swap page
  const handleBuyClick = () => {
    console.log(' Buy button clicked for:', selectedSymbol);
    // Dispatch custom event to notify main app to switch to trade page
    const event = new CustomEvent('navigateToTrade');
    window.dispatchEvent(event);
    console.log(' Dispatched navigateToTrade event');
  };
  const [selectedPeriod, setSelectedPeriod] = useState<string>('1D');

  const [realStockData, setRealStockData] = useState<RealStockData | null>(null);
  const [realTechnicalData, setRealTechnicalData] = useState<RealTechnicalData | null>(null);
  const [realEarningsData, setRealEarningsData] = useState<RealEarningsData | null>(null);
  const [realNewsData, setRealNewsData] = useState<RealNewsData | null>(null);
  const [realCompanyData, setRealCompanyData] = useState<RealCompanyOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('technical');
  // Use symbols directly from context - no need for separate state
  const availableSymbols = useMemo(() => {
    if (allStocks && allStocks.length > 0) {
      const symbols = allStocks.map(s => s.symbol);
      console.log(` Available ${symbols.length} xStock symbols:`, symbols.slice(0, 5));
      return symbols;
    }
    return ['AAPLx']; // Fallback
  }, [allStocks]);

  // Transform shared data when symbol changes
  useEffect(() => {
    const loadStockData = async () => {
      try {
        // Get stock from shared context (no API call!)
        // selectedSymbol is already in xStock format (e.g., 'AAPLx'), no need to append 'x'
        const stock = getStockBySymbol(selectedSymbol);

        if (stock) {
          setRealStockData(transformStockData(stock));

          // Fetch technical indicators for THIS specific stock
          const technicalData = await fetchTechnicalIndicators(selectedSymbol);
          setRealTechnicalData(technicalData);

          setRealEarningsData({ symbol: selectedSymbol, earnings: {}, success: false });
          setRealNewsData({ symbol: selectedSymbol, news: [], sentiment: {}, success: false } as any);
          setRealCompanyData({ symbol: selectedSymbol, overview: {}, success: false });
        } else {
          setError(`Stock ${selectedSymbol} not found in available xStocks`);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError(`Failed to load data for ${selectedSymbol}`);
      }
    };

    loadStockData();
  }, [selectedSymbol, allStocks, getStockBySymbol]);

  // Helper function to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Helper function to format large numbers
  const formatLargeNumber = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toFixed(0)}`;
  };

  if (contextLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <div className="w-14 h-14 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <h2 className="text-sm font-bold text-[#1a1a1a] mb-2">Loading Real Data</h2>
          <p className="text-[#3C3C3C]">Fetching live financial data for {selectedSymbol}...</p>
        </motion.div>
      </div>
    );
  }

  if (error || !realStockData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <div className="text-red-500 text-sm mb-3"></div>
          <h2 className="text-sm font-bold text-[#1a1a1a] mb-2">Data Error</h2>
          <p className="text-red-300 mb-3">{error || 'Failed to load stock data'}</p>
          <Button onClick={() => window.location.reload()} className="bg-playful-green hover:bg-playful-orange">
            Retry
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-3"
        >
          <h1 className="text-sm md:text-sm font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent mb-3">
            Individual Stock Analysis
          </h1>
          <p className="text-sm text-[#3C3C3C] mb-3">
            Real-time comprehensive analysis with live financial data
          </p>

          {/* Symbol and Period Selectors */}
          <div className="flex justify-center items-center gap-10 mb-3 flex-wrap">
            <div className="flex items-center gap-10">
              <label className="text-[#1a1a1a] font-bold">Select Stock:</label>
              <div className="relative flex items-center gap-2.5 bg-white border-2 border-black rounded-2xl px-3 py-2.5 hover:bg-playful-cream transition-colors shadow-md">
                <img
                  key={selectedSymbol}
                  src={getStockLogo(selectedSymbol)}
                  alt={selectedSymbol}
                  className="w-6 h-6 rounded object-cover"
                />
                <select
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  className="bg-transparent text-[#1a1a1a] font-semibold focus:outline-none cursor-pointer appearance-none pr-8 min-w-[120px]"
                >
                  {availableSymbols.length > 0 ? (
                    availableSymbols.map((symbol) => (
                      <option key={symbol} value={symbol} className="bg-white text-[#1a1a1a] py-2">
                        {symbol}
                      </option>
                    ))
                  ) : (
                    <option value={selectedSymbol} className="bg-white text-[#1a1a1a]">
                      {selectedSymbol}
                    </option>
                  )}
                </select>
                <svg className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#1a1a1a] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div className="flex items-center gap-10">
              <label className="text-[#1a1a1a] font-bold">Period:</label>
              <div className="flex gap-2.5">
                {['1D', '1W', '1M', '3M', '6M', '1Y'].map((period) => (
                  <Button
                    key={period}
                    size="sm"
                    variant={selectedPeriod === period ? "default" : "outline"}
                    onClick={() => setSelectedPeriod(period)}
                    className={cn(
                      "px-3 py-1 text-sm font-semibold border-2 border-black rounded-2xl transition-all",
                      selectedPeriod === period
                        ? "bg-playful-green text-white shadow-md"
                        : "bg-white text-[#1a1a1a] hover:bg-playful-cream"
                    )}
                  >
                    {period}
                  </Button>
                ))}
              </div>
            </div>

            <Badge className="bg-playful-green text-white border-2 border-black font-bold">LIVE DATA</Badge>
          </div>
        </motion.div>

        {/* Stock Header & Key Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card className="glass-card border-black/10/50 mb-3">
            <CardHeader>
              <CardTitle className="text-sm text-[#1a1a1a] flex items-center gap-10">
                <Building2 className="w-8 h-8 text-primary-400" />
                Stock Header & Key Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Stock Info */}
                <div>
                  <div className="flex items-center gap-10 mb-3">
                    <img
                      key={realStockData.symbol}
                      src={getStockLogo(realStockData.symbol)}
                      alt={realStockData.symbol}
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                    <div>
                      <h2 className="text-sm font-bold text-[#1a1a1a]">{realStockData.symbol}</h2>
                      <Badge className="bg-blue-600 mt-1">{realStockData.sector}</Badge>
                    </div>
                  </div>
                  <h3 className="text-sm text-[#1a1a1a] mb-3">{realStockData.name}</h3>

                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <div className="text-[#3C3C3C] text-sm mb-1">Current Price</div>
                      <div className="text-sm font-bold text-[#1a1a1a]">{formatCurrency(realStockData.price)}</div>
                    </div>

                    {/* Buy Button */}
                    <div className="flex items-end">
                      <Button
                        onClick={handleBuyClick}
                        className="w-full h-9 bg-gradient-to-r from-playful-green to-green-500 hover:from-green-500 hover:to-playful-green text-white font-semibold rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                      >
                        <ShoppingCart className="w-4 h-4 mr-1.5" />
                        Buy {selectedSymbol.replace('x', '')}
                      </Button>
                    </div>

                    <div>
                      <div className="text-[#3C3C3C] text-sm mb-1">Change</div>
                      <div className={`text-sm font-bold ${realStockData.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {realStockData.change >= 0 ? '+' : ''}{formatCurrency(realStockData.change)}
                        ({realStockData.changePercent.toFixed(2)}%)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Metrics */}
                <div>
                  <h4 className="text-sm font-semibold text-[#1a1a1a] mb-3">Key Metrics</h4>
                  <div className="grid grid-cols-2 gap-10">
                    <div>
                      <div className="text-[#3C3C3C] text-sm mb-1">Volume</div>
                      <div className="text-sm font-bold text-[#1a1a1a]">{realStockData.volume.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-[#3C3C3C] text-sm mb-1">Avg Volume</div>
                      <div className="text-sm font-bold text-[#1a1a1a]">{realStockData.avgVolume.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-[#3C3C3C] text-sm mb-1">Market Cap</div>
                      <div className="text-sm font-bold text-[#1a1a1a]">{formatLargeNumber(realStockData.marketCap)}</div>
                    </div>
                    <div>
                      <div className="text-[#3C3C3C] text-sm mb-1">52W Range</div>
                      <div className="text-sm font-bold text-[#1a1a1a]">
                        {formatCurrency(realStockData.week52Low)} - {formatCurrency(realStockData.week52High)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Navigation Tabs */}
        <div className="flex justify-center gap-10 mb-3 flex-wrap">
          {[
            { id: 'technical', label: 'Technical Analysis', icon: <ChartCandlestick className="w-4 h-4" /> },
            { id: 'fundamentals', label: 'Fundamentals', icon: <DollarSign className="w-4 h-4" /> },
            { id: 'earnings', label: 'Earnings', icon: <TrendingUp className="w-4 h-4" /> },
            { id: 'news', label: 'News & Sentiment', icon: <FileText className="w-4 h-4" /> },
            { id: 'company', label: 'Company Overview', icon: <Building2 className="w-4 h-4" /> }
          ].map(tab => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "outline"}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2.5 border-2 border-black rounded-2xl font-semibold transition-all",
                activeTab === tab.id
                  ? "bg-playful-green text-white shadow-md"
                  : "bg-white text-[#1a1a1a] hover:bg-playful-cream"
              )}
            >
              {tab.icon}
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Dynamic Content Based on Active Tab */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            {activeTab === 'technical' && realTechnicalData && (
              <>
                {/* Interactive Stock Chart - PHASE 4.1 WEEK 1 */}
                <StockChart key={`chart-${selectedSymbol}-${selectedPeriod}`} symbol={selectedSymbol} period={selectedPeriod} className="mb-3" />

                <Card className="glass-card border-3 border-black rounded-2xl">
                  <CardHeader className="bg-playful-cream border-b-2 border-black">
                    <CardTitle className="text-sm text-[#1a1a1a] flex items-center gap-10">
                      <Activity className="w-8 h-8 text-playful-green" />
                      Technical Indicators
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="bg-white">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* RSI */}
                    <div className="bg-playful-cream p-3 rounded-2xl border-2 border-black">
                      <h4 className="text-sm font-bold text-[#1a1a1a] mb-3">RSI (14)</h4>
                      <div className={`text-2xl font-bold mb-2 px-3 py-2 rounded-lg border-2 border-black inline-block ${
                        realTechnicalData.rsi > 70 ? 'bg-red-500 text-white' :
                        realTechnicalData.rsi > 60 ? 'bg-orange-500 text-white' :
                        realTechnicalData.rsi >= 40 ? 'bg-playful-green text-white' :
                        realTechnicalData.rsi >= 30 ? 'bg-orange-500 text-white' :
                        'bg-red-500 text-white'
                      }`}>{realTechnicalData.rsi.toFixed(1)}</div>
                      <div className="w-full bg-gray-200 rounded-full h-3 border-2 border-black mt-3">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-playful-green via-playful-orange to-red-500"
                          style={{ width: `${realTechnicalData.rsi}%` }}
                        />
                      </div>
                      <div className={`text-sm font-bold mt-2 px-2 py-1 rounded border-2 border-black inline-block ${
                        realTechnicalData.rsi > 70 ? 'bg-red-500 text-white' :
                        realTechnicalData.rsi < 30 ? 'bg-red-500 text-white' :
                        'bg-playful-green text-white'
                      }`}>
                        {realTechnicalData.rsi > 70 ? 'Overbought' :
                         realTechnicalData.rsi < 30 ? 'Oversold' : 'Neutral'}
                      </div>
                    </div>

                    {/* MACD */}
                    <div className="bg-playful-cream p-3 rounded-2xl border-2 border-black">
                      <h4 className="text-sm font-bold text-[#1a1a1a] mb-3">MACD</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[#3C3C3C] text-sm font-medium">MACD Line:</span>
                          <span className={`font-bold px-2 py-1 rounded border-2 border-black text-white ${
                            realTechnicalData.macd.macd >= 0 ? 'bg-playful-green' : 'bg-red-500'
                          }`}>{realTechnicalData.macd.macd.toFixed(3)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#3C3C3C] text-sm font-medium">Signal:</span>
                          <span className={`font-bold px-2 py-1 rounded border-2 border-black text-white ${
                            realTechnicalData.macd.signal >= 0 ? 'bg-playful-green' : 'bg-red-500'
                          }`}>{realTechnicalData.macd.signal.toFixed(3)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#3C3C3C] text-sm font-medium">Histogram:</span>
                          <span className={`font-bold px-2 py-1 rounded border-2 border-black text-white ${
                            realTechnicalData.macd.histogram >= 0 ? 'bg-playful-green' : 'bg-red-500'
                          }`}>
                            {realTechnicalData.macd.histogram.toFixed(3)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Moving Averages */}
                    <div className="bg-playful-cream p-3 rounded-2xl border-2 border-black">
                      <h4 className="text-sm font-bold text-[#1a1a1a] mb-3">Moving Averages</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[#3C3C3C] text-sm font-medium">SMA 20:</span>
                          <span className={`font-bold px-2 py-1 rounded border-2 border-black text-white ${
                            realStockData.price > realTechnicalData.sma20 ? 'bg-playful-green' : 'bg-red-500'
                          }`}>{formatCurrency(realTechnicalData.sma20)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#3C3C3C] text-sm font-medium">SMA 50:</span>
                          <span className={`font-bold px-2 py-1 rounded border-2 border-black text-white ${
                            realStockData.price > realTechnicalData.sma50 ? 'bg-playful-green' : 'bg-red-500'
                          }`}>{formatCurrency(realTechnicalData.sma50)}</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[#3C3C3C] text-sm font-medium">vs SMA20:</span>
                          <span className={`font-bold px-2 py-1 rounded border-2 border-black text-white ${
                            ((realStockData.price / realTechnicalData.sma20 - 1) * 100) > 0 ? 'bg-playful-green' : 'bg-red-500'
                          }`}>
                            {((realStockData.price / realTechnicalData.sma20 - 1) * 100).toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bollinger Bands */}
                  <div className="mt-3 bg-playful-cream p-3 rounded-2xl border-2 border-black">
                    <h4 className="text-sm font-bold text-[#1a1a1a] mb-3">Bollinger Bands</h4>
                    <div className="grid grid-cols-3 gap-10">
                      <div>
                        <div className="text-[#3C3C3C] text-sm font-medium mb-1">Upper Band</div>
                        <div className="text-lg font-bold text-red-500">{formatCurrency(realTechnicalData.bollinger.upper)}</div>
                      </div>
                      <div>
                        <div className="text-[#3C3C3C] text-sm font-medium mb-1">Middle (SMA 20)</div>
                        <div className="text-lg font-bold text-[#1a1a1a]">{formatCurrency(realTechnicalData.bollinger.middle)}</div>
                      </div>
                      <div>
                        <div className="text-[#3C3C3C] text-sm font-medium mb-1">Lower Band</div>
                        <div className="text-lg font-bold text-playful-green">{formatCurrency(realTechnicalData.bollinger.lower)}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </>
            )}

            {activeTab === 'fundamentals' && (
              <FundamentalAnalysis key={`fundamentals-${selectedSymbol}-${selectedPeriod}`} symbol={selectedSymbol} period={selectedPeriod} />
            )}

            {activeTab === 'earnings' && (
              <EarningsAnalystData key={`earnings-${selectedSymbol}-${selectedPeriod}`} symbol={selectedSymbol} period={selectedPeriod} />
            )}

            {activeTab === 'news' && (
              <NewsHeadlines symbol={selectedSymbol} />
            )}

            {activeTab === 'company' && (
              <CompanyOverview symbol={selectedSymbol} />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Data Source Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-3 text-center"
        >
          <div className="bg-gray-800/30 rounded-lg p-3">
            <div className="flex justify-center items-center gap-10 text-sm text-[#3C3C3C]">
              <Badge className="bg-green-600 text-[#1a1a1a]">LIVE DATA</Badge>
              <span>Data sources: yfinance • Real-time stock prices • Technical indicators</span>
              <span>Last updated: {new Date(realStockData.lastUpdated).toLocaleTimeString()}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default RealIndividualStockAnalysis;