import pkg from '@solana/web3.js';
const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = pkg;

export class JupiterService {
  constructor() {
    // Use HELIUS_RPC_URL which is defined in .env instead of undefined RPC_URL
    this.connection = new Connection(process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com');
    this.jupiterBaseUrl = 'https://quote-api.jup.ag/v6';
    this.rpcUrl = process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';
  }

  async getQuote(inputMint, outputMint, amount, slippageBps = 50) {
    try {
      const response = await fetch(`${this.jupiterBaseUrl}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting quote:', error);
      throw error;
    }
  }

  async createSwapTransaction(quote, userPublicKey, wrapAndUnwrapSol = true) {
    try {
      const response = await fetch(`${this.jupiterBaseUrl}/swap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: userPublicKey,
          wrapAndUnwrapSol: wrapAndUnwrapSol,
          useSharedAccounts: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 10000,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating swap transaction:', error);
      throw error;
    }
  }

  async createLimitOrder(order) {
    try {
      const response = await fetch(`${this.jupiterBaseUrl}/trigger-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputMint: order.inputMint,
          outputMint: order.outputMint,
          amount: order.amount,
          targetPrice: order.targetPrice,
          maker: order.maker,
          expiry: order.expiry,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating limit order:', error);
      throw error;
    }
  }

  async craftSendTransaction(sendData) {
    try {
      // Generate keypair from invite code
      const inviteCodeBuffer = Buffer.from(sendData.inviteCode, 'base64');
      const keypair = await this.generateKeypairFromInviteCode(sendData.inviteCode);

      // Create transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(sendData.sender),
          toPubkey: new PublicKey(sendData.recipient),
          lamports: sendData.amount * LAMPORTS_PER_SOL,
        })
      );

      const response = await fetch(`${this.jupiterBaseUrl}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction: transaction,
          sender: sendData.sender,
          recipient: sendData.recipient,
          tokenMint: sendData.tokenMint,
          amount: sendData.amount,
          inviteCode: sendData.inviteCode,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.transaction;
    } catch (error) {
      console.error('Error crafting send transaction:', error);
      throw error;
    }
  }

  async generateKeypairFromInviteCode(inviteCode) {
    // Simplified invite code to keypair generation
    // In a real implementation, this would use proper cryptographic derivation
    const seed = Buffer.from(inviteCode, 'base64');
    const { Keypair } = await import('@solana/web3.js');
    return Keypair.fromSeed(seed.slice(0, 32));
  }

  async getTransactionStatus(signature) {
    try {
      const status = await this.connection.getSignatureStatus(signature);
      return {
        signature,
        status: status.value?.confirmationStatus || 'pending',
        slot: status.value?.slot,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Error getting transaction status:', error);
      throw error;
    }
  }

  async simulateTransaction(transaction) {
    try {
      const simulation = await this.connection.simulateTransaction(transaction);
      return {
        success: simulation.value.err === null,
        logs: simulation.value.logs || [],
        error: simulation.value.err,
      };
    } catch (error) {
      console.error('Error simulating transaction:', error);
      throw error;
    }
  }
}