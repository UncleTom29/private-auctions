/* eslint-disable @typescript-eslint/no-explicit-any */
// Privy configuration for PrivateAuction
 
export const PRIVY_CONFIG = {
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
 
  // Login methods supported
  loginMethods: ['wallet', 'email', 'google', 'twitter'] as const,
 
  // Appearance configuration
  appearance: {
    theme: 'dark' as const,
    accentColor: '#9333EA', // Primary purple
    logo: '/logo.svg',
    showWalletLoginFirst: true,
  },
 
  // Embedded wallet configuration
  embeddedWallets: {
    createOnLogin: 'users-without-wallets' as const,
  },
 
  // Solana clusters
  solanaClusters: [
    {
      name: 'mainnet-beta' as const,
      rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL!,
    },
    {
      name: 'devnet' as const,
      rpcUrl: 'https://api.devnet.solana.com',
    },
  ],
};
 
// Supported wallet connectors
export const SUPPORTED_WALLETS = [
  'phantom',
  'solflare',
  'backpack',
  'coinbase_wallet',
] as const;
 
// Authentication states
export type AuthState =
  | 'unauthenticated'
  | 'connecting'
  | 'authenticated'
  | 'error';
 
// Helper to get user's primary wallet address
export function getPrimaryWalletAddress(user: any): string | null {
  if (!user) return null;
 
  // Check for linked Solana wallet first
  const solanaWallet = user.linkedAccounts?.find(
    (account: any) => account.type === 'wallet' && account.chainType === 'solana'
  );
 
  if (solanaWallet) {
    return solanaWallet.address;
  }
 
  // Fall back to embedded wallet
  const embeddedWallet = user.linkedAccounts?.find(
    (account: any) => account.type === 'wallet' && account.walletClientType === 'privy'
  );
 
  return embeddedWallet?.address || null;
}
 
// Helper to check if user has verified email
export function hasVerifiedEmail(user: any): boolean {
  return user?.linkedAccounts?.some(
    (account: any) => account.type === 'email' && account.verified
  );
}
 
// Helper to get user's display name
export function getUserDisplayName(user: any): string {
  if (!user) return 'Anonymous';
 
  // Check for linked social accounts
  const twitter = user.linkedAccounts?.find(
    (account: any) => account.type === 'twitter'
  );
  if (twitter?.username) return `@${twitter.username}`;
 
  const google = user.linkedAccounts?.find(
    (account: any) => account.type === 'google'
  );
  if (google?.name) return google.name;
 
  const email = user.linkedAccounts?.find(
    (account: any) => account.type === 'email'
  );
  if (email?.address) return email.address.split('@')[0];
 
  // Fall back to shortened wallet address
  const wallet = getPrimaryWalletAddress(user);
  if (wallet) {
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  }
 
  return 'Anonymous';
}
 