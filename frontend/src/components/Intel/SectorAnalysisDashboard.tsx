import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { useMarketData } from '../../contexts/MarketDataContext';
import { SectorComposition } from './SectorComposition';
import { SectorFundamentals } from './SectorFundamentals';
import { SectorTechnicals } from './SectorTechnicals';
import { SectorSentiment } from './SectorSentiment';
import {
  TrendingUp,
  TrendingDown,
  Building2,
  BarChart3,
  PieChart,
  DollarSign,
  Users,
  Target,
  Activity,
  Globe,
  Newspaper,
  Star,
  ArrowUpDown,
  Filter,
  RefreshCw,
  ChevronDown,
  Calendar
} from 'lucide-react';

// Types for sector analysis
interface SectorStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  weight: number;
  peRatio: number;
  revenueGrowth: number;
  eps: number;
  beta: number;
}

interface SectorData {
  name: string;
  stocks: SectorStock[];
  totalMarketCap: number;
  avgChange: number;
  totalVolume: number;
  topGainer: SectorStock;
  topLoser: SectorStock;
  performance: number;
  stockCount: number;
  avgPE: number;
  avgBeta: number;
  relativeStrength: number;
  moneyFlow: number;
  volatility: number;
}

interface SectorAnalysisDashboardProps {
  className?: string;
}

// Dashboard sections configuration
type AnalysisSection = 'overview' | 'composition' | 'fundamentals' | 'technicals' | 'sentiment';

