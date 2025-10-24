import pkg from '@solana/web3.js';
const { Connection, PublicKey, ParsedAccountData } = pkg;

export class WalletService {
  constructor() {
    // Use HELIUS_RPC_URL which is defined in .env instead of undefined RPC_URL
    this.connection = new Connection(process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com');
  }

  async getBalance(publicKey) {
    try {
      const publicKeyObj = new PublicKey(publicKey);
      const balance = await this.connection.getBalance(publicKeyObj);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }

  async getTokenBalances(publicKey) {
    try {
      const publicKeyObj = new PublicKey(publicKey);
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        publicKeyObj,
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );

      const balances = [];
      for (const account of tokenAccounts.value) {
        const parsedData = account.account.data.parsed;
        if (parsedData && parsedData.info) {
          balances.push({
            mint: parsedData.info.mint,
            amount: parsedData.info.tokenAmount.amount,
            uiAmount: parsedData.info.tokenAmount.uiAmount,
            decimals: parsedData.info.tokenAmount.decimals,
          });
        }
      }

      return balances;
    } catch (error) {
      console.error('Error getting token balances:', error);
      throw error;
    }
  }

  async getAccountInfo(publicKey) {
    try {
      const publicKeyObj = new PublicKey(publicKey);
      const accountInfo = await this.connection.getAccountInfo(publicKeyObj);

      return {
        publicKey,
        lamports: accountInfo?.lamports || 0,
        owner: accountInfo?.owner?.toString() || null,
        executable: accountInfo?.executable || false,
        rentEpoch: accountInfo?.rentEpoch || 0,
      };
    } catch (error) {
      console.error('Error getting account info:', error);
      throw error;
    }
  }

  async validateWallet(publicKey) {
    try {
      const publicKeyObj = new PublicKey(publicKey);
      const accountInfo = await this.connection.getAccountInfo(publicKeyObj);
      return accountInfo !== null;
    } catch (error) {
      console.error('Error validating wallet:', error);
      return false;
    }
  }

  async estimateTransactionFee(transaction) {
    try {
      const feeCalculator = await this.connection.getFeeForMessage(transaction.compileMessage());
      return feeCalculator.value || 5000; // Default fee if estimation fails
    } catch (error) {
      console.error('Error estimating transaction fee:', error);
      return 5000; // Default fee
    }
  }

  async getRecentBlockhash() {
    try {
      const { blockhash } = await this.connection.getRecentBlockhash();
      return blockhash;
    } catch (error) {
      console.error('Error getting recent blockhash:', error);
      throw error;
    }
  }

  async isConnected() {
    try {
      await this.connection.getSlot();
      return true;
    } catch (error) {
      console.error('Connection error:', error);
      return false;
    }
  }
}