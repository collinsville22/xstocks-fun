import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Badge } from '../ui/badge';
import { ExternalLink, Newspaper, Clock, Loader2, AlertCircle, Calendar, TrendingUp, RefreshCw } from 'lucide-react';
import { getStockLogo } from '../../utils/stockImages';
import { cn } from '../../lib/utils';
import { ENV } from '../../config/env';

interface NewsArticle {
  title: string;
  publisher: string;
  link: string;
  publishedDate: number | null;
  type: string;
  thumbnail: string | null;
}

interface NewsHeadlinesProps {
  symbol: string;
}

export const NewsHeadlines: React.FC<NewsHeadlinesProps> = ({ symbol }) => {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNews();
  }, [symbol]);

  const fetchNews = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const timestamp = Date.now();
      // Fetch data from Intel microservice
      const response = await fetch(`${ENV.INTEL_API_URL}/api/news/${symbol}?_t=${timestamp}`);

      if (!response.ok) {
        throw new Error('Failed to fetch news data');
      }

      const apiResponse = await response.json();
      setNews(apiResponse.news || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load news');
      console.error('Error fetching news:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchNews(true);
  };

  const formatDate = (timestamp: number | null): string => {
    if (!timestamp) return 'Unknown date';

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes < 1 ? 'Just now' : `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTypeColor = (type: string) => {
    switch (type.toUpperCase()) {
      case 'VIDEO':
        return 'bg-playful-green/20 text-primary-400';
      case 'PRESS_RELEASE':
        return 'bg-cyan-400/20 text-cyan-400';
      default:
        return 'bg-white border-3 border-black rounded-2xl shadow-md text-[#1a1a1a]';
    }
  };

  return (
    <Card className="relative overflow-hidden bg-white border-3 border-black">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-50" />

      <CardHeader className="relative z-10 pb-4 border-b-2 border-black">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-10">
            <img
              src={getStockLogo(symbol)}
              alt={symbol}
              className="w-8 h-8 rounded-2xl object-cover"
            />
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center">
              <Newspaper className="w-5 h-5 text-[#1a1a1a]" />
            </div>
            <div>
              <h3 className="text-sm font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Recent News
              </h3>
              <p className="text-sm text-[#3C3C3C]">
                {isLoading ? 'Loading...' : `${news.length} articles for ${symbol}`}
              </p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing || isLoading}
            className="hover:bg-playful-cream p-2 rounded-2xl transition-colors"
          >
            <RefreshCw className={cn(
              'w-5 h-5 text-[#3C3C3C]',
              refreshing && 'animate-spin'
            )} />
          </button>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 p-3">
        {isLoading && news.length === 0 ? (
          <div className="flex items-center justify-center py-2.5">
            <RefreshCw className="w-8 h-8 text-playful-green animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-2.5">
            <Newspaper className="w-12 h-12 text-[#3C3C3C] mx-auto mb-3" />
            <p className="text-red-500 mb-2">Error loading news</p>
            <p className="text-sm text-[#3C3C3C]">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-3 px-3 py-2.5 bg-playful-green hover:bg-playful-orange text-white border-2 border-black rounded-2xl transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-2.5">
            <Newspaper className="w-12 h-12 text-[#3C3C3C] mx-auto mb-3" />
            <p className="text-[#3C3C3C]">No news available</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-playful-cream">
            <AnimatePresence mode="popLayout">
              {news.map((article, idx) => (
                <motion.div
                  key={`${symbol}-${article.publishedDate}-${idx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: idx * 0.05, duration: 0.3 }}
                >
                  <div
                    className={cn(
                      'p-3 cursor-pointer transition-all duration-300 bg-white border-2 border-black rounded-2xl',
                      'hover:bg-playful-cream hover:border-playful-green'
                    )}
                    onClick={() => window.open(article.link, '_blank', 'noopener,noreferrer')}
                  >
                    <div className="flex gap-10">
                      {article.thumbnail && (
                        <div className="flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden bg-white border-3 border-black rounded-2xl shadow-md">
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

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-2">
                          <Badge
                            variant="outline"
                            className="bg-playful-green/20 text-playful-green border-2 border-black text-sm font-semibold"
                          >
                            {symbol}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn('text-sm', getTypeColor(article.type))}
                          >
                            {article.type.replace('_', ' ')}
                          </Badge>
                        </div>

                        <h3 className="text-sm font-semibold text-[#1a1a1a] line-clamp-2 mb-2 leading-tight">
                          {article.title}
                        </h3>

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
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
};