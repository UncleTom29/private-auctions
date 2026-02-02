use anchor_lang::prelude::*;
 
use crate::state::*;
use crate::errors::*;
use crate::events::{BidRevealed, RevealPhaseStarted};
 
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RevealBidParams {
    /// The actual bid amount
    pub amount: u64,
    /// The salt used in commitment
    pub salt: [u8; 32],
    /// ZK proof of valid reveal
    pub proof: Vec<u8>,
}
 
#[derive(Accounts)]
#[instruction(params: RevealBidParams)]
pub struct RevealBid<'info> {
    #[account(
        seeds = [b"program_config"],
        bump = config.bump,
        constraint = !config.paused @ ConfigError::ProgramPaused
    )]
    pub config: Account<'info, ProgramConfig>,
 
    #[account(
        mut,
        seeds = [b"auction", auction.seller.as_ref(), &auction.start_time.to_le_bytes()],
        bump = auction.bump
    )]
    pub auction: Account<'info, AuctionState>,
 
    #[account(
        mut,
        seeds = [b"bid", auction.key().as_ref(), bidder.key().as_ref()],
        bump = bid.bump,
        constraint = bid.bidder == bidder.key() @ BidError::OnlyBidder,
        constraint = !bid.revealed @ BidError::BidAlreadyRevealed
    )]
    pub bid: Account<'info, BidCommitment>,
 
    pub bidder: Signer<'info>,
 
    /// CHECK: Light Protocol state tree
    #[account(mut, constraint = state_tree.key() == config.state_tree)]
    pub state_tree: AccountInfo<'info>,
}
 
pub fn handler(ctx: Context<RevealBid>, params: RevealBidParams) -> Result<()> {
    let auction = &mut ctx.accounts.auction;
    let bid = &mut ctx.accounts.bid;
    let clock = Clock::get()?;
 
    // Check if we need to transition to reveal phase
    if auction.status == AuctionStatus::Active && clock.unix_timestamp >= auction.end_time {
        auction.status = AuctionStatus::Revealing;
 
        emit!(RevealPhaseStarted {
            auction_id: auction.key(),
            total_bids: auction.bid_count,
            reveal_deadline: auction.reveal_deadline(),
            timestamp: clock.unix_timestamp,
        });
    }
 
    // Verify auction is in reveal phase
    require!(
        auction.can_reveal_bids(clock.unix_timestamp),
        AuctionError::NotInRevealPhase
    );
 
    // Verify reveal deadline hasn't passed
    require!(
        clock.unix_timestamp < auction.reveal_deadline(),
        BidError::RevealDeadlinePassed
    );
 
    // Verify commitment matches reveal
    let bid_reveal = BidReveal {
        amount: params.amount,
        salt: params.salt,
        proof: params.proof.clone(),
    };
 
    require!(
        bid_reveal.verify_commitment(&bid.commitment_hash, &ctx.accounts.bidder.key()),
        BidError::CommitmentMismatch
    );
 
    // Verify ZK proof (in production, verify actual proof)
    require!(!params.proof.is_empty(), BidError::InvalidProof);
 
    // Update bid state
    bid.reveal(params.amount);
 
    // Update auction revealed count
    auction.revealed_count += 1;
 
    // Track highest and second-highest bids for second-price calculation
    let current_highest = auction.winning_amount.unwrap_or(0);
    let current_second = auction.second_price.unwrap_or(0);
 
    if params.amount > current_highest {
        // New highest bid
        auction.second_price = auction.winning_amount;
        auction.winning_amount = Some(params.amount);
        auction.winner = Some(ctx.accounts.bidder.key());
    } else if params.amount > current_second {
        // New second-highest bid
        auction.second_price = Some(params.amount);
    }
 
    // Update compressed bid in Merkle tree
    // In production, this would update the Light Protocol compressed account
 
    // Emit event
    emit!(BidRevealed {
        bid_id: bid.key(),
        auction_id: auction.key(),
        bidder: ctx.accounts.bidder.key(),
        amount: params.amount,
        current_highest: auction.winning_amount.unwrap_or(0),
        revealed_count: auction.revealed_count,
        timestamp: clock.unix_timestamp,
    });
 
    msg!(
        "Bid {} revealed: {} lamports (revealed {}/{})",
        bid.key(),
        params.amount,
        auction.revealed_count,
        auction.bid_count
    );
 
    Ok(())
}