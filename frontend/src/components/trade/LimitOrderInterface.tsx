import React, { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { Token, TriggerOrder, TriggerOrderData, OrderResponse } from '../../types';
import { walletService } from '../../lib/wallet';
import { jupiterService } from '../../lib/jupiter.js';

interface LimitOrderInterfaceProps {
  baseTokens: Token[];
  xstocks: Token[];
  onOrderCreated?: (orderId: string) => void;
}

export const LimitOrderInterface: React.FC<LimitOrderInterfaceProps> = ({ baseTokens, xstocks, onOrderCreated }) => {
  const { connected, publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [state, setState] = useState({
    inputToken: null as Token | null,
    outputToken: null as Token | null,
    makingAmount: '',   // Exact amount you're giving
    takingAmount: '',   // Exact amount you're getting
    expiry: '',
    usdValue: null as number | null,
    loading: false,
    error: null as string | null
  });

  // Order management state
  const [orders, setOrders] = useState<TriggerOrderData[]>([]);
  const [showOrders, setShowOrders] = useState(false);
  const [executionType, setExecutionType] = useState<'automatic' | 'manual'>('automatic');

  const updateState = useCallback((updates: Partial<typeof state>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  useEffect(() => {
    // Reset form when trade type changes
    setState({
      inputToken: null,
      outputToken: null,
      makingAmount: '',
      takingAmount: '',
      expiry: '',
      loading: false,
      error: null
    });
  }, [tradeType]);

  const getAvailableInputTokens = useCallback(() => {
    return tradeType === 'buy' ? baseTokens : xstocks;
  }, [tradeType, baseTokens, xstocks]);

  const getAvailableOutputTokens = useCallback(() => {
    return tradeType === 'buy' ? xstocks : baseTokens;
  }, [tradeType, xstocks, baseTokens]);

  const handleInputTokenChange = useCallback((tokenSymbol: string) => {
    const token = getAvailableInputTokens().find(t => t.symbol === tokenSymbol);
    if (token) {
      updateState({
        inputToken: token,
        outputToken: null // Reset output token when input token changes
      });
    }
  }, [getAvailableInputTokens, updateState]);

  const handleOutputTokenChange = useCallback((tokenSymbol: string) => {
    const token = getAvailableOutputTokens().find(t => t.symbol === tokenSymbol);
    if (token) {
      updateState({ outputToken: token });
    }
  }, [getAvailableOutputTokens, updateState]);

  // Calculate taking amount based on making amount (using Jupiter quote)
  const calculateTakingAmount = useCallback(async (makingAmount: string) => {
    if (!state.inputToken || !state.outputToken || !makingAmount) return '';

    try {
      const rawAmount = parseFloat(makingAmount);
      const adjustedAmount = (rawAmount * Math.pow(10, state.inputToken.decimals)).toString();

      const quote = await jupiterService.getQuote(
        state.inputToken.mint,
        state.outputToken.mint,
        adjustedAmount,
        50
      );

      const takingAmount = (parseInt(quote.outAmount) / Math.pow(10, state.outputToken.decimals)).toFixed(6);
      return takingAmount;
    } catch (error) {
      console.error('Failed to calculate taking amount:', error);
      return '';
    }
  }, [state.inputToken, state.outputToken]);

  const handleMakingAmountChange = useCallback(async (amount: string) => {
    updateState({ makingAmount: amount, usdValue: null });
    if (amount && state.inputToken && state.outputToken) {
      const takingAmount = await calculateTakingAmount(amount);

      // Calculate USD value for validation
      try {
        const makingAmountRaw = (parseFloat(amount) * Math.pow(10, state.inputToken.decimals)).toString();
        const validation = await jupiterService.validateMinimumOrderSize(state.inputToken.mint, makingAmountRaw);
        updateState({ takingAmount, usdValue: validation.usdValue });
      } catch (error) {
        console.error('Failed to calculate USD value:', error);
        updateState({ takingAmount });
      }
    }
  }, [calculateTakingAmount, state.inputToken, state.outputToken, updateState]);

  const handleTakingAmountChange = useCallback((amount: string) => {
    updateState({ takingAmount: amount });
  }, [updateState]);

  // Load user orders
  const loadUserOrders = useCallback(async () => {
    if (!publicKey) return;

    try {
      const userOrders = await jupiterService.getTriggerOrders(publicKey.toString());
      setOrders(userOrders || []);
    } catch (error) {
      console.error('Failed to load orders:', error);
    }
  }, [publicKey]);

  // Execute order manually
  const handleExecuteOrder = useCallback(async (orderId: string) => {
    if (!publicKey) return;

    try {
      const response = await jupiterService.executeTriggerOrder(orderId, publicKey.toString());
      console.log('Order executed:', response);
      loadUserOrders();
    } catch (error) {
      console.error('Failed to execute order:', error);
    }
  }, [publicKey, loadUserOrders]);

  // Cancel order
  const handleCancelOrder = useCallback(async (orderId: string) => {
    if (!publicKey) return;

    try {
      const response = await jupiterService.cancelTriggerOrder(orderId, publicKey.toString());
      console.log('Order cancelled:', response);
      loadUserOrders();
    } catch (error) {
      console.error('Failed to cancel order:', error);
    }
  }, [publicKey, loadUserOrders]);

  const handleCreateOrder = useCallback(async () => {
    if (!connected || !publicKey || !sendTransaction || !state.inputToken || !state.outputToken) {
      updateState({ error: 'Please connect your wallet and select tokens' });
      return;
    }

    if (!state.makingAmount || !state.takingAmount) {
      updateState({ error: 'Please fill in all amount fields' });
      return;
    }

    try {
      updateState({ loading: true, error: null });

      console.log('Creating limit order with Jupiter Trigger API...');

      // Validate minimum order size ($5 USD)
      const makingAmountRaw = (parseFloat(state.makingAmount) * Math.pow(10, state.inputToken.decimals)).toString();
      const validation = await jupiterService.validateMinimumOrderSize(state.inputToken.mint, makingAmountRaw);

      if (!validation.isValid) {
        updateState({ error: validation.message || 'Order size must be at least $0.10 USD' });
        return;
      }

      const order: TriggerOrder = {
        inputMint: state.inputToken.mint,
        outputMint: state.outputToken.mint,
        makingAmount: makingAmountRaw,
        takingAmount: (parseFloat(state.takingAmount) * Math.pow(10, state.outputToken.decimals)).toString(),
        maker: publicKey.toString(),
        expiry: state.expiry ? Math.floor(new Date(state.expiry).getTime() / 1000) : undefined, // Unix timestamp in seconds
        executionType
      };

      // Create trigger order using Jupiter Trigger API
      const orderResponse = await jupiterService.createTriggerOrder(order);

      console.log('Trigger order response received:', orderResponse);

      let orderId = orderResponse.orderId || orderResponse.requestId;

      // If the response contains transaction data, process it
      if (orderResponse.transaction || orderResponse.swapTransaction) {
        const transactionData = orderResponse.transaction || orderResponse.swapTransaction;
        if (transactionData) {
          const transactionBuffer = Buffer.from(transactionData, 'base64');

          let transaction;
          try {
            transaction = VersionedTransaction.deserialize(transactionBuffer);
            console.log('Deserialized as VersionedTransaction');
          } catch (versionedError) {
            try {
              transaction = Transaction.from(transactionBuffer);
              console.log('Deserialized as legacy Transaction');
            } catch (legacyError) {
              console.error('Failed to deserialize transaction:', versionedError, legacyError);
              throw new Error('Failed to deserialize transaction');
            }
          }

          const signature = await sendTransaction(transaction, connection);
          orderId = signature;
          console.log('Transaction sent:', signature);
        }
      }

      if (onOrderCreated && orderId) {
        onOrderCreated(orderId);
      }

      // Reset form
      updateState({
        makingAmount: '',
        takingAmount: '',
        expiry: '',
        usdValue: null,
        loading: false
      });

      // Reload orders
      loadUserOrders();

    } catch (error) {
      console.error('Limit order error:', error);
      updateState({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to create limit order'
      });
    }
  }, [connected, publicKey, sendTransaction, connection, state, executionType, onOrderCreated, updateState, loadUserOrders]);

  const canCreateOrder = useCallback(() => {
    return connected &&
           state.inputToken &&
           state.outputToken &&
           state.makingAmount &&
           state.takingAmount &&
           state.usdValue !== null &&
           state.usdValue >= 0.1 &&
           !state.loading;
  }, [connected, state.inputToken, state.outputToken, state.makingAmount, state.takingAmount, state.usdValue, state.loading]);

  // Load orders when component mounts and when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      loadUserOrders();
    }
  }, [connected, publicKey, loadUserOrders]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-3">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xs font-bold text-[#2C2C2C]">Limit Orders</h2>

        <div className="flex gap-2.5">
          <button
            onClick={() => setShowOrders(!showOrders)}
            className="px-3 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            {showOrders ? 'Hide Orders' : 'My Orders'} ({orders.length})
          </button>
        </div>
      </div>

      {/* Trade Type and Execution Type */}
      <div className="flex gap-10 mb-3">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setTradeType('buy')}
            className={`px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
              tradeType === 'buy'
                ? 'bg-blue-600 text-white'
                : 'text-[#5C5C5C] hover:text-[#2C2C2C]'
            }`}
          >
            Buy xStocks
          </button>
          <button
            onClick={() => setTradeType('sell')}
            className={`px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
              tradeType === 'sell'
                ? 'bg-blue-600 text-white'
                : 'text-[#5C5C5C] hover:text-[#2C2C2C]'
            }`}
          >
            Sell xStocks
          </button>
        </div>

        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setExecutionType('automatic')}
            className={`px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
              executionType === 'automatic'
                ? 'bg-green-600 text-white'
                : 'text-[#5C5C5C] hover:text-[#2C2C2C]'
            }`}
          >
            Auto Execute
          </button>
          <button
            onClick={() => setExecutionType('manual')}
            className={`px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
              executionType === 'manual'
                ? 'bg-orange-600 text-white'
                : 'text-[#5C5C5C] hover:text-[#2C2C2C]'
            }`}
          >
            Manual Execute
          </button>
        </div>
      </div>

      {state.error && (
        <div className="mb-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {state.error}
        </div>
      )}

      {/* Order Management Panel */}
      {showOrders && (
        <div className="mb-3 bg-gray-50 rounded-lg p-3">
          <h3 className="text-xs font-semibold mb-3">Your Limit Orders</h3>
          {orders.length === 0 ? (
            <p className="text-[#5C5C5C]">No active orders</p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order.orderId} className="bg-white p-3 rounded-lg border">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-mono text-xs text-[#5C5C5C]">{order.orderId}</div>
                      <div className="text-xs text-[#5C5C5C]">
                        Status: <span className={`font-medium ${
                          order.status === 'pending' ? 'text-yellow-600' :
                          order.status === 'executed' ? 'text-green-600' :
                          order.status === 'cancelled' ? 'text-red-600' :
                          'text-[#5C5C5C]'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      {order.status === 'pending' && executionType === 'manual' && (
                        <button
                          onClick={() => handleExecuteOrder(order.orderId)}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                        >
                          Execute
                        </button>
                      )}
                      {order.status === 'pending' && (
                        <button
                          onClick={() => handleCancelOrder(order.orderId)}
                          className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {/* Input Token */}
        <div className="border border-black/30 rounded-lg p-3">
          <label className="block text-xs font-medium text-[#3C3C3C] mb-2">
            You Give Exactly ({tradeType === 'buy' ? 'Pay With' : 'Sell'})
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <select
              value={state.inputToken?.symbol || ''}
              onChange={(e) => handleInputTokenChange(e.target.value)}
              className="px-3 py-2 border border-black/30 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select token</option>
              {getAvailableInputTokens().map(token => (
                <option key={`input-${token.symbol}`} value={token.symbol}>
                  {token.symbol} - {token.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={state.makingAmount}
              onChange={(e) => handleMakingAmountChange(e.target.value)}
              placeholder="0.0"
              className="px-3 py-2 border border-black/30 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!state.inputToken}
            />
          </div>
        </div>

        {/* Output Token */}
        <div className="border border-black/30 rounded-lg p-3">
          <label className="block text-xs font-medium text-[#3C3C3C] mb-2">
            You Get Exactly ({tradeType === 'buy' ? 'Receive' : 'Get'})
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <select
              value={state.outputToken?.symbol || ''}
              onChange={(e) => handleOutputTokenChange(e.target.value)}
              className="px-3 py-2 border border-black/30 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!state.inputToken}
            >
              <option value="">Select token</option>
              {getAvailableOutputTokens().map(token => (
                <option key={`output-${token.symbol}`} value={token.symbol}>
                  {token.symbol} - {token.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={state.takingAmount}
              onChange={(e) => handleTakingAmountChange(e.target.value)}
              placeholder="0.0"
              className="px-3 py-2 border border-black/30 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!state.inputToken}
            />
          </div>
        </div>

        {/* Exchange Rate Info */}
        {state.inputToken && state.outputToken && state.makingAmount && state.takingAmount && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-xs text-blue-800">
              <div>Exchange Rate: 1 {state.inputToken.symbol} = {
                (parseFloat(state.takingAmount) / parseFloat(state.makingAmount)).toFixed(6)
              } {state.outputToken.symbol}</div>
              <div>Execution: {executionType === 'automatic' ? 'Jupiter monitors and executes automatically' : 'You execute manually when ready'}</div>
              {state.usdValue !== null && (
                <div className="mt-2">
                  <div className="font-medium">
                    Order Value: ${state.usdValue.toFixed(2)} USD
                    {state.usdValue < 0.1 && (
                      <span className="ml-2 text-red-600 font-bold">
                        ⚠️ Below $0.10 minimum
                      </span>
                    )}
                  </div>
                  {state.usdValue < 0.1 && (
                    <div className="text-red-600 mt-1 text-xs">
                      Jupiter requires a minimum order size of $0.10 USD
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Expiry */}
        <div className="border border-black/30 rounded-lg p-3">
          <label className="block text-xs font-medium text-[#3C3C3C] mb-2">
            Expiry (Optional)
          </label>
          <input
            type="datetime-local"
            value={state.expiry}
            onChange={(e) => updateState({ expiry: e.target.value })}
            className="w-full px-3 py-2 border border-black/30 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Create Order Button */}
        <button
          onClick={handleCreateOrder}
          disabled={!canCreateOrder()}
          className={`w-full py-2.5 px-3 rounded-lg font-medium transition-colors ${
            canCreateOrder()
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-[#5C5C5C] cursor-not-allowed'
          }`}
        >
          {state.loading ? 'Creating Order...' :
           state.usdValue === null ? 'Calculating Value...' :
           state.usdValue < 0.1 ? `Order Below $0.10 Minimum` :
           `Create ${tradeType === 'buy' ? 'Buy' : 'Sell'} Limit Order`}
        </button>
      </div>
    </div>
  );
};