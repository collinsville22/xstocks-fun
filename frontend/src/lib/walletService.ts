import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';

export interface TokenBalance {
  mint: string;
  balance: number;
  uiAmount: number;
  decimals: number;
  symbol?: string;
  name?: string;
}

export interface WalletBalances {
  sol: number;
  tokens: TokenBalance[];
}

export class UniversalWalletService {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Fetch all balances for a connected wallet using wallet adapter patterns
   */
  async fetchWalletBalances(
    wallet: WalletContextState,
    tokenList?: Array<{ mint: string; symbol: string; name: string; decimals: number }>
  ): Promise<WalletBalances> {
    if (!wallet.connected || !wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    const publicKey = wallet.publicKey;

    try {
      // Fetch SOL balance
      const solBalance = await this.connection.getBalance(publicKey);
      const solInSol = solBalance / LAMPORTS_PER_SOL;

      // Fetch token balances using wallet adapter approach
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );

      const tokens: TokenBalance[] = [];

      for (const tokenAccount of tokenAccounts.value) {
        const parsedInfo = tokenAccount.account.data.parsed.info;
        const mint = parsedInfo.mint;
        const tokenAmount = parsedInfo.tokenAmount;

        if (parseFloat(tokenAmount.uiAmount) > 0) {
          // Find token metadata from provided token list
          const tokenInfo = tokenList?.find(token => token.mint === mint);

          tokens.push({
            mint,
            balance: parseInt(tokenAmount.amount),
            uiAmount: parseFloat(tokenAmount.uiAmount),
            decimals: tokenAmount.decimals,
            symbol: tokenInfo?.symbol || 'Unknown',
            name: tokenInfo?.name || 'Unknown Token'
          });
        }
      }

      return {
        sol: solInSol,
        tokens
      };

    } catch (error) {
      console.error('Error fetching wallet balances:', error);
      // Don't leak error details to frontend - generic message only
      throw new Error('Failed to fetch wallet balances');
    }
  }

  /**
   * Get specific token balance
   */
  async getTokenBalance(
    wallet: WalletContextState,
    mintAddress: string
  ): Promise<TokenBalance | null> {
    if (!wallet.connected || !wallet.publicKey) {
      return null;
    }

    try {
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        wallet.publicKey,
        { mint: new PublicKey(mintAddress) }
      );

      if (tokenAccounts.value.length === 0) {
        return null;
      }

      const tokenAccount = tokenAccounts.value[0];
      const parsedInfo = tokenAccount.account.data.parsed.info;
      const tokenAmount = parsedInfo.tokenAmount;

      return {
        mint: mintAddress,
        balance: parseInt(tokenAmount.amount),
        uiAmount: parseFloat(tokenAmount.uiAmount),
        decimals: tokenAmount.decimals
      };

    } catch (error) {
      console.error('Error fetching token balance:', error);
      return null;
    }
  }

  /**
   * Get SOL balance
   */
  async getSolBalance(wallet: WalletContextState): Promise<number> {
    if (!wallet.connected || !wallet.publicKey) {
      return 0;
    }

    try {
      const balance = await this.connection.getBalance(wallet.publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error fetching SOL balance:', error);
      return 0;
    }
  }

  /**
   * Check if wallet supports specific features
   */
  getWalletCapabilities(wallet: WalletContextState) {
    return {
      connected: wallet.connected,
      connecting: wallet.connecting,
      disconnecting: wallet.disconnecting,
      publicKey: wallet.publicKey?.toString(),
      walletName: wallet.wallet?.adapter?.name,
      canSignTransaction: !!wallet.signTransaction,
      canSignMessage: !!wallet.signMessage,
      canSignAllTransactions: !!wallet.signAllTransactions,
      autoConnect: wallet.autoConnect,
    };
  }

  /**
   * Format balance for display
   */
  formatBalance(balance: number, decimals: number = 6): string {
    return balance.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals
    });
  }

  /**
   * Convert raw balance to UI amount
   */
  toUIAmount(rawBalance: number, decimals: number): number {
    return rawBalance / Math.pow(10, decimals);
  }

  /**
   * Convert UI amount to raw balance
   */
  toRawAmount(uiAmount: number, decimals: number): number {
    return Math.floor(uiAmount * Math.pow(10, decimals));
  }
}

// Create a singleton instance
export const createWalletService = (connection: Connection) => {
  return new UniversalWalletService(connection);
};

// Export for use in components
export { UniversalWalletService as WalletService };