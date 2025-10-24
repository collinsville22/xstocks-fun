import React, { useState } from 'react';
import { Building2 } from 'lucide-react';

interface StockLogoProps {
  symbol: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showFallback?: boolean;
}

export const StockLogo: React.FC<StockLogoProps> = ({
  symbol,
  size = 'md',
  className = '',
  showFallback = true
}) => {
  const [imageError, setImageError] = useState(false);

  // Clean symbol (remove -B, -A, x suffix, etc. for logo lookup)
  const cleanSymbol = symbol.replace(/(-[A-Z]|x)$/i, '');

  // Size mapping
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-14 h-14'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
    xl: 'w-10 h-10'
  };

  // Use multiple logo services with fallback
  const logoDevToken = import.meta.env.VITE_LOGO_DEV_TOKEN;

  const logoUrls = [
    `https://logo.clearbit.com/${getCompanyDomain(cleanSymbol)}`,
    ...(logoDevToken ? [`https://img.logo.dev/${getCompanyDomain(cleanSymbol)}?token=${logoDevToken}`] : []),
    `https://assets.tradevu.com/logos/${cleanSymbol.toUpperCase()}.png`
  ];

  const [currentLogoIndex, setCurrentLogoIndex] = useState(0);

  const handleImageError = () => {
    if (currentLogoIndex < logoUrls.length - 1) {
      setCurrentLogoIndex(currentLogoIndex + 1);
    } else {
      setImageError(true);
    }
  };

  if (imageError || !showFallback) {
    return showFallback ? (
      <div className={`${sizeClasses[size]} ${className} bg-gradient-to-br from-purple-600 via-blue-600 to-purple-600 rounded-lg flex items-center justify-center border border-black/20 shadow-lg`}>
        <span className={`font-bold text-[#1a1a1a] ${size === 'sm' ? 'text-sm' : size === 'md' ? 'text-sm' : size === 'lg' ? 'text-sm' : 'text-sm'}`}>
          {cleanSymbol.charAt(0)}
        </span>
      </div>
    ) : null;
  }

  return (
    <img
      src={logoUrls[currentLogoIndex]}
      alt={`${symbol} logo`}
      className={`${sizeClasses[size]} ${className} rounded-lg object-contain bg-white/5 border border-black/10/50`}
      onError={handleImageError}
    />
  );
};

// Helper function to map stock symbols to company domains
function getCompanyDomain(symbol: string): string {
  const domainMap: Record<string, string> = {
    'AAPL': 'apple.com',
    'MSFT': 'microsoft.com',
    'GOOGL': 'google.com',
    'GOOG': 'google.com',
    'AMZN': 'amazon.com',
    'NVDA': 'nvidia.com',
    'META': 'meta.com',
    'TSLA': 'tesla.com',
    'BRK': 'berkshirehathaway.com',
    'LLY': 'lilly.com',
    'V': 'visa.com',
    'JNJ': 'jnj.com',
    'JPM': 'jpmorganchase.com',
    'UNH': 'unitedhealthgroup.com',
    'XOM': 'exxonmobil.com',
    'PFE': 'pfizer.com',
    'HD': 'homedepot.com',
    'CVX': 'chevron.com',
    'ABT': 'abbott.com',
    'ABBV': 'abbvie.com',
    'BAC': 'bankofamerica.com',
    'MRK': 'merck.com',
    'KO': 'coca-colacompany.com',
    'PEP': 'pepsico.com',
    'AVGO': 'broadcom.com',
    'TMO': 'thermofisher.com',
    'CRM': 'salesforce.com',
    'DHR': 'danaher.com',
    'DIS': 'thewaltdisneycompany.com',
    'ADBE': 'adobe.com',
    'VZ': 'verizon.com',
    'ACN': 'accenture.com',
    'NFLX': 'netflix.com',
    'NKE': 'nike.com',
    'MCD': 'mcdonalds.com',
    'CSCO': 'cisco.com',
    'WFC': 'wellsfargo.com',
    'T': 'att.com',
    'NEE': 'nexteraenergy.com',
    'CVS': 'cvshealth.com',
    'ORCL': 'oracle.com',
    'AMD': 'amd.com',
    'INTC': 'intel.com',
    'BA': 'boeing.com',
    'CAT': 'caterpillar.com',
    'GS': 'goldmansachs.com',
    'IBM': 'ibm.com',
    'SBUX': 'starbucks.com',
    'TXN': 'ti.com',
    'HON': 'honeywell.com',
    'UPS': 'ups.com',
    'GE': 'ge.com',
    'MMM': '3m.com',
    'MS': 'morganstanley.com',
    'C': 'citigroup.com',
    'AXP': 'americanexpress.com',
    'BLK': 'blackrock.com',
    'COP': 'conocophillips.com',
    'SLB': 'slb.com',
    'DUK': 'duke-energy.com',
    'CMCSA': 'comcastcorporation.com'
  };

  return domainMap[symbol.toUpperCase()] || `${symbol.toLowerCase()}.com`;
}
