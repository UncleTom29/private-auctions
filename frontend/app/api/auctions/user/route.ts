/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

/**
 * GET /api/auctions/user - Get user's auctions
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'active-bids';

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
      .select('id')
      .eq('privy_id', session.user.id)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    let auctions: any[] = [];

    switch (type) {
      case 'active-bids': {
        // Get auctions where user has active bids
        const { data: bidAuctions } = await supabase
          .from('bids')
          .select(`
            auction_id,
            auctions!inner (
              *,
              seller:users!auctions_seller_id_fkey (
                wallet_addresses,
                reputation_score,
                completed_auctions
              )
            )
          `)
          .eq('bidder_id', user.id)
          .eq('revealed', false)
          .eq('auctions.status', 'active');

        auctions = bidAuctions?.map(b => ({
          ...b.auctions,
          id: b.auctions.on_chain_id,
          seller: {
            address: b.auctions.seller.wallet_addresses[0],
            reputationScore: b.auctions.seller.reputation_score,
            completedAuctions: b.auctions.seller.completed_auctions,
          },
        })) || [];
        break;
      }

      case 'won': {
        // Get auctions user has won
        const { data: wonAuctions } = await supabase
          .from('fulfillments')
          .select(`
            auction_id,
            auctions!inner (
              *,
              seller:users!auctions_seller_id_fkey (
                wallet_addresses,
                reputation_score,
                completed_auctions
              )
            )
          `)
          .eq('buyer_id', user.id);

        auctions = wonAuctions?.map(f => ({
          ...f.auctions,
          id: f.auctions.on_chain_id,
          seller: {
            address: f.auctions.seller.wallet_addresses[0],
            reputationScore: f.auctions.seller.reputation_score,
            completedAuctions: f.auctions.seller.completed_auctions,
          },
        })) || [];
        break;
      }

      case 'created': {
        // Get auctions created by user
        const { data: createdAuctions } = await supabase
          .from('auctions')
          .select(`
            *,
            seller:users!auctions_seller_id_fkey (
              wallet_addresses,
              reputation_score,
              completed_auctions
            )
          `)
          .eq('seller_id', user.id)
          .order('created_at', { ascending: false });

        auctions = createdAuctions?.map(a => ({
          ...a,
          id: a.on_chain_id,
          seller: {
            address: a.seller.wallet_addresses[0],
            reputationScore: a.seller.reputation_score,
            completedAuctions: a.seller.completed_auctions,
          },
        })) || [];
        break;
      }

      case 'past': {
        // Get all past activity (settled or cancelled)
        const { data: pastAuctions } = await supabase
          .from('auctions')
          .select(`
            *,
            seller:users!auctions_seller_id_fkey (
              wallet_addresses,
              reputation_score,
              completed_auctions
            )
          `)
          .or(`seller_id.eq.${user.id},id.in.(select auction_id from bids where bidder_id = ${user.id})`)
          .in('status', ['settled', 'cancelled'])
          .order('created_at', { ascending: false })
          .limit(50);

        auctions = pastAuctions?.map(a => ({
          ...a,
          id: a.on_chain_id,
          seller: {
            address: a.seller.wallet_addresses[0],
            reputationScore: a.seller.reputation_score,
            completedAuctions: a.seller.completed_auctions,
          },
        })) || [];
        break;
      }
    }

    // Transform data for client
    const formattedAuctions = auctions.map(auction => ({
      id: auction.id || auction.on_chain_id,
      title: auction.title,
      description: auction.description,
      images: auction.images || [],
      category: auction.category,
      productType: auction.product_type,
      bidCount: auction.bid_count || 0,
      endsAt: auction.ends_at,
      status: auction.status,
      seller: auction.seller,
    }));

    return NextResponse.json(formattedAuctions);
  } catch (error) {
    console.error('Error in GET /api/auctions/user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
