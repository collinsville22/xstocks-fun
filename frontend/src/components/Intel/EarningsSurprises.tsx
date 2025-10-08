import React from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { TrendingUp, TrendingDown, Target } from 'lucide-react';

interface EarningsSurprise {
  quarter: string;
  epsActual: number;
  epsEstimate: number;
  surprisePercent: number;
  beat: boolean;
}

interface EarningsSurprisesProps {
  surprises: EarningsSurprise[];
}

export const EarningsSurprises: React.FC<EarningsSurprisesProps> = ({ surprises }) => {
  // Calculate statistics
  const totalSurprises = surprises.length;
  const beatsCount = surprises.filter(s => s.beat).length;
  const missesCount = totalSurprises - beatsCount;
  const beatRate = totalSurprises > 0 ? (beatsCount / totalSurprises) * 100 : 0;
  const avgSurprise = totalSurprises > 0
    ? surprises.reduce((sum, s) => sum + s.surprisePercent, 0) / totalSurprises
    : 0;

  // Format percentage
  const formatPercent = (num: number): string => {
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  // Get color based on surprise
  const getSurpriseColor = (surprise: number): string => {
    if (surprise > 5) return 'text-green-500';
    if (surprise > 0) return 'text-playful-green';
    if (surprise < -5) return 'text-red-500';
    if (surprise < 0) return 'text-red-500';
    return 'text-[#3C3C3C]';
  };

  // Get bar height for visualization (normalized to 100px max)
  const getBarHeight = (surprise: number): number => {
    const maxSurprise = Math.max(...surprises.map(s => Math.abs(s.surprisePercent)));
    if (maxSurprise === 0) return 0;
    return (Math.abs(surprise) / maxSurprise) * 80; // Max 80px
  };

  if (!surprises || surprises.length === 0) {
    return (
      <Card className="bg-white border-3 border-black">
        <CardHeader className="border-b border-3 border-black">
          <h3 className="text-sm font-semibold text-[#1a1a1a]">Earnings Surprises</h3>
        </CardHeader>
        <CardContent className="p-3">
          <div className="text-center text-[#3C3C3C] py-2.5">
            Earnings surprise data not available for this stock
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-3 border-black">
      <CardHeader className="border-b border-3 border-black">
        <h3 className="text-sm font-semibold text-[#1a1a1a]">Earnings Surprises</h3>
        <p className="text-sm text-[#3C3C3C] mt-1">
          Historical earnings beat/miss performance
        </p>
      </CardHeader>

      <CardContent className="p-3">
        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-3">
          <div className="bg-playful-cream p-3 rounded-2xl border-2 border-black">
            <div className="text-sm text-[#3C3C3C] mb-1">Beat Rate</div>
            <div className={`text-sm font-bold ${beatRate >= 50 ? 'text-playful-green' : 'text-red-500'}`}>
              {beatRate.toFixed(1)}%
            </div>
            <div className="text-sm text-[#3C3C3C] mt-1">
              {beatsCount} beats, {missesCount} misses
            </div>
          </div>

          <div className="bg-playful-cream p-3 rounded-2xl border-2 border-black">
            <div className="text-sm text-[#3C3C3C] mb-1">Avg Surprise</div>
            <div className={`text-sm font-bold ${getSurpriseColor(avgSurprise)}`}>
              {formatPercent(avgSurprise)}
            </div>
            <div className="text-sm text-[#3C3C3C] mt-1">
              Last {totalSurprises} quarters
            </div>
          </div>

          <div className="bg-playful-cream p-3 rounded-2xl border-2 border-black">
            <div className="text-sm text-[#3C3C3C] mb-1">Consistency</div>
            <div className={`text-sm font-bold ${beatRate >= 75 ? 'text-playful-green' : beatRate >= 50 ? 'text-playful-orange' : 'text-red-500'}`}>
              {beatRate >= 75 ? 'High' : beatRate >= 50 ? 'Medium' : 'Low'}
            </div>
            <div className="text-sm text-[#3C3C3C] mt-1">
              {beatRate >= 75 ? 'Very consistent' : beatRate >= 50 ? 'Moderately consistent' : 'Inconsistent'}
            </div>
          </div>

          <div className="bg-playful-cream p-3 rounded-2xl border-2 border-black">
            <div className="text-sm text-[#3C3C3C] mb-1">Latest Result</div>
            <div className={`text-sm font-bold ${surprises[0]?.beat ? 'text-playful-green' : 'text-red-500'}`}>
              {surprises[0]?.beat ? 'Beat' : 'Miss'}
            </div>
            <div className="text-sm text-[#3C3C3C] mt-1">
              {formatPercent(surprises[0]?.surprisePercent || 0)}
            </div>
          </div>
        </div>

        {/* Bar Chart Visualization */}
        <div className="mb-3">
          <div className="flex items-end justify-between gap-1.5 h-32 bg-playful-cream/30 p-3 rounded-2xl border border-black/10/50">
            {surprises.slice(0, 12).reverse().map((surprise, idx) => {
              const barHeight = getBarHeight(surprise.surprisePercent);
              const isPositive = surprise.surprisePercent >= 0;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center justify-end relative group">
                  {/* Bar */}
                  <div
                    className={`w-full rounded-t transition-all ${
                      surprise.beat ? 'bg-green-500 hover:bg-green-400' : 'bg-red-500 hover:bg-red-400'
                    }`}
                    style={{ height: `${barHeight}px` }}
                  >
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-white border-3 border-black rounded-2xl px-3 py-2 text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                      <div className="text-[#1a1a1a] font-bold mb-1">{surprise.quarter}</div>
                      <div className="text-[#1a1a1a] text-sm">
                        Actual: <span className="font-semibold">${surprise.epsActual.toFixed(2)}</span>
                      </div>
                      <div className="text-[#1a1a1a] text-sm">
                        Estimate: <span className="font-semibold">${surprise.epsEstimate.toFixed(2)}</span>
                      </div>
                      <div className={`text-sm font-bold mt-1 ${surprise.beat ? 'text-playful-green' : 'text-red-500'}`}>
                        {formatPercent(surprise.surprisePercent)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-10 mt-3 text-sm text-[#3C3C3C]">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Beat Estimate</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Miss Estimate</span>
            </div>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="glass-card">
              <tr>
                <th className="text-left p-3 text-[#3C3C3C] font-medium">Quarter</th>
                <th className="text-right p-3 text-[#3C3C3C] font-medium">Actual EPS</th>
                <th className="text-right p-3 text-[#3C3C3C] font-medium">Estimate</th>
                <th className="text-right p-3 text-[#3C3C3C] font-medium">Surprise</th>
                <th className="text-center p-3 text-[#3C3C3C] font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {surprises.slice(0, 8).map((surprise, idx) => (
                <tr
                  key={idx}
                  className={`border-b border-3 border-black/50 hover:bg-playful-cream/30 transition-colors ${
                    idx % 2 === 0 ? 'bg-gray-900/30' : ''
                  }`}
                >
                  <td className="p-3 text-[#1a1a1a] font-medium">{surprise.quarter}</td>
                  <td className="p-3 text-right text-[#1a1a1a]">
                    ${surprise.epsActual.toFixed(2)}
                  </td>
                  <td className="p-3 text-right text-[#1a1a1a]">
                    ${surprise.epsEstimate.toFixed(2)}
                  </td>
                  <td className={`p-3 text-right font-medium ${getSurpriseColor(surprise.surprisePercent)}`}>
                    {formatPercent(surprise.surprisePercent)}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-sm font-medium ${
                        surprise.beat
                          ? 'bg-green-500/20 text-playful-green'
                          : 'bg-red-500/20 text-red-500'
                      }`}
                    >
                      {surprise.beat ? (
                        <>
                          <TrendingUp className="w-3 h-3" /> Beat
                        </>
                      ) : (
                        <>
                          <TrendingDown className="w-3 h-3" /> Miss
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Insights */}
        <div className="mt-3 p-3 bg-white border-2 border-black rounded-2xl">
          <div className="flex items-start gap-10">
            <Target className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-blue-400 mb-1">Analysis</div>
              <div className="text-sm text-[#1a1a1a] leading-relaxed">
                {beatRate >= 75 ? (
                  <>
                    This stock has a <span className="text-playful-green font-medium">strong track record</span> of beating analyst estimates,
                    with {beatsCount} beats out of {totalSurprises} quarters ({beatRate.toFixed(0)}% beat rate).
                    This indicates reliable earnings execution and potentially conservative analyst estimates.
                  </>
                ) : beatRate >= 50 ? (
                  <>
                    This stock has a <span className="text-playful-orange font-medium">mixed earnings track record</span>,
                    with {beatsCount} beats and {missesCount} misses over the last {totalSurprises} quarters.
                    Performance has been moderately consistent.
                  </>
                ) : (
                  <>
                    This stock has <span className="text-red-500 font-medium">struggled to meet analyst expectations</span>,
                    with only {beatsCount} beats out of {totalSurprises} quarters ({beatRate.toFixed(0)}% beat rate).
                    This suggests execution challenges or overly optimistic estimates.
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};