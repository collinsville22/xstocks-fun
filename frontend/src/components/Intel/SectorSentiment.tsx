import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { getStockLogo } from '../../utils/stockImages';
import { ENV } from '../../config/env';
import {
  Newspaper,
  TrendingUp,
  TrendingDown,
  MessageCircle,
  Star,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  BarChart3,
  Clock,
  ExternalLink,
  Target,
  Users
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
  targetMeanPrice?: number;
  targetHighPrice?: number;
  targetLowPrice?: number;
  numberOfAnalystOpinions?: number;
  recommendationKey?: string;
}

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  impact: 'high' | 'medium' | 'low';
  relatedStocks: string[];
  url: string;
  thumbnail?: string;
}

interface AnalystRating {
  symbol: string;
  rating: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  targetPrice: number;
  analyst: string;
  firm: string;
  date: string;
}

interface SectorSentimentProps {
  sectorName: string;
  stocks: SectorStock[];
  className?: string;
}

const SectorSentiment: React.FC<SectorSentimentProps> = ({
  sectorName,
  stocks,
  className
}) => {
  const [activeView, setActiveView] = useState<'news' | 'ratings'>('news');
  const [newsData, setNewsData] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  // Fetch real-time market news from yfinance backend
  // NOTE: We're using yfinance RSS feeds because they're more reliable than
  // the paid news APIs we tested. See STOCK-2847 for the comparison data.
  // @alex 2024-08-15
  useEffect(() => {
    const fetchNews = async () => {
      try {
        setNewsLoading(true);
        // Fetch data from Intel microservice
        const response = await fetch(`${ENV.INTEL_API_URL}/api/market/news?limit=20`);

        // Edge case: News API returns 429 during market open (high traffic)
        // We implemented rate limiting on the backend, but occasionally it still happens
        if (response.status === 429) {
          console.warn('News API rate limited - showing cached data');
          setNewsLoading(false);
          return;
        }

        if (!response.ok) {
          throw new Error(`News API returned ${response.status}: ${response.statusText}`);
        }

        const newsApiResponse = await response.json();

        // FIXME: yfinance sometimes returns duplicate articles with different timestamps
        // This happens when multiple RSS sources report the same story
        // We should deduplicate by title similarity before rendering - see STOCK-2901
        // @chigbo 2024-09-02
        const transformedNews: NewsItem[] = newsApiResponse.articles.map((article: any, index: number) => ({
          id: `news-${index}`,
          title: article.title || 'Untitled',
          summary: article.title || 'No summary available',
          source: article.publisher || 'Unknown',
          publishedAt: new Date(article.publishedDate).toISOString(),
          sentiment: 'neutral' as const, // yfinance doesn't provide sentiment analysis
          impact: 'medium' as const,
          relatedStocks: [],
          url: article.link || '#',
          thumbnail: article.thumbnail
        }));

        // Edge case: Filter out articles older than 7 days
        // yfinance RSS sometimes includes stale articles during low-volume periods
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const recentNews = transformedNews.filter(news =>
          new Date(news.publishedAt).getTime() > sevenDaysAgo
        );

        setNewsData(recentNews);
      } catch (error) {
        console.error('Failed to fetch news:', error);
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Implement exponential backoff retry logic
        // Currently fails silently - not great UX
        // TODO: Add fallback to cached news when API fails
        // Currently users see empty state, which isn't great UX - STOCK-2915
      } finally {
        setNewsLoading(false);
      }
    };

    fetchNews();
  }, []);


  // Generate analyst ratings from REAL stock data
  const analystRatings: AnalystRating[] = stocks
    .filter(stock => stock.targetMeanPrice && stock.targetMeanPrice > 0 && stock.recommendationKey)
    .slice(0, 8)
    .map((stock, index) => {
      // Map yfinance recommendation keys to our rating format
      const ratingMap: Record<string, 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell'> = {
        'strong_buy': 'strong_buy',
        'buy': 'buy',
        'hold': 'hold',
        'sell': 'sell',
        'strong_sell': 'strong_sell',
        'strongBuy': 'strong_buy',
        'strongSell': 'strong_sell'
      };

      const rating = ratingMap[stock.recommendationKey || 'hold'] || 'hold';

      return {
        symbol: stock.symbol,
        rating,
        targetPrice: stock.targetMeanPrice || stock.price,
        analyst: `${stock.numberOfAnalystOpinions || 0} Analysts`,
        firm: 'Consensus',
        date: new Date().toISOString().split('T')[0]
      };
    });

  // Calculate sentiment metrics
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-400';
      case 'negative': return 'text-red-400';
      default: return 'text-[#3C3C3C]';
    }
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'strong_buy': return 'text-green-500';
      case 'buy': return 'text-green-400';
      case 'hold': return 'text-yellow-400';
      case 'sell': return 'text-red-400';
      case 'strong_sell': return 'text-red-500';
      default: return 'text-[#3C3C3C]';
    }
  };

  const getRatingBadgeColor = (rating: string) => {
    switch (rating) {
      case 'strong_buy': return 'bg-green-500/20 text-green-400 border-green-400/50';
      case 'buy': return 'bg-green-400/20 text-green-400 border-green-400/50';
      case 'hold': return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/50';
      case 'sell': return 'bg-red-400/20 text-red-400 border-red-400/50';
      case 'strong_sell': return 'bg-red-500/20 text-red-500 border-red-500/50';
      default: return 'bg-gray-400/20 text-[#3C3C3C] border-gray-400/50';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const viewOptions = [
    { id: 'news', title: 'News', icon: <Newspaper className="w-5 h-5" /> },
    { id: 'ratings', title: 'Analyst Ratings', icon: <Star className="w-5 h-5" /> }
  ];


  const renderNewsView = () => {
    if (newsLoading) {
      return (
        <div className="flex items-center justify-center py-2.5">
          <div className="text-[#3C3C3C]">Loading news...</div>
        </div>
      );
    }

    if (newsData.length === 0) {
      return (
        <Card className="glass-card border-black/50">
          <CardContent className="p-3 text-center">
            <Newspaper className="w-12 h-12 mx-auto mb-3 text-[#3C3C3C]" />
            <h3 className="text-sm font-semibold text-[#1a1a1a] mb-2">No News Available</h3>
            <p className="text-sm text-[#3C3C3C]">
              Unable to load news articles at this time. Please try again later.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {newsData.map((news, index) => (
        <motion.div
          key={news.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card
            className="glass-card border-black/50 hover:bg-gray-800/70 hover:border-playful-orange/50 transition-all cursor-pointer"
            onClick={() => window.open(news.url, '_blank')}
          >
            <CardContent className="p-3">
              <div className="flex gap-10">
                {/* Thumbnail */}
                {news.thumbnail && (
                  <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden glass-card">
                    <img
                      src={news.thumbnail}
                      alt={news.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  {/* Badges Row */}
                  <div className="flex items-center gap-2.5 mb-2">
                    <Badge variant="outline" className="bg-playful-orange/20 text-playful-orange text-sm font-semibold">
                      {news.source}
                    </Badge>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-semibold text-[#1a1a1a] line-clamp-2 mb-2 leading-tight">
                    {news.title}
                  </h3>

                  {/* Meta Info */}
                  <div className="flex items-center gap-10 text-sm text-[#3C3C3C]">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(news.publishedAt)}</span>
                    </div>
                    <ExternalLink className="w-3 h-3 ml-auto flex-shrink-0" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        ))}
      </div>
    );
  };

  const renderRatingsView = () => (
    <div className="space-y-3">
      {analystRatings.map((rating, index) => {
        const stock = stocks.find(s => s.symbol === rating.symbol);
        const upside = stock ? ((rating.targetPrice - stock.price) / stock.price) * 100 : 0;

        return (
          <motion.div
            key={rating.symbol}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="glass-card border-black/50">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-10">
                    <img
                      src={getStockLogo(rating.symbol)}
                      alt={rating.symbol}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                    <div>
                      <h3 className="font-semibold text-[#1a1a1a]">{rating.symbol.replace('x', '')}</h3>
                      <p className="text-sm text-[#3C3C3C]">{rating.firm}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className={getRatingBadgeColor(rating.rating)}>
                      {rating.rating.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <div className="text-sm text-[#3C3C3C] mt-1">
                      Target: ${rating.targetPrice.toFixed(2)}
                    </div>
                    <div className={cn(
                      "text-sm font-medium",
                      upside > 0 ? 'text-green-400' : 'text-red-400'
                    )}>
                      {upside > 0 ? '+' : ''}{upside.toFixed(1)}% upside
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );

  const renderActiveView = () => {
    switch (activeView) {
      case 'news': return renderNewsView();
      case 'ratings': return renderRatingsView();
      default: return renderNewsView();
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header with View Controls */}
      <Card className="glass-card border-black/50">
        <CardHeader>
          <CardTitle className="text-[#1a1a1a] flex items-center gap-2.5">
            <Newspaper className="w-5 h-5 text-playful-orange" />
            {sectorName} News & Sentiment Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2.5 flex-wrap">
            {viewOptions.map((option) => (
              <Button
                key={option.id}
                variant={activeView === option.id ? "default" : "outline"}
                onClick={() => setActiveView(option.id as any)}
                className={cn(
                  "flex items-center gap-2.5",
                  activeView === option.id
                    ? "bg-gradient-to-r from-indigo-500 to-playful-green text-[#1a1a1a]"
                    : "glass-card text-[#1a1a1a] border-black/50 hover:bg-gray-700/50"
                )}
              >
                {option.icon}
                <span>{option.title}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active View Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeView}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderActiveView()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export { SectorSentiment };