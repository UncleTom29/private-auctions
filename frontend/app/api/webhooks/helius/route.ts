import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/app/lib/supabase/server';
import { PublicKey } from '@solana/web3.js';

const HELIUS_WEBHOOK_SECRET = process.env.HELIUS_WEBHOOK_SECRET!;

interface HeliusWebhookEvent {
  type: string;
  signature: string;
  slot: number;
  timestamp: number;
  accountData?: any[];
  transaction?: {
    signature: string;
    slot: number;
    err: any;
  };
}

/**
 * Verify Helius webhook signature
 */
function verifySignature(payload: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', HELIUS_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Handle auction created event
 */
async function handleAuctionCreated(data: any, supabase: any) {
  try {
    const auctionPubkey = data.auctionPubkey;
    const seller = data.seller;

    // Update auction status to active
    const { error } = await supabase
      .from('auctions')
      .update({
        on_chain_id: auctionPubkey,
        status: 'active',
      })
      .eq('seller_id', seller)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Failed to update auction:', error);
    }

    console.log('Auction created:', auctionPubkey);
  } catch (error) {
    console.error('Error handling auction created:', error);
  }
}

/**
 * Handle bid submitted event
 */
async function handleBidSubmitted(data: any, supabase: any) {
  try {
    const auctionId = data.auctionId;
    const bidId = data.bidId;
    const commitmentHash = data.commitmentHash;

    // Update bid status
    const { error: bidError } = await supabase
      .from('bids')
      .update({
        on_chain_id: bidId,
      })
      .eq('commitment_hash', commitmentHash)
      .eq('auction_id', auctionId);

    if (bidError) {
      console.error('Failed to update bid:', bidError);
    }

    // Increment auction bid count
    const { error: auctionError } = await supabase.rpc('increment_bid_count', {
      auction_on_chain_id: auctionId,
    });

    if (auctionError) {
      console.error('Failed to increment bid count:', auctionError);
    }

    console.log('Bid submitted:', bidId);
  } catch (error) {
    console.error('Error handling bid submitted:', error);
  }
}

/**
 * Handle bid revealed event
 */
async function handleBidRevealed(data: any, supabase: any) {
  try {
    const bidId = data.bidId;
    const amount = data.amount;

    // Update bid with revealed amount
    const { error } = await supabase
      .from('bids')
      .update({
        revealed: true,
        amount: amount,
      })
      .eq('on_chain_id', bidId);

    if (error) {
      console.error('Failed to update revealed bid:', error);
    }

    console.log('Bid revealed:', bidId, amount);
  } catch (error) {
    console.error('Error handling bid revealed:', error);
  }
}

/**
 * Handle auction settled event
 */
async function handleAuctionSettled(data: any, supabase: any) {
  try {
    const auctionId = data.auctionId;
    const winner = data.winner;
    const settlementAmount = data.settlementAmount;

    // Update auction status
    const { error: auctionError } = await supabase
      .from('auctions')
      .update({
        status: 'settled',
      })
      .eq('on_chain_id', auctionId);

    if (auctionError) {
      console.error('Failed to update auction:', auctionError);
    }

    // Get auction details
    const { data: auction } = await supabase
      .from('auctions')
      .select('seller_id, product_type, title')
      .eq('on_chain_id', auctionId)
      .single();

    // Get winner user
    const { data: winnerUser } = await supabase
      .from('users')
      .select('id')
      .contains('wallet_addresses', [winner])
      .single();

    if (auction && winnerUser) {
      // Create fulfillment record
      const { error: fulfillmentError } = await supabase
        .from('fulfillments')
        .insert({
          auction_id: auctionId,
          buyer_id: winnerUser.id,
          seller_id: auction.seller_id,
          status: 'pending',
        });

      if (fulfillmentError) {
        console.error('Failed to create fulfillment:', fulfillmentError);
      }

      // Trigger fulfillment workflow based on product type
      if (auction.product_type === 'physical') {
        // Send notification to seller to ship
        await triggerShippingNotification(auction.seller_id, auctionId);
      } else if (auction.product_type === 'digital') {
        // Auto-release digital product
        await triggerDigitalDelivery(auctionId, winnerUser.id);
      }
    }

    console.log('Auction settled:', auctionId, winner, settlementAmount);
  } catch (error) {
    console.error('Error handling auction settled:', error);
  }
}

/**
 * Trigger shipping notification
 */
async function triggerShippingNotification(sellerId: string, auctionId: string) {
  // TODO: Send email/push notification to seller
  console.log('Shipping notification sent to seller:', sellerId, auctionId);
}

/**
 * Trigger digital delivery
 */
async function triggerDigitalDelivery(auctionId: string, buyerId: string) {
  // TODO: Release encrypted digital product key
  console.log('Digital delivery triggered:', auctionId, buyerId);
}

/**
 * POST /api/webhooks/helius - Handle Helius webhooks
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('x-helius-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    // Verify signature
    if (!verifySignature(body, signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse events
    const events: HeliusWebhookEvent[] = JSON.parse(body);
    const supabase = createClient();

    // Process each event
    for (const event of events) {
      console.log('Processing Helius webhook event:', event.type);

      switch (event.type) {
        case 'AUCTION_CREATED':
          await handleAuctionCreated(event.accountData, supabase);
          break;

        case 'BID_SUBMITTED':
          await handleBidSubmitted(event.accountData, supabase);
          break;

        case 'BID_REVEALED':
          await handleBidRevealed(event.accountData, supabase);
          break;

        case 'AUCTION_SETTLED':
          await handleAuctionSettled(event.accountData, supabase);
          break;

        case 'DELIVERY_CONFIRMED':
          // Handle delivery confirmation
          break;

        case 'DISPUTE_RAISED':
          // Handle dispute
          break;

        default:
          console.log('Unknown event type:', event.type);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing Helius webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
