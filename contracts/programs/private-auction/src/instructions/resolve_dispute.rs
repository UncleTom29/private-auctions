use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, transfer, Transfer};
 
use crate::state::*;
use crate::errors::*;
use crate::events::{DisputeResolved, EscrowReleased, EscrowRefunded, refund_reasons};
 
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ResolveDisputeParams {
    /// Vote for buyer (true) or seller (false)
    pub vote_for_buyer: bool,
    /// Encrypted arbitrator notes
    pub notes_encrypted: Option<[u8; 256]>,
}
 
#[derive(Accounts)]
#[instruction(params: ResolveDisputeParams)]
pub struct ResolveDispute<'info> {
    #[account(
        seeds = [b"program_config"],
        bump = config.bump,
        constraint = config.is_arbitrator(&arbitrator.key()) @ DisputeError::OnlyArbitrator
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
        seeds = [b"dispute", dispute.auction_id.as_ref()],
        bump = dispute.bump,
        constraint = dispute.status == DisputeStatus::EvidenceSubmitted ||
                     dispute.status == DisputeStatus::UnderReview
                     @ DisputeError::InvalidDisputeState
    )]
    pub dispute: Account<'info, Dispute>,
 
    #[account(
        mut,
        seeds = [b"escrow", dispute.auction_id.as_ref()],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, EscrowAccount>,
 
    #[account(
        mut,
        seeds = [b"escrow_vault", dispute.auction_id.as_ref()],
        bump
    )]
    pub escrow_vault: Account<'info, TokenAccount>,
 
    #[account(
        mut,
        constraint = buyer_token_account.owner == dispute.buyer
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,
 
    #[account(
        mut,
        constraint = seller_token_account.owner == dispute.seller
    )]
    pub seller_token_account: Account<'info, TokenAccount>,
 
    #[account(
        mut,
        constraint = fee_collector.key() == config.fee_collector
    )]
    pub fee_collector: Account<'info, TokenAccount>,
 
    #[account(
        mut,
        seeds = [b"user_profile", dispute.buyer.as_ref()],
        bump = buyer_profile.bump
    )]
    pub buyer_profile: Account<'info, UserProfile>,
 
    #[account(
        mut,
        seeds = [b"user_profile", dispute.seller.as_ref()],
        bump = seller_profile.bump
    )]
    pub seller_profile: Account<'info, UserProfile>,
 
    #[account(
        mut,
        seeds = [b"arbitrator", arbitrator.key().as_ref()],
        bump = arbitrator_record.bump
    )]
    pub arbitrator_record: Account<'info, ArbitratorRecord>,
 
    pub arbitrator: Signer<'info>,
 
    pub token_program: Program<'info, Token>,
}
 
