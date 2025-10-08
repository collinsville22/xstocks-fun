import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MarketDataProvider } from '../../contexts/MarketDataContext';
import { MarketIntelligenceDashboard } from './MarketIntelligenceDashboard';
import { SectorAnalysisDashboard } from './SectorAnalysisDashboard';
import { AdvancedStockScreener } from './AdvancedStockScreener';
import RealIndividualStockAnalysis from './RealIndividualStockAnalysis';
import QuantitativeAnalyticsTools from './QuantitativeAnalyticsTools';
import { PortfolioManagementDashboard } from './PortfolioManagementDashboard';
import { OptionsAnalysisDashboard } from './OptionsAnalysisDashboard';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  TrendingUp,
  Building2,
  BarChart3,
  Activity,
  Globe,
  Star,
  Filter,
  Search,
  PieChart,
  Calculator
} from 'lucide-react';

// Dashboard types and configuration
type DashboardType = 'market' | 'sector' | 'screener' | 'analysis' | 'quantitative' | 'portfolio' | 'options';

interface DashboardConfig {
  id: DashboardType;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  badge?: string;
}

const dashboards: DashboardConfig[] = [
  {
    id: 'market',
    title: 'Market Intelligence',
    description: '63 xStock heatmap with indices, sectors & movers',
    icon: <TrendingUp className="w-5 h-5" />,
    color: 'primary',
    badge: 'Real-time'
  },
  {
    id: 'sector',
    title: 'Sector Analysis',
    description: 'Comprehensive sector & industry breakdown',
    icon: <Building2 className="w-5 h-5" />,
    color: 'success',
    badge: 'New'
  },
  {
    id: 'screener',
    title: 'Advanced Screener',
    description: 'Multi-criteria stock screening with visualization',
    icon: <Filter className="w-5 h-5" />,
    color: 'info',
    badge: 'Latest'
  },
  {
    id: 'analysis',
    title: 'Stock Analysis',
    description: 'Real-time individual stock analysis with live data',
    icon: <Search className="w-5 h-5" />,
    color: 'warning',
    badge: 'LIVE'
  },
  {
    id: 'quantitative',
    title: 'Quantitative Analytics',
    description: 'Professional quant tools with real mathematical models',
    icon: <Activity className="w-5 h-5" />,
    color: 'primary',
    badge: 'QUANT'
  },
  {
    id: 'portfolio',
    title: 'Portfolio Management',
    description: 'Real portfolio analysis, rebalancing & optimization',
    icon: <PieChart className="w-5 h-5" />,
    color: 'success',
    badge: 'LIVE'
  },
  {
    id: 'options',
    title: 'Options Analysis',
    description: 'Professional options analytics with Greeks & IV surface',
    icon: <Calculator className="w-5 h-5" />,
    color: 'danger',
    badge: 'NEW'
  }
];

const IntelPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [activeDashboard, setActiveDashboard] = useState<DashboardType>('market');

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <div className="w-14 h-14 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <h2 className="text-sm font-bold font-display text-[#1a1a1a] mb-2">Intel Dashboard</h2>
          <p className="text-[#3C3C3C]">Initializing market intelligence...</p>
        </motion.div>
      </div>
    );
  }

  const getCurrentDashboard = () => dashboards.find(dashboard => dashboard.id === activeDashboard)!;

  const renderActiveDashboard = () => {
    switch (activeDashboard) {
      case 'market':
        return <MarketIntelligenceDashboard />;
      case 'sector':
        return <SectorAnalysisDashboard />;
      case 'screener':
        return <AdvancedStockScreener />;
      case 'analysis':
        return <RealIndividualStockAnalysis />;
      case 'quantitative':
        return <QuantitativeAnalyticsTools />;
      case 'portfolio':
        return <PortfolioManagementDashboard />;
      case 'options':
        return <OptionsAnalysisDashboard />;
      default:
        return <MarketIntelligenceDashboard />;
    }
  };

  return (
    <MarketDataProvider>
      <div className="min-h-screen relative">
      <div className="container mx-auto px-3 py-2.5 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-3"
        >
          <div className="text-center mb-3">
            <h1 className="text-sm md:text-sm font-bold font-display text-[#1a1a1a] mb-2">
              Intel Dashboard
            </h1>
            <p className="text-sm text-[#3C3C3C] font-body font-medium">
              Advanced market intelligence for 63 xStocks tokens
            </p>
          </div>

          {/* Compact Dashboard Navigation */}
          <div className="flex items-center justify-center gap-2.5 flex-wrap px-3">
            {dashboards.map((dashboard) => {
              const colorClasses = {
                primary: 'from-primary-500/20 to-primary-600/20 border-primary-500/30',
                success: 'from-success-500/20 to-success-600/20 border-success-500/30',
                info: 'from-info-500/20 to-info-600/20 border-info-500/30',
                warning: 'from-warning-500/20 to-warning-600/20 border-warning-500/30',
                danger: 'from-danger-500/20 to-danger-600/20 border-danger-500/30',
              };

              return (
                <button
                  key={dashboard.id}
                  onClick={() => setActiveDashboard(dashboard.id)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-2xl transition-all duration-200 whitespace-nowrap border-2 font-display font-semibold",
                    activeDashboard === dashboard.id
                      ? "bg-playful-green text-white border-black shadow-lg scale-105"
                      : "bg-white/80 text-[#1a1a1a] border-black/20 hover:bg-white hover:scale-105"
                  )}
                >
                  <div className="w-5 h-5 flex items-center justify-center">
                    {dashboard.icon}
                  </div>
                  <span className="text-sm">{dashboard.title}</span>
                  {dashboard.badge && (
                    <span
                      className={cn(
                        "text-sm h-5 px-2 py-0.5 rounded-full font-display font-semibold",
                        activeDashboard === dashboard.id
                          ? "bg-white/20 text-white"
                          : "bg-playful-orange/20 text-playful-orange border border-playful-orange/30"
                      )}
                    >
                      {dashboard.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Active Dashboard Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeDashboard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            {renderActiveDashboard()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
    </MarketDataProvider>
  );
};

export default IntelPage;