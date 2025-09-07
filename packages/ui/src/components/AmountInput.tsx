import React from 'react';
import { Input } from './Input';

export interface AmountInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  currency?: string;
  placeholder?: string;
  error?: string;
  min?: number;
  max?: number;
}

export const AmountInput: React.FC<AmountInputProps> = ({
  label = "Amount",
  value,
  onChange,
  currency = "USDC",
  placeholder = "0.00",
  error,
  min = 0,
  max,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow empty string
    if (inputValue === '') {
      onChange('');
      return;
    }
    
    // Only allow numbers and decimal point
    if (!/^\d*\.?\d*$/.test(inputValue)) {
      return;
    }
    
    // Check min/max constraints
    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue)) {
      if (min !== undefined && numValue < min) return;
      if (max !== undefined && numValue > max) return;
    }
    
    onChange(inputValue);
  };

  return (
    <div className="relative">
      <Input
        label={label}
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        error={error}
      />
      {currency && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <span className="text-gray-500 text-sm font-medium mt-6">{currency}</span>
        </div>
      )}
    </div>
  );
};