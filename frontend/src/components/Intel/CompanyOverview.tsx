import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Building2, Loader2, AlertCircle } from 'lucide-react';
import { getStockLogo } from '../../utils/stockImages';
import { ENV } from '../../config/env';

interface CompanyOverviewProps {
  symbol: string;
}

interface CompanyData {
  companyInfo: {
    sector: string;
    industry: string;
    country: string;
    fullTimeEmployees: number;
    longBusinessSummary: string;
  };
  valuation: {
    trailingPE: number | null;
    priceToBook: number | null;
  };
  profitability: {
    returnOnEquity: number | null;
    profitMargins: number | null;
  };
  growth: {
    revenueGrowth: number | null;
  };
  timestamp: number;
}

export const CompanyOverview: React.FC<CompanyOverviewProps> = ({ symbol }) => {
  const [data, setData] = useState<CompanyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanyData();
  }, [symbol]);

  const fetchCompanyData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch data from Intel microservice
      const response = await fetch(`${ENV.INTEL_API_URL}/api/fundamentals/${symbol}`);

      if (!response.ok) {
        throw new Error('Failed to fetch company data');
      }

      const apiResult = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load company data');
      console.error('Error fetching company data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-white border-3 border-black rounded-2xl shadow-md border-2 border-black">
        <CardContent className="flex items-center justify-center py-2.5">
          <div className="flex flex-col items-center gap-10">
            <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            <p className="text-[#3C3C3C]">Loading company data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="bg-white border-3 border-black rounded-2xl shadow-md border-2 border-black">
        <CardContent className="flex items-center justify-center py-2.5">
          <div className="flex flex-col items-center gap-10">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <p className="text-red-500">{error || 'No company data available'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Company Info Summary */}
      <Card className="bg-white border-3 border-black rounded-2xl shadow-md border-2 border-black">
        <CardHeader>
          <CardTitle className="text-sm text-[#1a1a1a] flex items-center gap-10">
            <img
              src={getStockLogo(symbol)}
              alt={symbol}
              className="w-10 h-10 rounded-2xl object-cover"
            />
            <Building2 className="w-6 h-6 text-orange-400" />
            Company Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
              <div>
                <div className="text-sm text-[#3C3C3C] mb-1">Sector</div>
                <Badge variant="outline" className="text-[#1a1a1a] border-blue-400/50">
                  {data.companyInfo.sector || 'N/A'}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-[#3C3C3C] mb-1">Industry</div>
                <Badge variant="outline" className="text-[#1a1a1a] border-primary-400/50">
                  {data.companyInfo.industry || 'N/A'}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-[#3C3C3C] mb-1">Country</div>
                <Badge variant="outline" className="text-[#1a1a1a] border-green-400/50">
                  {data.companyInfo.country || 'N/A'}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-[#3C3C3C] mb-1">Employees</div>
                <Badge variant="outline" className="text-[#1a1a1a] border-orange-400/50">
                  {data.companyInfo.fullTimeEmployees?.toLocaleString() || 'N/A'}
                </Badge>
              </div>
            </div>
            {data.companyInfo.longBusinessSummary && (
              <div>
                <div className="text-sm text-[#3C3C3C] mb-2">Business Summary</div>
                <p className="text-sm text-[#1a1a1a] leading-relaxed">
                  {data.companyInfo.longBusinessSummary.substring(0, 500)}
                  {data.companyInfo.longBusinessSummary.length > 500 && '...'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data timestamp */}
      <div className="text-sm text-[#3C3C3C] text-center">
        Data updated: {new Date(data.timestamp).toLocaleString()}
      </div>
    </div>
  );
};
