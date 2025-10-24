import React from 'react';

interface TradingInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  label?: string;
  type?: 'text' | 'number';
  step?: string;
  max?: string;
  min?: string;
  className?: string;
}

export const TradingInput: React.FC<TradingInputProps> = ({
  value,
  onChange,
  placeholder = "0.0",
  disabled = false,
  readOnly = false,
  label,
  type = 'text',
  step = "0.000001",
  max,
  min,
  className = ""
}) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-medium text-[#3C3C3C]">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          step={step}
          max={max}
          min={min}
          className={`w-full px-3 py-2.5 border border-black/30 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-[#2C2C2C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${readOnly ? 'bg-gray-50' : ''} ${className}`}
        />

        {/* Input decorations */}
        {!readOnly && !disabled && value && (
          <button
            onClick={() => onChange('')}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#5C5C5C] hover:text-[#5C5C5C] transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};