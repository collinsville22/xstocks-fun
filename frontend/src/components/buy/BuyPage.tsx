import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { initializeTransak, initializeMoonPay, validateAmount, LIMITS, FiatProvider } from '../../lib/fiatOnramp';

interface PaymentProvider {
  id: FiatProvider;
  name: string;
  logo: string;
  methods: string[];
  description: string;
}

const PAYMENT_PROVIDERS: PaymentProvider[] = [
  {
    id: 'moonpay',
    name: 'MoonPay',
    logo: '/moonpay.png',
    methods: ['Debit/Credit Card', 'Apple Pay', 'Google Pay', 'SEPA'],
    description: 'Fast processing • Global coverage'
  },
  {
    id: 'transak',
    name: 'Transak',
    logo: '/transak.png',
    methods: ['Debit/Credit Card', 'Apple Pay', 'Google Pay', 'Bank Transfer'],
    description: 'Best overall • Supports all tokens'
  }
];

const TOKENS = [
  {
    symbol: 'SOL' as const,
    name: 'Solana',
    logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
    price: 227.86
  },
  {
    symbol: 'USDC' as const,
    name: 'USD Coin',
    logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
    price: 1.00
  },
  {
    symbol: 'USDT' as const,
    name: 'USDt',
    logo: 'https://coin-images.coingecko.com/coins/images/325/large/Tether.png',
    price: 1.00
  }
];

