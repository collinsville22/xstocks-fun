import React, { useState, useEffect } from 'react';
import { Token } from '../../types';
import { usePriceHistory } from '../../hooks/usePriceHistory';
import { ENV } from '../../config/env';

interface TokenInfoPanelProps {
  token: Token | null;
  currentPrice: number | null;
}

interface CompanyInfo {
  sector?: string;
  industry?: string;
  country?: string;
  fullTimeEmployees?: number;
  longBusinessSummary?: string;
}

interface PricePoint {
  time: number;
  value: number;
}

interface TokenMetadata {
  mcap?: number;
  holderCount?: number;
  volumeChange?: {
    '24h'?: {
      buyVolume?: number;
      sellVolume?: number;
    };
  };
}

export const TokenInfoPanel: React.FC<TokenInfoPanelProps> = ({ token, currentPrice }) => {
  const [activeTab, setActiveTab] = useState<'chart' | 'info'>('chart');
  const [metadata, setMetadata] = useState<TokenMetadata | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [historicalData, setHistoricalData] = useState<PricePoint[]>([]);
  const priceHistory = usePriceHistory(token?.mint || null, currentPrice);

  useEffect(() => {
    if (!token) return;

    const fetchMetadata = async () => {
      setLoading(true);
      try {
        // Fetch from Jupiter Token API v2
        const response = await fetch(`https://lite-api.jup.ag/tokens/v2/search?query=${token.mint}`);
        const data = await response.json();

        if (data && data.length > 0) {
          const tokenData = data[0];
          setMetadata({
            mcap: tokenData.mcap,
            holderCount: tokenData.holderCount,
            volumeChange: {
              '24h': {
                buyVolume: tokenData.stats24h?.buyVolume || 0,
                sellVolume: tokenData.stats24h?.sellVolume || 0
              }
            }
          });
        }
      } catch (error) {
        console.error('Error fetching token metadata:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [token?.mint]);

  // Fetch historical price data from DexScreener (free, no auth required)
  useEffect(() => {
    if (!token) return;

    const fetchHistoricalData = async () => {
      try {
        // Use DexScreener API - simpler and no auth required
        const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${token.mint}`);

        if (response.ok) {
          const data = await response.json();
          console.log('DexScreener API response:', data);

          if (data && data.pairs && data.pairs.length > 0) {
            const pair = data.pairs[0];

            // DexScreener provides priceChange data for different timeframes
            // We'll create a simple chart using available price points
            const now = Date.now();
            const currentPrice = parseFloat(pair.priceUsd || '0');

            if (currentPrice > 0) {
              // Generate chart points using price change percentages
              const chartData: PricePoint[] = [];

              // Calculate prices for different timeframes based on price changes
              const priceChange24h = pair.priceChange?.h24 || 0;
              const priceChange6h = pair.priceChange?.h6 || 0;
              const priceChange1h = pair.priceChange?.h1 || 0;

              const price24hAgo = currentPrice / (1 + priceChange24h / 100);
              const price6hAgo = currentPrice / (1 + priceChange6h / 100);
              const price1hAgo = currentPrice / (1 + priceChange1h / 100);

              // Create data points
              chartData.push({ time: now - 24 * 60 * 60 * 1000, value: price24hAgo });
              chartData.push({ time: now - 6 * 60 * 60 * 1000, value: price6hAgo });
              chartData.push({ time: now - 1 * 60 * 60 * 1000, value: price1hAgo });
              chartData.push({ time: now, value: currentPrice });

              console.log(`DexScreener chart data created: ${chartData.length} points for ${token.symbol}`);
              setHistoricalData(chartData);
            }
          } else {
            console.log('No pairs found in DexScreener response for', token.symbol);
          }
        } else {
          console.error('DexScreener API error:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error fetching historical data:', error);
      }
    };

    fetchHistoricalData();
  }, [token?.mint]);

  // Fetch company info from Intel API
  useEffect(() => {
    if (!token) return;

    const fetchCompanyInfo = async () => {
      try {
        // Extract stock symbol from token symbol (remove 'x' prefix)
        const stockSymbol = token.symbol.startsWith('x') || token.symbol.startsWith('X')
          ? token.symbol.substring(1)
          : token.symbol;

        const response = await fetch(`${ENV.INTEL_API_URL}/api/fundamentals/${stockSymbol}`);

        if (response.ok) {
          const data = await response.json();
          setCompanyInfo(data.companyInfo);
        }
      } catch (error) {
        console.error('Error fetching company info:', error);
      }
    };

    fetchCompanyInfo();
  }, [token?.symbol]);

  if (!token) return null;

  const volume24h = metadata?.volumeChange?.['24h']
    ? (metadata.volumeChange['24h'].buyVolume || 0) + (metadata.volumeChange['24h'].sellVolume || 0)
    : 0;

  // Use historical data from Birdeye
  const displayData = historicalData;

  // Calculate min/max for chart scaling
  const prices = displayData.length > 0 ? displayData.map(p => p.value) : [0];
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  return (
    <div className="bg-white/90 border-4 border-black rounded-[32px] p-3 shadow-2xl">
      {/* Tabs */}
      <div className="flex gap-2.5 mb-3">
        <button
          onClick={() => setActiveTab('chart')}
          className={`flex-1 py-2 px-3 rounded-xl font-display font-bold text-xs transition-all duration-200 border-2 ${
            activeTab === 'chart'
              ? 'bg-playful-green text-white border-black'
              : 'bg-white text-[#5C5C5C] border-black/20 hover:bg-gray-50'
          }`}
        >
          CHART
        </button>
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 py-2 px-3 rounded-xl font-display font-bold text-xs transition-all duration-200 border-2 ${
            activeTab === 'info'
              ? 'bg-playful-green text-white border-black'
              : 'bg-white text-[#5C5C5C] border-black/20 hover:bg-gray-50'
          }`}
        >
          INFO
        </button>
      </div>

      {activeTab === 'chart' ? (
        <div>
          {/* Token Header */}
          <div className="flex items-center gap-10 mb-3 bg-white/50 rounded-2xl p-3 border-2 border-black/10">
            <div className="w-12 h-12 rounded-xl border-2 border-black/20 overflow-hidden flex-shrink-0 bg-white">
              <img
                src={token.logo}
                alt={token.symbol}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <div className="text-xs font-display font-bold text-[#2C2C2C]">{token.symbol}</div>
              <div className="text-xs text-[#5C5C5C] font-body">{token.name}</div>
            </div>
          </div>

          {/* Price Chart */}
          <div className="bg-[#F5F5F5] rounded-2xl p-3 h-36 relative mb-3">
            {displayData.length >= 2 ? (
              <svg className="w-full h-full" preserveAspectRatio="none">
                <polyline
                  points={displayData
                    .map((point, i) => {
                      const x = (i / (displayData.length - 1)) * 100;
                      const y = 100 - ((point.value - minPrice) / priceRange) * 100;
                      return `${x},${y}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke="#7EC850"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            ) : (
              <div className="flex items-center justify-center h-full text-[#ACACAC] text-xs font-body">
                {loading ? 'Loading chart data...' : `Price data collecting... ${displayData.length} points`}
              </div>
            )}
          </div>

          {/* Price Info */}
          <div className="mb-3 pb-4 border-b border-[#E5E5E5]">
            <div className="text-xs text-[#5C5C5C] font-body mb-1">Current Price</div>
            <div className="text-xs font-display font-bold text-[#2C2C2C]">
              ${currentPrice?.toFixed(6) || '-'}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-10">
            <div className="bg-[#FFF5E6] border-2 border-[#FFB84D] rounded-2xl p-3">
              <div className="text-xs text-[#5C5C5C] font-body mb-1">Market Cap</div>
              <div className="text-xs font-display font-bold text-[#2C2C2C]">
                {metadata?.mcap ? `$${(metadata.mcap / 1000000).toFixed(1)}M` : '-'}
              </div>
            </div>
            <div className="bg-[#E6F3FF] border-2 border-[#4D9FFF] rounded-2xl p-3">
              <div className="text-xs text-[#5C5C5C] font-body mb-1">Holders</div>
              <div className="text-xs font-display font-bold text-[#2C2C2C]">
                {metadata?.holderCount?.toLocaleString() || '-'}
              </div>
            </div>
            <div className="bg-[#FFF9E6] border-2 border-[#FFD24D] rounded-2xl p-3">
              <div className="text-xs text-[#5C5C5C] font-body mb-1">24h Vol</div>
              <div className="text-xs font-display font-bold text-[#2C2C2C]">
                {volume24h ? `$${(volume24h / 1000000).toFixed(1)}M` : '-'}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {companyInfo ? (
            <>
              {/* Company Badges */}
              <div className="grid grid-cols-2 gap-10">
                <div className="bg-[#E6F3FF] border-2 border-[#4D9FFF] rounded-2xl p-3">
                  <div className="text-xs text-[#5C5C5C] font-body mb-1">Sector</div>
                  <div className="text-xs font-display font-semibold text-[#2C2C2C]">
                    {companyInfo.sector || 'N/A'}
                  </div>
                </div>
                <div className="bg-[#FFF5E6] border-2 border-[#FFB84D] rounded-2xl p-3">
                  <div className="text-xs text-[#5C5C5C] font-body mb-1">Industry</div>
                  <div className="text-xs font-display font-semibold text-[#2C2C2C]">
                    {companyInfo.industry || 'N/A'}
                  </div>
                </div>
                <div className="bg-[#E6FFF3] border-2 border-[#4DFFB8] rounded-2xl p-3">
                  <div className="text-xs text-[#5C5C5C] font-body mb-1">Country</div>
                  <div className="text-xs font-display font-semibold text-[#2C2C2C]">
                    {companyInfo.country || 'N/A'}
                  </div>
                </div>
                <div className="bg-[#FFF9E6] border-2 border-[#FFD24D] rounded-2xl p-3">
                  <div className="text-xs text-[#5C5C5C] font-body mb-1">Employees</div>
                  <div className="text-xs font-display font-semibold text-[#2C2C2C]">
                    {companyInfo.fullTimeEmployees?.toLocaleString() || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Business Summary */}
              {companyInfo.longBusinessSummary && (
                <div className="bg-white/50 rounded-2xl p-3 border-2 border-black/10">
                  <div className="text-xs text-[#5C5C5C] font-body mb-2">About</div>
                  <p className="text-xs text-[#2C2C2C] leading-relaxed">
                    {companyInfo.longBusinessSummary.substring(0, 300)}
                    {companyInfo.longBusinessSummary.length > 300 && '...'}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center py-2.5 text-[#ACACAC] text-xs font-body">
              {loading ? 'Loading company info...' : 'No company data available'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
