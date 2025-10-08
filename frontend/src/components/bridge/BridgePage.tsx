import React from 'react';
import { SimpleWormholeBridge, WORMHOLE_CONFIG } from './SimpleWormholeBridge';
import { Token } from '../../types';
import { Globe, Coins, Clock, Zap, CheckCircle2, ArrowRight } from 'lucide-react';

interface BridgePageProps {
  tokens: Token[];
}

export const BridgePage: React.FC<BridgePageProps> = ({ tokens }) => {
  return (
    <div className="min-h-screen relative">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-3 lg:px-3 py-2.5 relative z-10">
        {/* Bridge Component */}
        <div className="mb-3">
          <SimpleWormholeBridge tokens={tokens} />
        </div>

        {/* Info Panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* How it Works */}
          <div className="bg-playful-cream border-4 border-black rounded-[32px] p-3 shadow-2xl">
            <h3 className="text-xs font-bold font-display text-[#2C2C2C] mb-3 flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-playful-green" />
              How it Works
            </h3>
            <div className="space-y-3">
              {[
                { step: '1', title: 'Connect Wallet', desc: 'Select your preferred wallet' },
                { step: '2', title: 'Select Chains', desc: 'Choose source and destination' },
                { step: '3', title: 'Enter Amount', desc: 'USDT or USDC amount' },
                { step: '4', title: 'Confirm & Bridge', desc: 'Execute the transfer' }
              ].map((item) => (
                <div key={item.step} className="flex items-start space-x-3 group">
                  <div className="w-7 h-7 bg-playful-green/20 border-2 border-playful-green rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-playful-green/30 transition-colors">
                    <span className="text-xs text-playful-green font-bold font-display">{item.step}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-[#2C2C2C] font-display">{item.title}</p>
                    <p className="text-xs text-[#5C5C5C] mt-0.5 font-body">{item.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#ACACAC] group-hover:text-playful-green transition-colors mt-1" />
                </div>
              ))}
            </div>
          </div>

          {/* Supported Chains */}
          <div className="bg-playful-cream border-4 border-black rounded-[32px] p-3 shadow-2xl">
            <h3 className="text-xs font-bold font-display text-[#2C2C2C] mb-3 flex items-center gap-2.5">
              <Globe className="w-5 h-5 text-playful-green" />
              Supported Chains
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {WORMHOLE_CONFIG.chains.map((chain) => (
                <div key={chain} className="flex items-center space-x-2 p-2.5 bg-white/80 border-2 border-black/10 rounded-xl hover:border-playful-green hover:bg-white transition-all group">
                  <div className="w-2 h-2 bg-playful-green rounded-full group-hover:animate-pulse"></div>
                  <span className="text-xs font-medium text-[#2C2C2C] font-body">{chain}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Important Notes */}
          <div className="bg-playful-cream border-4 border-playful-orange rounded-[32px] p-3 shadow-2xl">
            <h3 className="text-xs font-bold font-display text-playful-orange mb-3 flex items-center gap-2.5">
              <Zap className="w-5 h-5" />
              Important Notes
            </h3>
            <div className="space-y-2.5 text-xs text-[#2C2C2C] font-body">
              <div className="flex items-start gap-2.5">
                <div className="w-1 h-1 bg-playful-orange rounded-full mt-2 flex-shrink-0"></div>
                <p>Supported tokens: <span className="font-semibold">{WORMHOLE_CONFIG.tokens.join(', ')}</span></p>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-1 h-1 bg-playful-orange rounded-full mt-2 flex-shrink-0"></div>
                <p>Native USDC via CCTP (faster transfers)</p>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-1 h-1 bg-playful-orange rounded-full mt-2 flex-shrink-0"></div>
                <p>Bridge fees vary by route (shown before confirmation)</p>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-1 h-1 bg-playful-orange rounded-full mt-2 flex-shrink-0"></div>
                <p>Transfer time: 2-5 minutes</p>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-1 h-1 bg-playful-orange rounded-full mt-2 flex-shrink-0"></div>
                <p>Always verify receiving address</p>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-1 h-1 bg-playful-orange rounded-full mt-2 flex-shrink-0"></div>
                <p><span className="font-semibold">{WORMHOLE_CONFIG.chains.length}</span> blockchains supported</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 pb-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-3 sm:px-3 lg:px-3 pt-8">
          <div className="text-center text-xs text-[#5C5C5C]">
            <p className="flex items-center justify-center gap-2.5">
              <Zap className="w-4 h-4 text-primary-400" />
              <span>Powered by Wormhole Protocol</span>
              <span className="text-neutral-700">•</span>
              <span>Secure Cross-Chain Transfers</span>
            </p>
            <p className="mt-2 text-[#5C5C5C]">
              Bridge your stablecoins across <span className="text-primary-400 font-semibold">{WORMHOLE_CONFIG.chains.length}</span> different blockchains
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
