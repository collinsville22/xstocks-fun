import React from 'react';

interface LowBalancePromptProps {
  onBuyClick: () => void;
}

export const LowBalancePrompt: React.FC<LowBalancePromptProps> = ({ onBuyClick }) => {
  return (
    <div className="bg-playful-cream border-4 border-black rounded-[32px] p-3 shadow-2xl mt-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-10">
          <div className="w-14 h-14 bg-playful-orange rounded-2xl border-2 border-black flex items-center justify-center shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-display font-bold text-[#2C2C2C]">Low on SOL/USDC/USDT?</h3>
            <p className="text-xs text-[#5C5C5C] font-body">Buy crypto instantly with your card or payment method</p>
          </div>
        </div>

        <button
          onClick={onBuyClick}
          className="flex items-center gap-10 px-3 py-2.5 bg-playful-green text-white rounded-full font-display font-bold text-xs border-3 border-black shadow-lg hover:bg-playful-orange transition-all duration-200 hover:scale-105"
        >
          Buy Now
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );
};
