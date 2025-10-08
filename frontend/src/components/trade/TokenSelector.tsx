import React, { useState, useRef, useEffect } from 'react';
import { Token } from '../../types';

interface TokenSelectorProps {
  tokens: Token[];
  selectedToken: Token | null;
  onSelect: (token: Token) => void;
  label: string;
  disabled?: boolean;
  balances?: Record<string, { uiAmount: number }>;
  prices?: Record<string, number>;
}

export const TokenSelector: React.FC<TokenSelectorProps> = ({
  tokens,
  selectedToken,
  onSelect,
  label,
  disabled = false,
  balances = {},
  prices = {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside or pressing ESC
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Filter tokens based on search query
  const filteredTokens = tokens.filter(token =>
    token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (token: Token) => {
    onSelect(token);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleButtonClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <>
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={disabled}
        className={`flex items-center gap-10 px-3 py-2.5 bg-[#1C2128] border border-[#30363D] rounded-xl text-xs font-medium hover:bg-[#22272E] focus:outline-none focus:ring-2 focus:ring-playful-green/50 transition-all ${
          disabled ? 'cursor-not-allowed opacity-50' : ''
        }`}
        aria-label={label}
      >
        {selectedToken ? (
          <>
            <img
              src={selectedToken.logo}
              alt={selectedToken.symbol}
              className="w-7 h-7 rounded-full"
            />
            <span className="text-white font-semibold">{selectedToken.symbol}</span>
          </>
        ) : (
          <span className="text-[#5C5C5C]">Select token</span>
        )}
        <svg
          className={`w-4 h-4 ml-auto text-[#5C5C5C] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Jupiter-Style Modal Overlay */}
      {isOpen && tokens.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" ref={dropdownRef}>
          <div className="bg-[#0D1117] border-2 border-[#30363D] rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-[#21262D]">
              <h3 className="text-xs font-semibold text-white">Select a token</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-[#1C2128] rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-[#5C5C5C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-[#21262D]">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5C5C5C]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder='Search any token. Include "." for exact match.'
                  className="w-full pl-10 pr-16 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-playful-green transition-all"
                  autoFocus
                />
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-[#1C2128] border border-[#30363D] rounded text-xs text-[#5C5C5C] font-mono"
                >
                  Esc
                </button>
              </div>
            </div>

            {/* Popular Tokens (Top 4) */}
            <div className="px-3 py-2.5 border-b border-[#21262D]">
              <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-thin pb-1">
                {tokens.slice(0, 4).map((token) => (
                  <button
                    key={token.symbol}
                    onClick={() => handleSelect(token)}
                    className="flex items-center gap-2.5 px-3 py-2 bg-[#1C2128] border border-[#30363D] rounded-lg hover:bg-[#22272E] transition-colors flex-shrink-0"
                  >
                    <img src={token.logo} alt={token.symbol} className="w-5 h-5 rounded-full" />
                    <span className="text-xs font-medium text-white">{token.symbol}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Token List */}
            <div className="max-h-96 overflow-y-auto scrollbar-thin">
              {filteredTokens.length > 0 ? (
                filteredTokens.map((token) => (
                  <button
                    key={token.symbol}
                    onClick={() => handleSelect(token)}
                    className="w-full flex items-center gap-10 px-3 py-2.5 hover:bg-[#161B22] transition-colors group"
                  >
                    <img
                      src={token.logo}
                      alt={token.symbol}
                      className="w-9 h-9 rounded-full"
                    />
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold text-white">{token.symbol}</span>
                        {token.symbol === 'SOL' || token.symbol === 'USDC' ? (
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3 h-3 text-playful-green" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xs text-green-400">99</span>
                          </div>
                        ) : null}
                      </div>
                      <div className="text-xs text-[#5C5C5C] truncate">{token.name}</div>
                      <div className="text-xs text-[#5C5C5C] truncate font-mono">{token.mint?.slice(0, 8)}...</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-white">
                        {balances[token.mint]?.uiAmount?.toFixed(4) || '0.00'} {token.symbol}
                      </div>
                      <div className="text-xs text-[#5C5C5C]">
                        ${((balances[token.mint]?.uiAmount || 0) * (prices[token.mint] || 0)).toFixed(2)}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="py-2.5 text-center">
                  <p className="text-[#5C5C5C]">No tokens found</p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-2 text-xs text-playful-green hover:underline"
                  >
                    Clear search
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
