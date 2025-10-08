import React from 'react';

interface Token {
  symbol: string;
  name: string;
  mint: string;
  logo: string;
  decimals: number;
}

interface TokenSelectProps {
  tokens: Token[];
  selectedToken: Token | null;
  onTokenChange: (token: Token) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
}

export const TokenSelect: React.FC<TokenSelectProps> = ({
  tokens,
  selectedToken,
  onTokenChange,
  placeholder = "Select token",
  disabled = false,
  label
}) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-medium text-[#3C3C3C]">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          value={selectedToken?.symbol || ''}
          onChange={(e) => {
            const token = tokens.find(t => t.symbol === e.target.value);
            if (token) onTokenChange(token);
          }}
          disabled={disabled}
          className="w-full px-3 py-2.5 pr-10 border border-black/30 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-[#2C2C2C] appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <option value="">{placeholder}</option>
          {tokens.map(token => (
            <option key={token.symbol} value={token.symbol}>
              {token.symbol} - {token.name}
            </option>
          ))}
        </select>

        {/* Custom dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg className="h-5 w-5 text-[#5C5C5C]" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>

        {/* Token logo display */}
        {selectedToken && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <img
              src={selectedToken.logo}
              alt={selectedToken.symbol}
              className="w-6 h-6 rounded-full"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTIiIGZpbGw9IiNFNUU3RUIiLz4KPHRleHQgeD0iMTIiIHk9IjE2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBjbGFzcz0iZm9udC1ib2xkIiBmb250LXNpemU9IjEwIiBmaWxsPSIjNjM2NkY2Ij57eyB0b2tlbi5zeW1ib2wuY2hhckF0KDApIH19fTwvdGV4dD4KPC9zdmc+';
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};