use anchor_lang::prelude::*;
 
/// Auction status enum
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum AuctionStatus {
    /// Auction is active and accepting bids
    Active,
    /// Reveal phase - bidders must reveal their bids
    Revealing,
    /// Auction settled, winner determined
    Settled,
    /// Auction cancelled by seller
    Cancelled,
    /// Auction expired without bids
    Expired,
    /// Disputed - awaiting resolution
    Disputed,
}
 
impl Default for AuctionStatus {
    fn default() -> Self {
        Self::Active
    }
}
 
/// Product type discriminator
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum ProductType {
    /// NFT auction - direct Metaplex transfer
    Nft,
    /// Physical goods - requires shipping
    Physical,
    /// Digital goods - encrypted key delivery
    Digital,
    /// Services - time-locked redemption
    Service,
}
 
impl Default for ProductType {
    fn default() -> Self {
        Self::Nft
    }
}
 
/// Main auction state account (COMPRESSED via Light Protocol)
/// This struct represents the core auction data stored on-chain
#[account]
#[derive(Default, Debug)]
pub struct AuctionState {
    /// Unique auction identifier
    pub auction_id: Pubkey,
 
    /// Seller's wallet address
    pub seller: Pubkey,
 
    /// Type of product being auctioned
    pub product_type: ProductType,
 
    /// Hash of encrypted reserve price (Poseidon hash)
    /// hash(reserve_price || salt || seller_pubkey)
    pub reserve_price_hash: [u8; 32],
 
    /// Auction start timestamp (Unix)
    pub start_time: i64,
 
    /// Auction end timestamp (Unix)
    pub end_time: i64,
 
    /// Reveal phase duration in seconds (default: 86400 = 24 hours)
    pub reveal_duration: i64,
 
    /// Current auction status
    pub status: AuctionStatus,
 
    /// Number of bids received (cached from Merkle tree)
    pub bid_count: u32,
 
    /// Number of bids revealed
    pub revealed_count: u32,
 
    /// Merkle tree root for bid commitments
    pub bid_merkle_root: [u8; 32],
 
    /// Product metadata account (compressed)
    pub product_metadata: Pubkey,
 
    /// Escrow account for funds
    pub escrow_account: Pubkey,
 
    /// Winner's pubkey (set after settlement)
    pub winner: Option<Pubkey>,
 
    /// Winning bid amount (set after settlement)
    pub winning_amount: Option<u64>,
 
    /// Second price amount (actual payment)
    pub second_price: Option<u64>,
 
    /// NFT mint (if product_type == Nft)
    pub nft_mint: Option<Pubkey>,
 
    /// Token mint for payment (USDC, SOL wrapped, etc.)
    pub payment_mint: Pubkey,
 
    /// Minimum bid increment (in token base units)
    pub min_bid_increment: u64,
 
    /// Required bid collateral (anti-spam)
    pub bid_collateral: u64,
 
    /// MagicBlock PER session ID
    pub per_session_id: [u8; 32],
 
    /// Bump seed for PDA
    pub bump: u8,
 
    /// Reserved space for future upgrades
    pub _reserved: [u8; 64],
}
 
impl AuctionState {
    pub const LEN: usize = 8 + // discriminator
        32 + // auction_id
        32 + // seller
        1 + // product_type
        32 + // reserve_price_hash
        8 + // start_time
        8 + // end_time
        8 + // reveal_duration
        1 + // status
        4 + // bid_count
        4 + // revealed_count
        32 + // bid_merkle_root
        32 + // product_metadata
        32 + // escrow_account
        33 + // winner (Option<Pubkey>)
        9 + // winning_amount (Option<u64>)
        9 + // second_price (Option<u64>)
        33 + // nft_mint (Option<Pubkey>)
        32 + // payment_mint
        8 + // min_bid_increment
        8 + // bid_collateral
        32 + // per_session_id
        1 + // bump
        64; // _reserved
 
    /// Check if auction is in bidding phase
    pub fn is_active(&self) -> bool {
        self.status == AuctionStatus::Active
    }
 
    /// Check if auction is in reveal phase
    pub fn is_revealing(&self) -> bool {
        self.status == AuctionStatus::Revealing
    }
 
    /// Check if auction can accept bids
    pub fn can_accept_bids(&self, current_time: i64) -> bool {
        self.is_active() && current_time >= self.start_time && current_time < self.end_time
    }
 
    /// Check if reveal phase is active
    pub fn can_reveal_bids(&self, current_time: i64) -> bool {
        self.is_revealing()
            && current_time >= self.end_time
            && current_time < self.end_time + self.reveal_duration
    }
 
    /// Check if auction can be settled
    pub fn can_settle(&self, current_time: i64) -> bool {
        self.is_revealing() && current_time >= self.end_time + self.reveal_duration
    }
 
    /// Get reveal deadline
    pub fn reveal_deadline(&self) -> i64 {
        self.end_time + self.reveal_duration
    }
}
 
/// Compressed auction state for Light Protocol
/// This is the compressed version stored in the Merkle tree
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CompressedAuctionState {
    pub auction_id: [u8; 32],
    pub seller: [u8; 32],
    pub product_type: u8,
    pub reserve_price_hash: [u8; 32],
    pub start_time: i64,
    pub end_time: i64,
    pub reveal_duration: i64,
    pub status: u8,
    pub bid_count: u32,
    pub bid_merkle_root: [u8; 32],
}
 
impl CompressedAuctionState {
    pub fn from_auction_state(state: &AuctionState) -> Self {
        Self {
            auction_id: state.auction_id.to_bytes(),
            seller: state.seller.to_bytes(),
            product_type: state.product_type as u8,
            reserve_price_hash: state.reserve_price_hash,
            start_time: state.start_time,
            end_time: state.end_time,
            reveal_duration: state.reveal_duration,
            status: state.status as u8,
            bid_count: state.bid_count,
            bid_merkle_root: state.bid_merkle_root,
        }
    }
}
 