pub fn handler(ctx: Context<ResolveDispute>, params: ResolveDisputeParams) -> Result<()> {
    let config = &ctx.accounts.config;
    let dispute = &mut ctx.accounts.dispute;
    let escrow = &mut ctx.accounts.escrow;
    let buyer_profile = &mut ctx.accounts.buyer_profile;
    let seller_profile = &mut ctx.accounts.seller_profile;
    let arbitrator_record = &mut ctx.accounts.arbitrator_record;
    let stats = &mut ctx.accounts.stats;
    let clock = Clock::get()?;
 
    // Update dispute to under review if first vote
    if dispute.status == DisputeStatus::EvidenceSubmitted {
        dispute.status = DisputeStatus::UnderReview;
        dispute.arbitrator = Some(ctx.accounts.arbitrator.key());
    }
 
    // Record the vote
    dispute.record_vote(params.vote_for_buyer);
 
    // Store arbitrator notes if provided
    if let Some(notes) = params.notes_encrypted {
        dispute.arbitrator_notes = Some(notes);
    }
 
    dispute.last_activity = clock.unix_timestamp;
 
    // Check if we have enough votes to resolve
    if dispute.votes_collected >= Dispute::MIN_VOTES_FOR_RESOLUTION {
        // Determine outcome based on votes
        let outcome = dispute.determine_outcome();
 
        // Calculate distribution
        let payment_amount = escrow.amount;
        let platform_fee = config.calculate_fee(payment_amount);
 
        let auction_id = dispute.auction_id;
        let escrow_vault_seeds = &[
            b"escrow_vault".as_ref(),
            auction_id.as_ref(),
            &[ctx.bumps.escrow_vault],
        ];
 
        match outcome {
            DisputeOutcome::FullRefund => {
                // Refund full amount to buyer
                transfer(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        Transfer {
                            from: ctx.accounts.escrow_vault.to_account_info(),
                            to: ctx.accounts.buyer_token_account.to_account_info(),
                            authority: ctx.accounts.escrow_vault.to_account_info(),
                        },
                        &[escrow_vault_seeds],
                    ),
                    payment_amount,
                )?;
 
                escrow.status = EscrowStatus::Refunded;
 
                // Update profiles
                buyer_profile.record_dispute_raised(true);
                seller_profile.record_dispute_against();
 
                emit!(EscrowRefunded {
                    escrow_id: escrow.key(),
                    auction_id,
                    recipient: dispute.buyer,
                    amount: payment_amount,
                    reason: refund_reasons::DISPUTE_RESOLVED,
                    timestamp: clock.unix_timestamp,
                });
            }
            DisputeOutcome::ReleaseToSeller => {
                // Pay seller minus platform fee
                let seller_receives = payment_amount - platform_fee;
 
                transfer(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        Transfer {
                            from: ctx.accounts.escrow_vault.to_account_info(),
                            to: ctx.accounts.fee_collector.to_account_info(),
                            authority: ctx.accounts.escrow_vault.to_account_info(),
                        },
                        &[escrow_vault_seeds],
                    ),
                    platform_fee,
                )?;
 
                transfer(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        Transfer {
                            from: ctx.accounts.escrow_vault.to_account_info(),
                            to: ctx.accounts.seller_token_account.to_account_info(),
                            authority: ctx.accounts.escrow_vault.to_account_info(),
                        },
                        &[escrow_vault_seeds],
                    ),
                    seller_receives,
                )?;
 
                escrow.status = EscrowStatus::Released;
 
                emit!(EscrowReleased {
                    escrow_id: escrow.key(),
                    auction_id,
                    beneficiary: dispute.seller,
                    amount: seller_receives,
                    platform_fee,
                    timestamp: clock.unix_timestamp,
                });
            }
            DisputeOutcome::SplitFault | DisputeOutcome::PartialRefund { .. } => {
                // Split 50/50 minus platform fee
                let total_after_fee = payment_amount - platform_fee;
                let buyer_receives = total_after_fee / 2;
                let seller_receives = total_after_fee - buyer_receives;
 
                // Platform fee
                transfer(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        Transfer {
                            from: ctx.accounts.escrow_vault.to_account_info(),
                            to: ctx.accounts.fee_collector.to_account_info(),
                            authority: ctx.accounts.escrow_vault.to_account_info(),
                        },
                        &[escrow_vault_seeds],
                    ),
                    platform_fee,
                )?;
 
                // Buyer portion
                transfer(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        Transfer {
                            from: ctx.accounts.escrow_vault.to_account_info(),
                            to: ctx.accounts.buyer_token_account.to_account_info(),
                            authority: ctx.accounts.escrow_vault.to_account_info(),
                        },
                        &[escrow_vault_seeds],
                    ),
                    buyer_receives,
                )?;
 
                // Seller portion
                transfer(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        Transfer {
                            from: ctx.accounts.escrow_vault.to_account_info(),
                            to: ctx.accounts.seller_token_account.to_account_info(),
                            authority: ctx.accounts.escrow_vault.to_account_info(),
                        },
                        &[escrow_vault_seeds],
                    ),
                    seller_receives,
                )?;
 
                escrow.status = EscrowStatus::Released;
                dispute.refund_amount = Some(buyer_receives);
            }
            DisputeOutcome::ReturnForRefund => {
                // Same as full refund for now
                transfer(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        Transfer {
                            from: ctx.accounts.escrow_vault.to_account_info(),
                            to: ctx.accounts.buyer_token_account.to_account_info(),
                            authority: ctx.accounts.escrow_vault.to_account_info(),
                        },
                        &[escrow_vault_seeds],
                    ),
                    payment_amount,
                )?;
 
                escrow.status = EscrowStatus::Refunded;
            }
        }
 
        // Resolve dispute
        dispute.resolve(outcome, dispute.refund_amount);
        escrow.released_at = Some(clock.unix_timestamp);
 
        // Update arbitrator record
        let resolution_time = (clock.unix_timestamp - dispute.opened_at) as u64;
        let arbitrator_fee = platform_fee / 10; // 10% of platform fee to arbitrator
        arbitrator_record.complete_case(resolution_time, arbitrator_fee);
 
        // Update stats
        stats.dispute_resolved();
 
        // Emit resolution event
        emit!(DisputeResolved {
            dispute_id: dispute.key(),
            auction_id,
            outcome: match outcome {
                DisputeOutcome::FullRefund | DisputeOutcome::ReturnForRefund => 0,
                DisputeOutcome::ReleaseToSeller => 1,
                _ => 2,
            },
            refund_amount: dispute.refund_amount.unwrap_or(0),
            arbitrator: ctx.accounts.arbitrator.key(),
            votes_buyer: dispute.votes_for_buyer,
            votes_seller: dispute.votes_for_seller,
            timestamp: clock.unix_timestamp,
        });
 
        msg!(
            "Dispute {} resolved with outcome {:?}",
            dispute.key(),
            outcome
        );
    } else {
        msg!(
            "Dispute {} vote recorded ({}/{})",
            dispute.key(),
            dispute.votes_collected,
            Dispute::MIN_VOTES_FOR_RESOLUTION
        );
    }
 
    Ok(())
}
 