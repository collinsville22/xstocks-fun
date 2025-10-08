'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { GlassCard } from './ui/GlassCard';
import { cn } from '../../../lib/utils';
import { ENV } from '../../../config/env';
import {
  Newspaper,
  TrendingUp,
  Target,
  Star,
  BarChart3,
  Briefcase,
  Search,
  RefreshCw,
  ExternalLink,
  Calendar,
  DollarSign,
  Users,
  ThumbsUp,
  ThumbsDown,
  Minus
} from 'lucide-react';

interface AdvancedFeaturesProps {
  className?: string;
  loading?: boolean;
}

interface NewsArticle {
  title: string;
  url: string;
  time_published: string;
  authors: string[];
  summary: string;
  source: string;
  category_within_source: string;
  sentiment_score: number;
  sentiment_label: string;
  relevance_score: number;
}

interface CompanyOverview {
  symbol: string;
  name: string;
  description: string;
  sector: string;
  industry: string;
  marketCapitalization: number;
  peRatio: number;
  eps: number;
  analystTargetPrice: number;
  beta: number;
  dividendYield: number;
  week52High: number;
  week52Low: number;
}

interface FeatureData {
  news?: { articles: NewsArticle[]; sentiment: any };
  overview?: CompanyOverview;
  earnings?: any;
  technical?: any;
}

const SAMPLE_STOCKS = ['AAPLx', 'MSFTx', 'GOOGLx', 'NVDAx', 'TSLAx', 'AMZNx'];

