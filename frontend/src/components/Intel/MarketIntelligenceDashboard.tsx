import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMarketData } from '../../contexts/MarketDataContext';
import { RefreshCw, ChevronDown, BarChart3, TrendingUp, Building2, Target, ArrowRight, ArrowLeft, Star, Newspaper, Zap, Users } from 'lucide-react';
import { MarketHeatmap } from './Market Intelligence Dashboard/MarketHeatmap';
import { MarketIndices } from './Market Intelligence Dashboard/MarketIndices';
import { SectorPerformance } from './Market Intelligence Dashboard/SectorPerformance';
import { TopMovers } from './Market Intelligence Dashboard/TopMovers';
import { MarketNewsFeed } from './Market Intelligence Dashboard/MarketNewsFeed';
import { UnusualVolumeDetector } from './Market Intelligence Dashboard/UnusualVolumeDetector';
import { AnalystSummary } from './Market Intelligence Dashboard/AnalystSummary';

// Types for API responses
interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  sector: string;
}

interface IndexData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  technical: any;
  lastUpdated: string;
}

interface SectorData {
  name: string;
  stocks: StockData[];
  totalMarketCap: number;
  avgChange: number;
  totalVolume: number;
  topGainer: StockData | null;
  topLoser: StockData | null;
  performance: number;
}

interface MoversData {
  topGainers: StockData[];
  topLosers: StockData[];
  mostActive: StockData[];
}

interface MarketPulse {
  totalVolume: number;
  avgVolume: number;
  volumeChange: number;
  marketCap: number;
  activeStocks: number;
  volatility: number;
  momentum: string;
  fearGreedIndex: number;
}

// Section definitions for modular navigation
type DashboardSection = 'heatmap' | 'indices' | 'sectors' | 'movers' | 'news' | 'volume' | 'analysts';

