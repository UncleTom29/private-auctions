use anchor_lang::prelude::*;
use crate::state::{ProgramConfig, ProgramStats};
use crate::errors::ConfigError;
 
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct InitializeProgramParams {
    /// Platform fee in basis points (e.g., 250 = 2.5%)
    pub platform_fee_bps: u16,
    /// Minimum auction duration (seconds)
    pub min_auction_duration: i64,
    /// Maximum auction duration (seconds)
    pub max_auction_duration: i64,
    /// Default reveal duration (seconds)
    pub default_reveal_duration: i64,
    /// Minimum bid collateral (lamports)
    pub min_bid_collateral: u64,
    /// Maximum bid collateral (lamports)
    pub max_bid_collateral: u64,
    /// Minimum seller reputation score
    pub min_seller_reputation: u16,
    /// Minimum reputation for high-value auctions
    pub min_high_value_reputation: u16,
    /// High-value threshold (USD cents)
    pub high_value_threshold: u64,
    /// Supported payment token mints
    pub supported_mints: Vec<Pubkey>,
    /// Initial arbitrators
    pub arbitrators: Vec<Pubkey>,
}
 
#[derive(Accounts)]
pub struct InitializeProgram<'info> {
    #[account(
        init,
        payer = authority,
        space = ProgramConfig::LEN,
        seeds = [b"program_config"],
        bump
    )]
    pub config: Account<'info, ProgramConfig>,
 
    #[account(
        init,
        payer = authority,
        space = ProgramStats::LEN,
        seeds = [b"program_stats"],
        bump
    )]
    pub stats: Account<'info, ProgramStats>,
 
    #[account(mut)]
    pub authority: Signer<'info>,
 
    /// CHECK: Light Protocol state tree (validated externally)
    pub state_tree: AccountInfo<'info>,
 
    /// CHECK: Light Protocol nullifier queue (validated externally)
    pub nullifier_queue: AccountInfo<'info>,
 
    /// CHECK: MagicBlock PER config (validated externally)
    pub per_config: AccountInfo<'info>,
 
    /// CHECK: Fee collector address
    pub fee_collector: AccountInfo<'info>,
 
    pub system_program: Program<'info, System>,
}
 
pub fn handler(ctx: Context<InitializeProgram>, params: InitializeProgramParams) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let stats = &mut ctx.accounts.stats;
    let clock = Clock::get()?;
 
    // Validate parameters
    require!(
        params.platform_fee_bps <= 1000, // Max 10%
        ConfigError::InvalidParameter
    );
    require!(
        params.min_auction_duration > 0,
        ConfigError::InvalidParameter
    );
    require!(
        params.max_auction_duration > params.min_auction_duration,
        ConfigError::InvalidParameter
    );
    require!(
        params.min_bid_collateral > 0,
        ConfigError::InvalidParameter
    );
    require!(
        params.supported_mints.len() <= ProgramConfig::MAX_SUPPORTED_MINTS,
        ConfigError::InvalidParameter
    );
    require!(
        params.arbitrators.len() <= ProgramConfig::MAX_ARBITRATORS,
        ConfigError::InvalidParameter
    );
 
    // Initialize config
    config.authority = ctx.accounts.authority.key();
    config.upgrade_authority = ctx.accounts.authority.key();
    config.fee_collector = ctx.accounts.fee_collector.key();
    config.platform_fee_bps = params.platform_fee_bps;
    config.min_auction_duration = params.min_auction_duration;
    config.max_auction_duration = params.max_auction_duration;
    config.default_reveal_duration = params.default_reveal_duration;
    config.min_bid_collateral = params.min_bid_collateral;
    config.max_bid_collateral = params.max_bid_collateral;
    config.min_seller_reputation = params.min_seller_reputation;
    config.min_high_value_reputation = params.min_high_value_reputation;
    config.high_value_threshold = params.high_value_threshold;
    config.paused = false;
    config.state_tree = ctx.accounts.state_tree.key();
    config.nullifier_queue = ctx.accounts.nullifier_queue.key();
    config.per_config = ctx.accounts.per_config.key();
    config.supported_mints = params.supported_mints;
    config.arbitrators = params.arbitrators;
    config.version = 1;
    config.bump = ctx.bumps.config;
 
    // Initialize stats
    stats.total_auctions = 0;
    stats.active_auctions = 0;
    stats.total_bids = 0;
    stats.total_volume = 0;
    stats.total_fees = 0;
    stats.total_users = 0;
    stats.total_disputes = 0;
    stats.disputes_resolved = 0;
    stats.last_updated = clock.unix_timestamp;
    stats.bump = ctx.bumps.stats;
 
    msg!("Program initialized with {} supported mints", config.supported_mints.len());
 
    Ok(())
}
 