const AdvancedFeaturesDisplay: React.FC<AdvancedFeaturesProps> = ({
  className,
  loading = false
}) => {
  const [selectedStock, setSelectedStock] = useState<string>('AAPLx');
  const [featureData, setFeatureData] = useState<FeatureData>({});
  const [activeFeature, setActiveFeature] = useState<'news' | 'overview' | 'earnings' | 'technical'>('news');
  const [isLoading, setIsLoading] = useState(false);

  const fetchAdvancedFeatures = async (symbol: string) => {
    if (!symbol) return;

    setIsLoading(true);
    try {
      const [newsResponse, overviewResponse, earningsResponse, technicalResponse] = await Promise.all([
        fetch(`${ENV.INTEL_API_URL}/api/market/news/${symbol}`).catch(() => null),
        fetch(`${ENV.INTEL_API_URL}/api/market/overview/${symbol}`).catch(() => null),
        fetch(`${ENV.INTEL_API_URL}/api/market/earnings/${symbol}`).catch(() => null),
        fetch(`${ENV.INTEL_API_URL}/api/market/technical/${symbol}`).catch(() => null)
      ]);

      const newFeatureData: FeatureData = {};

      if (newsResponse?.ok) {
        const newsData = await newsResponse.json();
        if (newsData.success) {
          newFeatureData.news = {
            articles: newsData.news || [],
            sentiment: newsData.sentiment || {}
          };
        }
      }

      if (overviewResponse?.ok) {
        const overviewData = await overviewResponse.json();
        if (overviewData.success) {
          newFeatureData.overview = overviewData.overview;
        }
      }

      if (earningsResponse?.ok) {
        const earningsData = await earningsResponse.json();
        if (earningsData.success) {
          newFeatureData.earnings = earningsData.earnings;
        }
      }

      if (technicalResponse?.ok) {
        const technicalData = await technicalResponse.json();
        if (technicalData.success) {
          newFeatureData.technical = technicalData.data;
        }
      }

      setFeatureData(newFeatureData);
    } catch (error) {
      console.error('Error fetching advanced features:', error);
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvancedFeatures(selectedStock);
  }, [selectedStock]);

  const getSentimentIcon = (label: string) => {
    switch (label?.toLowerCase()) {
      case 'positive': return <ThumbsUp className="w-4 h-4 text-green-400" />;
      case 'negative': return <ThumbsDown className="w-4 h-4 text-red-400" />;
      default: return <Minus className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getSentimentColor = (label: string) => {
    switch (label?.toLowerCase()) {
      case 'positive': return 'text-green-400 bg-green-400/20';
      case 'negative': return 'text-red-400 bg-red-400/20';
      default: return 'text-yellow-400 bg-yellow-400/20';
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value?.toFixed(2) || '0.00'}`;
  };

  const renderNewsSection = () => {
    const news = featureData.news;
    if (!news?.articles?.length) {
      return (
        <div className="text-center py-2.5">
          <Newspaper className="w-12 h-12 text-[#3C3C3C] mx-auto mb-3" />
          <p className="text-[#3C3C3C]">No news available</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {/* Sentiment Summary */}
        {news.sentiment && (
          <GlassCard className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-10">
                {getSentimentIcon(news.sentiment.overall_label)}
                <div>
                  <h3 className="font-semibold text-[#1a1a1a]">Market Sentiment</h3>
                  <p className="text-sm text-[#3C3C3C]">{news.sentiment.article_count} articles analyzed</p>
                </div>
              </div>
              <Badge className={cn('text-sm', getSentimentColor(news.sentiment.overall_label))}>
                {news.sentiment.overall_label} ({news.sentiment.overall_score?.toFixed(2)})
              </Badge>
            </div>
          </GlassCard>
        )}

        {/* News Articles */}
        <div className="space-y-3">
          {news.articles.slice(0, 5).map((article, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <GlassCard className="p-3 hover:border-blue-400/50 transition-all duration-300">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-[#1a1a1a] text-sm line-clamp-2 mb-1">
                      {article.title}
                    </h4>
                    <div className="flex items-center gap-2.5 text-sm text-[#3C3C3C] mb-2">
                      <span>{article.source}</span>
                      <span>•</span>
                      <span>{new Date(article.time_published).toLocaleDateString()}</span>
                      {getSentimentIcon(article.sentiment_label)}
                    </div>
                    <p className="text-sm text-[#1a1a1a] line-clamp-2">{article.summary}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-2"
                    onClick={() => window.open(article.url, '_blank')}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  const renderOverviewSection = () => {
    const overview = featureData.overview;
    if (!overview) {
      return (
        <div className="text-center py-2.5">
          <Briefcase className="w-12 h-12 text-[#3C3C3C] mx-auto mb-3" />
          <p className="text-[#3C3C3C]">No company overview available</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <GlassCard className="p-3">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-[#1a1a1a] mb-2">{overview.name}</h3>
            <div className="flex items-center gap-2.5 mb-3">
              <Badge variant="secondary" className="bg-blue-400/20 text-blue-400">
                {overview.sector}
              </Badge>
              <Badge variant="secondary" className="glass-card">
                {overview.industry}
              </Badge>
            </div>
            <p className="text-sm text-[#1a1a1a] line-clamp-3">{overview.description}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            <div className="text-center">
              <p className="text-sm font-bold text-green-400">
                {formatCurrency(overview.marketCapitalization)}
              </p>
              <p className="text-sm text-[#3C3C3C]">Market Cap</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-blue-400">
                {overview.peRatio?.toFixed(2) || 'N/A'}
              </p>
              <p className="text-sm text-[#3C3C3C]">P/E Ratio</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-primary-400">
                ${overview.eps?.toFixed(2) || 'N/A'}
              </p>
              <p className="text-sm text-[#3C3C3C]">EPS</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-orange-400">
                {overview.beta?.toFixed(2) || 'N/A'}
              </p>
              <p className="text-sm text-[#3C3C3C]">Beta</p>
            </div>
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <GlassCard className="p-3">
            <h4 className="font-semibold text-[#1a1a1a] mb-3 flex items-center gap-2.5">
              <Target className="w-4 h-4 text-blue-400" />
              Price Targets
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[#3C3C3C]">Analyst Target:</span>
                <span className="text-[#1a1a1a]">${overview.analystTargetPrice?.toFixed(2) || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#3C3C3C]">52W High:</span>
                <span className="text-green-400">${overview.week52High?.toFixed(2) || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#3C3C3C]">52W Low:</span>
                <span className="text-red-400">${overview.week52Low?.toFixed(2) || 'N/A'}</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-3">
            <h4 className="font-semibold text-[#1a1a1a] mb-3 flex items-center gap-2.5">
              <DollarSign className="w-4 h-4 text-green-400" />
              Dividends & Returns
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[#3C3C3C]">Dividend Yield:</span>
                <span className="text-green-400">{overview.dividendYield ? (overview.dividendYield * 100).toFixed(2) : '0.00'}%</span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  };

  const renderActiveFeature = () => {
    switch (activeFeature) {
      case 'news':
        return renderNewsSection();
      case 'overview':
        return renderOverviewSection();
      case 'earnings':
        return (
          <div className="text-center py-2.5">
            <Calendar className="w-12 h-12 text-[#3C3C3C] mx-auto mb-3" />
            <p className="text-[#3C3C3C]">Earnings data will be displayed here</p>
          </div>
        );
      case 'technical':
        return (
          <div className="text-center py-2.5">
            <BarChart3 className="w-12 h-12 text-[#3C3C3C] mx-auto mb-3" />
            <p className="text-[#3C3C3C]">Technical analysis will be displayed here</p>
          </div>
        );
      default:
        return null;
    }
  };

  const features = [
    { id: 'news', label: 'Market News', icon: Newspaper, color: 'from-blue-500 to-cyan-500' },
    { id: 'overview', label: 'Company Overview', icon: Briefcase, color: 'primary' },
    { id: 'earnings', label: 'Earnings', icon: Calendar, color: 'from-green-500 to-emerald-500' },
    { id: 'technical', label: 'Technical Analysis', icon: BarChart3, color: 'from-orange-500 to-red-500' }
  ];

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-playful-green/5 via-blue-500/5 to-cyan-500/5 opacity-50" />

      <CardHeader className="relative z-10 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="w-8 h-8 bg-gradient-to-br from-playful-green to-cyan-500 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-[#1a1a1a]" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Advanced Market Intelligence
              </CardTitle>
              <p className="text-sm text-[#3C3C3C]">Premium features powered by Alpha Vantage</p>
            </div>
          </div>

          {(loading || isLoading) && (
            <RefreshCw className="w-5 h-5 text-[#3C3C3C] animate-spin" />
          )}
        </div>
      </CardHeader>

      <CardContent className="relative z-10 p-3">
        {/* Stock Selector */}
        <div className="mb-3">
          <label className="text-sm font-medium text-[#1a1a1a] mb-2 block">Select Stock</label>
          <div className="flex flex-wrap gap-2.5">
            {SAMPLE_STOCKS.map((stock) => (
              <Button
                key={stock}
                size="sm"
                variant={selectedStock === stock ? "default" : "outline"}
                onClick={() => setSelectedStock(stock)}
                className={cn(
                  "text-sm",
                  selectedStock === stock
                    ? "bg-gradient-to-r from-playful-green to-cyan-500 text-[#1a1a1a]"
                    : "glass-card text-[#1a1a1a] hover:bg-gray-700/50"
                )}
              >
                {stock.replace('x', '')}
              </Button>
            ))}
          </div>
        </div>

        {/* Feature Tabs */}
        <div className="mb-3">
          <div className="flex flex-wrap gap-2.5">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Button
                  key={feature.id}
                  size="sm"
                  variant={activeFeature === feature.id ? "default" : "outline"}
                  onClick={() => setActiveFeature(feature.id as any)}
                  className={cn(
                    "text-sm flex items-center gap-2.5",
                    activeFeature === feature.id
                      ? `bg-gradient-to-r ${feature.color} text-[#1a1a1a]`
                      : "glass-card text-[#1a1a1a] hover:bg-gray-700/50"
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {feature.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Active Feature Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeFeature}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="min-h-[300px]"
          >
            {renderActiveFeature()}
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export { AdvancedFeaturesDisplay };