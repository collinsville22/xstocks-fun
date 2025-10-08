import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { StockLogo } from './StockLogo';
import { cn } from '../../lib/utils';

interface StockSelectorProps {
  selectedSymbol: string;
  availableSymbols: string[];
  onSelectSymbol: (symbol: string) => void;
}

export const StockSelector: React.FC<StockSelectorProps> = ({
  selectedSymbol,
  availableSymbols,
  onSelectSymbol
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter symbols based on search
  const filteredSymbols = availableSymbols.filter(symbol =>
    symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (symbol: string) => {
    onSelectSymbol(symbol);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-10 px-3 py-2.5 rounded-lg border transition-all",
          "bg-gray-800/90 backdrop-blur-sm text-[#1a1a1a]",
          "border-black/10 hover:border-primary-500",
          "focus:outline-none focus:ring-2 focus:ring-playful-green/50",
          "min-w-[200px]"
        )}
      >
        <StockLogo symbol={selectedSymbol} size="sm" />
        <span className="font-medium flex-1 text-left">{selectedSymbol}</span>
        <ChevronDown className={cn(
          "w-4 h-4 text-[#3C3C3C] transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full max-w-md bg-gray-800 rounded-lg border border-black/10 shadow-2xl z-50 overflow-hidden">
          {/* Search Bar */}
          <div className="p-3 border-b border-black/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3C3C3C]" />
              <input
                type="text"
                placeholder="Search stocks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900 text-[#1a1a1a] rounded-lg border border-black/10 focus:border-primary-500 focus:outline-none text-sm"
                autoFocus
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-[400px] overflow-y-auto">
            {filteredSymbols.length > 0 ? (
              <div className="grid grid-cols-2 gap-1.5 p-2">
                {filteredSymbols.map((symbol) => (
                  <button
                    key={symbol}
                    onClick={() => handleSelect(symbol)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-left",
                      "hover:bg-gray-700/50",
                      selectedSymbol === symbol && "bg-playful-green/20 border border-primary-500/50"
                    )}
                  >
                    <StockLogo symbol={symbol} size="sm" />
                    <span className="text-[#1a1a1a] font-medium text-sm">{symbol}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-3 text-center text-[#3C3C3C]">
                No stocks found matching "{searchTerm}"
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-gray-900/50 border-t border-black/10 text-center">
            <span className="text-sm text-[#3C3C3C]">
              {filteredSymbols.length} of {availableSymbols.length} stocks
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
