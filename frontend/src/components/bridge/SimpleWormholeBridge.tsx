import React from 'react';
import WormholeConnect from '@wormhole-foundation/wormhole-connect';

interface SimpleWormholeBridgeProps {
  tokens?: any[];
}

export const WORMHOLE_CONFIG = {
  network: 'Mainnet',
  chains: [
    'Ethereum',
    'Polygon',
    'Arbitrum',
    'Optimism',
    'Base',
    'Avalanche',
    'Solana',
    'Sui',
    'Aptos',
    'BNB Smart Chain',  // BSC
    'Linea',
    'Sei',  // Sei EVM
  ],
  tokens: ['USDC', 'USDT'],
};

export const SimpleWormholeBridge: React.FC<SimpleWormholeBridgeProps> = ({ tokens }) => {
  const config = {
    network: 'Mainnet',
    chains: [
      'Ethereum',
      'Polygon',
      'Arbitrum',
      'Optimism',
      'Base',
      'Avalanche',
      'Solana',
      'Sui',
      'Aptos',
      'BNB Smart Chain',  // BSC
      'Linea',
      'Sei',  // Sei EVM
    ],
    tokens: ['USDC', 'USDT'],
    ui: {
      title: 'Bridge to xStocks',
    },
  };

  const theme = {
    mode: 'light',
    primary: '#4CAF50',  // playful-green
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="glass-card overflow-hidden">
        <div className="p-3 bg-playful-cream border-b-2 border-black/10">
          <h2 className="text-xs font-bold font-display text-center text-[#2C2C2C]">
            Wormhole Connect Bridge
          </h2>
          <p className="text-center text-[#5C5C5C] mt-2">
            Bridge {WORMHOLE_CONFIG.tokens.join('/')} across {WORMHOLE_CONFIG.chains.length} blockchains
          </p>
        </div>

        <div className="p-3 bg-playful-cream">
          <WormholeConnect config={config} theme={theme} />
        </div>
      </div>

      <div className="mt-3 bg-playful-cream border-2 border-black/10 rounded-xl p-3">
        <h3 className="text-xs font-semibold font-display text-[#2C2C2C] mb-3">Key Features</h3>
        <ul className="text-xs text-[#3C3C3C] space-y-2">
          <li className="flex items-start gap-2.5">
            <div className="w-1.5 h-1.5 bg-playful-green rounded-full mt-1.5 flex-shrink-0"></div>
            <span>Automatic wallet selection (Phantom, MetaMask, etc.)</span>
          </li>
          <li className="flex items-start gap-2.5">
            <div className="w-1.5 h-1.5 bg-playful-green rounded-full mt-1.5 flex-shrink-0"></div>
            <span>Native USDC transfers via CCTP (faster, cheaper)</span>
          </li>
          <li className="flex items-start gap-2.5">
            <div className="w-1.5 h-1.5 bg-playful-green rounded-full mt-1.5 flex-shrink-0"></div>
            <span>Support for {WORMHOLE_CONFIG.chains.length} major chains</span>
          </li>
          <li className="flex items-start gap-2.5">
            <div className="w-1.5 h-1.5 bg-playful-green rounded-full mt-1.5 flex-shrink-0"></div>
            <span>Real-time quotes and fees</span>
          </li>
          <li className="flex items-start gap-2.5">
            <div className="w-1.5 h-1.5 bg-playful-green rounded-full mt-1.5 flex-shrink-0"></div>
            <span>Built-in transaction tracking</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
