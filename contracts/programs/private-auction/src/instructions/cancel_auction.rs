use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, transfer, Transfer, close_account, CloseAccount};
 
use crate::state::*;
use crate::errors::*;
use crate::events::{AuctionCancelled, cancellation_reasons};
 
#[derive(Accounts)]
pub struct CancelAuction<'info> {
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
        constraint = auction.seller == seller.key() @ AuctionError::OnlySeller,
        constraint = auction.status == AuctionStatus::Active @ AuctionError::InvalidAuctionState
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
 
    /// NFT escrow (optional, for NFT auctions)
    #[account(mut)]
    pub nft_escrow: Option<Account<'info, TokenAccount>>,
 
    /// Seller's NFT token account (optional, for returning NFT)
    #[account(mut)]
    pub seller_nft_account: Option<Account<'info, TokenAccount>>,
 
    #[account(mut)]
    pub seller: Signer<'info>,
 
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
 
pub fn handler(ctx: Context<CancelAuction>) -> Result<()> {
    let auction = &mut ctx.accounts.auction;
    let escrow = &mut ctx.accounts.escrow;
    let stats = &mut ctx.accounts.stats;
    let clock = Clock::get()?;
 
    // Can only cancel if no bids have been placed
    require!(
        auction.bid_count == 0,
        AuctionError::CannotCancelWithBids
    );
 
    // Return NFT to seller if NFT auction
    if auction.product_type == ProductType::Nft {
        if let (Some(nft_escrow), Some(seller_nft)) = (
            &ctx.accounts.nft_escrow,
            &ctx.accounts.seller_nft_account,
        ) {
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
                        to: seller_nft.to_account_info(),
                        authority: escrow.to_account_info(),
                    },
                    &[escrow_seeds],
                ),
                1,
            )?;
 
            // Close the NFT escrow account
            close_account(CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                CloseAccount {
                    account: nft_escrow.to_account_info(),
                    destination: ctx.accounts.seller.to_account_info(),
                    authority: escrow.to_account_info(),
                },
                &[escrow_seeds],
            ))?;
        }
    }
 
    // Update auction state
    auction.status = AuctionStatus::Cancelled;
 
    // Update escrow state
    escrow.status = EscrowStatus::Cancelled;
 
    // Update stats
    stats.active_auctions = stats.active_auctions.saturating_sub(1);
    stats.last_updated = clock.unix_timestamp;
 
    // Emit event
    emit!(AuctionCancelled {
        auction_id: auction.key(),
        seller: ctx.accounts.seller.key(),
        reason: cancellation_reasons::SELLER_REQUEST,
        bidders_to_refund: 0,
        timestamp: clock.unix_timestamp,
    });
 
    msg!("Auction {} cancelled by seller", auction.key());
 
    Ok(())
}