interface SectionConfig {
  id: AnalysisSection;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const analysisSections: SectionConfig[] = [
  {
    id: 'overview',
    title: 'Sector Overview',
    description: 'Performance comparison and key metrics',
    icon: <Building2 className="w-5 h-5" />,
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'composition',
    title: 'Composition & Strength',
    description: 'Market cap distribution and stock analysis',
    icon: <PieChart className="w-5 h-5" />,
    color: 'from-green-500 to-emerald-500'
  },
  {
    id: 'fundamentals',
    title: 'Fundamentals & Health',
    description: 'Financial metrics and growth trends',
    icon: <DollarSign className="w-5 h-5" />,
    color: 'primary'
  },
  {
    id: 'technicals',
    title: 'Technicals & Momentum',
    description: 'Relative strength and money flow',
    icon: <Activity className="w-5 h-5" />,
    color: 'from-orange-500 to-red-500'
  },
  {
    id: 'sentiment',
    title: 'News & Sentiment',
    description: 'Analyst recommendations and news',
    icon: <Newspaper className="w-5 h-5" />,
    color: 'info'
  }
];

const SectorAnalysisDashboard: React.FC<SectorAnalysisDashboardProps> = ({ className }) => {
  // Use shared market data context - no API calls needed!
  const { sectors, allStocks, isLoading, getStocksBySector, period, setPeriod } = useMarketData();

  const [activeSection, setActiveSection] = useState<AnalysisSection>('overview');
  const [selectedSector, setSelectedSector] = useState<string>('Technology');
  const [sortBy, setSortBy] = useState<string>('marketCap');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Transform shared data into the format this dashboard expects
  const sectorsData: SectorData[] = sectors.map(sector => {
    // The sectors from MarketDataContext use 'name' property, not 'sector'
    const sectorName = sector.name || sector.sector || 'Unknown';
    // Use stocks from sector data directly - they already have weight and fundamentals!
    const stocks = sector.stocks || [];
    const totalMarketCap = sector.totalMarketCap || stocks.reduce((sum, s) => sum + (s.marketCap || 0), 0);
    const totalVolume = sector.totalVolume || stocks.reduce((sum, s) => sum + (s.volume || 0), 0);
    const avgChange = sector.avgChange || sector.changePercent || 0;

    // Calculate average fundamentals from stocks with valid data
    const validPE = stocks.filter(s => s.peRatio && s.peRatio > 0);
    const validBeta = stocks.filter(s => s.beta && s.beta > 0);
    const avgPE = validPE.length > 0
      ? validPE.reduce((sum, s) => sum + s.peRatio, 0) / validPE.length
      : 0;
    const avgBeta = validBeta.length > 0
      ? validBeta.reduce((sum, s) => sum + s.beta, 0) / validBeta.length
      : 0;

    return {
      name: sectorName,
      stocks: stocks as any[],
      totalMarketCap,
      avgChange,
      totalVolume,
      topGainer: sector.topGainer,
      topLoser: sector.topLoser,
      performance: avgChange,
      stockCount: sector.stockCount || stocks.length,
      avgPE,
      avgBeta,
      relativeStrength: avgChange > 0 ? Math.abs(avgChange) * 10 : 0,
      moneyFlow: totalVolume > 0 ? (totalVolume / 1000000) : 0,
      volatility: Math.abs(avgChange)
    };
  });

  const selectedSectorData = sectorsData.find(sector => sector.name === selectedSector);

  const formatCurrency = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value?.toFixed(2) || '0.00'}`;
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value?.toFixed(2) || '0.00'}%`;
  };

  const getCurrentSection = () => analysisSections.find(section => section.id === activeSection)!;

  // Render sector overview section
  const renderOverviewSection = () => {
    return (
      <div className="space-y-3">
        {/* Sector Selection */}
        <Card className="bg-white border-3 border-black rounded-2xl shadow-md">
          <CardHeader>
            <CardTitle className="text-[#1a1a1a] flex items-center gap-2.5">
              <Building2 className="w-5 h-5 text-playful-green" />
              Sector Selection & Performance ({sectorsData.length} sectors)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sectorsData.length === 0 ? (
              <div className="text-center py-2.5">
                <p className="text-[#3C3C3C]">
                  {isLoading ? '⏳ Loading sectors...' : ' No sectors found'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-10">
                {sectorsData.map((sector) => {
                  return (
                    <Button
                      key={sector.name}
                      variant={selectedSector === sector.name ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedSector(sector.name)}
                      className={cn(
                        "h-auto p-3 flex flex-col items-center gap-2.5",
                        selectedSector === sector.name
                          ? "bg-playful-green text-white border-3 border-black"
                          : "bg-playful-cream border-2 border-black hover:bg-white hover:border-playful-green"
                      )}
                    >
                      <span className="text-sm font-medium text-center">{sector.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "text-sm font-bold",
                          sector.avgChange >= 0 ? "text-green-400" : "text-red-400"
                        )}>
                          {formatPercent(sector.avgChange)}
                        </span>
                        {sector.avgChange >= 0 ? (
                          <TrendingUp className="w-3 h-3 text-green-400" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-red-400" />
                        )}
                      </div>
                      <Badge variant="secondary" className="text-sm">
                        {sector.stockCount} stocks
                      </Badge>
                    </Button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

      {/* Selected Sector Overview */}
      {selectedSectorData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <Card className="bg-white border-3 border-black rounded-2xl shadow-md">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#3C3C3C]">Total Market Cap</p>
                  <p className="text-sm font-bold text-green-400">
                    {formatCurrency(selectedSectorData.totalMarketCap)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-400/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-3 border-black rounded-2xl shadow-md">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#3C3C3C]">Avg Performance</p>
                  <p className={cn(
                    "text-sm font-bold",
                    selectedSectorData.avgChange >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {formatPercent(selectedSectorData.avgChange)}
                  </p>
                </div>
                {selectedSectorData.avgChange >= 0 ? (
                  <TrendingUp className="w-8 h-8 text-green-400/50" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-red-400/50" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-3 border-black rounded-2xl shadow-md">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#3C3C3C]">Top Gainer</p>
                  <p className="text-sm font-bold text-[#1a1a1a]">
                    {selectedSectorData.topGainer?.symbol.replace('x', '') || 'N/A'}
                  </p>
                  <p className="text-sm text-green-400">
                    {selectedSectorData.topGainer ? formatPercent(selectedSectorData.topGainer.changePercent) : 'N/A'}
                  </p>
                </div>
                <Star className="w-8 h-8 text-yellow-400/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-3 border-black rounded-2xl shadow-md">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#3C3C3C]">Total Volume</p>
                  <p className="text-sm font-bold text-playful-green">
                    {(selectedSectorData.totalVolume / 1e6).toFixed(1)}M
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-playful-green/50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    );
  };

  // Render active section content
  const renderActiveSection = () => {
    switch (activeSection) {
      case 'overview':
        return renderOverviewSection();
      case 'composition':
        return selectedSectorData ? (
          <SectorComposition
            sectorName={selectedSectorData.name}
            stocks={selectedSectorData.stocks}
            totalMarketCap={selectedSectorData.totalMarketCap}
          />
        ) : (
          <Card className="bg-white border-3 border-black rounded-2xl shadow-md">
            <CardContent className="p-3 text-center">
              <PieChart className="w-14 h-14 text-green-400 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-[#1a1a1a] mb-2">Select a Sector</h3>
              <p className="text-[#3C3C3C]">Choose a sector from the overview to see detailed composition</p>
            </CardContent>
          </Card>
        );
      case 'fundamentals':
        return selectedSectorData ? (
          <SectorFundamentals
            sectorName={selectedSectorData.name}
            stocks={selectedSectorData.stocks}
          />
        ) : (
          <Card className="bg-white border-3 border-black rounded-2xl shadow-md">
            <CardContent className="p-3 text-center">
              <DollarSign className="w-14 h-14 text-primary-400 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-[#1a1a1a] mb-2">Select a Sector</h3>
              <p className="text-[#3C3C3C]">Choose a sector from the overview to see fundamentals analysis</p>
            </CardContent>
          </Card>
        );
      case 'technicals':
        return selectedSectorData ? (
          <SectorTechnicals
            sectorName={selectedSectorData.name}
            stocks={selectedSectorData.stocks}
          />
        ) : (
          <Card className="bg-white border-3 border-black rounded-2xl shadow-md">
            <CardContent className="p-3 text-center">
              <Activity className="w-14 h-14 text-orange-400 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-[#1a1a1a] mb-2">Select a Sector</h3>
              <p className="text-[#3C3C3C]">Choose a sector from the overview to see technical analysis</p>
            </CardContent>
          </Card>
        );
      case 'sentiment':
        return selectedSectorData ? (
          <SectorSentiment
            sectorName={selectedSectorData.name}
            stocks={selectedSectorData.stocks}
          />
        ) : (
          <Card className="bg-white border-3 border-black rounded-2xl shadow-md">
            <CardContent className="p-3 text-center">
              <Newspaper className="w-14 h-14 text-playful-orange mx-auto mb-3" />
              <h3 className="text-sm font-bold text-[#1a1a1a] mb-2">Select a Sector</h3>
              <p className="text-[#3C3C3C]">Choose a sector from the overview to see sentiment analysis</p>
            </CardContent>
          </Card>
        );
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
          <h1 className="text-sm font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent mb-2">
            Sector & Industry Analysis
          </h1>
          <p className="text-sm text-[#1a1a1a]">
            Deep-dive sector analysis across {sectorsData.length} market sectors with comprehensive metrics
          </p>
        </motion.div>

        {/* Main Dashboard Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-card backdrop-blur-xl border border-black/10/50 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Card Header with Navigation */}
          <div className="bg-white/50 backdrop-blur-xl p-3 border-b border-black/10/30">
            <div className="flex items-center justify-between">
              {/* Active Section Info */}
              <div className="flex items-center gap-10">
                <div className={`w-10 h-10 bg-gradient-to-br ${currentSection.color} rounded-2xl flex items-center justify-center shadow-lg`}>
                  {currentSection.icon}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#1a1a1a]">{currentSection.title}</h2>
                  <p className="text-sm text-[#3C3C3C]">{currentSection.description}</p>
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center gap-10">
                {/* Period Selector */}
                <div className="flex items-center gap-1.5 bg-playful-cream border-2 border-black rounded-2xl p-1">
                  {['1d', '1w', '1mo', '3mo', 'ytd', '1y'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p as any)}
                      className={cn(
                        "px-3 py-1 text-sm font-medium rounded transition-all",
                        period === p
                          ? "bg-playful-green text-[#1a1a1a] shadow-lg"
                          : "text-[#1a1a1a] hover:text-[#1a1a1a] hover:bg-playful-cream"
                      )}
                    >
                      {p.toUpperCase()}
                    </button>
                  ))}
                </div>

                {isLoading && (
                  <div className="flex items-center gap-2.5 text-playful-green">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading...</span>
                  </div>
                )}
                <Badge variant="outline" className="text-playful-green border-blue-400/50">
                  <Calendar className="w-3 h-3 mr-1" />
                  Live Data
                </Badge>
              </div>
            </div>
          </div>

          {/* Section Navigation Tabs */}
          <div className="px-3 py-2.5 border-b border-black/10/30">
            <div className="flex gap-2.5 overflow-x-auto">
              {analysisSections.map((section) => (
                <Button
                  key={section.id}
                  variant={activeSection === section.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "flex items-center gap-2.5 whitespace-nowrap",
                    activeSection === section.id
                      ? `bg-gradient-to-r ${section.color} text-[#1a1a1a] shadow-lg`
                      : "bg-white border-2 border-black hover:bg-playful-cream"
                  )}
                >
                  {section.icon}
                  <span className="hidden md:inline">{section.title}</span>
                </Button>
              ))}
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
            Analyzing <span className="text-primary-400 font-semibold">{sectorsData.length}</span> market sectors
            • <span className="text-danger-400 font-semibold">{allStocks.length}</span> xStock symbols
            • <span className="text-playful-green font-semibold">5</span> analysis sections
            • <span className="text-cyan-400 font-semibold">Real-time</span> sector intelligence
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export { SectorAnalysisDashboard };