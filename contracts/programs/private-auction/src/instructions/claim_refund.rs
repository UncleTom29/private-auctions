use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, transfer, Transfer};
 
use crate::state::*;
use crate::errors::*;
use crate::events::{RefundClaimed, refund_reasons, ReputationUpdated, reputation_reasons};
 
#[derive(Accounts)]
pub struct ClaimRefund<'info> {
    #[account(
        seeds = [b"program_config"],
        bump = config.bump
    )]
    pub config: Account<'info, ProgramConfig>,
 
    #[account(
        seeds = [b"auction", auction.seller.as_ref(), &auction.start_time.to_le_bytes()],
        bump = auction.bump,
        constraint =
            auction.status == AuctionStatus::Settled ||
            auction.status == AuctionStatus::Cancelled ||
            auction.status == AuctionStatus::Expired
            @ AuctionError::InvalidAuctionState
    )]
    pub auction: Account<'info, AuctionState>,
 
    #[account(
        mut,
        seeds = [b"bid", auction.key().as_ref(), bidder.key().as_ref()],
        bump = bid.bump,
        constraint = bid.bidder == bidder.key() @ BidError::OnlyBidder,
        constraint = !bid.collateral_returned @ BidError::RefundAlreadyClaimed
    )]
    pub bid: Account<'info, BidCommitment>,
 
    #[account(
        mut,
        seeds = [b"collateral_pool", auction.payment_mint.as_ref()],
        bump
    )]
    pub collateral_pool: Account<'info, CollateralPool>,
 
    #[account(mut)]
    pub collateral_pool_vault: Account<'info, TokenAccount>,
 
    #[account(
        mut,
        constraint = bidder_token_account.owner == bidder.key(),
        constraint = bidder_token_account.mint == auction.payment_mint
    )]
    pub bidder_token_account: Account<'info, TokenAccount>,
 
    #[account(
        mut,
        seeds = [b"user_profile", bidder.key().as_ref()],
        bump = bidder_profile.bump
    )]
    pub bidder_profile: Account<'info, UserProfile>,
 
    pub bidder: Signer<'info>,
 
    pub token_program: Program<'info, Token>,
}
 
pub fn handler(ctx: Context<ClaimRefund>) -> Result<()> {
    let auction = &ctx.accounts.auction;
    let bid = &mut ctx.accounts.bid;
    let collateral_pool = &mut ctx.accounts.collateral_pool;
    let bidder_profile = &mut ctx.accounts.bidder_profile;
    let clock = Clock::get()?;
 
    // Verify bidder is not the winner (winner cannot refund)
    if let Some(winner) = auction.winner {
        require!(
            ctx.accounts.bidder.key() != winner,
            BidError::WinnerCannotRefund
        );
    }
 
    // Determine refund amount and reason
    let mut refund_amount = bid.collateral_deposited;
    let mut reason = refund_reasons::OUTBID;
    let mut penalize = false;
 
    match auction.status {
        AuctionStatus::Settled => {
            // Check if bid was revealed
            if !bid.revealed {
                // Failed to reveal - penalize
                penalize = true;
                refund_amount = refund_amount / 2; // 50% penalty for not revealing
                reason = refund_reasons::FAILED_TO_REVEAL;
            }
        }
        AuctionStatus::Cancelled => {
            reason = refund_reasons::AUCTION_CANCELLED;
        }
        AuctionStatus::Expired => {
            reason = refund_reasons::AUCTION_CANCELLED;
        }
        _ => {
            return Err(AuctionError::InvalidAuctionState.into());
        }
    }
 
    // Transfer refund from collateral pool
    let payment_mint = auction.payment_mint;
    let pool_seeds = &[
        b"collateral_pool".as_ref(),
        payment_mint.as_ref(),
        &[ctx.bumps.collateral_pool],
    ];
 
    transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.collateral_pool_vault.to_account_info(),
                to: ctx.accounts.bidder_token_account.to_account_info(),
                authority: ctx.accounts.collateral_pool.to_account_info(),
            },
            &[pool_seeds],
        ),
        refund_amount,
    )?;
 
    // Update collateral pool
    collateral_pool.withdraw(bid.collateral_deposited)?;
 
    // Mark collateral as returned
    bid.collateral_returned = true;
 
    // Update reputation if penalized
    if penalize {
        let old_score = bidder_profile.reputation_score;
        // Reduce reputation by 50 points for failing to reveal
        bidder_profile.reputation_score = bidder_profile.reputation_score.saturating_sub(50);
 
        emit!(ReputationUpdated {
            user: ctx.accounts.bidder.key(),
            old_score,
            new_score: bidder_profile.reputation_score,
            reason: reputation_reasons::FAILED_TO_REVEAL,
            timestamp: clock.unix_timestamp,
        });
    }
 
    // Emit refund event
    emit!(RefundClaimed {
        bid_id: bid.key(),
        auction_id: auction.key(),
        bidder: ctx.accounts.bidder.key(),
        collateral_amount: refund_amount,
        deposit_amount: 0,
        timestamp: clock.unix_timestamp,
    });
 
    msg!(
        "Refund claimed: {} lamports ({}% of collateral)",
        refund_amount,
        (refund_amount * 100) / bid.collateral_deposited
    );
 
    Ok(())
}
 