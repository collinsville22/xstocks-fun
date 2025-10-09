import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { cn } from '../../lib/utils';
import {
  TrendingUp,
  Shield,
  Activity,
  Layers,
  Calculator,
  Zap,
  AlertCircle,
  BarChart3,
  Target,
  Search
} from 'lucide-react';

// Import sub-components (to be created)
import { OptionsChain } from './Options/OptionsChain';
import { UnusualActivity } from './Options/UnusualActivity';
import { PutCallRatio } from './Options/PutCallRatio';
import { IVSurface } from './Options/IVSurface';
import { GreeksAnalysis } from './Options/GreeksAnalysis';
import { OptionsFlow } from './Options/OptionsFlow';
import { SpreadAnalysis } from './Options/SpreadAnalysis';
import { ProbabilityCalculator } from './Options/ProbabilityCalculator';
import { HistoricalIVRank } from './Options/HistoricalIVRank';
import { OptionsScreener } from './Options/OptionsScreener';
import { ENV } from '../../config/env';

interface OptionsAnalysisDashboardProps {
  symbol?: string;
  className?: string;
}

// All 63 xStocks from tokens.json
const ALL_XSTOCKS = [
  'AAPLx', 'ABBVx', 'ABTx', 'ACNx', 'AMBRx', 'AMZNx', 'APPx', 'AVGOx',
  'AZNx', 'BACx', 'BRK.Bx', 'CMCSAx', 'COINx', 'CRCLx', 'CRMx', 'CRWDx',
  'CSCOx', 'CVXx', 'DFDVx', 'DHRx', 'GLDx', 'GMEx', 'GOOGLx', 'GSx',
  'HDx', 'HONx', 'HOODx', 'IBMx', 'INTCx', 'JNJx', 'JPMx', 'KOx',
  'LINx', 'LLYx', 'MAx', 'MCDx', 'MDTx', 'METAx', 'MRKx', 'MRVLx',
  'MSFTx', 'MSTRx', 'NFLXx', 'NVDAx', 'NVOx', 'OPENx', 'ORCLx', 'PEPx',
  'PFEx', 'PGx', 'PLTRx', 'PMx', 'QQQx', 'SPYx', 'TBLLx', 'TMOx',
  'TQQQx', 'TSLAx', 'UNHx', 'VTIx', 'Vx', 'WMTx', 'XOMx'
];

/**
 * Options Analysis Dashboard Component
 * Comprehensive options analytics with 10 sub-sections:
 * 1. Options Chain - Complete chain with Greeks
 * 2. Unusual Activity - Volume/OI detection
 * 3. Options Flow - Real-time flow visualization
 * 4. Spread Analysis - Multi-leg spread builder (8 strategies)
 * 5. Probability Calculator - Advanced probability metrics
 * 6. IV Rank - Historical IV tracking (30/60/90 day)
 * 7. Options Screener - Multi-criteria filtering
 * 8. Put/Call Ratio - Sentiment analysis
 * 9. IV Surface - Volatility surface & skew
 * 10. Greeks Analysis - Portfolio Greeks aggregation
 */
