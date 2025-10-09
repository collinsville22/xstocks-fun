import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { cn } from '../../lib/utils';
import { useMarketData } from '../../contexts/MarketDataContext';
import {
  TrendingUp,
  TrendingDown,
  Filter,
  Search,
  Download,
  Plus,
  BarChart3,
  ScatterChart,
  Target,
  Activity,
  DollarSign,
  RefreshCw,
  Save,
  Eye,
  ArrowUpDown,
  Percent,
  TrendingUpIcon,
  Calculator,
  Brain,
  Users,
  Shield,
  Zap,
  Crosshair
} from 'lucide-react';
import { FundamentalCriteriaComponent, type FundamentalCriteria } from './ScreeningCriteria/FundamentalCriteria';
import { TechnicalCriteriaComponent, type TechnicalCriteria } from './ScreeningCriteria/TechnicalCriteria';
import { QuantitativeCriteriaComponent, type QuantitativeCriteria } from './ScreeningCriteria/QuantitativeCriteria';
import { ResultsTable, type Stock } from './ScreeningResults/ResultsTable';
import { ScatterPlotAnalysis } from './ScreeningVisualization/ScatterPlotAnalysis';
import { PerformanceHeatmap } from './ScreeningVisualization/PerformanceHeatmap';
import { CorrelationAnalysis } from './ScreeningVisualization/CorrelationAnalysis';

// Types for stock screening
interface ScreeningCriteria {
  fundamental: FundamentalCriteria;
  technical: TechnicalCriteria;
  quantitative: QuantitativeCriteria;
}




// Use the Stock interface from ResultsTable
type ScreenedStock = Stock;

interface PresetScreen {
  id: string;
  name: string;
  description: string;
  criteria: ScreeningCriteria;
  icon: React.ReactNode;
  color: string;
}

interface AdvancedStockScreenerProps {
  className?: string;
}

// Preset screening strategies
const presetScreens: PresetScreen[] = [
  {
    id: 'value',
    name: 'Value Stocks',
    description: 'Low P/E, P/B ratios with dividends',
    criteria: {
      fundamental: { peRatioMax: 20, pbRatioMax: 3, dividendYieldMin: 1 },
      technical: {},
      quantitative: {}
    },
    icon: <DollarSign className="w-4 h-4" />,
    color: 'from-green-500 to-emerald-500'
  },
  {
    id: 'growth',
    name: 'Growth Stocks',
    description: 'High EPS and revenue growth',
    criteria: {
      fundamental: { peRatioMin: 20, marketCapMin: 10000000000 },
      technical: { priceChangeMin: 1 },
      quantitative: {}
    },
    icon: <TrendingUp className="w-4 h-4" />,
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'momentum',
    name: 'Momentum Plays',
    description: 'Strong price momentum and volume',
    criteria: {
      fundamental: {},
      technical: { priceChangeMin: 2, rsiMin: 55 },
      quantitative: {}
    },
    icon: <Activity className="w-4 h-4" />,
    color: 'primary'
  },
  {
    id: 'dividend',
    name: 'High Dividend',
    description: 'Dividend yield > 2.5%',
    criteria: {
      fundamental: { dividendYieldMin: 2.5 },
      technical: {},
      quantitative: {}
    },
    icon: <Percent className="w-4 h-4" />,
    color: 'from-orange-500 to-red-500'
  },
  {
    id: 'low_volatility',
    name: 'Low Volatility',
    description: 'Stable stocks with low volatility',
    criteria: {
      fundamental: {},
      technical: { volatilityMax: 20 },
      quantitative: {}
    },
    icon: <Shield className="w-4 h-4" />,
    color: 'info'
  },
  {
    id: 'quality',
    name: 'Quality Stocks',
    description: 'High ROE, low debt, strong margins',
    criteria: {
      fundamental: { debtEquityMax: 0.5 },
      technical: {},
      quantitative: { analystRatingMin: 4 }
    },
    icon: <Target className="w-4 h-4" />,
    color: 'from-teal-500 to-green-500'
  },
  {
    id: 'distressed',
    name: 'Distressed',
    description: 'Oversold stocks with potential',
    criteria: {
      fundamental: {},
      technical: { rsiMax: 30, priceChangeMax: -20 },
      quantitative: {}
    },
    icon: <TrendingDown className="w-4 h-4" />,
    color: 'from-red-500 to-pink-500'
  },
  {
    id: 'turnaround',
    name: 'Turnaround Candidates',
    description: 'Improving fundamentals',
    criteria: {
      fundamental: { peRatioMax: 15 },
      technical: { priceChangeMin: 2 },
      quantitative: {}
    },
    icon: <RefreshCw className="w-4 h-4" />,
    color: 'from-yellow-500 to-orange-500'
  }
];

