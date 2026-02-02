'use client';
 
import { ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import { WalletProvider } from './lib/privy/wallet-context';
 
const solanaConnectors = toSolanaWalletConnectors({
  shouldAutoConnect: true,
});
 
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 2,
      },
    },
  });
}
 
let browserQueryClient: QueryClient | undefined = undefined;
 
function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}
 
interface ProvidersProps {
  children: ReactNode;
}
 
export function Providers({ children }: ProvidersProps) {
  const queryClient = getQueryClient();
 
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'placeholder-app-id'}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#9333EA',
          logo: '/logo.svg',
          showWalletLoginFirst: true,
        },
        loginMethods: ['wallet', 'email', 'google', 'twitter'],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        externalWallets: {
          solana: {
            connectors: solanaConnectors,
          },
        },
        // Solana configuration
        solanaClusters: [
          {
            name: 'mainnet-beta',
            rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
          },
          {
            name: 'devnet',
            rpcUrl: 'https://api.devnet.solana.com',
          },
        ],
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WalletProvider>
          {children}
        </WalletProvider>
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </PrivyProvider>
  );
}