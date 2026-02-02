import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';
import { z } from 'zod';
import { PublicKey } from '@solana/web3.js';
import { uploadToIPFS } from '@/app/lib/storage/ipfs';
import { buildCreateAuctionTransaction } from '@/app/lib/solana/transactions';
import { getConnection } from '@/app/lib/solana/connection';

// Validation schemas
const createAuctionSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  productType: z.enum(['nft', 'physical', 'digital', 'service']),
  category: z.string(),
  images: z.array(z.string()).min(1).max(10),
  reservePriceHash: z.string(),
  duration: z.number().min(3600).max(2592000), // 1 hour to 30 days
  revealDuration: z.number().min(3600).max(86400), // 1 to 24 hours
  paymentMint: z.string(),
  minBidIncrement: z.number().min(0),
  bidCollateral: z.number().min(0),
  nftMint: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const querySchema = z.object({
  category: z.string().optional(),
  productType: z.enum(['nft', 'physical', 'digital', 'service']).optional(),
  status: z.enum(['active', 'revealing', 'settled', 'cancelled']).optional(),
  sortBy: z.enum(['ending-soon', 'newest', 'most-bids', 'price-high', 'price-low']).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

/**
 * GET /api/auctions - List auctions with filters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const filters = querySchema.parse(searchParams);

    const supabase = createClient();

    let query = supabase
      .from('auctions')
      .select(`
        *,
        seller:users!auctions_seller_id_fkey (
          wallet_addresses,
          reputation_score,
          completed_auctions
        )
      `);

    // Apply filters
    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    if (filters.productType) {
      query = query.eq('product_type', filters.productType);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    } else {
      // Default to active auctions
      query = query.eq('status', 'active');
    }

    if (filters.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
      );
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'ending-soon':
        query = query.order('ends_at', { ascending: true });
        break;
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'most-bids':
        query = query.order('bid_count', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch auctions' },
        { status: 500 }
      );
    }

    // Transform data for client
    const auctions = data.map((auction) => ({
      id: auction.on_chain_id,
      title: auction.title,
      description: auction.description,
      images: auction.images,
      category: auction.category,
      productType: auction.product_type,
      bidCount: auction.bid_count,
      endsAt: auction.ends_at,
      status: auction.status,
      seller: {
        address: auction.seller.wallet_addresses[0],
        reputationScore: auction.seller.reputation_score,
        completedAuctions: auction.seller.completed_auctions,
      },
    }));

    return NextResponse.json(auctions);
  } catch (error) {
    console.error('Error in GET /api/auctions:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auctions - Create new auction
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createAuctionSchema.parse(body);

    const supabase = createClient();

    // Get authenticated user
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, wallet_addresses')
      .eq('privy_id', session.user.id)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const sellerPubkey = new PublicKey(user.wallet_addresses[0]);

    // Upload metadata to IPFS
    const metadata = {
      title: validatedData.title,
      description: validatedData.description,
      images: validatedData.images,
      category: validatedData.category,
      productType: validatedData.productType,
      ...validatedData.metadata,
    };

    const ipfsHash = await uploadToIPFS(metadata);

    // Build auction creation transaction
    const { transaction } = await buildCreateAuctionTransaction({
      seller: sellerPubkey,
      productType: ['nft', 'physical', 'digital', 'service'].indexOf(validatedData.productType),
      category: 0, // Map category to enum
      reservePriceHash: Buffer.from(validatedData.reservePriceHash, 'hex'),
      duration: validatedData.duration,
      revealDuration: validatedData.revealDuration,
      ipfsHash,
      title: validatedData.title,
      description: validatedData.description,
      images: validatedData.images,
      paymentMint: new PublicKey(validatedData.paymentMint),
      minBidIncrement: validatedData.minBidIncrement,
      bidCollateral: validatedData.bidCollateral,
      nftMint: validatedData.nftMint ? new PublicKey(validatedData.nftMint) : undefined,
    });

    // Serialize transaction for client to sign
    const serializedTx = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    // Calculate end time
    const endsAt = new Date(Date.now() + validatedData.duration * 1000);

    // Store in database (status pending until transaction confirms)
    const { data: auction, error: insertError } = await supabase
      .from('auctions')
      .insert({
        seller_id: user.id,
        product_type: validatedData.productType,
        category: validatedData.category,
        title: validatedData.title,
        description: validatedData.description,
        ipfs_hash: ipfsHash,
        images: validatedData.images,
        reserve_price_hash: validatedData.reservePriceHash,
        duration: validatedData.duration,
        status: 'pending',
        ends_at: endsAt.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create auction' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      auctionId: auction.id,
      transaction: serializedTx.toString('base64'),
      ipfsHash,
    });
  } catch (error) {
    console.error('Error in POST /api/auctions:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
