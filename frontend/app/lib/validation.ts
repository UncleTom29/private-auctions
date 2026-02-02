/* eslint-disable @typescript-eslint/no-require-imports */
import { z } from 'zod';
import { PRODUCT_TYPES, PAYMENT_TOKENS, DURATION_PRESETS } from './constants';

/**
 * Solana address validation
 */
const solanaAddressSchema = z.string().refine(
  (val) => {
    try {
      const { PublicKey } = require('@solana/web3.js');
      new PublicKey(val);
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Invalid Solana address' }
);

/**
 * Create Auction Schema
 */
export const createAuctionSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),
  
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be less than 2000 characters'),
  
  productType: z.enum([
    PRODUCT_TYPES.NFT,
    PRODUCT_TYPES.PHYSICAL,
    PRODUCT_TYPES.DIGITAL,
    PRODUCT_TYPES.SERVICE,
  ]),
  
  category: z.string().min(1, 'Category is required'),
  
  images: z.array(z.string().url())
    .min(1, 'At least one image is required')
    .max(10, 'Maximum 10 images allowed'),
  
  reservePrice: z.number()
    .positive('Reserve price must be positive')
    .max(1000000, 'Reserve price too high'),
  
  duration: z.number()
    .min(3600, 'Duration must be at least 1 hour')
    .max(2592000, 'Duration must be less than 30 days'),
  
  revealDuration: z.number()
    .min(3600, 'Reveal duration must be at least 1 hour')
    .max(86400, 'Reveal duration must be less than 24 hours')
    .default(86400),
  
  paymentMint: solanaAddressSchema.default(PAYMENT_TOKENS.SOL.mint),
  
  minBidIncrement: z.number()
    .nonnegative('Minimum bid increment cannot be negative')
    .default(0.01),
  
  bidCollateral: z.number()
    .nonnegative('Bid collateral cannot be negative')
    .default(0.001),
  
  nftMint: solanaAddressSchema.optional(),
  
  metadata: z.record(z.string(), z.any()).optional(),
});

export type CreateAuctionInput = z.infer<typeof createAuctionSchema>;

/**
 * Submit Bid Schema
 */
export const submitBidSchema = z.object({
  auctionId: solanaAddressSchema,
  
  bidAmount: z.number()
    .positive('Bid amount must be positive')
    .max(1000000, 'Bid amount too high'),
  
  commitmentHash: z.string()
    .length(64, 'Invalid commitment hash'),
  
  proof: z.string()
    .min(1, 'Proof is required'),
  
  proofHash: z.string()
    .length(64, 'Invalid proof hash'),
  
  collateralAmount: z.number()
    .positive('Collateral amount must be positive'),
});

export type SubmitBidInput = z.infer<typeof submitBidSchema>;

/**
 * Reveal Bid Schema
 */
export const revealBidSchema = z.object({
  bidId: solanaAddressSchema,
  
  amount: z.number()
    .positive('Bid amount must be positive'),
  
  salt: z.array(z.number())
    .length(32, 'Salt must be 32 bytes'),
  
  proof: z.string()
    .min(1, 'Proof is required'),
});

export type RevealBidInput = z.infer<typeof revealBidSchema>;

/**
 * Update Auction Schema
 */
export const updateAuctionSchema = z.object({
  title: z.string()
    .min(1)
    .max(200)
    .optional(),
  
  description: z.string()
    .min(10)
    .max(2000)
    .optional(),
  
  images: z.array(z.string().url())
    .min(1)
    .max(10)
    .optional(),
  
  status: z.enum(['pending', 'active', 'revealing', 'settled', 'cancelled'])
    .optional(),
});

export type UpdateAuctionInput = z.infer<typeof updateAuctionSchema>;

/**
 * Shipping Address Schema
 */
export const shippingAddressSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  
  addressLine1: z.string().min(1, 'Address line 1 is required'),
  
  addressLine2: z.string().optional(),
  
  city: z.string().min(1, 'City is required'),
  
  state: z.string().min(2, 'State is required'),
  
  postalCode: z.string().min(1, 'Postal code is required'),
  
  country: z.string().length(2, 'Country must be 2-letter code'),
  
  phone: z.string().optional(),
});

export type ShippingAddress = z.infer<typeof shippingAddressSchema>;

/**
 * User Profile Schema
 */
export const userProfileSchema = z.object({
  displayName: z.string()
    .min(1)
    .max(50)
    .optional(),
  
  bio: z.string()
    .max(500)
    .optional(),
  
  avatar: z.string().url().optional(),
  
  email: z.string().email().optional(),
  
  notificationPreferences: z.object({
    email: z.boolean().default(true),
    push: z.boolean().default(true),
    sms: z.boolean().default(false),
  }).optional(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

/**
 * Query Filters Schema
 */
export const auctionFiltersSchema = z.object({
  category: z.string().optional(),
  
  productType: z.enum([
    PRODUCT_TYPES.NFT,
    PRODUCT_TYPES.PHYSICAL,
    PRODUCT_TYPES.DIGITAL,
    PRODUCT_TYPES.SERVICE,
    'all'
  ]).optional(),
  
  status: z.enum(['active', 'revealing', 'settled', 'cancelled', 'all']).optional(),
  
  sortBy: z.enum(['ending-soon', 'newest', 'most-bids', 'price-high', 'price-low']).optional(),
  
  search: z.string().max(100).optional(),
  
  limit: z.coerce.number().min(1).max(100).default(20),
  
  offset: z.coerce.number().min(0).default(0),
});

export type AuctionFilters = z.infer<typeof auctionFiltersSchema>;

/**
 * Dispute Schema
 */
export const disputeSchema = z.object({
  auctionId: solanaAddressSchema,
  
  reason: z.string()
    .min(10, 'Reason must be at least 10 characters')
    .max(1000, 'Reason must be less than 1000 characters'),
  
  evidence: z.array(z.string())
    .max(5, 'Maximum 5 evidence files allowed')
    .optional(),
});

export type DisputeInput = z.infer<typeof disputeSchema>;

/**
 * File Upload Schema
 */
export const fileUploadSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, 'File size must be less than 10MB')
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type),
      'File must be an image (JPEG, PNG, WebP, or GIF)'
    ),
});

/**
 * Helper function to safely parse with Zod
 */
export function safeParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, errors: result.error };
}
