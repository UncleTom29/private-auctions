use anchor_lang::prelude::*;
 
/// User profile account (COMPRESSED via Light Protocol)
#[account]
#[derive(Default, Debug)]
pub struct UserProfile {
    /// User's primary wallet pubkey
    pub user_pubkey: Pubkey,
 
    /// Reputation score (0-1000)
    /// 500 = neutral, >700 = trusted, <300 = untrusted
    pub reputation_score: u16,
 
    /// Total auctions completed as seller
    pub auctions_as_seller: u32,
 
    /// Total auctions completed as buyer
    pub auctions_as_buyer: u32,
 
    /// Total successful deliveries
    pub successful_deliveries: u32,
 
    /// Number of disputes raised against user
    pub disputes_against: u8,
 
    /// Number of disputes user raised
    pub disputes_raised: u8,
 
    /// Number of disputes won
    pub disputes_won: u8,
 
    /// Total transaction volume (in USD cents)
    pub total_volume: u64,
 
    /// Average rating received (0-50, divide by 10 for stars)
    pub average_rating: u8,
 
    /// Number of ratings received
    pub rating_count: u32,
 
    /// Encrypted preferences (address, notifications, etc.)
    pub encrypted_preferences: [u8; 64],
 
    /// KYC verification level
    pub kyc_level: KycLevel,
 
    /// Account created timestamp
    pub created_at: i64,
 
    /// Last activity timestamp
    pub last_active: i64,
 
    /// Whether profile is verified by platform
    pub platform_verified: bool,
 
    /// Staked amount for reputation (slashable)
    pub staked_amount: u64,
 
    /// Bump seed for PDA
    pub bump: u8,
 
    /// Reserved for future use
    pub _reserved: [u8; 32],
}
 
impl UserProfile {
    pub const LEN: usize = 8 + // discriminator
        32 + // user_pubkey
        2 + // reputation_score
        4 + // auctions_as_seller
        4 + // auctions_as_buyer
        4 + // successful_deliveries
        1 + // disputes_against
        1 + // disputes_raised
        1 + // disputes_won
        8 + // total_volume
        1 + // average_rating
        4 + // rating_count
        64 + // encrypted_preferences
        1 + // kyc_level
        8 + // created_at
        8 + // last_active
        1 + // platform_verified
        8 + // staked_amount
        1 + // bump
        32; // _reserved
 
    /// Calculate reputation score based on activity
    pub fn calculate_reputation(&self) -> u16 {
        let total_auctions = self.auctions_as_seller + self.auctions_as_buyer;
        if total_auctions == 0 {
            return 500; // Neutral for new users
        }
 
        let mut score: i32 = 500;
 
        // Successful deliveries boost
        let delivery_rate = (self.successful_deliveries as f64) / (self.auctions_as_seller as f64).max(1.0);
        score += (delivery_rate * 200.0) as i32;
 
        // Dispute penalty
        let dispute_rate = (self.disputes_against as f64) / (total_auctions as f64).max(1.0);
        score -= (dispute_rate * 300.0) as i32;
 
        // Volume bonus (logarithmic)
        if self.total_volume > 0 {
            let volume_bonus = ((self.total_volume as f64).log10() * 10.0) as i32;
            score += volume_bonus.min(100);
        }
 
        // Rating bonus
        if self.rating_count > 0 {
            let rating_bonus = ((self.average_rating as i32 - 25) * 4); // -100 to +100
            score += rating_bonus;
        }
 
        // Clamp to valid range
        score.max(0).min(1000) as u16
    }
 
    /// Check if user meets minimum reputation for an action
    pub fn meets_reputation_threshold(&self, min_score: u16) -> bool {
        self.reputation_score >= min_score
    }
 
    /// Check if user can sell high-value items
    pub fn can_sell_high_value(&self) -> bool {
        self.reputation_score >= 700
            && self.auctions_as_seller >= 10
            && self.disputes_against < 3
            && self.kyc_level >= KycLevel::Enhanced
    }
 
