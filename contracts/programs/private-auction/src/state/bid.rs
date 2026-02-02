use anchor_lang::prelude::*;
 
/// Bid commitment state (COMPRESSED via Light Protocol)
/// Stored in Merkle tree for privacy
#[account]
#[derive(Default, Debug)]
pub struct BidCommitment {
    /// Unique bid identifier
    pub bid_id: Pubkey,
 
    /// Associated auction
    pub auction_id: Pubkey,
 
    /// Bidder's wallet (may be PDA for additional privacy)
    pub bidder: Pubkey,
 
    /// Commitment hash: poseidon(bid_amount || salt || bidder_pubkey)
    pub commitment_hash: [u8; 32],
 
    /// Timestamp when bid was submitted
    pub timestamp: i64,
 
    /// Whether bid has been revealed
    pub revealed: bool,
 
    /// Revealed amount (only set after reveal)
    pub revealed_amount: Option<u64>,
 
    /// ZK proof hash for bid validity
    pub proof_hash: [u8; 32],
 
    /// Collateral deposited (returned on reveal or refund)
    pub collateral_deposited: u64,
 
    /// Whether collateral has been returned
    pub collateral_returned: bool,
 
    /// Bump seed for PDA
    pub bump: u8,
}
 
impl BidCommitment {
    pub const LEN: usize = 8 + // discriminator
        32 + // bid_id
        32 + // auction_id
        32 + // bidder
        32 + // commitment_hash
        8 + // timestamp
        1 + // revealed
        9 + // revealed_amount (Option<u64>)
        32 + // proof_hash
        8 + // collateral_deposited
        1 + // collateral_returned
        1; // bump
 
    /// Check if bid can be revealed
    pub fn can_reveal(&self) -> bool {
        !self.revealed
    }
 
    /// Mark bid as revealed with amount
    pub fn reveal(&mut self, amount: u64) {
        self.revealed = true;
        self.revealed_amount = Some(amount);
    }
}
 
/// Compressed bid commitment for Light Protocol Merkle tree
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CompressedBidCommitment {
    pub bid_id: [u8; 32],
    pub auction_id: [u8; 32],
    pub commitment_hash: [u8; 32],
    pub timestamp: i64,
    pub revealed: bool,
}
 
impl CompressedBidCommitment {
    pub const SERIALIZED_SIZE: usize = 32 + 32 + 32 + 8 + 1;
 
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(Self::SERIALIZED_SIZE);
        bytes.extend_from_slice(&self.bid_id);
        bytes.extend_from_slice(&self.auction_id);
        bytes.extend_from_slice(&self.commitment_hash);
        bytes.extend_from_slice(&self.timestamp.to_le_bytes());
        bytes.push(if self.revealed { 1 } else { 0 });
        bytes
    }
 
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() < Self::SERIALIZED_SIZE {
            return Err(anchor_lang::error::ErrorCode::AccountDidNotDeserialize.into());
        }
 
        Ok(Self {
            bid_id: bytes[0..32].try_into().unwrap(),
            auction_id: bytes[32..64].try_into().unwrap(),
            commitment_hash: bytes[64..96].try_into().unwrap(),
            timestamp: i64::from_le_bytes(bytes[96..104].try_into().unwrap()),
            revealed: bytes[104] != 0,
        })
    }
}
 
/// Bid reveal data submitted during reveal phase
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct BidReveal {
    /// The actual bid amount
    pub amount: u64,
 
    /// Random salt used in commitment
    pub salt: [u8; 32],
 
    /// ZK proof of valid reveal
    pub proof: Vec<u8>,
}
 
impl BidReveal {
    /// Verify the reveal matches the commitment
    pub fn verify_commitment(&self, commitment_hash: &[u8; 32], bidder: &Pubkey) -> bool {
        // Compute: poseidon(amount || salt || bidder)
        // This would use the actual Poseidon hash implementation
        let computed_hash = Self::compute_commitment(self.amount, &self.salt, bidder);
        computed_hash == *commitment_hash
    }
 
    /// Compute commitment hash from reveal data
    pub fn compute_commitment(amount: u64, salt: &[u8; 32], bidder: &Pubkey) -> [u8; 32] {
        use light_hasher::Poseidon;
        use solana_program::keccak;
 
        // Convert inputs to field elements for Poseidon
        // For production, use proper Poseidon implementation
        // This is a simplified version using keccak as placeholder
        let mut data = Vec::new();
        data.extend_from_slice(&amount.to_le_bytes());
        data.extend_from_slice(salt);
        data.extend_from_slice(&bidder.to_bytes());
 
        keccak::hash(&data).to_bytes()
    }
}
 
/// Bid status tracking
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum BidStatus {
    /// Bid submitted, pending reveal
    Committed,
    /// Bid revealed successfully
    Revealed,
    /// Bid won the auction
    Won,
    /// Bid lost, refund available
    Lost,
    /// Bid forfeited (failed to reveal)
    Forfeited,
    /// Refund claimed
    Refunded,
}
 
impl Default for BidStatus {
    fn default() -> Self {
        Self::Committed
    }
}