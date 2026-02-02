import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

/**
 * GET /api/users/stats - Get user statistics
 */
export async function GET(request: NextRequest) {
  try {
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
      .select('id, reputation_score, completed_auctions')
      .eq('privy_id', session.user.id)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get active bids count
    const { count: activeBidsCount } = await supabase
      .from('bids')
      .select('id', { count: 'exact', head: true })
      .eq('bidder_id', user.id)
      .eq('revealed', false);

    // Get won auctions count
    const { data: wonAuctions } = await supabase
      .from('fulfillments')
      .select('id')
      .eq('buyer_id', user.id);

    // Get created auctions count
    const { count: createdAuctionsCount } = await supabase
      .from('auctions')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', user.id);

    const stats = {
      reputationScore: user.reputation_score || 500,
      completedAuctions: user.completed_auctions || 0,
      activeBids: activeBidsCount || 0,
      auctionsWon: wonAuctions?.length || 0,
      auctionsCreated: createdAuctionsCount || 0,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error in GET /api/users/stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}