export const OptionsAnalysisDashboard: React.FC<OptionsAnalysisDashboardProps> = ({
  symbol: propSymbol,
  className
}) => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>(propSymbol || 'AAPLx');
  const [activeTab, setActiveTab] = useState<string>('chain');
  const [selectedExpiration, setSelectedExpiration] = useState<string>('');
  const [availableExpirations, setAvailableExpirations] = useState<string[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Use prop symbol if provided, otherwise use internal state
  const symbol = propSymbol || selectedSymbol;

  // Fetch available expiration dates when symbol changes
  useEffect(() => {
    const fetchExpirations = async () => {
      if (!symbol) {
        console.log(' No symbol provided');
        return;
      }

      console.log(' Fetching options for symbol:', symbol);
      setIsLoading(true);
      try {
        const url = `${ENV.INTEL_API_URL}/api/options/chain/${symbol}`;
        console.log(' API URL:', url);

        const response = await fetch(url);
        console.log(' Response status:', response.status);

        if (!response.ok) {
          throw new Error(`Failed to fetch options data: ${response.statusText}`);
        }

        const apiResponse = await response.json();
        console.log('📊 Received data:', apiResponse);

        if (apiResponse.availableExpirations && apiResponse.availableExpirations.length > 0) {
          console.log('📅 Setting expirations:', apiResponse.availableExpirations.length);
          setAvailableExpirations(apiResponse.availableExpirations);
          setSelectedExpiration(apiResponse.availableExpirations[0]);
        } else {
          console.warn(' No expirations in response');
        }

        if (apiResponse.currentPrice) {
          console.log('💰 Current price:', apiResponse.currentPrice);
          setCurrentPrice(apiResponse.currentPrice);
        }
      } catch (error) {
        console.error(' Error fetching options expirations:', error);
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

    fetchExpirations();
  }, [symbol]);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="bg-white border-3 border-black rounded-2xl shadow-md p-3">
        <div className="flex items-center justify-between flex-wrap gap-10">
          <div>
            <h2 className="text-sm font-bold text-[#1a1a1a] flex items-center gap-2.5">
              <Calculator className="w-6 h-6 text-playful-green" />
              Options Analysis Dashboard
            </h2>
            <p className="text-[#3C3C3C] mt-1 font-medium">
              Professional-grade options analytics for {symbol}
            </p>
          </div>

          <div className="flex items-center gap-10">
            {/* Stock Selector */}
            {!propSymbol && (
              <div>
                <label className="text-sm text-[#3C3C3C] mb-1 block">Select Stock</label>
                <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                  <SelectTrigger className="w-[180px] bg-white border-2 border-black">
                    <SelectValue placeholder="Select stock" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-2 border-black">
                    {ALL_XSTOCKS.map((stock) => (
                      <SelectItem key={stock} value={stock}>
                        {stock}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Current Price */}
            {currentPrice > 0 && (
              <div className="text-right">
                <div className="text-sm text-[#3C3C3C]">Current Price</div>
                <div className="text-sm font-bold text-[#1a1a1a]">
                  ${currentPrice.toFixed(2)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Feature Overview Cards - All 10 Sections */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10 mt-3">
          <Card
            className={cn(
              "bg-white border-2 border-black rounded-2xl shadow-md cursor-pointer transition-all hover:scale-105",
              activeTab === 'chain' && "bg-playful-green border-3"
            )}
            onClick={() => setActiveTab('chain')}
          >
            <CardContent className="p-3 text-center">
              <Layers className="w-5 h-5 text-blue-400 mx-auto mb-1" />
              <div className="text-sm text-[#3C3C3C]">Options Chain</div>
              <div className="text-sm font-semibold text-[#1a1a1a]">Full Data</div>
            </CardContent>
          </Card>

          <Card
            className={cn(
              "bg-white border-2 border-black rounded-2xl shadow-md cursor-pointer transition-all hover:scale-105",
              activeTab === 'unusual' && "bg-playful-green border-3"
            )}
            onClick={() => setActiveTab('unusual')}
          >
            <CardContent className="p-3 text-center">
              <Zap className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
              <div className="text-sm text-[#3C3C3C]">Unusual Activity</div>
              <div className="text-sm font-semibold text-[#1a1a1a]">Smart Money</div>
            </CardContent>
          </Card>

          <Card
            className={cn(
              "bg-white border-2 border-black rounded-2xl shadow-md cursor-pointer transition-all hover:scale-105",
              activeTab === 'flow' && "bg-playful-green border-3"
            )}
            onClick={() => setActiveTab('flow')}
          >
            <CardContent className="p-3 text-center">
              <BarChart3 className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
              <div className="text-sm text-[#3C3C3C]">Options Flow</div>
              <div className="text-sm font-semibold text-[#1a1a1a]">Real-Time</div>
            </CardContent>
          </Card>

          <Card
            className={cn(
              "bg-white border-2 border-black rounded-2xl shadow-md cursor-pointer transition-all hover:scale-105",
              activeTab === 'spreads' && "bg-playful-green border-3"
            )}
            onClick={() => setActiveTab('spreads')}
          >
            <CardContent className="p-3 text-center">
              <Layers className="w-5 h-5 text-purple-400 mx-auto mb-1" />
              <div className="text-sm text-[#3C3C3C]">Spread Analysis</div>
              <div className="text-sm font-semibold text-[#1a1a1a]">8 Strategies</div>
            </CardContent>
          </Card>

          <Card
            className={cn(
              "bg-white border-2 border-black rounded-2xl shadow-md cursor-pointer transition-all hover:scale-105",
              activeTab === 'probability' && "bg-playful-green border-3"
            )}
            onClick={() => setActiveTab('probability')}
          >
            <CardContent className="p-3 text-center">
              <Calculator className="w-5 h-5 text-pink-400 mx-auto mb-1" />
              <div className="text-sm text-[#3C3C3C]">Probability</div>
              <div className="text-sm font-semibold text-[#1a1a1a]">Calculator</div>
            </CardContent>
          </Card>

          <Card
            className={cn(
              "bg-white border-2 border-black rounded-2xl shadow-md cursor-pointer transition-all hover:scale-105",
              activeTab === 'iv-rank' && "bg-playful-green border-3"
            )}
            onClick={() => setActiveTab('iv-rank')}
          >
            <CardContent className="p-3 text-center">
              <Target className="w-5 h-5 text-blue-400 mx-auto mb-1" />
              <div className="text-sm text-[#3C3C3C]">IV Rank</div>
              <div className="text-sm font-semibold text-[#1a1a1a]">Historical</div>
            </CardContent>
          </Card>

          <Card
            className={cn(
              "bg-white border-2 border-black rounded-2xl shadow-md cursor-pointer transition-all hover:scale-105",
              activeTab === 'screener' && "bg-playful-green border-3"
            )}
            onClick={() => setActiveTab('screener')}
          >
            <CardContent className="p-3 text-center">
              <Search className="w-5 h-5 text-indigo-400 mx-auto mb-1" />
              <div className="text-sm text-[#3C3C3C]">Screener</div>
              <div className="text-sm font-semibold text-[#1a1a1a]">Filter Options</div>
            </CardContent>
          </Card>

          <Card
            className={cn(
              "bg-white border-2 border-black rounded-2xl shadow-md cursor-pointer transition-all hover:scale-105",
              activeTab === 'pcratio' && "bg-playful-green border-3"
            )}
            onClick={() => setActiveTab('pcratio')}
          >
            <CardContent className="p-3 text-center">
              <TrendingUp className="w-5 h-5 text-green-400 mx-auto mb-1" />
              <div className="text-sm text-[#3C3C3C]">Put/Call Ratio</div>
              <div className="text-sm font-semibold text-[#1a1a1a]">Sentiment</div>
            </CardContent>
          </Card>

          <Card
            className={cn(
              "bg-white border-2 border-black rounded-2xl shadow-md cursor-pointer transition-all hover:scale-105",
              activeTab === 'ivsurface' && "bg-playful-green border-3"
            )}
            onClick={() => setActiveTab('ivsurface')}
          >
            <CardContent className="p-3 text-center">
              <Activity className="w-5 h-5 text-primary-400 mx-auto mb-1" />
              <div className="text-sm text-[#3C3C3C]">IV Surface</div>
              <div className="text-sm font-semibold text-[#1a1a1a]">Volatility</div>
            </CardContent>
          </Card>

          <Card
            className={cn(
              "bg-white border-2 border-black rounded-2xl shadow-md cursor-pointer transition-all hover:scale-105",
              activeTab === 'greeks' && "bg-playful-green border-3"
            )}
            onClick={() => setActiveTab('greeks')}
          >
            <CardContent className="p-3 text-center">
              <Shield className="w-5 h-5 text-orange-400 mx-auto mb-1" />
              <div className="text-sm text-[#3C3C3C]">Greeks</div>
              <div className="text-sm font-semibold text-[#1a1a1a]">Risk Mgmt</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tab Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsContent value="chain" className="space-y-3">
          <OptionsChain
            symbol={symbol}
            selectedExpiration={selectedExpiration}
            availableExpirations={availableExpirations}
            onExpirationChange={setSelectedExpiration}
            currentPrice={currentPrice}
          />
        </TabsContent>

        <TabsContent value="unusual" className="mt-3 space-y-3">
          <UnusualActivity />
        </TabsContent>

        <TabsContent value="pcratio" className="mt-3 space-y-3">
          <PutCallRatio symbol={symbol} />
        </TabsContent>

        <TabsContent value="ivsurface" className="mt-3 space-y-3">
          <IVSurface symbol={symbol} currentPrice={currentPrice} />
        </TabsContent>

        <TabsContent value="greeks" className="mt-3 space-y-3">
          <GreeksAnalysis
            symbol={symbol}
            selectedExpiration={selectedExpiration}
            availableExpirations={availableExpirations}
            onExpirationChange={setSelectedExpiration}
            currentPrice={currentPrice}
          />
        </TabsContent>

        <TabsContent value="flow" className="mt-3 space-y-3">
          <OptionsFlow />
        </TabsContent>

        <TabsContent value="spreads" className="mt-3 space-y-3">
          <SpreadAnalysis
            symbol={symbol}
            currentPrice={currentPrice}
            availableOptions={{ calls: [], puts: [] }}
          />
        </TabsContent>

        <TabsContent value="probability" className="mt-3 space-y-3">
          <ProbabilityCalculator
            symbol={symbol}
            currentPrice={currentPrice}
          />
        </TabsContent>

        <TabsContent value="iv-rank" className="mt-3 space-y-3">
          <HistoricalIVRank symbol={symbol} />
        </TabsContent>

        <TabsContent value="screener" className="mt-3 space-y-3">
          <OptionsScreener />
        </TabsContent>
      </Tabs>

      {/* Educational Footer */}
      <Card className="bg-white border-2 border-black rounded-2xl shadow-md">
        <CardContent className="p-3">
          <div className="flex items-start gap-10">
            <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[#1a1a1a]">
                Professional Options Analytics
              </p>
              <p className="text-sm text-[#3C3C3C]">
                This dashboard provides institutional-grade options analytics including complete options chains,
                unusual activity detection, Put/Call ratio sentiment analysis, implied volatility surface,
                Greeks analysis, and real-time options flow. Data is sourced from real market data with 5-minute delay.
              </p>
              <div className="flex flex-wrap gap-2.5 mt-2">
                <Badge className="bg-playful-green text-white border-2 border-black text-sm font-bold px-3 py-1">
                  Real Market Data
                </Badge>
                <Badge className="bg-blue-500 text-white border-2 border-black text-sm font-bold px-3 py-1">
                  Professional Greeks
                </Badge>
                <Badge className="bg-playful-orange text-white border-2 border-black text-sm font-bold px-3 py-1">
                  Smart Money Detection
                </Badge>
                <Badge className="bg-red-500 text-white border-2 border-black text-sm font-bold px-3 py-1">
                  Risk Management
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OptionsAnalysisDashboard;