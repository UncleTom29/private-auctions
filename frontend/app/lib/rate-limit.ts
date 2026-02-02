import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Create rate limiters for different operations
export const rateLimiters = {
  // Bid submissions: 10 per minute per user per auction
  bidSubmission: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
    prefix: 'ratelimit:bid',
  }),

  // Auction creation: 5 per hour per user
  auctionCreation: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    analytics: true,
    prefix: 'ratelimit:auction',
  }),

  // Proof verification: 100 per minute global
  proofVerification: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
    prefix: 'ratelimit:proof',
  }),

  // API requests: 100 per minute per IP
  apiRequest: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
    prefix: 'ratelimit:api',
  }),
};

/**
 * Check rate limit for a given identifier
 */
export async function checkRateLimit(
  identifier: string,
  type: keyof typeof rateLimiters = 'apiRequest'
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const limiter = rateLimiters[type];
  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  if (!success) {
    throw new Error('Rate limit exceeded');
  }

  return { success, limit, remaining, reset };
}

/**
 * Get rate limit info without incrementing
 */
export async function getRateLimitInfo(
  identifier: string,
  type: keyof typeof rateLimiters = 'apiRequest'
) {
  const key = `${rateLimiters[type].prefix}:${identifier}`;
  const ttl = await redis.ttl(key);
  const count = await redis.get<number>(key);

  return {
    count: count || 0,
    reset: ttl > 0 ? Date.now() + ttl * 1000 : 0,
  };
}
