use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, transfer, Transfer};
 
use crate::state::*;
use crate::errors::*;
use crate::events::BidSubmitted;
 
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct SubmitBidParams {
    /// Commitment hash: poseidon(bid_amount || salt || bidder)
    pub commitment_hash: [u8; 32],
    /// ZK proof of valid bid (bid >= reserve)
    pub proof: Vec<u8>,
    /// Hash of the ZK proof for on-chain storage
    pub proof_hash: [u8; 32],
}
 
#[derive(Accounts)]
#[instruction(params: SubmitBidParams)]
pub struct SubmitBid<'info> {
    #[account(
        seeds = [b"program_config"],
        bump = config.bump,
        constraint = !config.paused @ ConfigError::ProgramPaused
    )]
    pub config: Account<'info, ProgramConfig>,
 
    #[account(
        mut,
        seeds = [b"program_stats"],
        bump = stats.bump
    )]
    pub stats: Account<'info, ProgramStats>,
 
    #[account(
        mut,
        seeds = [b"auction", auction.seller.as_ref(), &auction.start_time.to_le_bytes()],
        bump = auction.bump,
        constraint = auction.is_active() @ AuctionError::AuctionNotActive
    )]
    pub auction: Account<'info, AuctionState>,
 
    #[account(
        init,
        payer = bidder,
        space = BidCommitment::LEN,
        seeds = [b"bid", auction.key().as_ref(), bidder.key().as_ref()],
        bump
    )]
    pub bid: Account<'info, BidCommitment>,
 
    #[account(
        mut,
        seeds = [b"escrow", auction.key().as_ref()],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, EscrowAccount>,
 
    #[account(
        mut,
        seeds = [b"escrow_vault", auction.key().as_ref()],
        bump
    )]
    pub escrow_vault: Account<'info, TokenAccount>,
 
    #[account(
        mut,
        seeds = [b"collateral_pool", auction.payment_mint.as_ref()],
        bump
    )]
    pub collateral_pool: Account<'info, CollateralPool>,
 
    #[account(
        mut,
        constraint = collateral_pool_vault.mint == auction.payment_mint
    )]
    pub collateral_pool_vault: Account<'info, TokenAccount>,
 
    #[account(
        mut,
        constraint = bidder_token_account.owner == bidder.key(),
        constraint = bidder_token_account.mint == auction.payment_mint
    )]
    pub bidder_token_account: Account<'info, TokenAccount>,
 
    #[account(
        seeds = [b"user_profile", bidder.key().as_ref()],
        bump = bidder_profile.bump
    )]
    pub bidder_profile: Account<'info, UserProfile>,
 
    #[account(mut)]
    pub bidder: Signer<'info>,
 
    /// CHECK: Light Protocol state tree for compressed bid storage
    #[account(mut, constraint = state_tree.key() == config.state_tree)]
    pub state_tree: AccountInfo<'info>,
 
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
 
pub fn handler(ctx: Context<SubmitBid>, params: SubmitBidParams) -> Result<()> {
    let auction = &mut ctx.accounts.auction;
    let bid = &mut ctx.accounts.bid;
    let collateral_pool = &mut ctx.accounts.collateral_pool;
    let stats = &mut ctx.accounts.stats;
    let clock = Clock::get()?;
 
    // Verify auction can accept bids
    require!(
        auction.can_accept_bids(clock.unix_timestamp),
        AuctionError::BiddingEnded
    );
 
    // Verify ZK proof (in production, this would verify the actual proof)
    // For now, we just verify the proof is non-empty
    require!(!params.proof.is_empty(), BidError::InvalidProof);
 
    // Transfer collateral from bidder to pool
    transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.bidder_token_account.to_account_info(),
                to: ctx.accounts.collateral_pool_vault.to_account_info(),
                authority: ctx.accounts.bidder.to_account_info(),
            },
        ),
        auction.bid_collateral,
    )?;
 
    // Initialize bid commitment
    bid.bid_id = bid.key();
    bid.auction_id = auction.key();
    bid.bidder = ctx.accounts.bidder.key();
    bid.commitment_hash = params.commitment_hash;
    bid.timestamp = clock.unix_timestamp;
    bid.revealed = false;
    bid.revealed_amount = None;
    bid.proof_hash = params.proof_hash;
    bid.collateral_deposited = auction.bid_collateral;
    bid.collateral_returned = false;
    bid.bump = ctx.bumps.bid;
 
    // Update collateral pool
    collateral_pool.deposit(auction.bid_collateral);
 
    // Update auction bid count
    auction.bid_count += 1;
 
    // Update Merkle root (in production, this would compute actual Merkle tree update)
    // For Light Protocol integration, this would use the state tree
    let compressed_bid = CompressedBidCommitment {
        bid_id: bid.bid_id.to_bytes(),
        auction_id: auction.key().to_bytes(),
        commitment_hash: params.commitment_hash,
        timestamp: clock.unix_timestamp,
        revealed: false,
    };
 
    // Store compressed bid in Merkle tree (Light Protocol CPI would go here)
    // light_sdk::compress_account(...)
 
    // Update auction Merkle root
    auction.bid_merkle_root = compute_merkle_root(&compressed_bid);
 
    // Update stats
    stats.bid_placed();
 
    // Emit event
    emit!(BidSubmitted {
        bid_id: bid.key(),
        auction_id: auction.key(),
        commitment_hash: params.commitment_hash,
        proof_hash: params.proof_hash,
        bid_count: auction.bid_count,
        collateral: auction.bid_collateral,
        timestamp: clock.unix_timestamp,
    });
 
    msg!(
        "Bid {} submitted to auction {}, total bids: {}",
        bid.key(),
        auction.key(),
        auction.bid_count
    );
 
    Ok(())
}
 
/// Compute Merkle root from compressed bid
/// In production, this would use Light Protocol's Merkle tree implementation
fn compute_merkle_root(bid: &CompressedBidCommitment) -> [u8; 32] {
    use solana_program::keccak;
 
    let bid_bytes = bid.to_bytes();
    keccak::hash(&bid_bytes).to_bytes()
}