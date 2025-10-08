'use client';

import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { StockTooltip } from './ui/StockTooltip';
import { cn } from '../../../lib/utils';
import { TrendingUp, TrendingDown, BarChart3, RefreshCw } from 'lucide-react';

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

interface MarketHeatmapProps {
  data: StockData[];
  timePeriod: '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y';
  onTimePeriodChange: (period: '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y') => void;
  onStockClick: (symbol: string) => void;
  loading?: boolean;
  className?: string;
}

interface HeatmapNode extends d3.HierarchyRectangularNode<StockData> {
  x: number;
  y: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  data: StockData;
}

const MarketHeatmap: React.FC<MarketHeatmapProps> = React.memo(({
  data,
  timePeriod,
  onTimePeriodChange,
  onStockClick,
  loading = false,
  className
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = React.useState<{
    visible: boolean;
    x: number;
    y: number;
    data: StockData | null;
  }>({ visible: false, x: 0, y: 0, data: null });

  const timePeriods = [
    { value: '1D', label: '1 Day' },
    { value: '1W', label: '1 Week' },
    { value: '1M', label: '1 Month' },
    { value: '3M', label: '3 Months' },
    { value: 'YTD', label: 'YTD' },
    { value: '1Y', label: '1 Year' }
  ] as const;

  const getColorScale = useCallback((min: number, max: number) => {
    return d3.scaleSequential()
      .domain([min, max])
      .interpolator(d3.interpolateRdYlGn);
  }, []);

  const formatCurrency = useCallback((value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  }, []);

  const formatNumber = useCallback((value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toString();
  }, []);

  const drawHeatmap = useCallback(() => {
    if (!svgRef.current || !containerRef.current || data.length === 0) return;

    const container = containerRef.current;
    const svg = d3.select(svgRef.current);
    const width = container.clientWidth;
    const height = container.clientHeight;

    svg.selectAll('*').remove();

    const g = svg.append('g');

    const root = d3.treemap<StockData>()
      .size([width, height])
      .padding(1)
      .paddingInner(1)
      .paddingOuter(2)
      .round(true)(
        d3.hierarchy({ children: data })
          .sum(d => d.marketCap)
          .sort((a, b) => (b.value || 0) - (a.value || 0))
      );

    const colorScale = getColorScale(
      d3.min(data, d => d.changePercent) || 0,
      d3.max(data, d => d.changePercent) || 0
    );

    const leaf = g.selectAll('g')
      .data(root.leaves())
      .join('g')
      .attr('transform', d => `translate(${d.x0},${d.y0})`)
      .style('cursor', 'pointer');

    leaf.append('rect')
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .attr('rx', 4)
      .attr('fill', d => colorScale(d.data.changePercent))
      .attr('stroke', '#1f2937')
      .attr('stroke-width', 1)
      .style('opacity', 0.9)
      .on('mouseover', function(event, d) {
        d3.select(this).style('opacity', 1).attr('stroke-width', 2);
        setTooltip({
          visible: true,
          x: event.pageX,
          y: event.pageY,
          data: d.data
        });
      })
      .on('mousemove', function(event, d) {
        setTooltip(prev => ({
          ...prev,
          x: event.pageX,
          y: event.pageY
        }));
      })
      .on('mouseout', function() {
        d3.select(this).style('opacity', 0.9).attr('stroke-width', 1);
        setTooltip({
          visible: false,
          x: 0,
          y: 0,
          data: null
        });
      })
      .on('click', (event, d) => {
        onStockClick(d.data.symbol);
      });

    leaf.append('text')
      .attr('x', 4)
      .attr('y', 20)
      .text(d => d.data.symbol)
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', '#ffffff')
      .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.8)')
      .style('pointer-events', 'none');

    leaf.append('text')
      .attr('x', 4)
      .attr('y', 38)
      .text(d => `${d.data.changePercent >= 0 ? '+' : ''}${d.data.changePercent.toFixed(2)}%`)
      .attr('font-size', '12px')
      .attr('fill', '#ffffff')
      .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.8)')
      .style('pointer-events', 'none');

    leaf.append('text')
      .attr('x', 4)
      .attr('y', d => (d.y1 - d.y0) - 10)
      .text(d => formatCurrency(d.data.marketCap))
      .attr('font-size', '11px')
      .attr('fill', '#e5e7eb')
      .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.8)')
      .style('pointer-events', 'none');

  }, [data, getColorScale, formatCurrency, onStockClick]);

  useEffect(() => {
    drawHeatmap();
  }, [drawHeatmap]);

  useEffect(() => {
    const handleResize = () => {
      drawHeatmap();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawHeatmap]);

  const stats = useMemo(() => {
    if (data.length === 0) return null;

    const totalMarketCap = data.reduce((sum, stock) => sum + stock.marketCap, 0);
    const gainers = data.filter(stock => stock.changePercent > 0).length;
    const losers = data.filter(stock => stock.changePercent < 0).length;
    const avgChange = data.reduce((sum, stock) => sum + stock.changePercent, 0) / data.length;

    return {
      totalMarketCap,
      gainers,
      losers,
      avgChange
    };
  }, [data]);

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-playful-green/5 to-pink-500/5 opacity-50" />

      <CardHeader className="relative z-10 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-playful-green rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-[#1a1a1a]" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Market Heatmap
              </CardTitle>
              <p className="text-sm text-[#3C3C3C]">Real-time market cap visualization</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {loading && (
              <RefreshCw className="w-4 h-4 text-[#3C3C3C] animate-spin" />
            )}
            <div className="flex gap-1.5 p-1 glass-card rounded-lg">
              {timePeriods.map((period) => (
                <Button
                  key={period.value}
                  variant={timePeriod === period.value ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onTimePeriodChange(period.value)}
                  className={cn(
                    'h-8 px-3 text-sm font-medium transition-all duration-200',
                    timePeriod === period.value
                      ? 'bg-gradient-to-r from-primary-500/20 to-primary-600/20 backdrop-blur-md border border-primary-500/30 text-[#1a1a1a] shadow-lg'
                      : 'text-[#3C3C3C] hover:text-[#1a1a1a] hover:bg-gray-700/50'
                  )}
                >
                  {period.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {stats && (
          <div className="flex gap-10 mt-3">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm text-[#1a1a1a]">
                {stats.gainers} gainers
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              <span className="text-sm text-[#1a1a1a]">
                {stats.losers} losers
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-sm text-[#1a1a1a]">
                Avg: {stats.avgChange.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-sm text-[#1a1a1a]">
                Total MCap: {formatCurrency(stats.totalMarketCap)}
              </span>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="relative z-10 p-0">
        <div
          ref={containerRef}
          className="w-full h-[700px] relative"
        >
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            className="bg-gray-900/20 rounded-lg"
          />

          {data.length === 0 && !loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-[#3C3C3C] mx-auto mb-3" />
                <p className="text-[#3C3C3C]">No market data available</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <AnimatePresence>
        {tooltip.visible && tooltip.data && (
          <StockTooltip
            visible={true}
            x={tooltip.x}
            y={tooltip.y}
            data={tooltip.data}
          />
        )}
      </AnimatePresence>
    </Card>
  );
});

MarketHeatmap.displayName = 'MarketHeatmap';

export { MarketHeatmap };