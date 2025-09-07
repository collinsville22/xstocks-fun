import React from 'react';
import { XStock } from '@xstocks/types';
import { Select, SelectOption } from './Select';

export interface TokenSelectorProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  tokens: Record<string, XStock>;
  error?: string;
}

export const TokenSelector: React.FC<TokenSelectorProps> = ({
  label = "Select Token",
  value,
  onChange,
  tokens,
  error,
}) => {
  const options: SelectOption[] = Object.values(tokens).map((token) => ({
    value: token.symbol,
    label: `${token.name} (${token.symbol})`,
    icon: token.icon,
  }));

  return (
    <Select
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      options={options}
      error={error}
    />
  );
};