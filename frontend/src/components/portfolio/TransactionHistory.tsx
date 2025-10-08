import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, ParsedTransactionWithMeta, PartiallyDecodedInstruction } from '@solana/web3.js';
import {
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Clock,
  RefreshCw,
  Filter,
  Search,
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity,
  History
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Token } from '../../types';

interface TransactionData {
  signature: string;
  timestamp: number;
  type: 'swap' | 'transfer' | 'unknown';
  status: 'success' | 'failed';
  fromToken?: {
    symbol: string;
    amount: number;
    mint: string;
  };
  toToken?: {
    symbol: string;
    amount: number;
    mint: string;
  };
  fee: number;
  blockTime: number;
  slot: number;
}

interface TransactionHistoryProps {
  tokens: Token[];
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ tokens }) => {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();

  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'swap' | 'transfer'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch transaction history from Solana blockchain
  const fetchTransactionHistory = useCallback(async () => {
    if (!connected || !publicKey) return;

    try {
      setLoading(true);
      setError(null);

      // Get confirmed signatures for the wallet (last 50 transactions)
      const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 50 });

      console.log(`Found ${signatures.length} signatures for wallet ${publicKey.toString()}`);

      const transactionPromises = signatures.map(async (signatureInfo) => {
        try {
          // Get parsed transaction details
          const transaction = await connection.getParsedTransaction(signatureInfo.signature, {
            maxSupportedTransactionVersion: 0
          });

          if (!transaction || !transaction.meta) {
            return null;
          }

          const txData: TransactionData = {
            signature: signatureInfo.signature,
            timestamp: transaction.blockTime || Date.now() / 1000,
            type: 'unknown',
            status: transaction.meta.err ? 'failed' : 'success',
            fee: transaction.meta.fee / 1e9, // Convert lamports to SOL
            blockTime: transaction.blockTime || 0,
            slot: transaction.slot
          };

          // Parse token transfers
          const tokenTransfers = transaction.meta.preTokenBalances && transaction.meta.postTokenBalances
            ? parseTokenTransfers(transaction.meta.preTokenBalances, transaction.meta.postTokenBalances, publicKey.toString())
            : [];

          // Determine transaction type and extract token information
          if (tokenTransfers.length >= 2) {
            txData.type = 'swap';

            // Find the token we sent (decreased balance) and received (increased balance)
            const sentTransfer = tokenTransfers.find(t => t.changeAmount < 0);
            const receivedTransfer = tokenTransfers.find(t => t.changeAmount > 0);

            if (sentTransfer) {
              const sentToken = tokens.find(t => t.mint === sentTransfer.mint);
              txData.fromToken = {
                symbol: sentToken?.symbol || 'Unknown',
                amount: Math.abs(sentTransfer.changeAmount),
                mint: sentTransfer.mint
              };
            }

            if (receivedTransfer) {
              const receivedToken = tokens.find(t => t.mint === receivedTransfer.mint);
              txData.toToken = {
                symbol: receivedToken?.symbol || 'Unknown',
                amount: receivedTransfer.changeAmount,
                mint: receivedTransfer.mint
              };
            }
          } else if (tokenTransfers.length === 1) {
            txData.type = 'transfer';
            const transfer = tokenTransfers[0];
            const transferToken = tokens.find(t => t.mint === transfer.mint);

            if (transfer.changeAmount > 0) {
              txData.toToken = {
                symbol: transferToken?.symbol || 'Unknown',
                amount: transfer.changeAmount,
                mint: transfer.mint
              };
            } else {
              txData.fromToken = {
                symbol: transferToken?.symbol || 'Unknown',
                amount: Math.abs(transfer.changeAmount),
                mint: transfer.mint
              };
            }
          }

          return txData;
        } catch (error) {
          console.error(`Error parsing transaction ${signatureInfo.signature}:`, error);
          return null;
        }
      });

      // Wait for all transaction details to be fetched
      const transactionResults = await Promise.all(transactionPromises);
      const validTransactions = transactionResults.filter(tx => tx !== null) as TransactionData[];

      // Sort by timestamp (newest first)
      validTransactions.sort((a, b) => b.timestamp - a.timestamp);

      setTransactions(validTransactions);
      console.log(`Processed ${validTransactions.length} transactions`);

    } catch (error) {
      console.error('Error fetching transaction history:', error);
      setError('Failed to fetch transaction history. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [connected, publicKey, connection, tokens]);

  // Parse token balance changes to identify transfers
  const parseTokenTransfers = (
    preBalances: any[],
    postBalances: any[],
    walletAddress: string
  ) => {
    const transfers: Array<{
      mint: string;
      changeAmount: number;
      decimals: number;
    }> = [];

    // Create maps for easier lookup
    const preBalanceMap = new Map();
    const postBalanceMap = new Map();

    preBalances.forEach(balance => {
      if (balance.owner === walletAddress) {
        preBalanceMap.set(balance.mint, balance.uiTokenAmount.uiAmount || 0);
      }
    });

    postBalances.forEach(balance => {
      if (balance.owner === walletAddress) {
        postBalanceMap.set(balance.mint, balance.uiTokenAmount.uiAmount || 0);
      }
    });

    // Calculate changes
    const allMints = new Set([...preBalanceMap.keys(), ...postBalanceMap.keys()]);

    allMints.forEach(mint => {
      const preBal = preBalanceMap.get(mint) || 0;
      const postBal = postBalanceMap.get(mint) || 0;
      const change = postBal - preBal;

      if (Math.abs(change) > 0.000001) { // Filter out dust
        const tokenBalance = postBalances.find(b => b.mint === mint && b.owner === walletAddress);
        const decimals = tokenBalance?.uiTokenAmount?.decimals || 6;

        transfers.push({
          mint,
          changeAmount: change,
          decimals
        });
      }
    });

    return transfers;
  };

  // Manual refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTransactionHistory();
    setRefreshing(false);
  }, [fetchTransactionHistory]);

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    if (filter !== 'all' && tx.type !== filter) return false;
    if (searchTerm && !tx.signature.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !tx.fromToken?.symbol.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !tx.toToken?.symbol.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  // Get transaction type icon and color
  const getTransactionDisplay = (tx: TransactionData) => {
    switch (tx.type) {
      case 'swap':
        return {
          icon: <Activity className="w-4 h-4" />,
          color: 'blue',
          label: 'Swap'
        };
      case 'transfer':
        return {
          icon: tx.fromToken ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />,
          color: tx.fromToken ? 'red' : 'green',
          label: tx.fromToken ? 'Send' : 'Receive'
        };
      default:
        return {
          icon: <Activity className="w-4 h-4" />,
          color: 'gray',
          label: 'Unknown'
        };
    }
  };

  // Load transaction history on wallet connection
  useEffect(() => {
    if (connected && publicKey) {
      fetchTransactionHistory();
    } else {
      setTransactions([]);
    }
  }, [connected, publicKey, fetchTransactionHistory]);

  if (!connected) {
    return (
      <div className="bg-white/95 border-4 border-black rounded-[32px] p-3 shadow-2xl text-center">
        <div className="w-20 h-20 bg-playful-orange/10 rounded-2xl border-2 border-black flex items-center justify-center mx-auto mb-3">
          <Activity className="w-10 h-10 text-playful-orange" />
        </div>
        <h3 className="text-xs font-display font-bold text-[#2C2C2C] mb-3">Connect Wallet</h3>
        <p className="text-[#5C5C5C] font-body">Connect your wallet to view transaction history</p>
      </div>
    );
  }

  return (
    <div className="bg-white/95 border-4 border-black rounded-[32px] p-3 shadow-2xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-10 mb-3">
        <div>
          <h3 className="text-xs font-display font-bold text-[#2C2C2C] flex items-center gap-10 mb-2">
            <History className="w-6 h-6 text-playful-green" />
            Transaction History
          </h3>
          <p className="text-[#5C5C5C] text-xs font-body">Recent blockchain transactions from your wallet</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2.5 px-3 py-2.5 bg-white border-3 border-black rounded-2xl font-display font-semibold text-[#2C2C2C] hover:bg-gray-50 transition-all duration-200 shadow-lg disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-10 mb-3">
        <div className="flex gap-2.5">
          {[
            { value: 'all', label: 'All' },
            { value: 'swap', label: 'Swaps' },
            { value: 'transfer', label: 'Transfers' }
          ].map(filterOption => (
            <button
              key={filterOption.value}
              onClick={() => setFilter(filterOption.value as any)}
              className={`px-3 py-2 rounded-2xl font-display font-semibold transition-all duration-200 border-3 ${
                filter === filterOption.value
                  ? 'bg-playful-green text-white border-black shadow-lg'
                  : 'bg-white text-[#2C2C2C] border-black/20 hover:bg-gray-50'
              }`}
            >
              {filterOption.label}
            </button>
          ))}
        </div>

        <div className="flex-1 max-w-xs">
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border-3 border-black rounded-2xl font-body text-[#2C2C2C] placeholder-[#ACACAC] focus:outline-none focus:border-playful-green transition-all shadow-md"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && transactions.length === 0 && (
        <div className="text-center py-16">
          <div className="w-14 h-14 border-4 border-playful-green border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-[#5C5C5C] font-body font-medium">Loading transaction history...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-playful-orange/10 rounded-2xl border-2 border-black flex items-center justify-center mx-auto mb-3">
            <Activity className="w-10 h-10 text-playful-orange" />
          </div>
          <p className="text-playful-orange font-display font-bold mb-3">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-3 py-2.5 bg-playful-green text-white rounded-2xl font-display font-bold border-3 border-black shadow-lg hover:bg-playful-orange transition-all duration-200"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Transaction List */}
      {!loading && !error && (
        <div className="space-y-3">
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map((tx, index) => {
              const display = getTransactionDisplay(tx);

              return (
                <motion.div
                  key={tx.signature}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="border-3 border-black/20 rounded-2xl p-3 hover:bg-playful-cream/30 hover:border-playful-green/50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-10">
                      <div className={`w-12 h-12 rounded-2xl border-2 border-black flex items-center justify-center shadow-md ${
                        display.color === 'blue' ? 'bg-playful-green/10 text-playful-green' :
                        display.color === 'green' ? 'bg-playful-green/10 text-playful-green' :
                        display.color === 'red' ? 'bg-playful-orange/10 text-playful-orange' :
                        'bg-gray-100 text-[#5C5C5C]'
                      }`}>
                        {display.icon}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2.5 mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-body font-semibold border-2 ${
                            tx.status === 'success'
                              ? 'bg-playful-green/10 text-playful-green border-playful-green/20'
                              : 'bg-playful-orange/10 text-playful-orange border-playful-orange/20'
                          }`}>
                            {display.label}
                          </span>
                          <span className="px-3 py-1 bg-white border-2 border-black/10 rounded-full text-xs font-body font-medium text-[#5C5C5C]">
                            {tx.status === 'success' ? 'Success' : 'Failed'}
                          </span>
                        </div>

                        <div className="text-xs text-[#2C2C2C] font-body font-medium">
                          {tx.type === 'swap' && tx.fromToken && tx.toToken && (
                            <span>
                              {tx.fromToken.amount.toFixed(6)} {tx.fromToken.symbol} → {tx.toToken.amount.toFixed(6)} {tx.toToken.symbol}
                            </span>
                          )}
                          {tx.type === 'transfer' && tx.fromToken && (
                            <span>Sent {tx.fromToken.amount.toFixed(6)} {tx.fromToken.symbol}</span>
                          )}
                          {tx.type === 'transfer' && tx.toToken && (
                            <span>Received {tx.toToken.amount.toFixed(6)} {tx.toToken.symbol}</span>
                          )}
                          {tx.type === 'unknown' && (
                            <span>Transaction</span>
                          )}
                        </div>

                        <div className="text-xs text-[#5C5C5C] mt-2 flex items-center gap-2.5 font-body">
                          <Clock className="w-3 h-3" />
                          {formatTimestamp(tx.timestamp)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-[#5C5C5C] font-body mb-2">
                        Fee: <span className="font-semibold text-[#2C2C2C]">{tx.fee.toFixed(6)} SOL</span>
                      </div>
                      <button
                        onClick={() => window.open(`https://explorer.solana.com/tx/${tx.signature}`, '_blank')}
                        className="flex items-center gap-1.5 px-3 py-2.5 bg-white border-2 border-black/20 rounded-xl text-xs font-body font-semibold text-playful-green hover:bg-playful-green/10 hover:border-playful-green/50 transition-all"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Explorer
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-playful-orange/10 rounded-2xl border-2 border-black flex items-center justify-center mx-auto mb-3">
                <Activity className="w-10 h-10 text-playful-orange" />
              </div>
              <h3 className="text-xs font-display font-bold text-[#2C2C2C] mb-3">
                {filter === 'all' ? 'No Transactions' : `No ${filter} transactions`}
              </h3>
              <p className="text-[#5C5C5C] font-body">
                {searchTerm
                  ? 'No transactions match your search criteria'
                  : 'Start trading to see your transaction history'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Summary Stats */}
      {filteredTransactions.length > 0 && (
        <div className="mt-3 pt-8 border-t-3 border-black/20">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-10 text-center">
            <div className="p-3 bg-playful-cream/30 rounded-2xl">
              <p className="text-xs text-[#5C5C5C] font-body mb-1">Total Transactions</p>
              <p className="text-xs font-display font-bold text-[#2C2C2C]">{filteredTransactions.length}</p>
            </div>
            <div className="p-3 bg-playful-green/10 rounded-2xl">
              <p className="text-xs text-[#5C5C5C] font-body mb-1">Successful</p>
              <p className="text-xs font-display font-bold text-playful-green">
                {filteredTransactions.filter(tx => tx.status === 'success').length}
              </p>
            </div>
            <div className="p-3 bg-playful-orange/10 rounded-2xl">
              <p className="text-xs text-[#5C5C5C] font-body mb-1">Failed</p>
              <p className="text-xs font-display font-bold text-playful-orange">
                {filteredTransactions.filter(tx => tx.status === 'failed').length}
              </p>
            </div>
            <div className="p-3 bg-playful-cream/30 rounded-2xl">
              <p className="text-xs text-[#5C5C5C] font-body mb-1">Total Fees</p>
              <p className="text-xs font-display font-bold text-[#2C2C2C]">
                {filteredTransactions.reduce((sum, tx) => sum + tx.fee, 0).toFixed(4)} SOL
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};