const AdvancedStockScreener: React.FC<AdvancedStockScreenerProps> = ({ className }) => {
  // Use shared market data context - no API calls needed! Now includes period awareness
  const { allStocks, isLoading: contextLoading, isFetching, period, setPeriod } = useMarketData();

  const [loading, setLoading] = useState(false);
  const [screeningCriteria, setScreeningCriteria] = useState<ScreeningCriteria>({
    fundamental: {},
    technical: {},
    quantitative: {}
  });
  const [screenedStocks, setScreenedStocks] = useState<ScreenedStock[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'criteria' | 'results' | 'visualization'>('criteria');
  const [activeVizTab, setActiveVizTab] = useState<'scatter' | 'heatmap' | 'correlation'>('scatter');

  // Track if user has initiated screening (to enable auto-refresh)
  const hasScreenedRef = useRef(false);

  // Apply preset screen
  const applyPresetScreen = (preset: PresetScreen) => {
    setScreeningCriteria(preset.criteria);
    setSelectedPreset(preset.id);
    runScreen(preset.criteria);
  };

  // Run stock screen - now uses shared context data!
  // Wrap in useCallback to prevent infinite loops in useEffect
  const runScreen = useCallback(async (criteria: ScreeningCriteria = screeningCriteria, switchToResults: boolean = true) => {
    hasScreenedRef.current = true; // Mark that user has initiated screening
    setLoading(true);
    try {
      // Use shared data from context instead of fetching
      const stocks = allStocks || [];

      // Data successfully loaded from MarketDataContext

      // Apply screening criteria
      const filtered = stocks.filter((stock: any) => {
        // Fundamental criteria
        if (criteria.fundamental.marketCapMin && stock.marketCap < criteria.fundamental.marketCapMin) return false;
        if (criteria.fundamental.marketCapMax && stock.marketCap > criteria.fundamental.marketCapMax) return false;
        if (criteria.fundamental.peRatioMin && (stock.peRatio || 0) < criteria.fundamental.peRatioMin) return false;
        if (criteria.fundamental.peRatioMax && (stock.peRatio || 999) > criteria.fundamental.peRatioMax) return false;
        if (criteria.fundamental.pbRatioMin && (stock.pbRatio || 0) < criteria.fundamental.pbRatioMin) return false;
        if (criteria.fundamental.pbRatioMax && (stock.pbRatio || 999) > criteria.fundamental.pbRatioMax) return false;
        if (criteria.fundamental.dividendYieldMin && (stock.dividendYield || 0) < criteria.fundamental.dividendYieldMin) return false;
        if (criteria.fundamental.epsGrowthMin && ((stock.epsGrowth || stock.revenueGrowth) || 0) < criteria.fundamental.epsGrowthMin) return false;
        if (criteria.fundamental.debtEquityMax && (stock.debtToEquity || 0) > criteria.fundamental.debtEquityMax) return false;
        if (criteria.fundamental.revenueGrowthMin && (stock.revenueGrowth || 0) < criteria.fundamental.revenueGrowthMin) return false;

        // Technical criteria (using REAL TA data)
        if (criteria.technical.priceChangeMin && stock.changePercent < criteria.technical.priceChangeMin) return false;
        if (criteria.technical.priceChangeMax && stock.changePercent > criteria.technical.priceChangeMax) return false;
        if (criteria.technical.volumeMin && stock.volume < criteria.technical.volumeMin) return false;
        if (criteria.technical.rsiMin && (stock.rsi || 0) < criteria.technical.rsiMin) return false;
        if (criteria.technical.rsiMax && (stock.rsi || 100) > criteria.technical.rsiMax) return false;
        if (criteria.technical.macdSignal && criteria.technical.macdSignal !== 'neutral' && stock.macdSignal !== criteria.technical.macdSignal) return false;
        if (criteria.technical.volatilityMax && (stock.volatility || 0) > criteria.technical.volatilityMax) return false;

        // Quantitative criteria (using REAL data from backend)
        if (criteria.quantitative.earningsSurpriseMin && (stock.earningsSurprise || 0) < criteria.quantitative.earningsSurpriseMin) return false;
        if (criteria.quantitative.shortInterestMax && (stock.shortInterest || 0) > criteria.quantitative.shortInterestMax) return false;
        if (criteria.quantitative.insiderOwnershipMin && (stock.insiderOwnership || 0) < criteria.quantitative.insiderOwnershipMin) return false;
        if (criteria.quantitative.institutionalOwnershipMin && (stock.institutionalOwnership || 0) < criteria.quantitative.institutionalOwnershipMin) return false;
        if (criteria.quantitative.putCallRatioMin && (stock.putCallRatio || 0) < criteria.quantitative.putCallRatioMin) return false;
        if (criteria.quantitative.putCallRatioMax && (stock.putCallRatio || 999) > criteria.quantitative.putCallRatioMax) return false;

        return true;
      });

      // Transform to ScreenedStock format with REAL data from backend
      const screenedData: ScreenedStock[] = filtered.map((stock: any) => {
        // Map recommendationKey to recommendation string
        const recMap: Record<string, string> = {
          'strong_buy': 'Strong Buy',
          'buy': 'Buy',
          'hold': 'Hold',
          'sell': 'Sell',
          'strong_sell': 'Strong Sell'
        };

        // Convert analyst rating (1-5 scale) from recommendationKey
        const ratingMap: Record<string, number> = {
          'strong_buy': 5,
          'buy': 4,
          'hold': 3,
          'sell': 2,
          'strong_sell': 1
        };

        const recommendation = recMap[stock.recommendationKey || 'hold'] || 'Hold';
        const analystRating = ratingMap[stock.recommendationKey || 'hold'] || 3;

        // Generate performance score from available metrics
        const performanceScore = Math.min(100, Math.max(0, Math.floor(
          (stock.changePercent || 0) * 2 +
          (stock.roe || 0) * 0.5 +
          (analystRating - 3) * 10 +
          50 // Base score
        )));

        return {
          symbol: stock.symbol,
          name: stock.name,
          sector: stock.sector || 'Technology',
          price: stock.price,
          change: stock.change,
          changePercent: stock.changePercent,
          volume: stock.volume,
          marketCap: stock.marketCap,

          // Fundamental metrics (REAL DATA - fixed field names)
          pe: stock.pe || stock.peRatio || stock.trailingPE || 0,
          pb: stock.pb || stock.pbRatio || stock.priceToBook || 0,
          dividendYield: stock.dividendYield || 0,
          epsGrowth: stock.epsGrowth || stock.revenueGrowth || 0,
          debtToEquity: stock.debtToEquity || stock.debtEquity || 0,

          // Technical metrics (REAL DATA from TA library - check all possible field names)
          rsi: stock.rsi || stock.RSI || undefined,
          macdSignal: stock.macdSignal || stock.macd || 'neutral',
          volatility: stock.volatility || 0,

          // Quantitative metrics (REAL DATA)
          analystRating,
          earningsSurprise: stock.earningsSurprise || 0,
          shortInterest: stock.shortInterest || 0,
          insiderOwnership: stock.insiderOwnership || 0,
          institutionalOwnership: stock.institutionalOwnership || 0,
          esgScore: undefined,  // Not available from yfinance

          // Historical data - for now keep simple arrays until backend provides history endpoint
          priceHistory: [],
          volumeHistory: [],

          // Calculated metrics
          performanceScore,
          recommendation: recommendation as any
        };
      });

      setScreenedStocks(screenedData);

      // Only switch to results tab if explicitly requested (manual "Run Screen" click)
      if (switchToResults) {
        setActiveTab('results');
      }
    } catch (error) {
      console.error('Error running screen:', error);
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
    } finally {
      setLoading(false);
    }
  }, [allStocks, screeningCriteria]); // Re-create function when data or criteria changes

  // Auto-rescreen when allStocks data changes (period change, refresh, etc.)
  useEffect(() => {
    // Only re-run if user has initiated screening at least once
    if (hasScreenedRef.current && allStocks && allStocks.length > 0) {
      runScreen(screeningCriteria, false); // false = don't switch to results tab
    }
  }, [allStocks, runScreen, screeningCriteria]); // Re-run screen when data changes

  // Clear all criteria
  const clearCriteria = () => {
    setScreeningCriteria({
      fundamental: {},
      technical: {},
      quantitative: {}
    });
    setSelectedPreset(null);
    setScreenedStocks([]);
    hasScreenedRef.current = false; // Reset screening flag
  };

  // Format currency
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

  return (
    <div className="min-h-screen p-3">
      <div className="max-w-7xl mx-auto">
        {/* Dashboard Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-3"
        >
          <h1 className="text-sm font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent mb-2">
            Advanced Stock Screener
          </h1>
          <p className="text-sm text-[#1a1a1a]">
            Comprehensive screening with fundamental, technical, and quantitative analysis
          </p>
        </motion.div>

        {/* Main Dashboard Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-card backdrop-blur-xl border border-black/10/50 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Card Header with Tabs */}
          <div className="bg-white/50 backdrop-blur-xl p-3 border-b border-black/10/30">
            <div className="flex items-center justify-between mb-3">
              {/* Dashboard Title */}
              <div>
                <h2 className="text-sm font-bold text-[#1a1a1a]">Stock Screening</h2>
                <p className="text-sm text-[#3C3C3C]">Filter stocks by fundamental, technical & quantitative criteria</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-10">
                {loading && (
                  <div className="flex items-center gap-2.5 text-blue-400">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Screening...</span>
                  </div>
                )}

                {activeTab === 'results' && (
                  <>
                    {/* Period Selector - only visible in Screen Results tab */}
                    <div className="flex items-center gap-1.5 bg-gray-700/30 rounded-lg p-1 border border-black/10/30">
                      {isFetching && (
                        <RefreshCw className="w-4 h-4 animate-spin text-primary-400 mr-2" />
                      )}
                      {(['1d', '1w', '1mo', '3mo', 'ytd', '1y'] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setPeriod(p)}
                          disabled={isFetching}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                            period === p
                              ? 'bg-gradient-to-r from-playful-green to-pink-500 text-[#1a1a1a] shadow-lg'
                              : 'text-[#3C3C3C] hover:text-[#1a1a1a] hover:bg-gray-700/50'
                          } ${isFetching ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {p.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {activeTab === 'criteria' && (
                  <>
                    <Button
                      onClick={() => runScreen()}
                      disabled={loading}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-[#1a1a1a] shadow-lg"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                          Screening...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-2" />
                          Run Screen
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={clearCriteria}
                      variant="outline"
                      className="border-red-400/50 text-red-400 hover:bg-red-400/10"
                    >
                      Clear All
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Section Tabs */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-2">
              {[
                { id: 'criteria', label: 'Screening Criteria', icon: <Filter className="w-4 h-4" />, color: 'from-blue-500 to-cyan-500' },
                { id: 'results', label: 'Screen Results', icon: <BarChart3 className="w-4 h-4" />, color: 'from-green-500 to-emerald-500' },
                { id: 'visualization', label: 'Visual Analysis', icon: <ScatterChart className="w-4 h-4" />, color: 'primary' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-200 whitespace-nowrap ${
                    activeTab === tab.id
                      ? `bg-gradient-to-r ${tab.color} text-[#1a1a1a] shadow-lg`
                      : 'bg-gray-700/30 text-[#1a1a1a] hover:bg-gray-700/50 hover:text-[#1a1a1a] border border-black/10/30'
                  }`}
                >
                  <div className={`w-4 h-4 flex items-center justify-center ${
                    activeTab === tab.id ? 'text-[#1a1a1a]' : ''
                  }`}>
                    {tab.icon}
                  </div>
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Active Section Content */}
          <div className="p-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
          {activeTab === 'criteria' && (
            <div className="space-y-3">
              {/* Preset Screens */}
              <Card className="glass-card border-black/10/50">
                <CardHeader>
                  <CardTitle className="text-[#1a1a1a] flex items-center gap-2.5">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    Preset Screens & Quick Strategies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-10">
                    {presetScreens.map((preset) => (
                      <Button
                        key={preset.id}
                        variant={selectedPreset === preset.id ? "default" : "outline"}
                        onClick={() => applyPresetScreen(preset)}
                        className={cn(
                          "h-auto py-2.5 px-3 flex flex-col items-center gap-10 text-sm",
                          selectedPreset === preset.id
                            ? `bg-gradient-to-r ${preset.color} text-[#1a1a1a] shadow-lg`
                            : "glass-card text-[#1a1a1a] border-black/10/50 hover:bg-gray-700/50"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          {preset.icon}
                          <span className="font-semibold">{preset.name}</span>
                        </div>
                        <span className="text-center opacity-90 leading-snug text-sm min-h-[2.5rem] flex items-center">
                          {preset.description}
                        </span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Screening Criteria Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Fundamental Criteria */}
                <FundamentalCriteriaComponent
                  criteria={screeningCriteria.fundamental}
                  onChange={(fundamental) => setScreeningCriteria(prev => ({ ...prev, fundamental }))}
                />

                {/* Technical Criteria */}
                <TechnicalCriteriaComponent
                  criteria={screeningCriteria.technical}
                  onChange={(technical) => setScreeningCriteria(prev => ({ ...prev, technical }))}
                />

                {/* Quantitative Criteria */}
                <QuantitativeCriteriaComponent
                  criteria={screeningCriteria.quantitative}
                  onChange={(quantitative) => setScreeningCriteria(prev => ({ ...prev, quantitative }))}
                />
              </div>
            </div>
          )}

          {activeTab === 'results' && (
            <ResultsTable
              stocks={screenedStocks}
              onExport={() => {
                // CSV export functionality
                const csvContent = [
                  // Header
                  'Symbol,Name,Price,Change%,Market Cap,P/E,Volume,RSI,Performance Score',
                  // Data rows
                  ...screenedStocks.map(stock => [
                    stock.symbol,
                    `"${stock.name}"`,
                    stock.price,
                    stock.changePercent.toFixed(2),
                    stock.marketCap,
                    stock.pe?.toFixed(2) || '',
                    stock.volume,
                    stock.rsi?.toFixed(1) || '',
                    stock.performanceScore
                  ].join(','))
                ].join('\n');

                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `xstocks-screener-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
              }}
            />
          )}

          {activeTab === 'visualization' && (
            <div className="space-y-3">
              {/* Visualization tabs */}
              <Card className="glass-card border-black/10/50">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2.5">
                      {[
                        { id: 'scatter', label: 'Scatter Analysis', icon: <ScatterChart className="w-4 h-4" /> },
                        { id: 'heatmap', label: 'Performance Heatmap', icon: <BarChart3 className="w-4 h-4" /> },
                        { id: 'correlation', label: 'Correlation Matrix', icon: <Activity className="w-4 h-4" /> }
                      ].map((tab) => (
                        <Button
                          key={tab.id}
                          variant={activeVizTab === tab.id ? "default" : "outline"}
                          onClick={() => setActiveVizTab(tab.id as any)}
                          className={cn(
                            "flex items-center gap-2.5",
                            activeVizTab === tab.id
                              ? "bg-playful-green text-[#1a1a1a]"
                              : "bg-gray-700/50 text-[#1a1a1a] border-black/10/50 hover:bg-gray-600/50"
                          )}
                        >
                          {tab.icon}
                          {tab.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Visualization components */}
                {activeVizTab === 'scatter' && (
                  <ScatterPlotAnalysis
                    stocks={screenedStocks}
                  />
                )}
                {activeVizTab === 'heatmap' && (
                  <PerformanceHeatmap
                    stocks={screenedStocks}
                  />
                )}
                {activeVizTab === 'correlation' && (
                  <CorrelationAnalysis
                    stocks={screenedStocks}
                  />
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Quick Stats */}
      {screenedStocks.length > 0 && (
        <div className="bg-gradient-to-r from-gray-800/60 to-gray-700/60 p-3 border-t border-black/10/30">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-10">
                <Badge variant="outline" className="text-green-400 border-green-400/50">
                  {screenedStocks.length} stocks found
                </Badge>
                <span className="text-[#3C3C3C] text-sm">
                  Avg Market Cap: {formatCurrency(screenedStocks.reduce((sum, s) => sum + s.marketCap, 0) / screenedStocks.length)}
                </span>
                <span className="text-[#3C3C3C] text-sm">
                  Avg Change: {formatPercent(screenedStocks.reduce((sum, s) => sum + s.changePercent, 0) / screenedStocks.length)}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-blue-400/50 text-blue-400 hover:bg-blue-400/10"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>

    {/* Footer Stats */}
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="text-center mt-3 text-[#3C3C3C]"
    >
      <p>
        Screening <span className="text-primary-400 font-semibold">63</span> xStock symbols
        • <span className="text-danger-400 font-semibold">3</span> criteria types
        • <span className="text-blue-400 font-semibold">Real-time</span> TA library calculations
        • <span className="text-green-400 font-semibold">Professional</span> options data
        • <span className="text-cyan-400 font-semibold">Advanced</span> filtering
      </p>
    </motion.div>
  </div>
</div>
  );
};

export { AdvancedStockScreener };