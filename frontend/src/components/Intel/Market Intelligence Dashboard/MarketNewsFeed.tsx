'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { GlassCard } from './ui/GlassCard';
import { cn } from '../../../lib/utils';
import { Newspaper, RefreshCw, ExternalLink, Calendar, TrendingUp } from 'lucide-react';
import { ENV } from '../../../config/env';

interface NewsArticle {
  symbol: string;
  title: string;
  publisher: string;
  link: string;
  publishedDate: number;
  type: 'STORY' | 'VIDEO' | 'PRESS_RELEASE';
  thumbnail?: string;
}

interface NewsResponse {
  success: boolean;
  articles: NewsArticle[];
  totalCount: number;
}

interface MarketNewsFeedProps {
  limit?: number;
  className?: string;
  onArticleClick?: (article: NewsArticle) => void;
}

const MarketNewsFeed: React.FC<MarketNewsFeedProps> = React.memo(({
  limit = 20,
  className,
  onArticleClick
}) => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchNews = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Fetch data from Intel microservice

      const response = await fetch(`${ENV.INTEL_API_URL}/api/market/news?limit=${limit}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch news: ${response.statusText}`);
      }

      const data: NewsResponse = await response.json();

      if (data.success) {
        setArticles(data.articles);
        setTotalCount(data.totalCount);
      } else {
        throw new Error('API returned success: false');
      }
    } catch (err) {
      console.error('Error fetching market news:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch market news');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [limit]);

  // Initial fetch on mount
  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // Auto-refresh every 10 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNews(true);
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, [fetchNews]);

  const handleRefresh = () => {
    fetchNews(true);
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    // Recent articles (less than 24 hours)
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes < 1 ? 'Just now' : `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    }

    // Format as "Jan 15, 2025"
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'VIDEO':
        return 'bg-playful-green/20 text-primary-400';
      case 'PRESS_RELEASE':
        return 'bg-cyan-400/20 text-cyan-400';
      default: // STORY
        return 'bg-white border-2 border-black text-[#1a1a1a]';
    }
  };

  const handleArticleClick = (article: NewsArticle) => {
    onArticleClick?.(article);
    window.open(article.link, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-50" />

      <CardHeader className="relative z-10 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center">
              <Newspaper className="w-5 h-5 text-[#1a1a1a]" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Market News Feed
              </CardTitle>
              <p className="text-sm text-[#3C3C3C]">
                {loading ? 'Loading...' : `${totalCount} articles available`}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="hover:bg-playful-cream"
          >
            <RefreshCw className={cn(
              'w-5 h-5 text-[#3C3C3C]',
              refreshing && 'animate-spin'
            )} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 p-3">
        {loading && articles.length === 0 ? (
          <div className="flex items-center justify-center py-2.5">
            <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-2.5">
            <Newspaper className="w-12 h-12 text-[#3C3C3C] mx-auto mb-3" />
            <p className="text-red-400 mb-2">Error loading news</p>
            <p className="text-sm text-[#3C3C3C]">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="mt-3"
            >
              Try Again
            </Button>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-2.5">
            <Newspaper className="w-12 h-12 text-[#3C3C3C] mx-auto mb-3" />
            <p className="text-[#3C3C3C]">No news available</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
            <AnimatePresence mode="popLayout">
              {articles.map((article, idx) => (
                <motion.div
                  key={`${article.symbol}-${article.publishedDate}-${idx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: idx * 0.05, duration: 0.3 }}
                >
                  <GlassCard
                    className={cn(
                      'p-3 cursor-pointer transition-all duration-300',
                      'hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-400/10'
                    )}
                    onClick={() => handleArticleClick(article)}
                  >
                    <div className="flex gap-10">
                      {/* Thumbnail */}
                      {article.thumbnail && (
                        <div className="flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden bg-playful-cream border-2 border-black">
                          <img
                            src={article.thumbnail}
                            alt={article.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Badges Row */}
                        <div className="flex items-center gap-2.5 mb-2">
                          <Badge
                            variant="outline"
                            className="bg-blue-400/20 text-blue-400 text-sm font-semibold"
                          >
                            {article.symbol}x
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn('text-sm', getTypeColor(article.type))}
                          >
                            {article.type.replace('_', ' ')}
                          </Badge>
                        </div>

                        {/* Title */}
                        <h3 className="text-sm font-semibold text-[#1a1a1a] line-clamp-2 mb-2 leading-tight">
                          {article.title}
                        </h3>

                        {/* Meta Info */}
                        <div className="flex items-center gap-10 text-sm text-[#3C3C3C]">
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-3 h-3" />
                            <span className="truncate max-w-[120px]">{article.publisher}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(article.publishedDate)}</span>
                          </div>
                          <ExternalLink className="w-3 h-3 ml-auto flex-shrink-0" />
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

MarketNewsFeed.displayName = 'MarketNewsFeed';

export { MarketNewsFeed };