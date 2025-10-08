import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
  MathWalletAdapter,
  Coin98WalletAdapter,
  SafePalWalletAdapter,
  BitKeepWalletAdapter,
  CloverWalletAdapter,
  TrustWalletAdapter,
  NightlyWalletAdapter,
  CoinbaseWalletAdapter,
  BitgetWalletAdapter,
  TokenPocketWalletAdapter,
  XDEFIWalletAdapter,
  TrezorWalletAdapter,
  NufiWalletAdapter,
  ParticleAdapter,
  WalletConnectWalletAdapter,
  UnsafeBurnerWalletAdapter,
  TokenaryWalletAdapter,
  SkyWalletAdapter,
  SalmonWalletAdapter,
  SaifuWalletAdapter,
  SpotWalletAdapter,
  SolongWalletAdapter,
  NekoWalletAdapter,
  OntoWalletAdapter,
  KrystalWalletAdapter,
  KeystoneWalletAdapter,
  HyperPayWalletAdapter,
  HuobiWalletAdapter,
  FractalWalletAdapter,
  CoinhubWalletAdapter,
  BitpieWalletAdapter,
  AvanaWalletAdapter,
  AlphaWalletAdapter,
} from '@solana/wallet-adapter-wallets';

// Universal wallet configuration that adapts to any available Solana wallet
export const getUniversalWalletAdapters = () => {
  const wallets = [];
  const seenWalletNames = new Set<string>();

  // Helper to safely add wallet adapter
  const addWallet = (WalletAdapter: any, name: string) => {
    try {
      const wallet = new WalletAdapter();
      const walletName = wallet.name || name;

      // Skip if we've already added this wallet
      if (seenWalletNames.has(walletName)) {
 console.warn(`Skipping duplicate wallet: ${walletName}`);
        return;
      }

      seenWalletNames.add(walletName);
      wallets.push(wallet);
    } catch (error) {
 console.warn(`Failed to initialize ${name}:`, error);
    }
  };

  // Primary wallets - most common
  addWallet(PhantomWalletAdapter, 'Phantom');
  addWallet(SolflareWalletAdapter, 'Solflare');
  addWallet(CoinbaseWalletAdapter, 'Coinbase');

  // Hardware wallets
  addWallet(LedgerWalletAdapter, 'Ledger');
  addWallet(TrezorWalletAdapter, 'Trezor');
  addWallet(KeystoneWalletAdapter, 'Keystone');

  // Popular extension wallets
  addWallet(Coin98WalletAdapter, 'Coin98');
  addWallet(TrustWalletAdapter, 'Trust');
  addWallet(XDEFIWalletAdapter, 'XDEFI');
  addWallet(BitgetWalletAdapter, 'Bitget');
  addWallet(BitKeepWalletAdapter, 'BitKeep');
  addWallet(TokenPocketWalletAdapter, 'TokenPocket');

  // Mobile & multi-platform wallets
  addWallet(TorusWalletAdapter, 'Torus');
  addWallet(MathWalletAdapter, 'Math');
  addWallet(SafePalWalletAdapter, 'SafePal');
  addWallet(CloverWalletAdapter, 'Clover');
  addWallet(NightlyWalletAdapter, 'Nightly');
  addWallet(NufiWalletAdapter, 'Nufi');

  // Additional wallet support
  addWallet(TokenaryWalletAdapter, 'Tokenary');
  addWallet(SkyWalletAdapter, 'Sky');
  addWallet(SalmonWalletAdapter, 'Salmon');
  addWallet(SaifuWalletAdapter, 'Saifu');
  addWallet(SpotWalletAdapter, 'Spot');
  addWallet(SolongWalletAdapter, 'Solong');
  addWallet(NekoWalletAdapter, 'Neko');
  addWallet(OntoWalletAdapter, 'Onto');
  addWallet(KrystalWalletAdapter, 'Krystal');
  addWallet(HyperPayWalletAdapter, 'HyperPay');
  addWallet(HuobiWalletAdapter, 'Huobi');
  addWallet(FractalWalletAdapter, 'Fractal');
  addWallet(CoinhubWalletAdapter, 'Coinhub');
  addWallet(BitpieWalletAdapter, 'Bitpie');
  addWallet(AvanaWalletAdapter, 'Avana');
  addWallet(AlphaWalletAdapter, 'Alpha');

  // Development wallet (for testing only)
  if (process.env.NODE_ENV === 'development') {
    addWallet(UnsafeBurnerWalletAdapter, 'Burner');
  }

 console.log(`[SUCCESS] Initialized ${wallets.length} unique wallet adapters`);
  return wallets;
};

// Endpoint configuration for different networks
export const getNetworkEndpoints = () => {
  return {
    mainnet: "https://mainnet.helius-rpc.com/?api-key=481343b5-f94a-4cb1-93ed-0b885d2a7c7d",
    devnet: "https://api.devnet.solana.com",
    testnet: "https://api.testnet.solana.com",
  };
};

// Default configuration
export const defaultWalletConfig = {
  wallets: getUniversalWalletAdapters(),
  endpoint: getNetworkEndpoints().mainnet,
  autoConnect: true,
};