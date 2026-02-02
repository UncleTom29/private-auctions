use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint, transfer, Transfer};
 
use crate::state::*;
use crate::errors::*;
use crate::events::AuctionCreated;
 
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CreateAuctionParams {
    /// Product type (NFT, Physical, Digital, Service)
    pub product_type: ProductType,
    /// Category for marketplace
    pub category: Category,
    /// Hash of reserve price (poseidon hash with salt)
    pub reserve_price_hash: [u8; 32],
    /// Auction duration in seconds
    pub duration: i64,
    /// Reveal phase duration in seconds (0 = use default)
    pub reveal_duration: i64,
    /// IPFS hash of product metadata
    pub ipfs_hash: String,
    /// Product title
    pub title: String,
    /// Product description
    pub description: String,
    /// Image URLs
    pub images: Vec<String>,
    /// Payment token mint
    pub payment_mint: Pubkey,
    /// Minimum bid increment
    pub min_bid_increment: u64,
    /// Bid collateral required
    pub bid_collateral: u64,
    /// NFT mint (if NFT auction)
    pub nft_mint: Option<Pubkey>,
    /// Shipping options (for physical products)
    pub shipping: Option<ShippingOptions>,
    /// Digital delivery options
    pub digital_delivery: Option<DigitalDelivery>,
    /// Service details
    pub service_details: Option<ServiceDetails>,
}
 
#[derive(Accounts)]
#[instruction(params: CreateAuctionParams)]
pub struct CreateAuction<'info> {
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
        init,
        payer = seller,
        space = AuctionState::LEN,
        seeds = [b"auction", seller.key().as_ref(), &Clock::get()?.unix_timestamp.to_le_bytes()],
        bump
    )]
    pub auction: Account<'info, AuctionState>,
 
    #[account(
        init,
        payer = seller,
        space = ProductMetadata::LEN,
        seeds = [b"product", auction.key().as_ref()],
        bump
    )]
    pub product_metadata: Account<'info, ProductMetadata>,
 
    #[account(
        init,
        payer = seller,
        space = EscrowAccount::LEN,
        seeds = [b"escrow", auction.key().as_ref()],
        bump
    )]
    pub escrow: Account<'info, EscrowAccount>,
 
    #[account(
        init,
        payer = seller,
        token::mint = payment_mint,
        token::authority = escrow,
        seeds = [b"escrow_vault", auction.key().as_ref()],
        bump
    )]
    pub escrow_vault: Account<'info, TokenAccount>,
 
    #[account(
        seeds = [b"user_profile", seller.key().as_ref()],
        bump = seller_profile.bump,
        constraint = seller_profile.reputation_score >= config.min_seller_reputation @ ProfileError::InsufficientReputation
    )]
    pub seller_profile: Account<'info, UserProfile>,
 
    pub payment_mint: Account<'info, Mint>,
 
    /// NFT mint (optional, for NFT auctions)
    #[account(mut)]
    pub nft_mint_account: Option<Account<'info, Mint>>,
 
    /// NFT token account (optional, seller's NFT)
    #[account(
        mut,
        constraint = nft_token_account.is_none() || nft_token_account.as_ref().unwrap().mint == params.nft_mint.unwrap_or_default()
    )]
    pub nft_token_account: Option<Account<'info, TokenAccount>>,
 
    /// NFT escrow account (optional, holds NFT during auction)
    #[account(mut)]
    pub nft_escrow_account: Option<Account<'info, TokenAccount>>,
 
    #[account(mut)]
    pub seller: Signer<'info>,
 
    /// CHECK: Light Protocol state tree
    #[account(constraint = state_tree.key() == config.state_tree)]
    pub state_tree: AccountInfo<'info>,
 
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
 