    /// Update reputation after auction completion
    pub fn update_after_auction(&mut self, as_seller: bool, successful: bool, rating: Option<u8>) {
        if as_seller {
            self.auctions_as_seller += 1;
            if successful {
                self.successful_deliveries += 1;
            }
        } else {
            self.auctions_as_buyer += 1;
        }
 
        if let Some(r) = rating {
            let total_rating = (self.average_rating as u32) * self.rating_count + (r as u32);
            self.rating_count += 1;
            self.average_rating = (total_rating / self.rating_count) as u8;
        }
 
        self.reputation_score = self.calculate_reputation();
        self.last_active = Clock::get().unwrap().unix_timestamp;
    }
 
    /// Record a dispute against this user
    pub fn record_dispute_against(&mut self) {
        self.disputes_against += 1;
        self.reputation_score = self.calculate_reputation();
    }
 
    /// Record a dispute this user raised
    pub fn record_dispute_raised(&mut self, won: bool) {
        self.disputes_raised += 1;
        if won {
            self.disputes_won += 1;
        }
    }
}
 
/// KYC verification level
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Debug)]
pub enum KycLevel {
    /// No KYC verification
    None,
    /// Basic email/phone verification
    Basic,
    /// ID verification completed
    Enhanced,
    /// Full KYC with proof of address
    Full,
    /// Accredited investor status
    Accredited,
}
 
impl Default for KycLevel {
    fn default() -> Self {
        Self::None
    }
}
 
/// Compressed user profile for Light Protocol
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CompressedUserProfile {
    pub user_pubkey: [u8; 32],
    pub reputation_score: u16,
    pub auctions_completed: u32,
    pub disputes_against: u8,
    pub kyc_level: u8,
    pub created_at: i64,
}
 
impl CompressedUserProfile {
    pub const SERIALIZED_SIZE: usize = 32 + 2 + 4 + 1 + 1 + 8;
 
    pub fn from_profile(profile: &UserProfile) -> Self {
        Self {
            user_pubkey: profile.user_pubkey.to_bytes(),
            reputation_score: profile.reputation_score,
            auctions_completed: profile.auctions_as_seller + profile.auctions_as_buyer,
            disputes_against: profile.disputes_against,
            kyc_level: profile.kyc_level as u8,
            created_at: profile.created_at,
        }
    }
}
 
/// Reputation stake account for slashing mechanism
#[account]
#[derive(Default, Debug)]
pub struct ReputationStake {
    /// User's pubkey
    pub user: Pubkey,
 
    /// Staked token mint
    pub token_mint: Pubkey,
 
    /// Token account holding stake
    pub token_account: Pubkey,
 
    /// Amount staked
    pub amount: u64,
 
    /// Lock expiry (cannot withdraw until this time)
    pub lock_until: i64,
 
    /// Whether stake is currently locked due to dispute
    pub locked_for_dispute: bool,
 
    /// Bump seed for PDA
    pub bump: u8,
}
 
impl ReputationStake {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 8 + 8 + 1 + 1;
 
    /// Minimum stake for seller privileges
    pub const MIN_SELLER_STAKE: u64 = 100_000_000; // 100 USDC (6 decimals)
 
    /// Minimum stake for high-value auctions
    pub const MIN_HIGH_VALUE_STAKE: u64 = 1_000_000_000; // 1000 USDC
 
    /// Check if stake can be withdrawn
    pub fn can_withdraw(&self, current_time: i64) -> bool {
        !self.locked_for_dispute && current_time >= self.lock_until
    }
 
    /// Lock stake for dispute resolution
    pub fn lock_for_dispute(&mut self) {
        self.locked_for_dispute = true;
    }
 
    /// Unlock stake after dispute resolution
    pub fn unlock(&mut self) {
        self.locked_for_dispute = false;
    }
 
    /// Slash a portion of stake
    pub fn slash(&mut self, percentage: u8) -> u64 {
        let slash_amount = (self.amount * percentage as u64) / 100;
        self.amount -= slash_amount;
        slash_amount
    }
}
 