interface SectionConfig {
  id: DashboardSection;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const dashboardSections: SectionConfig[] = [
  {
    id: 'heatmap',
    title: 'Market Heatmap',
    description: 'Visual overview of all 63 xStock performance',
    icon: <BarChart3 className="w-5 h-5" />,
    color: 'from-green-500 to-blue-500'
  },
  {
    id: 'indices',
    title: 'Market Indices',
    description: '21 major indices with technical analysis',
    icon: <TrendingUp className="w-5 h-5" />,
    color: 'primary'
  },
  {
    id: 'sectors',
    title: 'Sector Analysis',
    description: 'Performance across 9 market sectors',
    icon: <Building2 className="w-5 h-5" />,
    color: 'success'
  },
  {
    id: 'movers',
    title: 'Top Movers & Pulse',
    description: 'Market leaders, laggards & sentiment',
    icon: <Target className="w-5 h-5" />,
    color: 'danger'
  },
  {
    id: 'news',
    title: 'Market News',
    description: 'Latest news from top stocks & market headlines',
    icon: <Newspaper className="w-5 h-5" />,
    color: 'info'
  },
  {
    id: 'volume',
    title: 'Unusual Volume',
    description: 'Detect unusual trading activity & volume spikes',
    icon: <Zap className="w-5 h-5" />,
    color: 'warning'
  },
  {
    id: 'analysts',
    title: 'Analyst Ratings',
    description: 'Consensus ratings, top picks & price targets',
    icon: <Users className="w-5 h-5" />,
    color: 'success'
  }
];

const MarketIntelligenceDashboard: React.FC = () => {
  // Use shared MarketDataContext (OPTION 1 unified pattern)
  const {
    allStocks,
    indices,
    sectors,
    topGainers,
    topLosers,
    mostActive,
    pulse,
    isLoading,
    period,
    setPeriod
  } = useMarketData();

  // Section navigation state
  const [activeSection, setActiveSection] = useState<DashboardSection>('heatmap');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Map UI period format to API format
  const periodMap: Record<'1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y', '1d' | '1w' | '1mo' | '3mo' | 'ytd' | '1y'> = {
    '1D': '1d',
    '1W': '1w',
    '1M': '1mo',
    '3M': '3mo',
    'YTD': 'ytd',
    '1Y': '1y'
  };

  // Reverse map for display
  const reversePeriodMap: Record<'1d' | '1w' | '1mo' | '3mo' | 'ytd' | '1y', '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y'> = {
    '1d': '1D',
    '1w': '1W',
    '1mo': '1M',
    '3mo': '3M',
    'ytd': 'YTD',
    '1y': '1Y'
  };

  const timePeriod = reversePeriodMap[period];

  const handleTimePeriodChange = (newPeriod: '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y') => {
    setPeriod(periodMap[newPeriod]);
  };

  // Transform shared context data into component state format
  const stocksData = allStocks || [];
  const indicesData = indices || [];
  const sectorsData = sectors || [];
  const moversData = {
    topGainers: topGainers || [],
    topLosers: topLosers || [],
    mostActive: mostActive || []
  };
  const marketPulse = pulse || {
    totalVolume: 0,
    avgVolume: 0,
    volumeChange: 0,
    marketCap: 0,
    activeStocks: 0,
    volatility: 20,
    momentum: 'neutral',
    fearGreedIndex: 50
  };

  const loading = isLoading;

  const handleStockClick = (symbol: string) => {
    console.log('Stock clicked:', symbol);
  };

  const handleSectorClick = (sectorName: string) => {
    console.log('Sector clicked:', sectorName);
  };

  // Navigation helper functions
  const getCurrentSection = () => dashboardSections.find(section => section.id === activeSection)!;
  const getCurrentSectionIndex = () => dashboardSections.findIndex(section => section.id === activeSection);

  const navigateToNextSection = () => {
    const currentIndex = getCurrentSectionIndex();
    const nextIndex = (currentIndex + 1) % dashboardSections.length;
    setActiveSection(dashboardSections[nextIndex].id);
    setDropdownOpen(false);
  };

  const navigateToPrevSection = () => {
    const currentIndex = getCurrentSectionIndex();
    const prevIndex = currentIndex === 0 ? dashboardSections.length - 1 : currentIndex - 1;
    setActiveSection(dashboardSections[prevIndex].id);
    setDropdownOpen(false);
  };

  const selectSection = (sectionId: DashboardSection) => {
    setActiveSection(sectionId);
    setDropdownOpen(false);
  };

  // Render active section content
  const renderActiveSection = () => {
    switch (activeSection) {
      case 'heatmap':
        return (
          <MarketHeatmap
            data={stocksData}
            timePeriod={timePeriod}
            onTimePeriodChange={handleTimePeriodChange}
            onStockClick={handleStockClick}
            loading={isLoading}
          />
        );
      case 'indices':
        return (
          <MarketIndices
            indices={indicesData}
            loading={loading}
          />
        );
      case 'sectors':
        return (
          <SectorPerformance
            sectors={sectorsData}
            loading={loading}
            onSectorClick={handleSectorClick}
            onStockClick={handleStockClick}
          />
        );
      case 'movers':
        return (
          <TopMovers
            topGainers={moversData.topGainers}
            topLosers={moversData.topLosers}
            mostActive={moversData.mostActive}
            marketPulse={marketPulse}
            loading={loading}
            onStockClick={handleStockClick}
          />
        );
      case 'news':
        return <MarketNewsFeed />;
      case 'volume':
        return <UnusualVolumeDetector />;
      case 'analysts':
        return <AnalystSummary />;
      default:
        return null;
    }
  };

  const currentSection = getCurrentSection();

  return (
    <div className="min-h-screen p-3">
      <div className="max-w-7xl mx-auto">
        {/* Dashboard Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-3"
        >
          <h1 className="text-sm font-bold font-display bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent mb-2">
            Market Intelligence Dashboard
          </h1>
          <p className="text-sm text-[#3C3C3C]">
            Advanced analytics for 63 xStock symbols with real-time insights
          </p>
        </motion.div>

        {/* Main Dashboard Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-card overflow-hidden"
        >
          {/* Card Header with Period Selector */}
          <div className="bg-playful-cream/50 backdrop-blur-xl p-3 border-b border-black/10">
            <div className="flex items-center justify-between">
              {/* Dashboard Title */}
              <div>
                <h2 className="text-sm font-bold font-display text-[#1a1a1a]">Market Intelligence</h2>
                <p className="text-sm text-[#3C3C3C] font-body">Real-time insights across 63 xStocks</p>
              </div>

              {/* Period Selector & Loading */}
              <div className="flex items-center gap-10">
                {loading && (
                  <div className="flex items-center gap-2.5 text-primary-400">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading...</span>
                  </div>
                )}

                {/* Global Period Selector - Only show for sections that use historical data */}
                {!['news', 'volume', 'analysts'].includes(activeSection) && (
                  <div className="flex items-center gap-1.5 bg-white/80 rounded-2xl p-1 border-3 border-black/20">
                    {(['1D', '1W', '1M', '3M', 'YTD', '1Y'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => handleTimePeriodChange(p)}
                        className={`px-3 py-1.5 rounded-xl text-sm font-semibold font-display transition-all duration-200 ${
                          timePeriod === p
                            ? 'bg-playful-green text-white border-2 border-black shadow-lg'
                            : 'text-[#1a1a1a] hover:bg-playful-cream/50'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Section Tabs */}
            <div className="flex items-center gap-2.5 mt-3 overflow-x-auto pb-2">
              {dashboardSections.map((section) => {
                return (
                  <button
                    key={section.id}
                    onClick={() => selectSection(section.id)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl transition-all duration-200 whitespace-nowrap border-2 font-display font-semibold ${
                      section.id === activeSection
                        ? 'bg-playful-orange text-white border-black shadow-lg scale-105'
                        : 'bg-white/80 text-[#1a1a1a] hover:bg-playful-cream/50 border-black/20'
                    }`}
                  >
                    <div className="w-5 h-5 flex items-center justify-center">
                      {section.icon}
                    </div>
                    <span className="text-sm">{section.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Section Content */}
          <div className="p-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderActiveSection()}
              </motion.div>
            </AnimatePresence>
          </div>

        </motion.div>

        {/* Footer Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-3 text-[#3C3C3C]"
        >
          <p>
            Tracking <span className="text-green-400 font-semibold">63</span> xStock symbols
            • <span className="text-blue-400 font-semibold">21</span> market indices
            • <span className="text-primary-400 font-semibold">9</span> diverse sectors
            • <span className="text-yellow-400 font-semibold">7</span> dashboard sections
            • <span className="text-cyan-400 font-semibold">Real-time</span> market data
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export { MarketIntelligenceDashboard };