pub fn handler(ctx: Context<CreateAuction>, params: CreateAuctionParams) -> Result<()> {
    let config = &ctx.accounts.config;
    let stats = &mut ctx.accounts.stats;
    let auction = &mut ctx.accounts.auction;
    let product = &mut ctx.accounts.product_metadata;
    let escrow = &mut ctx.accounts.escrow;
    let clock = Clock::get()?;
 
    // Validate parameters
    config.validate_auction_params(params.duration, params.bid_collateral)?;
 
    require!(
        config.is_mint_supported(&params.payment_mint),
        ConfigError::UnsupportedMint
    );
 
    // Validate product type specific requirements
    match params.product_type {
        ProductType::Nft => {
            require!(params.nft_mint.is_some(), AuctionError::InvalidProductType);
            require!(
                ctx.accounts.nft_token_account.is_some(),
                AuctionError::InvalidProductType
            );
        }
        ProductType::Physical => {
            require!(params.shipping.is_some(), AuctionError::InvalidProductType);
        }
        ProductType::Digital => {
            require!(
                params.digital_delivery.is_some(),
                AuctionError::InvalidProductType
            );
        }
        ProductType::Service => {
            require!(
                params.service_details.is_some(),
                AuctionError::InvalidProductType
            );
        }
    }
 
    // Calculate timestamps
    let start_time = clock.unix_timestamp;
    let end_time = start_time + params.duration;
    let reveal_duration = if params.reveal_duration > 0 {
        params.reveal_duration
    } else {
        config.default_reveal_duration
    };
 
    // Initialize auction state
    auction.auction_id = auction.key();
    auction.seller = ctx.accounts.seller.key();
    auction.product_type = params.product_type;
    auction.reserve_price_hash = params.reserve_price_hash;
    auction.start_time = start_time;
    auction.end_time = end_time;
    auction.reveal_duration = reveal_duration;
    auction.status = AuctionStatus::Active;
    auction.bid_count = 0;
    auction.revealed_count = 0;
    auction.bid_merkle_root = [0u8; 32];
    auction.product_metadata = product.key();
    auction.escrow_account = escrow.key();
    auction.winner = None;
    auction.winning_amount = None;
    auction.second_price = None;
    auction.nft_mint = params.nft_mint;
    auction.payment_mint = params.payment_mint;
    auction.min_bid_increment = params.min_bid_increment;
    auction.bid_collateral = params.bid_collateral;
    auction.per_session_id = [0u8; 32]; // Will be set by PER integration
    auction.bump = ctx.bumps.auction;
 
    // Initialize product metadata
    product.product_id = product.key();
    product.auction_id = auction.key();
    product.product_type = params.product_type;
    product.category = params.category;
    product.ipfs_hash = params.ipfs_hash.clone();
    product.title = params.title;
    product.description = params.description;
    product.images = params.images;
    product.seller = ctx.accounts.seller.key();
    product.shipping = params.shipping;
    product.digital_delivery = params.digital_delivery;
    product.service_details = params.service_details;
    product.nft_mint = params.nft_mint;
    product.created_at = clock.unix_timestamp;
    product.verified = false;
    product.bump = ctx.bumps.product_metadata;
 
    // Initialize escrow
    escrow.escrow_id = escrow.key();
    escrow.auction_id = auction.key();
    escrow.amount = 0;
    escrow.token_mint = params.payment_mint;
    escrow.token_account = ctx.accounts.escrow_vault.key();
    escrow.beneficiary = ctx.accounts.seller.key();
    escrow.payer = None;
    escrow.security_level = EscrowSecurityLevel::Standard;
    escrow.release_conditions = ReleaseConditions::default();
    escrow.status = EscrowStatus::Created;
    escrow.created_at = clock.unix_timestamp;
    escrow.released_at = None;
    escrow.bump = ctx.bumps.escrow;
 
    // Transfer NFT to escrow if NFT auction
    if params.product_type == ProductType::Nft {
        if let (Some(nft_source), Some(nft_dest)) = (
            &ctx.accounts.nft_token_account,
            &ctx.accounts.nft_escrow_account,
        ) {
            transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: nft_source.to_account_info(),
                        to: nft_dest.to_account_info(),
                        authority: ctx.accounts.seller.to_account_info(),
                    },
                ),
                1,
            )?;
        }
    }
 
    // Update stats
    stats.auction_created();
 
    // Emit event
    emit!(AuctionCreated {
        auction_id: auction.key(),
        seller: ctx.accounts.seller.key(),
        product_type: params.product_type as u8,
        category: params.category as u8,
        ipfs_hash: params.ipfs_hash,
        start_time,
        end_time,
        payment_mint: params.payment_mint,
        bid_collateral: params.bid_collateral,
        timestamp: clock.unix_timestamp,
    });
 
    msg!(
        "Auction {} created by {} ending at {}",
        auction.key(),
        ctx.accounts.seller.key(),
        end_time
    );
 
    Ok(())
}
 