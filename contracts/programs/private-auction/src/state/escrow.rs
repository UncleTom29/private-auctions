use anchor_lang::prelude::*;
 
/// Escrow security level based on auction value
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum EscrowSecurityLevel {
    /// Standard: Single-sig release ($0 - $1,000)
    Standard,
    /// Enhanced: 2-of-3 multi-sig ($1,000 - $10,000)
    Enhanced,
    /// Maximum: 3-of-5 multi-sig + time-lock ($10,000+)
    Maximum,
}
 
impl Default for EscrowSecurityLevel {
    fn default() -> Self {
        Self::Standard
    }
}
 
/// Release conditions for escrow
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ReleaseConditions {
    /// Delivery confirmation required
    pub requires_delivery_confirmation: bool,
 
    /// Time-lock duration (seconds after settlement)
    pub time_lock_duration: i64,
 
    /// Multi-sig threshold (number of signatures required)
    pub multi_sig_threshold: u8,
 
    /// Multi-sig signers
    pub signers: Vec<Pubkey>,
 
    /// Signatures collected
    pub signatures_collected: u8,
 
    /// Release deadline (Unix timestamp)
    pub release_deadline: i64,
}
 
impl Default for ReleaseConditions {
    fn default() -> Self {
        Self {
            requires_delivery_confirmation: false,
            time_lock_duration: 0,
            multi_sig_threshold: 1,
            signers: vec![],
            signatures_collected: 0,
            release_deadline: 0,
        }
    }
}
 
/// Escrow account (UNCOMPRESSED - needs fast access for settlement)
#[account]
#[derive(Default, Debug)]
pub struct EscrowAccount {
    /// Unique escrow identifier
    pub escrow_id: Pubkey,
 
    /// Associated auction
    pub auction_id: Pubkey,
 
    /// Total amount held in escrow
    pub amount: u64,
 
    /// Token mint (USDC, SOL, etc.)
    pub token_mint: Pubkey,
 
    /// Token account holding the funds
    pub token_account: Pubkey,
 
    /// Beneficiary (seller) address
    pub beneficiary: Pubkey,
 
    /// Winner/payer address
    pub payer: Option<Pubkey>,
 
    /// Security level based on value
    pub security_level: EscrowSecurityLevel,
 
    /// Release conditions
    pub release_conditions: ReleaseConditions,
 
    /// Escrow status
    pub status: EscrowStatus,
 
    /// Created timestamp
    pub created_at: i64,
 
    /// Released timestamp
    pub released_at: Option<i64>,
 
    /// Bump seed for PDA
    pub bump: u8,
 
    /// Reserved for future use
    pub _reserved: [u8; 32],
}
 
impl EscrowAccount {
    pub const LEN: usize = 8 + // discriminator
        32 + // escrow_id
        32 + // auction_id
        8 + // amount
        32 + // token_mint
        32 + // token_account
        32 + // beneficiary
        33 + // payer (Option<Pubkey>)
        1 + // security_level
        (1 + 8 + 1 + 4 + (32 * 5) + 1 + 8) + // release_conditions (approx)
        1 + // status
        8 + // created_at
        9 + // released_at (Option<i64>)
        1 + // bump
        32; // _reserved
 
    /// Determine security level based on amount
    pub fn determine_security_level(amount_usd: u64) -> EscrowSecurityLevel {
        // Assuming amount is in USD cents
        match amount_usd {
            0..=100_000 => EscrowSecurityLevel::Standard,           // $0 - $1,000
            100_001..=1_000_000 => EscrowSecurityLevel::Enhanced,   // $1,000 - $10,000
            _ => EscrowSecurityLevel::Maximum,                      // $10,000+
        }
    }
 
    /// Check if escrow can be released
    pub fn can_release(&self, current_time: i64) -> bool {
        if self.status != EscrowStatus::Funded {
            return false;
        }
 
        // Check time-lock
        if current_time < self.release_conditions.release_deadline {
            return false;
        }
 
        // Check multi-sig threshold
        if self.release_conditions.signatures_collected < self.release_conditions.multi_sig_threshold
        {
            return false;
        }
 
        // Check delivery confirmation if required
        // (This would be checked via external oracle/confirmation)
 
        true
    }
 
    /// Add a signature for multi-sig release
    pub fn add_signature(&mut self, signer: &Pubkey) -> Result<()> {
        if !self.release_conditions.signers.contains(signer) {
            return Err(anchor_lang::error::ErrorCode::ConstraintOwner.into());
        }
        self.release_conditions.signatures_collected += 1;
        Ok(())
    }
}
 
/// Escrow status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, Default)]
pub enum EscrowStatus {
    /// Escrow created but not funded
    #[default]
    Created,
    /// Escrow funded with bid amount
    Funded,
    /// Funds released to beneficiary
    Released,
    /// Funds refunded to payer
    Refunded,
    /// Escrow disputed
    Disputed,
    /// Escrow cancelled
    Cancelled,
}
 
/// Collateral pool for bid collateral management
#[account]
#[derive(Default, Debug)]
pub struct CollateralPool {
    /// Pool authority
    pub authority: Pubkey,
 
    /// Token mint for collateral
    pub token_mint: Pubkey,
 
    /// Token account holding collateral
    pub token_account: Pubkey,
 
    /// Total collateral held
    pub total_collateral: u64,
 
    /// Number of active bids with collateral
    pub active_bids: u32,
 
    /// Bump seed for PDA
    pub bump: u8,
}
 
impl CollateralPool {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 8 + 4 + 1;
 
    /// Deposit collateral for a bid
    pub fn deposit(&mut self, amount: u64) {
        self.total_collateral += amount;
        self.active_bids += 1;
    }
 
    /// Withdraw collateral (refund or forfeiture)
    pub fn withdraw(&mut self, amount: u64) -> Result<()> {
        if amount > self.total_collateral {
            return Err(anchor_lang::error::ErrorCode::InsufficientFunds.into());
        }
        self.total_collateral -= amount;
        if self.active_bids > 0 {
            self.active_bids -= 1;
        }
        Ok(())
    }
}