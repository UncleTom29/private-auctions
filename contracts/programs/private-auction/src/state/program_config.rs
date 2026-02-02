use anchor_lang::prelude::*;
 
/// Global program configuration
#[account]
#[derive(Default, Debug)]
pub struct ProgramConfig {
    /// Program authority (can update config)
    pub authority: Pubkey,
 
    /// Program upgrade authority (multi-sig)
    pub upgrade_authority: Pubkey,
 
    /// Fee collector address
    pub fee_collector: Pubkey,
 
    /// Platform fee in basis points (e.g., 250 = 2.5%)
    pub platform_fee_bps: u16,
 
    /// Minimum auction duration (seconds)
    pub min_auction_duration: i64,
 
    /// Maximum auction duration (seconds)
    pub max_auction_duration: i64,
 
    /// Default reveal duration (seconds)
    pub default_reveal_duration: i64,
 
    /// Minimum bid collateral (in lamports)
    pub min_bid_collateral: u64,
 
    /// Maximum bid collateral (in lamports)
    pub max_bid_collateral: u64,
 
    /// Minimum reputation score to create auctions
    pub min_seller_reputation: u16,
 
    /// Minimum reputation score for high-value auctions
    pub min_high_value_reputation: u16,
 
    /// High-value threshold (in USD cents)
    pub high_value_threshold: u64,
 
    /// Whether the program is paused
    pub paused: bool,
 
    /// Light Protocol state tree (for compressed accounts)
    pub state_tree: Pubkey,
 
    /// Light Protocol nullifier queue
    pub nullifier_queue: Pubkey,
 
    /// MagicBlock PER configuration
    pub per_config: Pubkey,
 
    /// Supported payment mints
    pub supported_mints: Vec<Pubkey>,
 
    /// Arbitrators for dispute resolution
    pub arbitrators: Vec<Pubkey>,
 
    /// Program version
    pub version: u8,
 
    /// Bump seed for PDA
    pub bump: u8,
 
    /// Reserved for future use
    pub _reserved: [u8; 64],
}
 
impl ProgramConfig {
    pub const MAX_SUPPORTED_MINTS: usize = 10;
    pub const MAX_ARBITRATORS: usize = 10;
 
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // upgrade_authority
        32 + // fee_collector
        2 + // platform_fee_bps
        8 + // min_auction_duration
        8 + // max_auction_duration
        8 + // default_reveal_duration
        8 + // min_bid_collateral
        8 + // max_bid_collateral
        2 + // min_seller_reputation
        2 + // min_high_value_reputation
        8 + // high_value_threshold
        1 + // paused
        32 + // state_tree
        32 + // nullifier_queue
        32 + // per_config
        (4 + Self::MAX_SUPPORTED_MINTS * 32) + // supported_mints
        (4 + Self::MAX_ARBITRATORS * 32) + // arbitrators
        1 + // version
        1 + // bump
        64; // _reserved
 
    /// Default values for production
    pub fn default_production() -> Self {
        Self {
            authority: Pubkey::default(),
            upgrade_authority: Pubkey::default(),
            fee_collector: Pubkey::default(),
            platform_fee_bps: 250, // 2.5%
            min_auction_duration: 3600, // 1 hour
            max_auction_duration: 2592000, // 30 days
            default_reveal_duration: 86400, // 24 hours
            min_bid_collateral: 1_000_000, // 0.001 SOL
            max_bid_collateral: 1_000_000_000, // 1 SOL
            min_seller_reputation: 300,
            min_high_value_reputation: 700,
            high_value_threshold: 1_000_000, // $10,000 in cents
            paused: false,
            state_tree: Pubkey::default(),
            nullifier_queue: Pubkey::default(),
            per_config: Pubkey::default(),
            supported_mints: vec![],
            arbitrators: vec![],
            version: 1,
            bump: 0,
            _reserved: [0u8; 64],
        }
    }
 
    /// Check if a mint is supported
    pub fn is_mint_supported(&self, mint: &Pubkey) -> bool {
        self.supported_mints.contains(mint)
    }
 
    /// Check if address is an arbitrator
    pub fn is_arbitrator(&self, address: &Pubkey) -> bool {
        self.arbitrators.contains(address)
    }
 
    /// Calculate platform fee for a given amount
    pub fn calculate_fee(&self, amount: u64) -> u64 {
        (amount * self.platform_fee_bps as u64) / 10_000
    }
 
    /// Validate auction parameters
    pub fn validate_auction_params(&self, duration: i64, collateral: u64) -> Result<()> {
        require!(
            duration >= self.min_auction_duration,
            crate::errors::AuctionError::DurationTooShort
        );
        require!(
            duration <= self.max_auction_duration,
            crate::errors::AuctionError::DurationTooLong
        );
        require!(
            collateral >= self.min_bid_collateral,
            crate::errors::AuctionError::CollateralTooLow
        );
        require!(
            collateral <= self.max_bid_collateral,
            crate::errors::AuctionError::CollateralTooHigh
        );
        Ok(())
    }
}
 
/// Program statistics (for analytics)
#[account]
#[derive(Default, Debug)]
pub struct ProgramStats {
    /// Total auctions created
    pub total_auctions: u64,
 
    /// Active auctions
    pub active_auctions: u64,
 
    /// Total bids placed
    pub total_bids: u64,
 
    /// Total transaction volume (in lamports)
    pub total_volume: u64,
 
    /// Total fees collected (in lamports)
    pub total_fees: u64,
 
    /// Total users registered
    pub total_users: u64,
 
    /// Total disputes
    pub total_disputes: u64,
 
    /// Disputes resolved
    pub disputes_resolved: u64,
 
    /// Last updated timestamp
    pub last_updated: i64,
 
    /// Bump seed for PDA
    pub bump: u8,
}
 
impl ProgramStats {
    pub const LEN: usize = 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 1;
 
    /// Update stats when auction is created
    pub fn auction_created(&mut self) {
        self.total_auctions += 1;
        self.active_auctions += 1;
        self.last_updated = Clock::get().unwrap().unix_timestamp;
    }
 
    /// Update stats when auction is completed
    pub fn auction_completed(&mut self, volume: u64, fee: u64) {
        self.active_auctions = self.active_auctions.saturating_sub(1);
        self.total_volume += volume;
        self.total_fees += fee;
        self.last_updated = Clock::get().unwrap().unix_timestamp;
    }
 
    /// Update stats when bid is placed
    pub fn bid_placed(&mut self) {
        self.total_bids += 1;
        self.last_updated = Clock::get().unwrap().unix_timestamp;
    }
 
    /// Update stats when user registers
    pub fn user_registered(&mut self) {
        self.total_users += 1;
        self.last_updated = Clock::get().unwrap().unix_timestamp;
    }
 
    /// Update stats when dispute is raised
    pub fn dispute_raised(&mut self) {
        self.total_disputes += 1;
        self.last_updated = Clock::get().unwrap().unix_timestamp;
    }
 
    /// Update stats when dispute is resolved
    pub fn dispute_resolved(&mut self) {
        self.disputes_resolved += 1;
        self.last_updated = Clock::get().unwrap().unix_timestamp;
    }
}