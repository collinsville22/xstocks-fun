import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { TrendingUp, TrendingDown, Minus, DollarSign, BarChart3, Clock } from 'lucide-react';
import { cn } from '../../../../lib/utils';

interface StockTooltipProps {
  data: {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    marketCap: number;
    sector?: string;
  };
  visible: boolean;
  x: number;
  y: number;
  className?: string;
}

const StockTooltip: React.FC<StockTooltipProps> = ({
  data,
  visible,
  x,
  y,
  className
}) => {
  const formatCurrency = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatNumber = (value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toString();
  };

  const changeColor = useMemo(() => {
    if (data.changePercent > 5) return 'text-green-400';
    if (data.changePercent > 2) return 'text-emerald-300';
    if (data.changePercent > 0) return 'text-green-300';
    if (data.changePercent > -2) return 'text-red-300';
    if (data.changePercent > -5) return 'text-orange-400';
    return 'text-red-400';
  }, [data.changePercent]);

  const changeIcon = useMemo(() => {
    if (data.changePercent > 0.1) return TrendingUp;
    if (data.changePercent < -0.1) return TrendingDown;
    return Minus;
  }, [data.changePercent]);

  const ChangeIcon = changeIcon;

  const positionStyle = useMemo(() => {
    const tooltipWidth = 280;
    const tooltipHeight = 200;
    const margin = 20;

    let left = x + margin;
    let top = y + margin;

    // Prevent overflow from viewport
    if (left + tooltipWidth > window.innerWidth - margin) {
      left = x - tooltipWidth - margin;
    }

    if (top + tooltipHeight > window.innerHeight - margin) {
      top = y - tooltipHeight - margin;
    }

    return {
      left: Math.max(margin, left),
      top: Math.max(margin, top)
    };
  }, [x, y]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={cn('fixed z-50 pointer-events-none', className)}
          style={positionStyle}
          initial={{ opacity: 0, scale: 0.8, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {/* Glow effect */}
          <div
            className="absolute inset-0 blur-2xl opacity-50"
            style={{
              background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, rgba(147, 51, 234, 0.1) 100%)'
            }}
          />

          {/* Main tooltip */}
          <Card className="relative backdrop-blur-xl bg-black/90 border border-black/10/50 shadow-2xl overflow-hidden">
            {/* Animated gradient border */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-playful-green/20 to-pink-500/20 animate-pulse" />
            <div className="absolute inset-[1px] bg-black rounded-lg" />

            <CardContent className="relative p-3 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <h3 className="text-sm font-bold text-white">
                    {data.symbol}
                  </h3>
                  {data.sector && (
                    <Badge variant="secondary" className="text-sm bg-gray-800 text-gray-300">
                      {data.sector}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-gray-300 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  Live
                </div>
              </div>

              {/* Company name */}
              <p className="text-sm text-gray-200 font-medium">
                {data.name}
              </p>

              {/* Price */}
              <div className="flex items-baseline gap-2.5">
                <span className="text-sm font-bold text-white">
                  ${data.price.toFixed(2)}
                </span>
                <div className={cn('flex items-center gap-1.5', changeColor)}>
                  <ChangeIcon className="w-4 h-4" />
                  <span className="font-semibold">
                    {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)}
                  </span>
                  <span className="text-sm">
                    ({data.changePercent >= 0 ? '+' : ''}{data.changePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-10 pt-2 border-t border-white/10">
                <div className="flex items-center gap-2.5">
                  <DollarSign className="w-4 h-4 text-cyan-400" />
                  <div>
                    <p className="text-sm text-gray-400">Market Cap</p>
                    <p className="text-sm font-semibold text-white">
                      {formatCurrency(data.marketCap)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <BarChart3 className="w-4 h-4 text-primary-400" />
                  <div>
                    <p className="text-sm text-gray-400">Volume</p>
                    <p className="text-sm font-semibold text-white">
                      {formatNumber(data.volume)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Mini sparkline (would be real data in production) */}
              <div className="h-8 bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded flex items-center justify-center">
                <div className="text-sm text-gray-400">Real-time chart</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export { StockTooltip };