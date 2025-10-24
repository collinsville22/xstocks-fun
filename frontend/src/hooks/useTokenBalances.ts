import { useState, useEffect, useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Token } from '../types';

interface TokenBalance {
  mint: string;
  balance: number;
  uiAmount: number;
}

export const useTokenBalances = (tokens: Token[]) => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balances, setBalances] = useState<Record<string, TokenBalance>>({});
  const [loading, setLoading] = useState(false);

  // Create stable token mints string to prevent unnecessary re-fetches
  const tokenMints = useMemo(() => tokens.map(t => t.mint).join(','), [tokens]);

  useEffect(() => {
    if (!publicKey || !tokens.length) {
      setBalances({});
      return;
    }

    const fetchBalances = async () => {
      setLoading(true);
      const newBalances: Record<string, TokenBalance> = {};

      try {
        // Get SOL balance
        const solBalance = await connection.getBalance(publicKey);
        const solToken = tokens.find(t => t.mint === 'So11111111111111111111111111111111111111112');
        if (solToken) {
          newBalances['So11111111111111111111111111111111111111112'] = {
            mint: 'So11111111111111111111111111111111111111112',
            balance: solBalance,
            uiAmount: solBalance / Math.pow(10, 9)
          };
        }

        // Get token accounts for all other tokens
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
        });

        tokenAccounts.value.forEach(accountInfo => {
          const parsedInfo = accountInfo.account.data.parsed.info;
          const mint = parsedInfo.mint;
          const balance = parsedInfo.tokenAmount.amount;
          const decimals = parsedInfo.tokenAmount.decimals;
          const uiAmount = parsedInfo.tokenAmount.uiAmount || 0;

          newBalances[mint] = {
            mint,
            balance: parseInt(balance),
            uiAmount
          };
        });

        setBalances(newBalances);
      } catch (error) {
        console.error('Error fetching token balances:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBalances();

    // Refresh balances every 10 minutes to conserve RPC credits
    const interval = setInterval(fetchBalances, 600000);
    return () => clearInterval(interval);
  }, [publicKey, connection, tokenMints]);

  return { balances, loading };
};
