import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  Building2,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  Loader2,
  CheckCircle,
  XCircle,
  DollarSign
} from 'lucide-react';
import { EarningsSurprises } from './EarningsSurprises';
import { NewsHeadlines } from './NewsHeadlines';
import { ENV } from '../../config/env';

interface EarningsAnalystDataProps {
  symbol: string;
  className?: string;
}

// Data interfaces
interface EarningsData {
  symbol: string;
  quarterlyEarnings: Array<{
    date: string;
    revenue: number | null;
    earnings: number | null;
  }>;
  annualEarnings: Array<{
    year: string;
    revenue: number | null;
    earnings: number | null;
  }>;
  earningsInfo: {
    trailingEps: number | null;
    forwardEps: number | null;
    earningsGrowth: number | null;
    trailingPE: number | null;
  };
  earningsSurprises: Array<{
    quarter: string;
    epsActual: number;
    epsEstimate: number;
    surprisePercent: number;
    beat: boolean;
  }>;
  timestamp: number;
}

interface AnalystData {
  symbol: string;
  priceTargets: {
    current: number | null;
    targetHigh: number | null;
    targetLow: number | null;
    targetMean: number | null;
    numberOfAnalysts: number | null;
  };
  recommendations: Array<{
    date: string;
    firm: string;
    toGrade: string;
    fromGrade: string;
    action: string;
  }>;
  recommendationTrend: {
    recommendationKey: string | null;
    recommendationMean: number | null;
  };
  upgradesDowngrades: Array<{
    date: string;
    firm: string;
    toGrade: string;
    action: string;
  }>;
  timestamp: number;
}

interface OwnershipData {
  symbol: string;
  institutionalHolders: Array<{
    holder: string;
    shares: number;
    percentOut: number;
    value: number;
  }>;
  ownershipSummary: {
    heldPercentInsiders: number | null;
    heldPercentInstitutions: number | null;
    shortPercentOfFloat: number | null;
  };
  timestamp: number;
}

/**
 * Earnings & Analyst Data Component - Phase 4.1 Week 3
 * Comprehensive earnings history, analyst ratings, and ownership data
 */
