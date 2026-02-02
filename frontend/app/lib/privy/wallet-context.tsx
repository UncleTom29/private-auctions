'use client';
 
import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from 'react';
import { usePrivy, useSolanaWallets } from '@privy-io/react-auth';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
 
interface WalletContextType {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  walletAddress: string | null;
  publicKey: PublicKey | null;
 
  // Actions
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
 
  // Balance
  balance: number | null;
  refreshBalance: () => Promise<void>;
 
  // Connection
  connection: Connection;
}
 
const WalletContext = createContext<WalletContextType | undefined>(undefined);
 
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
 
export function WalletProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets, ready: walletsReady } = useSolanaWallets();
 
  const [isConnecting, setIsConnecting] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
 
  // Create connection instance
  const connection = new Connection(RPC_URL, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
  });
 
  // Get the active wallet
  const activeWallet = wallets.find((w) => w.walletClientType === 'privy') || wallets[0];
  const walletAddress = activeWallet?.address || null;
  const publicKey = walletAddress ? new PublicKey(walletAddress) : null;
 
  const isConnected = authenticated && !!activeWallet;
 
  // Connect wallet
  const connect = useCallback(async () => {
    if (!ready) return;
    setIsConnecting(true);
    try {
      await login();
    } finally {
      setIsConnecting(false);
    }
  }, [ready, login]);
 
  // Disconnect wallet
  const disconnect = useCallback(async () => {
    await logout();
    setBalance(null);
  }, [logout]);
 
  // Sign a single transaction
  const signTransaction = useCallback(
    async (transaction: Transaction): Promise<Transaction> => {
      if (!activeWallet) {
        throw new Error('No wallet connected');
      }
 
      const signedTx = await activeWallet.signTransaction(transaction);
      return signedTx;
    },
    [activeWallet]
  );
 
  // Sign multiple transactions
  const signAllTransactions = useCallback(
    async (transactions: Transaction[]): Promise<Transaction[]> => {
      if (!activeWallet) {
        throw new Error('No wallet connected');
      }
 
      // Privy doesn't have signAllTransactions, sign one by one
      const signedTxs = await Promise.all(
        transactions.map((tx) => activeWallet.signTransaction(tx))
      );
      return signedTxs;
    },
    [activeWallet]
  );
 
  // Sign a message
  const signMessage = useCallback(
    async (message: Uint8Array): Promise<Uint8Array> => {
      if (!activeWallet) {
        throw new Error('No wallet connected');
      }
 
      const signature = await activeWallet.signMessage(message);
      return signature;
    },
    [activeWallet]
  );
 
  // Refresh balance
  const refreshBalance = useCallback(async () => {
    if (!publicKey) {
      setBalance(null);
      return;
    }
 
    try {
      const lamports = await connection.getBalance(publicKey);
      setBalance(lamports / 1e9); // Convert to SOL
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      setBalance(null);
    }
  }, [publicKey, connection]);
 
  // Auto-refresh balance when wallet changes
  useEffect(() => {
    if (isConnected && publicKey) {
      refreshBalance();
 
      // Set up balance polling
      const interval = setInterval(refreshBalance, 30000);
      return () => clearInterval(interval);
    }
  }, [isConnected, publicKey, refreshBalance]);
 
  const value: WalletContextType = {
    isConnected,
    isConnecting,
    walletAddress,
    publicKey,
    connect,
    disconnect,
    signTransaction,
    signAllTransactions,
    signMessage,
    balance,
    refreshBalance,
    connection,
  };
 
  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}
 
export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}