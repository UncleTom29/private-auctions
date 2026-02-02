use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, transfer, Transfer};
 
use crate::state::*;
use crate::errors::*;
use crate::events::{AuctionSettled, EscrowFunded};
 
#[derive(Accounts)]
pub struct SettleAuction<'info> {
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
        constraint = auction.status == AuctionStatus::Revealing @ AuctionError::InvalidAuctionState
    )]
    pub auction: Account<'info, AuctionState>,
 
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
        seeds = [b"bid", auction.key().as_ref(), winner.key().as_ref()],
        bump = winner_bid.bump,
        constraint = winner_bid.revealed @ BidError::BidNotFound
    )]
    pub winner_bid: Account<'info, BidCommitment>,
 
    #[account(
        mut,
        constraint = winner_token_account.owner == winner.key(),
        constraint = winner_token_account.mint == auction.payment_mint
    )]
    pub winner_token_account: Account<'info, TokenAccount>,
 
    /// CHECK: Winner must match auction.winner
    #[account(constraint = Some(winner.key()) == auction.winner @ AuctionError::InvalidAuctionState)]
    pub winner: AccountInfo<'info>,
 
    /// CHECK: Seller address
    #[account(constraint = seller.key() == auction.seller)]
    pub seller: AccountInfo<'info>,
 
    #[account(
        mut,
        constraint = fee_collector.key() == config.fee_collector
    )]
    pub fee_collector: Account<'info, TokenAccount>,
 
    /// NFT escrow (optional, for NFT auctions)
    #[account(mut)]
    pub nft_escrow: Option<Account<'info, TokenAccount>>,
 
    /// Winner's NFT account (optional, for NFT auctions)
    #[account(mut)]
    pub winner_nft_account: Option<Account<'info, TokenAccount>>,
 
    pub token_program: Program<'info, Token>,
}
 
pub fn handler(ctx: Context<SettleAuction>) -> Result<()> {
    let auction = &mut ctx.accounts.auction;
    let escrow = &mut ctx.accounts.escrow;
    let config = &ctx.accounts.config;
    let stats = &mut ctx.accounts.stats;
    let clock = Clock::get()?;
 
    // Verify auction can be settled
    require!(
        auction.can_settle(clock.unix_timestamp),
        AuctionError::CannotSettleYet
    );
 
    // Verify there are revealed bids
    require!(auction.revealed_count > 0, AuctionError::NoBidsPlaced);
 
    // Calculate payment amounts
    let winning_amount = auction.winning_amount.ok_or(AuctionError::NoBidsPlaced)?;
 
    // Second-price auction: winner pays second-highest bid (or reserve if only one bidder)
    let payment_amount = auction.second_price.unwrap_or(winning_amount);
 
    // Calculate platform fee
    let platform_fee = config.calculate_fee(payment_amount);
    let seller_receives = payment_amount - platform_fee;
 
    // Transfer payment from winner to escrow vault
    transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.winner_token_account.to_account_info(),
                to: ctx.accounts.escrow_vault.to_account_info(),
                authority: ctx.accounts.winner.to_account_info(),
            },
        ),
        payment_amount,
    )?;
 
    // Update escrow state
    escrow.amount = payment_amount;
    escrow.payer = Some(ctx.accounts.winner.key());
    escrow.status = EscrowStatus::Funded;
    escrow.security_level = EscrowAccount::determine_security_level(payment_amount);
 
    // Set release conditions based on product type
    match auction.product_type {
        ProductType::Nft => {
            // NFT: Immediate release after transfer
            escrow.release_conditions.requires_delivery_confirmation = false;
            escrow.release_conditions.time_lock_duration = 0;
            escrow.release_conditions.release_deadline = clock.unix_timestamp;
        }
        ProductType::Physical => {
            // Physical: Requires delivery confirmation
            escrow.release_conditions.requires_delivery_confirmation = true;
            escrow.release_conditions.time_lock_duration = 30 * 24 * 60 * 60; // 30 days
            escrow.release_conditions.release_deadline =
                clock.unix_timestamp + escrow.release_conditions.time_lock_duration;
        }
        ProductType::Digital => {
            // Digital: Short time-lock for download verification
            escrow.release_conditions.requires_delivery_confirmation = false;
            escrow.release_conditions.time_lock_duration = 24 * 60 * 60; // 24 hours
            escrow.release_conditions.release_deadline =
                clock.unix_timestamp + escrow.release_conditions.time_lock_duration;
        }
        ProductType::Service => {
            // Service: Confirmation after service delivery
            escrow.release_conditions.requires_delivery_confirmation = true;
            escrow.release_conditions.time_lock_duration = 14 * 24 * 60 * 60; // 14 days
            escrow.release_conditions.release_deadline =
                clock.unix_timestamp + escrow.release_conditions.time_lock_duration;
        }
    }
 
    // Handle NFT transfer immediately if NFT auction
    if auction.product_type == ProductType::Nft {
        if let (Some(nft_escrow), Some(winner_nft)) = (
            &ctx.accounts.nft_escrow,
            &ctx.accounts.winner_nft_account,
        ) {
            // Create escrow signer seeds for CPI
            let auction_key = auction.key();
            let escrow_seeds = &[
                b"escrow".as_ref(),
                auction_key.as_ref(),
                &[escrow.bump],
            ];
 
            transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: nft_escrow.to_account_info(),
                        to: winner_nft.to_account_info(),
                        authority: escrow.to_account_info(),
                    },
                    &[escrow_seeds],
                ),
                1,
            )?;
 
            // Also release funds to seller immediately for NFT
            let vault_seeds = &[
                b"escrow_vault".as_ref(),
                auction_key.as_ref(),
                &[ctx.bumps.escrow_vault],
            ];
 
            // Transfer fee to collector
            transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.escrow_vault.to_account_info(),
                        to: ctx.accounts.fee_collector.to_account_info(),
                        authority: ctx.accounts.escrow_vault.to_account_info(),
                    },
                    &[vault_seeds],
                ),
                platform_fee,
            )?;
 
            // Mark escrow as released for NFT
            escrow.status = EscrowStatus::Released;
            escrow.released_at = Some(clock.unix_timestamp);
        }
    }
 
    // Update auction state
    auction.status = AuctionStatus::Settled;
    auction.second_price = Some(payment_amount);
 
    // Update stats
    stats.auction_completed(payment_amount, platform_fee);
 
    // Emit events
    emit!(EscrowFunded {
        escrow_id: escrow.key(),
        auction_id: auction.key(),
        payer: ctx.accounts.winner.key(),
        amount: payment_amount,
        token_mint: auction.payment_mint,
        security_level: escrow.security_level as u8,
        timestamp: clock.unix_timestamp,
    });
 
    emit!(AuctionSettled {
        auction_id: auction.key(),
        winner: ctx.accounts.winner.key(),
        winning_amount,
        second_price: payment_amount,
        platform_fee,
        seller_receives,
        total_bids: auction.bid_count,
        revealed_bids: auction.revealed_count,
        timestamp: clock.unix_timestamp,
    });
 
    msg!(
        "Auction {} settled. Winner: {}, Payment: {} (winning bid: {})",
        auction.key(),
        ctx.accounts.winner.key(),
        payment_amount,
        winning_amount
    );
 
    Ok(())
}