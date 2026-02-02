use anchor_lang::prelude::*;
 
use crate::state::*;
use crate::errors::*;
use crate::events::DisputeRaised;
 
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RaiseDisputeParams {
    /// Reason for dispute
    pub reason: DisputeReason,
    /// Encrypted description of the issue
    pub description_encrypted: [u8; 256],
    /// Initial evidence (optional)
    pub initial_evidence: Option<Evidence>,
}
 
#[derive(Accounts)]
#[instruction(params: RaiseDisputeParams)]
pub struct RaiseDispute<'info> {
    #[account(
        seeds = [b"program_config"],
        bump = config.bump
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
        constraint = auction.status == AuctionStatus::Settled @ AuctionError::InvalidAuctionState
    )]
    pub auction: Account<'info, AuctionState>,
 
    #[account(
        mut,
        seeds = [b"escrow", auction.key().as_ref()],
        bump = escrow.bump,
        constraint = escrow.status == EscrowStatus::Funded @ EscrowError::InvalidEscrowState
    )]
    pub escrow: Account<'info, EscrowAccount>,
 
    #[account(
        init,
        payer = disputer,
        space = Dispute::LEN,
        seeds = [b"dispute", auction.key().as_ref()],
        bump
    )]
    pub dispute: Account<'info, Dispute>,
 
    #[account(
        mut,
        seeds = [b"user_profile", disputer.key().as_ref()],
        bump = disputer_profile.bump
    )]
    pub disputer_profile: Account<'info, UserProfile>,
 
    /// Disputer must be either buyer or seller
    #[account(
        mut,
        constraint =
            Some(disputer.key()) == auction.winner ||
            disputer.key() == auction.seller
            @ DisputeError::NotAParty
    )]
    pub disputer: Signer<'info>,
 
    pub system_program: Program<'info, System>,
}
 
pub fn handler(ctx: Context<RaiseDispute>, params: RaiseDisputeParams) -> Result<()> {
    let auction = &mut ctx.accounts.auction;
    let escrow = &mut ctx.accounts.escrow;
    let dispute = &mut ctx.accounts.dispute;
    let disputer_profile = &mut ctx.accounts.disputer_profile;
    let stats = &mut ctx.accounts.stats;
    let clock = Clock::get()?;
 
    // Determine buyer and seller
    let buyer = auction.winner.ok_or(AuctionError::InvalidAuctionState)?;
    let seller = auction.seller;
    let disputer = ctx.accounts.disputer.key();
 
    // Initialize dispute
    dispute.dispute_id = dispute.key();
    dispute.auction_id = auction.key();
    dispute.escrow_id = escrow.key();
    dispute.buyer = buyer;
    dispute.seller = seller;
    dispute.raised_by = disputer;
    dispute.reason = params.reason;
    dispute.description_encrypted = params.description_encrypted;
    dispute.status = DisputeStatus::Opened;
    dispute.amount = escrow.amount;
    dispute.buyer_evidence = vec![];
    dispute.seller_evidence = vec![];
    dispute.arbitrator = None;
    dispute.arbitrator_notes = None;
    dispute.outcome = None;
    dispute.refund_amount = None;
    dispute.opened_at = clock.unix_timestamp;
    dispute.last_activity = clock.unix_timestamp;
    dispute.resolved_at = None;
    dispute.evidence_deadline = clock.unix_timestamp + Dispute::DEFAULT_EVIDENCE_PERIOD;
    dispute.resolution_deadline = clock.unix_timestamp + Dispute::DEFAULT_RESOLUTION_PERIOD;
    dispute.votes_collected = 0;
    dispute.votes_for_buyer = 0;
    dispute.votes_for_seller = 0;
    dispute.bump = ctx.bumps.dispute;
 
    // Add initial evidence if provided
    if let Some(evidence) = params.initial_evidence {
        let is_buyer = disputer == buyer;
        dispute.add_evidence(evidence, is_buyer)?;
    }
 
    // Lock escrow
    escrow.status = EscrowStatus::Disputed;
 
    // Update auction status
    auction.status = AuctionStatus::Disputed;
 
    // Update disputer profile
    disputer_profile.record_dispute_raised(false); // Not won yet
 
    // Update stats
    stats.dispute_raised();
 
    // Emit event
    emit!(DisputeRaised {
        dispute_id: dispute.key(),
        auction_id: auction.key(),
        escrow_id: escrow.key(),
        raised_by: disputer,
        reason: params.reason as u8,
        amount: escrow.amount,
        evidence_deadline: dispute.evidence_deadline,
        timestamp: clock.unix_timestamp,
    });
 
    msg!(
        "Dispute {} raised for auction {} by {}",
        dispute.key(),
        auction.key(),
        disputer
    );
 
    Ok(())
}
