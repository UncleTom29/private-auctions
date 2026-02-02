import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';
import { z } from 'zod';
import { PublicKey } from '@solana/web3.js';
import { verifyProof } from '@/app/lib/noir/verifier';
import { buildSubmitBidTransaction } from '@/app/lib/solana/transactions';
import { checkRateLimit } from '@/app/lib/rate-limit';

const submitBidSchema = z.object({
  commitmentHash: z.string().length(64), // 32 bytes hex
  proof: z.string(), // Base64 encoded proof
  proofHash: z.string().length(64),
  collateralAmount: z.number().positive(),
});

/**
 * POST /api/auctions/[id]/bids - Submit bid with ZK proof
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auctionId = params.id;
    const body = await request.json();
    const validatedData = submitBidSchema.parse(body);

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

    // Rate limiting
    const rateLimitKey = `bid:${session.user.id}:${auctionId}`;
    try {
      await checkRateLimit(rateLimitKey);
    } catch {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before submitting another bid.' },
        { status: 429 }
      );
    }

    // Get user
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

    const bidderPubkey = new PublicKey(user.wallet_addresses[0]);

    // Verify auction exists and is active
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('status, ends_at, payment_mint, bid_collateral')
      .eq('on_chain_id', auctionId)
      .single();

    if (auctionError || !auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      );
    }

    if (auction.status !== 'active') {
      return NextResponse.json(
        { error: 'Auction is not accepting bids' },
        { status: 400 }
      );
    }

    // Check if auction has ended
    if (new Date(auction.ends_at) < new Date()) {
      return NextResponse.json(
        { error: 'Auction has ended' },
        { status: 400 }
      );
    }

    // Check if user already has a bid
    const { data: existingBid } = await supabase
      .from('bids')
      .select('id')
      .eq('auction_id', auctionId)
      .eq('bidder_id', user.id)
      .single();

    if (existingBid) {
      return NextResponse.json(
        { error: 'You already have a bid on this auction' },
        { status: 400 }
      );
    }

    // Verify ZK proof
    const proofBuffer = Buffer.from(validatedData.proof, 'base64');
    const publicInputs = {
      commitmentHash: validatedData.commitmentHash,
      // Reserve price would be fetched from auction
    };

    const isValidProof = await verifyProof(proofBuffer, publicInputs);

    if (!isValidProof) {
      return NextResponse.json(
        { error: 'Invalid proof' },
        { status: 400 }
      );
    }

    // Build bid submission transaction
    const { transaction } = await buildSubmitBidTransaction({
      auctionId: new PublicKey(auctionId),
      bidder: bidderPubkey,
      commitmentHash: Buffer.from(validatedData.commitmentHash, 'hex'),
      proof: proofBuffer,
      proofHash: Buffer.from(validatedData.proofHash, 'hex'),
      paymentMint: new PublicKey(auction.payment_mint || 'So11111111111111111111111111111111111111112'),
      collateralAmount: validatedData.collateralAmount,
    });

    // Serialize transaction
    const serializedTx = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    // Store bid in database (pending until confirmed)
    const { data: bid, error: bidError } = await supabase
      .from('bids')
      .insert({
        auction_id: auctionId,
        bidder_id: user.id,
        commitment_hash: validatedData.commitmentHash,
        revealed: false,
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (bidError) {
      console.error('Failed to store bid:', bidError);
      return NextResponse.json(
        { error: 'Failed to submit bid' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      bidId: bid.id,
      transaction: serializedTx.toString('base64'),
    });
  } catch (error) {
    console.error('Error in POST /api/auctions/[id]/bids:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
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
 * GET /api/auctions/[id]/bids - Get user's bids for auction
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auctionId = params.id;

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

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('privy_id', session.user.id)
      .single();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch user's bids for this auction
    const { data: bids, error } = await supabase
      .from('bids')
      .select('*')
      .eq('auction_id', auctionId)
      .eq('bidder_id', user.id)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Failed to fetch bids:', error);
      return NextResponse.json(
        { error: 'Failed to fetch bids' },
        { status: 500 }
      );
    }

    return NextResponse.json(bids);
  } catch (error) {
    console.error('Error in GET /api/auctions/[id]/bids:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
