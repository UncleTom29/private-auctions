/**
 * Application constants and configuration
 */

// Product Types
export const PRODUCT_TYPES = {
  NFT: 'nft',
  PHYSICAL: 'physical',
  DIGITAL: 'digital',
  SERVICE: 'service',
} as const;

export type ProductType = typeof PRODUCT_TYPES[keyof typeof PRODUCT_TYPES];

// Auction Statuses
export const AUCTION_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  REVEALING: 'revealing',
  SETTLED: 'settled',
  CANCELLED: 'cancelled',
} as const;

export type AuctionStatus = typeof AUCTION_STATUS[keyof typeof AUCTION_STATUS];

// Categories
export const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'art', label: 'Art & Collectibles' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'music', label: 'Music & Media' },
  { value: 'fashion', label: 'Fashion & Wearables' },
  { value: 'tech', label: 'Technology' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'other', label: 'Other' },
] as const;

// Payment Tokens
export const PAYMENT_TOKENS = {
  SOL: {
    mint: 'So11111111111111111111111111111111111111112',
    symbol: 'SOL',
    decimals: 9,
    name: 'Solana',
  },
  USDC: {
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin',
  },
  USDT: {
    mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    symbol: 'USDT',
    decimals: 6,
    name: 'Tether USD',
  },
} as const;

// Duration Presets (in seconds)
export const DURATION_PRESETS = {
  ONE_HOUR: 3600,
  SIX_HOURS: 21600,
  ONE_DAY: 86400,
  THREE_DAYS: 259200,
  ONE_WEEK: 604800,
  TWO_WEEKS: 1209600,
  ONE_MONTH: 2592000,
} as const;

// Reveal Window
export const REVEAL_WINDOW = {
  MIN: 3600, // 1 hour
  DEFAULT: 86400, // 24 hours
  MAX: 259200, // 3 days
} as const;

// Reputation Score Ranges
export const REPUTATION_RANGES = {
  EXCELLENT: { min: 800, max: 1000, color: 'success' },
  GOOD: { min: 600, max: 799, color: 'info' },
  FAIR: { min: 400, max: 599, color: 'warning' },
  POOR: { min: 0, max: 399, color: 'error' },
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  DEFAULT_OFFSET: 0,
} as const;

// File Upload
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES: 10,
  ACCEPTED_IMAGE_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ],
  ACCEPTED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
} as const;

// Rate Limits
export const RATE_LIMITS = {
  BID_SUBMISSION: { limit: 10, window: 60 }, // 10 per minute
  AUCTION_CREATION: { limit: 5, window: 3600 }, // 5 per hour
  API_REQUEST: { limit: 100, window: 60 }, // 100 per minute
} as const;

// ZK Proof Settings
export const ZK_PROOF = {
  MAX_PROOF_SIZE: 2048, // bytes
  ESTIMATED_GENERATION_TIME: 2500, // milliseconds
  TIMEOUT: 30000, // 30 seconds
} as const;

// Solana
export const SOLANA = {
  COMMITMENT: 'confirmed' as const,
  TIMEOUT: 60000, // 60 seconds
  MAX_RETRIES: 3,
} as const;

// Light Protocol
export const LIGHT_PROTOCOL = {
  MAX_COMPRESSED_ACCOUNTS: 10000,
  MERKLE_TREE_DEPTH: 26,
  GAS_SAVINGS_PERCENTAGE: 99,
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  AUCTIONS: '/api/auctions',
  BIDS: '/api/auctions/:id/bids',
  PROOFS: '/api/proofs/verify',
  WEBHOOKS: '/api/webhooks/helius',
  FULFILLMENT: '/api/fulfillment',
  USER_STATS: '/api/users/stats',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Please connect your wallet',
  INSUFFICIENT_BALANCE: 'Insufficient balance',
  AUCTION_ENDED: 'This auction has ended',
  AUCTION_NOT_FOUND: 'Auction not found',
  BID_TOO_LOW: 'Bid amount is below minimum',
  INVALID_PROOF: 'Invalid zero-knowledge proof',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later',
  NETWORK_ERROR: 'Network error. Please check your connection',
  UNKNOWN_ERROR: 'An unknown error occurred',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  AUCTION_CREATED: 'Auction created successfully!',
  BID_SUBMITTED: 'Bid submitted successfully!',
  BID_REVEALED: 'Bid revealed successfully!',
  AUCTION_CANCELLED: 'Auction cancelled successfully!',
  DELIVERY_CONFIRMED: 'Delivery confirmed!',
} as const;

// External Links
export const EXTERNAL_LINKS = {
  DOCS: 'https://docs.privateauction.xyz',
  DISCORD: 'https://discord.gg/privateauction',
  TWITTER: 'https://twitter.com/privateauction',
  GITHUB: 'https://github.com/privateauction',
  SOLSCAN: 'https://solscan.io',
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_MULTI_CURRENCY: false,
  ENABLE_FRACTIONAL_AUCTIONS: false,
  ENABLE_DUTCH_AUCTIONS: false,
  ENABLE_REPUTATION_STAKING: true,
  ENABLE_DISPUTE_RESOLUTION: true,
} as const;

// Deployment Info
export const DEPLOYMENT = {
  NETWORK: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'mainnet-beta',
  PROGRAM_ID: process.env.NEXT_PUBLIC_PROGRAM_ID || '',
  VERSION: '1.0.0',
  BUILD_ID: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'dev',
} as const;
