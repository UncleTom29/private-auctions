use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, transfer, Transfer};
 
use crate::state::*;
use crate::errors::*;
use crate::events::{DeliveryConfirmed, EscrowReleased};
 
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ConfirmDeliveryParams {
    /// ZK proof of delivery (without revealing address)
    pub delivery_proof: Vec<u8>,
    /// Hash of delivery proof for on-chain storage
    pub proof_hash: [u8; 32],
    /// Optional rating for seller (0-50, /10 for stars)
    pub seller_rating: Option<u8>,
}
 
#[derive(Accounts)]
#[instruction(params: ConfirmDeliveryParams)]
pub struct ConfirmDelivery<'info> {
    #[account(
        seeds = [b"program_config"],
        bump = config.bump
    )]
    pub config: Account<'info, ProgramConfig>,
 
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
        mut,
        seeds = [b"escrow_vault", auction.key().as_ref()],
        bump
    )]
    pub escrow_vault: Account<'info, TokenAccount>,
 
    #[account(
        mut,
        constraint = seller_token_account.owner == auction.seller,
        constraint = seller_token_account.mint == auction.payment_mint
    )]
    pub seller_token_account: Account<'info, TokenAccount>,
 
    #[account(
        mut,
        constraint = fee_collector.key() == config.fee_collector
    )]
    pub fee_collector: Account<'info, TokenAccount>,
 
    #[account(
        mut,
        seeds = [b"user_profile", auction.seller.as_ref()],
        bump = seller_profile.bump
    )]
    pub seller_profile: Account<'info, UserProfile>,
 
    #[account(
        mut,
        seeds = [b"user_profile", buyer.key().as_ref()],
        bump = buyer_profile.bump
    )]
    pub buyer_profile: Account<'info, UserProfile>,
 
    /// CHECK: Buyer must match auction winner
    #[account(
        constraint = Some(buyer.key()) == auction.winner @ FulfillmentError::OnlyBuyerCanConfirm
    )]
    pub buyer: Signer<'info>,
 
    pub token_program: Program<'info, Token>,
}
 
pub fn handler(ctx: Context<ConfirmDelivery>, params: ConfirmDeliveryParams) -> Result<()> {
    let config = &ctx.accounts.config;
    let auction = &mut ctx.accounts.auction;
    let escrow = &mut ctx.accounts.escrow;
    let seller_profile = &mut ctx.accounts.seller_profile;
    let buyer_profile = &mut ctx.accounts.buyer_profile;
    let clock = Clock::get()?;
 
    // Verify delivery proof (in production, this would verify ZK proof)
    require!(
        !params.delivery_proof.is_empty(),
        FulfillmentError::InvalidDeliveryProof
    );
 
    // Calculate payment distribution
    let payment_amount = escrow.amount;
    let platform_fee = config.calculate_fee(payment_amount);
    let seller_receives = payment_amount - platform_fee;
 
    let auction_key = auction.key();
    let escrow_vault_seeds = &[
        b"escrow_vault".as_ref(),
        auction_key.as_ref(),
        &[ctx.bumps.escrow_vault],
    ];
 
    // Transfer platform fee
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
 
    // Transfer payment to seller
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
 
    // Update escrow state
    escrow.status = EscrowStatus::Released;
    escrow.released_at = Some(clock.unix_timestamp);
 
    // Update seller reputation
    seller_profile.update_after_auction(true, true, params.seller_rating);
 
    // Update buyer reputation
    buyer_profile.update_after_auction(false, true, None);
 
    // Emit events
    emit!(DeliveryConfirmed {
        auction_id: auction.key(),
        escrow_id: escrow.key(),
        buyer: ctx.accounts.buyer.key(),
        seller: auction.seller,
        proof_hash: params.proof_hash,
        timestamp: clock.unix_timestamp,
    });
 
    emit!(EscrowReleased {
        escrow_id: escrow.key(),
        auction_id: auction.key(),
        beneficiary: auction.seller,
        amount: seller_receives,
        platform_fee,
        timestamp: clock.unix_timestamp,
    });
 
    msg!(
        "Delivery confirmed for auction {}. {} released to seller.",
        auction.key(),
        seller_receives
    );
 
    Ok(())
}
 