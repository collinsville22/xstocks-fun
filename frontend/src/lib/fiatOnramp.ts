export type FiatProvider = 'transak' | 'moonpay';

export interface OnrampConfig {
  walletAddress: string;
  cryptoCurrencyCode: 'SOL' | 'USDC' | 'USDT';
  fiatAmount?: number;
  fiatCurrency?: string;
}

// Minimum and maximum purchase limits
export const LIMITS = {
  MIN_PURCHASE: 5, // $5 minimum
  MAX_PURCHASE_US: 6000,
  MAX_PURCHASE_EU: 75000,
};

// Token configurations for each provider
export const TOKEN_CONFIGS = {
  SOL: {
    transak: { code: 'SOL', network: 'solana' },
    moonpay: { code: 'sol', network: 'solana' },
  },
  USDC: {
    transak: { code: 'USDC', network: 'solana' },
    moonpay: { code: 'usdc_sol', network: 'solana' },
  },
  USDT: {
    transak: { code: 'USDT', network: 'solana' },
    moonpay: { code: 'usdt_sol', network: 'solana' },
  },
};

/**
 * Initialize Transak widget - Redirect to Transak page with pre-filled details
 */
export const initializeTransak = (config: OnrampConfig) => {
  const { walletAddress, cryptoCurrencyCode, fiatAmount = 100 } = config;

  const tokenConfig = TOKEN_CONFIGS[cryptoCurrencyCode].transak;

  // Use transak.com/buy with correct parameter names
  const params = new URLSearchParams({
    defaultCryptoCurrency: tokenConfig.code,
    cryptoCurrencyList: tokenConfig.code,
    defaultNetwork: tokenConfig.network,
    networks: tokenConfig.network,
    walletAddress: walletAddress,
    fiatAmount: fiatAmount.toString(),
    defaultFiatAmount: fiatAmount.toString(),
    fiatCurrency: 'USD',
    defaultFiatCurrency: 'USD',
    disableWalletAddressForm: 'true',
  });

  const transakUrl = `https://transak.com/buy?${params.toString()}`;

  // Open in new tab (more reliable than popup)
  window.open(transakUrl, '_blank', 'noopener,noreferrer');

  console.log('Transak opened:', transakUrl);
};

/**
 * Initialize MoonPay widget - Redirect to MoonPay page with pre-filled details
 */
export const initializeMoonPay = (config: OnrampConfig) => {
  const { walletAddress, cryptoCurrencyCode, fiatAmount = 100 } = config;

  const tokenConfig = TOKEN_CONFIGS[cryptoCurrencyCode].moonpay;

  // Build MoonPay URL
  const params = new URLSearchParams({
    currencyCode: tokenConfig.code,
    walletAddress: walletAddress,
    baseCurrencyAmount: fiatAmount.toString(),
    baseCurrencyCode: 'USD',
  });

  const moonpayUrl = `https://buy.moonpay.com?${params.toString()}`;

  // Open in new tab (more reliable than popup)
  window.open(moonpayUrl, '_blank', 'noopener,noreferrer');

  console.log('MoonPay opened:', moonpayUrl);
};

/**
 * Validate purchase amount
 */
export const validateAmount = (amount: number): { valid: boolean; error?: string } => {
  if (amount < LIMITS.MIN_PURCHASE) {
    return {
      valid: false,
      error: `Minimum purchase amount is $${LIMITS.MIN_PURCHASE}`,
    };
  }

  // We'll use the lower US limit as default max
  if (amount > LIMITS.MAX_PURCHASE_US) {
    return {
      valid: false,
      error: `Maximum purchase amount is $${LIMITS.MAX_PURCHASE_US.toLocaleString()} (US users)`,
    };
  }

  return { valid: true };
};

/**
 * Get recommended providers for a token
 */
export const getProviderSupport = (token: 'SOL' | 'USDC' | 'USDT') => {
  const support = {
    SOL: {
      transak: true,
      moonpay: true,
    },
    USDC: {
      transak: true,
      moonpay: true,
    },
    USDT: {
      transak: true,
      moonpay: true,
    },
  };

  return support[token];
};