export const EarningsAnalystData: React.FC<EarningsAnalystDataProps> = ({
  symbol,
  className = ''
}) => {
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null);
  const [analystData, setAnalystData] = useState<AnalystData | null>(null);
  const [ownershipData, setOwnershipData] = useState<OwnershipData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
 console.log(' EarningsAnalystData useEffect triggered:', { symbol });
    fetchAllData();
  }, [symbol]);

  const fetchAllData = async () => {
 console.log('🟢 EarningsAnalystData fetching data:', { symbol });
    setIsLoading(true);
    setError(null);

    try {
      // Add timestamp to force cache refresh when period changes (these endpoints don't vary by period but we refresh the view)
      const timestamp = Date.now();
 console.log(' EarningsAnalystData API calls with timestamp:', timestamp);

      // Fetch all three endpoints in parallel
      const [earningsRes, analystRes, ownershipRes] = await Promise.all([
        fetch(`${ENV.INTEL_API_URL}/api/earnings/${symbol}?_t=${timestamp}`),
        fetch(`${ENV.INTEL_API_URL}/api/analysts/${symbol}?_t=${timestamp}`),
        fetch(`${ENV.INTEL_API_URL}/api/ownership/${symbol}?_t=${timestamp}`)
      ]);

      if (!earningsRes.ok || !analystRes.ok || !ownershipRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [earnings, analyst, ownership] = await Promise.all([
        earningsRes.json(),
        analystRes.json(),
        ownershipRes.json()
      ]);

      setEarningsData(earnings);
      setAnalystData(analyst);
      setOwnershipData(ownership);
    } catch (err) {
 console.error('Error fetching earnings/analyst data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper functions
  const formatCurrency = (num: number | null, compact: boolean = true): string => {
    if (num === null || num === undefined) return 'N/A';

    if (compact) {
      if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
      if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
      if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
      return `$${num.toFixed(2)}`;
    }

    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercent = (num: number | null): string => {
    if (num === null || num === undefined) return 'N/A';
    return `${(num * 100).toFixed(2)}%`;
  };

  const getRecommendationColor = (key: string | null): string => {
    if (!key) return 'text-[#3C3C3C]';
    if (key === 'strong_buy' || key === 'buy') return 'text-playful-green';
    if (key === 'hold') return 'text-yellow-400';
    if (key === 'sell' || key === 'strong_sell') return 'text-red-500';
    return 'text-[#3C3C3C]';
  };

  const getRecommendationLabel = (key: string | null): string => {
    if (!key) return 'N/A';
    return key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getUpsidePercent = (current: number | null, target: number | null): string => {
    if (!current || !target) return 'N/A';
    const upside = ((target - current) / current) * 100;
    return upside >= 0 ? `+${upside.toFixed(1)}%` : `${upside.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <Card className={`bg-white border-3 border-black rounded-2xl shadow-md border-2 border-black ${className}`}>
        <CardContent className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-10">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="text-[#3C3C3C]">Loading earnings & analyst data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`bg-white border-3 border-black rounded-2xl shadow-md border-2 border-black ${className}`}>
        <CardContent className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-10">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <span className="text-red-500">{error}</span>
            <button
              onClick={fetchAllData}
              className="mt-2 px-3 py-2.5 text-sm bg-blue-600 text-[#1a1a1a] rounded hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Earnings Summary */}
      {earningsData && (
        <Card className="bg-white border-3 border-black rounded-2xl shadow-md border-2 border-black">
          <CardHeader>
            <CardTitle className="text-sm text-[#1a1a1a] flex items-center gap-10">
              <TrendingUp className="w-6 h-6 text-playful-green" />
              Earnings Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-3">
              <div className="bg-playful-cream p-3 rounded-2xl border border-2 border-black">
                <div className="text-sm text-[#3C3C3C] mb-1">EPS (TTM)</div>
                <div className="text-sm font-bold text-[#1a1a1a]">
                  {formatCurrency(earningsData?.earningsInfo?.trailingEps, false)}
                </div>
                <div className="text-sm text-[#3C3C3C]">Trailing 12 months</div>
              </div>
              <div className="bg-playful-cream p-3 rounded-2xl border border-2 border-black">
                <div className="text-sm text-[#3C3C3C] mb-1">Forward EPS</div>
                <div className="text-sm font-bold text-[#1a1a1a]">
                  {formatCurrency(earningsData?.earningsInfo?.forwardEps, false)}
                </div>
                <div className="text-sm text-[#3C3C3C]">Next 12 months</div>
              </div>
              <div className="bg-playful-cream p-3 rounded-2xl border border-2 border-black">
                <div className="text-sm text-[#3C3C3C] mb-1">Earnings Growth</div>
                <div className={`text-sm font-bold ${
                  earningsData?.earningsInfo?.earningsGrowth && earningsData.earningsInfo.earningsGrowth > 0
                    ? 'text-playful-green'
                    : 'text-red-500'
                }`}>
                  {formatPercent(earningsData?.earningsInfo?.earningsGrowth)}
                </div>
                <div className="text-sm text-[#3C3C3C]">Year over year</div>
              </div>
              <div className="bg-playful-cream p-3 rounded-2xl border border-2 border-black">
                <div className="text-sm text-[#3C3C3C] mb-1">P/E Ratio</div>
                <div className="text-sm font-bold text-[#1a1a1a]">
                  {earningsData?.earningsInfo?.trailingPE?.toFixed(2) || 'N/A'}
                </div>
                <div className="text-sm text-[#3C3C3C]">Price to earnings</div>
              </div>
            </div>

            {/* Quarterly Earnings */}
            {earningsData?.quarterlyEarnings && earningsData.quarterlyEarnings.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-[#1a1a1a] mb-3">Quarterly Earnings History</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-black/10">
                        <th className="text-left py-2 px-3 text-[#3C3C3C]">Quarter</th>
                        <th className="text-right py-2 px-3 text-[#3C3C3C]">Revenue</th>
                        <th className="text-right py-2 px-3 text-[#3C3C3C]">Earnings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {earningsData.quarterlyEarnings.slice(0, 4).map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-800 hover:bg-white border-3 border-black rounded-2xl shadow-md">
                          <td className="py-2 px-3 text-[#1a1a1a]">{item.date}</td>
                          <td className="py-2 px-3 text-right text-[#1a1a1a]">
                            {formatCurrency(item.revenue)}
                          </td>
                          <td className="py-2 px-3 text-right text-[#1a1a1a]">
                            {formatCurrency(item.earnings)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Earnings Surprises */}
      {earningsData && earningsData.earningsSurprises && earningsData.earningsSurprises.length > 0 && (
        <EarningsSurprises surprises={earningsData.earningsSurprises} />
      )}

      {/* Analyst Ratings & Price Targets */}
      {analystData && (
        <Card className="bg-white border-3 border-black rounded-2xl shadow-md border-2 border-black">
          <CardHeader>
            <CardTitle className="text-sm text-[#1a1a1a] flex items-center gap-10">
              <Target className="w-6 h-6 text-playful-green" />
              Analyst Ratings & Price Targets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Price Targets */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-[#1a1a1a]">Price Targets</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-playful-cream p-3 rounded-2xl">
                    <span className="text-[#3C3C3C]">Current Price</span>
                    <span className="text-sm font-bold text-[#1a1a1a]">
                      {formatCurrency(analystData.priceTargets.current, false)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-playful-cream p-3 rounded-2xl">
                    <span className="text-[#3C3C3C]">Mean Target</span>
                    <div className="text-right">
                      <div className="text-sm font-bold text-playful-green">
                        {formatCurrency(analystData.priceTargets.targetMean, false)}
                      </div>
                      <div className={`text-sm ${
                        getUpsidePercent(analystData.priceTargets.current, analystData.priceTargets.targetMean).startsWith('+')
                          ? 'text-playful-green'
                          : 'text-red-500'
                      }`}>
                        {getUpsidePercent(analystData.priceTargets.current, analystData.priceTargets.targetMean)} upside
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-10">
                    <div className="bg-playful-cream p-3 rounded-2xl">
                      <div className="text-sm text-[#3C3C3C] mb-1">High Target</div>
                      <div className="text-sm font-bold text-playful-green">
                        {formatCurrency(analystData.priceTargets.targetHigh, false)}
                      </div>
                    </div>
                    <div className="bg-playful-cream p-3 rounded-2xl">
                      <div className="text-sm text-[#3C3C3C] mb-1">Low Target</div>
                      <div className="text-sm font-bold text-red-500">
                        {formatCurrency(analystData.priceTargets.targetLow, false)}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-[#3C3C3C] text-center">
                    Based on {analystData.priceTargets.numberOfAnalysts || 'N/A'} analysts
                  </div>
                </div>
              </div>

              {/* Recommendation */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-[#1a1a1a]">Consensus Recommendation</h4>
                <div className="flex flex-col items-center justify-center bg-playful-cream p-3 rounded-2xl h-full">
                  <div className={`text-sm font-bold mb-2 ${
                    getRecommendationColor(analystData.recommendationTrend.recommendationKey)
                  }`}>
                    {getRecommendationLabel(analystData.recommendationTrend.recommendationKey)}
                  </div>
                  <div className="text-[#3C3C3C] text-sm">
                    Rating: {analystData.recommendationTrend.recommendationMean?.toFixed(2) || 'N/A'} / 5.0
                  </div>
                  <div className="mt-3 w-full">
                    <div className="flex justify-between text-sm text-[#3C3C3C] mb-1">
                      <span>Strong Buy</span>
                      <span>Strong Sell</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                        style={{
                          width: analystData.recommendationTrend.recommendationMean
                            ? `${(analystData.recommendationTrend.recommendationMean / 5) * 100}%`
                            : '50%'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Upgrades/Downgrades */}
            {analystData?.upgradesDowngrades && analystData.upgradesDowngrades.length > 0 && (
              <div className="mt-3">
                <h4 className="text-sm font-semibold text-[#1a1a1a] mb-3">Recent Upgrades/Downgrades</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {analystData.upgradesDowngrades.slice(0, 10).map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-playful-cream p-3 rounded-2xl hover:bg-white border-3 border-black rounded-2xl shadow-md transition-colors"
                    >
                      <div className="flex items-center gap-10">
                        {item.action === 'up' ? (
                          <ArrowUp className="w-4 h-4 text-playful-green" />
                        ) : item.action === 'down' ? (
                          <ArrowDown className="w-4 h-4 text-red-500" />
                        ) : (
                          <div className="w-4 h-4" />
                        )}
                        <div>
                          <div className="text-[#1a1a1a] font-medium">{item.firm}</div>
                          <div className="text-sm text-[#3C3C3C]">{item.date}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant="outline"
                          className={`${
                            item.action === 'up'
                              ? 'border-green-400/50 text-playful-green'
                              : item.action === 'down'
                              ? 'border-red-400/50 text-red-500'
                              : 'border-gray-400/50 text-[#3C3C3C]'
                          }`}
                        >
                          {item.toGrade || item.action}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ownership Data */}
      {ownershipData && (
        <Card className="bg-white border-3 border-black rounded-2xl shadow-md border-2 border-black">
          <CardHeader>
            <CardTitle className="text-sm text-[#1a1a1a] flex items-center gap-10">
              <Users className="w-6 h-6 text-primary-400" />
              Ownership & Short Interest
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Ownership Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-3">
              <div className="bg-playful-cream p-3 rounded-2xl border border-2 border-black">
                <div className="text-sm text-[#3C3C3C] mb-1">Insider Ownership</div>
                <div className="text-sm font-bold text-primary-400">
                  {formatPercent(ownershipData.ownershipSummary.heldPercentInsiders)}
                </div>
                <div className="text-sm text-[#3C3C3C]">% held by insiders</div>
              </div>
              <div className="bg-playful-cream p-3 rounded-2xl border border-2 border-black">
                <div className="text-sm text-[#3C3C3C] mb-1">Institutional Ownership</div>
                <div className="text-sm font-bold text-playful-green">
                  {formatPercent(ownershipData.ownershipSummary.heldPercentInstitutions)}
                </div>
                <div className="text-sm text-[#3C3C3C]">% held by institutions</div>
              </div>
              <div className="bg-playful-cream p-3 rounded-2xl border border-2 border-black">
                <div className="text-sm text-[#3C3C3C] mb-1">Short Interest</div>
                <div className="text-sm font-bold text-orange-400">
                  {formatPercent(ownershipData.ownershipSummary.shortPercentOfFloat)}
                </div>
                <div className="text-sm text-[#3C3C3C]">% of float shorted</div>
              </div>
            </div>

            {/* Top Institutional Holders */}
            {ownershipData.institutionalHolders.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-[#1a1a1a] mb-3">Top Institutional Holders</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-black/10">
                        <th className="text-left py-2 px-3 text-[#3C3C3C]">Institution</th>
                        <th className="text-right py-2 px-3 text-[#3C3C3C]">Shares</th>
                        <th className="text-right py-2 px-3 text-[#3C3C3C]">% Out</th>
                        <th className="text-right py-2 px-3 text-[#3C3C3C]">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ownershipData.institutionalHolders.slice(0, 5).map((holder, idx) => (
                        <tr key={idx} className="border-b border-gray-800 hover:bg-white border-3 border-black rounded-2xl shadow-md">
                          <td className="py-2 px-3 text-[#1a1a1a]">{holder.holder}</td>
                          <td className="py-2 px-3 text-right text-[#1a1a1a]">
                            {holder.shares.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-right text-[#1a1a1a]">
                            {holder.percentOut.toFixed(2)}%
                          </td>
                          <td className="py-2 px-3 text-right text-[#1a1a1a]">
                            {formatCurrency(holder.value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Data timestamp */}
      <div className="text-sm text-[#3C3C3C] text-center">
        Data updated: {new Date(earningsData?.timestamp || Date.now()).toLocaleString()}
      </div>
    </div>
  );
};

export default EarningsAnalystData;