export const BuyPage: React.FC = () => {
  const { publicKey, connected } = useWallet();
  const [selectedToken, setSelectedToken] = useState(TOKENS[0]);
  const [amount, setAmount] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider | null>(PAYMENT_PROVIDERS[0]); // MoonPay as default
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const cryptoAmount = amount ? (parseFloat(amount) / selectedToken.price).toFixed(6) : '0';

  // Validate amount when it changes
  useEffect(() => {
    if (amount) {
      const numAmount = parseFloat(amount);
      if (!isNaN(numAmount)) {
        const validation = validateAmount(numAmount);
        setValidationError(validation.valid ? null : validation.error || null);
      }
    } else {
      setValidationError(null);
    }
  }, [amount]);

  // Handle buy action
  const handleBuy = () => {
    if (!connected || !publicKey) {
      alert('Please connect your wallet first');
      return;
    }

    if (!selectedProvider || !amount) {
      return;
    }

    const numAmount = parseFloat(amount);
    const validation = validateAmount(numAmount);

    if (!validation.valid) {
      setValidationError(validation.error || null);
      return;
    }

    setIsProcessing(true);

    try {
      const walletAddress = publicKey.toBase58();

      if (selectedProvider.id === 'transak') {
        initializeTransak({
          walletAddress,
          cryptoCurrencyCode: selectedToken.symbol,
          fiatAmount: numAmount,
        });
      } else if (selectedProvider.id === 'moonpay') {
        initializeMoonPay({
          walletAddress,
          cryptoCurrencyCode: selectedToken.symbol,
          fiatAmount: numAmount,
        });
      }

      // Show success message
      setTimeout(() => {
        setIsProcessing(false);
      }, 1000);
    } catch (error) {
      console.error('Error initializing payment provider:', error);
      alert('Failed to open payment window. Please check your popup blocker settings.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-3 py-2.5">
      {/* Wallet Connection Warning */}
      {!connected && (
        <div className="bg-playful-orange/10 border-4 border-black rounded-[32px] p-3 shadow-2xl mb-3">
          <div className="flex items-center gap-10">
            <div className="w-12 h-12 bg-playful-orange rounded-2xl border-2 border-black flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-display font-bold text-[#2C2C2C]">Wallet Not Connected</h3>
              <p className="text-xs text-[#5C5C5C] font-body">Please connect your Solana wallet to purchase crypto</p>
            </div>
          </div>
        </div>
      )}

      {/* Header Card */}
      <div className="bg-white/95 border-4 border-black rounded-[32px] p-3 shadow-2xl mb-3">
        <div className="flex items-center gap-10 mb-3">
          <div className="w-14 h-14 bg-playful-green rounded-2xl border-2 border-black flex items-center justify-center shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xs font-display font-bold text-[#2C2C2C]">Buy Crypto</h1>
            <p className="text-xs text-[#666] font-body">Purchase crypto with your card or payment method</p>
          </div>
        </div>

        {/* Token Selection */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-[#5C5C5C] font-body mb-3">Select Token</label>
          <div className="grid grid-cols-3 gap-10">
            {TOKENS.map((token) => (
              <button
                key={token.symbol}
                onClick={() => setSelectedToken(token)}
                className={`flex items-center gap-10 p-3 rounded-2xl border-3 transition-all duration-200 ${
                  selectedToken.symbol === token.symbol
                    ? 'bg-playful-green text-white border-black shadow-lg'
                    : 'bg-white text-[#2C2C2C] border-black/20 hover:bg-gray-50'
                }`}
              >
                <img src={token.logo} alt={token.symbol} className="w-10 h-10 rounded-full" />
                <div className="text-left">
                  <div className="font-display font-bold">{token.symbol}</div>
                  <div className={`text-xs ${selectedToken.symbol === token.symbol ? 'text-white/80' : 'text-[#5C5C5C]'}`}>
                    {token.name}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Amount Input */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-xs font-medium text-[#5C5C5C] font-body">Amount (USD)</label>
            <span className="text-xs text-[#5C5C5C] font-body">
              Min: ${LIMITS.MIN_PURCHASE} • Max: ${LIMITS.MAX_PURCHASE_US.toLocaleString()}
            </span>
          </div>
          <div className={`bg-[#F5F5F5] border-3 rounded-2xl p-3 ${validationError ? 'border-red-500' : 'border-black'}`}>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100"
              min={LIMITS.MIN_PURCHASE}
              max={LIMITS.MAX_PURCHASE_US}
              className="w-full bg-transparent text-[#2C2C2C] text-xs font-display font-bold placeholder-[#ACACAC] focus:outline-none tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <div className="flex items-center justify-between mt-3">
              <div className="text-xs text-[#5C5C5C] font-body">
                ≈ {cryptoAmount} {selectedToken.symbol}
              </div>
              {validationError && (
                <div className="text-xs text-red-500 font-body font-medium">
                  {validationError}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment Provider Selector */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-[#5C5C5C] font-body mb-3">Payment Method</label>
          <button
            onClick={() => setShowProviderModal(true)}
            className="w-full flex items-center justify-between p-3 bg-white border-3 border-black rounded-2xl hover:bg-gray-50 transition-all duration-200"
          >
            {selectedProvider ? (
              <div className="flex items-center gap-10">
                <img src={selectedProvider.logo} alt={selectedProvider.name} className="h-6 object-contain" />
                <div className="text-left">
                  <div className="font-display font-bold text-[#2C2C2C]">{selectedProvider.name}</div>
                  <div className="text-xs text-[#5C5C5C]">{selectedProvider.methods[0]}</div>
                </div>
              </div>
            ) : (
              <span className="text-[#ACACAC] font-body">Select payment provider</span>
            )}
            <svg className="w-6 h-6 text-[#5C5C5C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Buy Button */}
        <button
          onClick={handleBuy}
          disabled={!connected || !amount || !selectedProvider || !!validationError || isProcessing}
          className={`w-full py-2.5 px-3 rounded-2xl font-display font-bold text-xs transition-all duration-200 border-3 ${
            connected && amount && selectedProvider && !validationError && !isProcessing
              ? 'bg-playful-green text-white border-black shadow-lg hover:bg-playful-orange hover:scale-105'
              : 'bg-[#E5E5E5] text-[#ACACAC] cursor-not-allowed border-black/10'
          }`}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2.5">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : !connected ? (
            'Connect wallet to continue'
          ) : !amount || !selectedProvider ? (
            'Enter amount and select provider'
          ) : validationError ? (
            validationError
          ) : (
            `Buy $${amount} of ${selectedToken.symbol}`
          )}
        </button>
      </div>

      {/* Provider Selection Modal */}
      {showProviderModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3">
          <div className="bg-white border-4 border-black rounded-[32px] p-3 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-display font-bold text-[#2C2C2C]">Select Provider</h3>
              <button
                onClick={() => setShowProviderModal(false)}
                className="w-10 h-10 rounded-full bg-gray-100 border-2 border-black flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              {PAYMENT_PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => {
                    setSelectedProvider(provider);
                    setShowProviderModal(false);
                  }}
                  className="w-full flex items-start gap-10 p-3 bg-white border-2 border-black/20 rounded-2xl hover:bg-gray-50 hover:border-playful-green transition-all duration-200"
                >
                  <div className="w-12 h-12 flex items-center justify-center">
                    <img src={provider.logo} alt={provider.name} className="max-h-8 max-w-full object-contain" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-display font-bold text-[#2C2C2C] mb-1">{provider.name}</div>
                    <div className="text-xs text-[#5C5C5C] font-body mb-2">{provider.description}</div>
                    <div className="flex flex-wrap gap-2.5">
                      {provider.methods.map((method) => (
                        <span
                          key={method}
                          className="text-xs bg-playful-green/10 text-playful-green px-2 py-1 rounded-lg font-body"
                        >
                          {method}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-[#5C5C5C]">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
