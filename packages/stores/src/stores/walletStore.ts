import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { WalletBalance } from '@xstocks/types';

interface WalletState {
  // Connection state
  connected: boolean;
  connecting: boolean;
  publicKey: string | null;
  
  // Balance state  
  balances: WalletBalance[];
  balancesLoading: boolean;
  
  // Actions
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setPublicKey: (publicKey: string | null) => void;
  setBalances: (balances: WalletBalance[]) => void;
  setBalancesLoading: (loading: boolean) => void;
  updateBalance: (mint: string, balance: WalletBalance) => void;
  disconnect: () => void;
}

const initialState = {
  connected: false,
  connecting: false,
  publicKey: null,
  balances: [],
  balancesLoading: false,
};

export const useWalletStore = create<WalletState>()(
  immer((set) => ({
    ...initialState,
    
    setConnected: (connected) => set((state) => {
      state.connected = connected;
      if (!connected) {
        state.publicKey = null;
        state.balances = [];
      }
    }),
    
    setConnecting: (connecting) => set((state) => {
      state.connecting = connecting;
    }),
    
    setPublicKey: (publicKey) => set((state) => {
      state.publicKey = publicKey;
    }),
    
    setBalances: (balances) => set((state) => {
      state.balances = balances;
    }),
    
    setBalancesLoading: (loading) => set((state) => {
      state.balancesLoading = loading;
    }),
    
    updateBalance: (mint, balance) => set((state) => {
      const index = state.balances.findIndex(b => b.mint === mint);
      if (index >= 0) {
        state.balances[index] = balance;
      } else {
        state.balances.push(balance);
      }
    }),
    
    disconnect: () => set(() => ({ ...initialState })),
  }))
);