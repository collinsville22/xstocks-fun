import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { SwapQuote, SwapTransaction, LoadingState, ErrorState } from '@xstocks/types';

interface SwapState {
  // Form state
  inputAmount: string;
  selectedStock: string;
  
  // Quote state
  quote: SwapQuote | null;
  quoteLoading: boolean;
  
  // Transaction state
  transaction: SwapTransaction | null;
  transactionLoading: boolean;
  
  // UI state
  error: ErrorState;
  
  // Actions
  setInputAmount: (amount: string) => void;
  setSelectedStock: (stock: string) => void;
  setQuote: (quote: SwapQuote | null) => void;
  setQuoteLoading: (loading: boolean) => void;
  setTransaction: (transaction: SwapTransaction | null) => void;
  setTransactionLoading: (loading: boolean) => void;
  setError: (error: ErrorState) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  inputAmount: '',
  selectedStock: 'AAPL',
  quote: null,
  quoteLoading: false,
  transaction: null,
  transactionLoading: false,
  error: { hasError: false },
};

export const useSwapStore = create<SwapState>()(
  immer((set) => ({
    ...initialState,
    
    setInputAmount: (amount) => set((state) => {
      state.inputAmount = amount;
      // Clear quote when amount changes
      state.quote = null;
    }),
    
    setSelectedStock: (stock) => set((state) => {
      state.selectedStock = stock;
      // Clear quote when stock changes
      state.quote = null;
    }),
    
    setQuote: (quote) => set((state) => {
      state.quote = quote;
    }),
    
    setQuoteLoading: (loading) => set((state) => {
      state.quoteLoading = loading;
    }),
    
    setTransaction: (transaction) => set((state) => {
      state.transaction = transaction;
    }),
    
    setTransactionLoading: (loading) => set((state) => {
      state.transactionLoading = loading;
    }),
    
    setError: (error) => set((state) => {
      state.error = error;
    }),
    
    clearError: () => set((state) => {
      state.error = { hasError: false };
    }),
    
    reset: () => set(() => ({ ...initialState })),
  }))
);