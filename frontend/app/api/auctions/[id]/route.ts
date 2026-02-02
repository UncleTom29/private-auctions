import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';
import { PublicKey } from '@solana/web3.js';
import { getCompressedAuction } from '@/app/lib/solana/compression';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auctionId = params.id;

    // Validate auction ID
    try {
      new PublicKey(auctionId);
    } catch {
      return NextResponse.json(
        { error: 'Invalid auction ID' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Fetch from database
    const { data: auction, error } = await supabase
      .from('auctions')
      .select(`
        *,
        seller:users!auctions_seller_id_fkey (
          wallet_addresses,
          reputation_score,
          completed_auctions
        )
      `)
      .eq('on_chain_id', auctionId)
      .single();

    if (error || !auction) {
      // Try to fetch from compressed state on-chain
      const compressedAuction = await getCompressedAuction(new PublicKey(auctionId));
      
      if (!compressedAuction) {
        return NextResponse.json(
          { error: 'Auction not found' },
          { status: 404 }
        );
      }

      // Return on-chain data if DB is out of sync
      return NextResponse.json(compressedAuction);
    }

    // Parse metadata from IPFS if needed
    let metadata = {};
    if (auction.ipfs_hash) {
      try {
        const ipfsResponse = await fetch(`https://gateway.pinata.cloud/ipfs/${auction.ipfs_hash}`);
        metadata = await ipfsResponse.json();
      } catch (err) {
        console.error('Failed to fetch IPFS metadata:', err);
      }
    }

    const response = {
      id: auction.on_chain_id,
      title: auction.title,
      description: auction.description,
      images: auction.images,
      category: auction.category,
      productType: auction.product_type,
      bidCount: auction.bid_count,
      endsAt: auction.ends_at,
      status: auction.status,
      merkleTree: auction.merkle_tree_id,
      paymentMint: auction.payment_mint || 'So11111111111111111111111111111111111111112', // SOL
      minBidIncrement: auction.min_bid_increment || 0.01,
      bidCollateral: auction.bid_collateral || 0.001,
      seller: {
        address: auction.seller.wallet_addresses[0],
        reputationScore: auction.seller.reputation_score,
        completedAuctions: auction.seller.completed_auctions,
      },
      metadata,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in GET /api/auctions/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auctionId = params.id;
    const updates = await request.json();

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

    // Verify auction ownership
    const { data: auction, error: fetchError } = await supabase
      .from('auctions')
      .select('seller_id, status, users!auctions_seller_id_fkey(privy_id)')
      .eq('on_chain_id', auctionId)
      .single();

    if (fetchError || !auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      );
    }

  
    if (auction.users.privy_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Only allow updates on pending auctions
    if (auction.status !== 'pending' && auction.status !== 'active') {
      return NextResponse.json(
        { error: 'Auction cannot be modified' },
        { status: 400 }
      );
    }

    // Update auction
    const { data: updated, error: updateError } = await supabase
      .from('auctions')
      .update(updates)
      .eq('on_chain_id', auctionId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update auction' },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error in PATCH /api/auctions/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Verify auction ownership and status
    const { data: auction, error: fetchError } = await supabase
      .from('auctions')
      .select('seller_id, status, bid_count, users!auctions_seller_id_fkey(privy_id)')
      .eq('on_chain_id', auctionId)
      .single();

    if (fetchError || !auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      );
    }

    if (auction.users.privy_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Can only cancel if no bids placed
    if (auction.bid_count > 0) {
      return NextResponse.json(
        { error: 'Cannot cancel auction with bids' },
        { status: 400 }
      );
    }

    // Update status to cancelled
    const { error: updateError } = await supabase
      .from('auctions')
      .update({ status: 'cancelled' })
      .eq('on_chain_id', auctionId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to cancel auction' },
        { status: 500 }
      );
    }

    // TODO: Cancel on-chain auction via transaction

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/auctions/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
