use anchor_lang::prelude::*;
 
/// Auction-related errors
#[error_code]
pub enum AuctionError {
    /// Auction duration is below minimum allowed
    #[msg("Auction duration is too short")]
    DurationTooShort,
 
    /// Auction duration exceeds maximum allowed
    #[msg("Auction duration is too long")]
    DurationTooLong,
 
    /// Bid collateral is below minimum required
    #[msg("Bid collateral is too low")]
    CollateralTooLow,
 
    /// Bid collateral exceeds maximum allowed
    #[msg("Bid collateral is too high")]
    CollateralTooHigh,
 
    /// Auction is not in active bidding phase
    #[msg("Auction is not active")]
    AuctionNotActive,
 
    /// Auction is not in reveal phase
    #[msg("Auction is not in reveal phase")]
    NotInRevealPhase,
 
    /// Auction cannot be settled yet
    #[msg("Auction cannot be settled yet")]
    CannotSettleYet,
 
    /// Auction has already been settled
    #[msg("Auction has already been settled")]
    AuctionAlreadySettled,
 
    /// Auction has been cancelled
    #[msg("Auction has been cancelled")]
    AuctionCancelled,
 
    /// Auction has expired
    #[msg("Auction has expired")]
    AuctionExpired,
 
    /// Bidding period has ended
    #[msg("Bidding period has ended")]
    BiddingEnded,
 
    /// Reveal period has ended
    #[msg("Reveal period has ended")]
    RevealPeriodEnded,
 
    /// Reserve price not met
    #[msg("Reserve price not met")]
    ReserveNotMet,
 
    /// No bids placed on auction
    #[msg("No bids placed on auction")]
    NoBidsPlaced,
 
    /// Invalid product type for this operation
    #[msg("Invalid product type")]
    InvalidProductType,
 
    /// Seller reputation too low
    #[msg("Seller reputation too low")]
    InsufficientSellerReputation,
 
    /// Cannot cancel auction with bids
    #[msg("Cannot cancel auction with bids")]
    CannotCancelWithBids,
 
    /// Only seller can perform this action
    #[msg("Only seller can perform this action")]
    OnlySeller,
 
    /// Invalid auction state for this operation
    #[msg("Invalid auction state")]
    InvalidAuctionState,
}
 
/// Bid-related errors
#[error_code]
pub enum BidError {
    /// Bid amount is below reserve price
    #[msg("Bid amount is below reserve price")]
    BidBelowReserve,
 
    /// Bid has already been revealed
    #[msg("Bid has already been revealed")]
    BidAlreadyRevealed,
 
    /// Bid commitment does not match reveal
    #[msg("Bid commitment does not match reveal")]
    CommitmentMismatch,
 
    /// Invalid ZK proof
    #[msg("Invalid ZK proof")]
    InvalidProof,
 
    /// Bidder has already placed a bid
    #[msg("Bidder has already placed a bid")]
    DuplicateBid,
 
    /// Bid not found
    #[msg("Bid not found")]
    BidNotFound,
 
    /// Only bidder can reveal their bid
    #[msg("Only bidder can reveal their bid")]
    OnlyBidder,
 
    /// Collateral not deposited
    #[msg("Collateral not deposited")]
    CollateralNotDeposited,
 
    /// Refund already claimed
    #[msg("Refund already claimed")]
    RefundAlreadyClaimed,
 
    /// Cannot claim refund for winning bid
    #[msg("Cannot claim refund for winning bid")]
    WinnerCannotRefund,
 
    /// Bid reveal deadline passed
    #[msg("Bid reveal deadline passed")]
    RevealDeadlinePassed,
}
 
/// Escrow-related errors
#[error_code]
pub enum EscrowError {
    /// Escrow is not funded
    #[msg("Escrow is not funded")]
    NotFunded,
 
    /// Escrow is already funded
    #[msg("Escrow is already funded")]
    AlreadyFunded,
 
    /// Escrow is locked
    #[msg("Escrow is locked")]
    EscrowLocked,
 
    /// Insufficient signatures for multi-sig release
    #[msg("Insufficient signatures")]
    InsufficientSignatures,
 
    /// Invalid signer for escrow
    #[msg("Invalid signer")]
    InvalidSigner,
 
    /// Time-lock not expired
    #[msg("Time-lock not expired")]
    TimeLockNotExpired,
 
    /// Escrow already released
    #[msg("Escrow already released")]
    AlreadyReleased,
 
    /// Invalid escrow state
    #[msg("Invalid escrow state")]
    InvalidEscrowState,
 
    /// Delivery not confirmed
    #[msg("Delivery not confirmed")]
    DeliveryNotConfirmed,
 
    /// Invalid token mint
    #[msg("Invalid token mint")]
    InvalidTokenMint,
 
    /// Amount mismatch
    #[msg("Amount mismatch")]
    AmountMismatch,
}
 
/// Dispute-related errors
#[error_code]
pub enum DisputeError {
    /// Dispute is already open
    #[msg("Dispute already exists")]
    DisputeAlreadyExists,
 
    /// Dispute not found
    #[msg("Dispute not found")]
    DisputeNotFound,
 
    /// Dispute is already resolved
    #[msg("Dispute already resolved")]
    DisputeAlreadyResolved,
 
    /// Cannot submit evidence at this time
    #[msg("Cannot submit evidence")]
    CannotSubmitEvidence,
 
    /// Evidence submission deadline passed
    #[msg("Evidence deadline passed")]
    EvidenceDeadlinePassed,
 
    /// Maximum evidence limit reached
    #[msg("Maximum evidence limit reached")]
    MaxEvidenceReached,
 
    /// Only arbitrator can perform this action
    #[msg("Only arbitrator can perform this action")]
    OnlyArbitrator,
 
    /// Not a party to this dispute
    #[msg("Not a party to this dispute")]
    NotAParty,
 
    /// Invalid dispute state for this operation
    #[msg("Invalid dispute state")]
    InvalidDisputeState,
 
    /// Voting period not open
    #[msg("Voting period not open")]
    VotingNotOpen,
 
    /// Arbitrator has already voted
    #[msg("Arbitrator has already voted")]
    AlreadyVoted,
 
    /// Resolution deadline passed
    #[msg("Resolution deadline passed")]
    ResolutionDeadlinePassed,
}
 
/// Profile-related errors
#[error_code]
pub enum ProfileError {
    /// Profile already exists
    #[msg("Profile already exists")]
    ProfileAlreadyExists,
 
    /// Profile not found
    #[msg("Profile not found")]
    ProfileNotFound,
 
    /// Insufficient reputation
    #[msg("Insufficient reputation")]
    InsufficientReputation,
 
    /// KYC verification required
    #[msg("KYC verification required")]
    KycRequired,
 
    /// Stake amount too low
    #[msg("Stake amount too low")]
    InsufficientStake,
 
    /// Cannot withdraw stake (locked)
    #[msg("Stake is locked")]
    StakeLocked,
 
    /// Invalid stake amount
    #[msg("Invalid stake amount")]
    InvalidStakeAmount,
}
 
/// Program configuration errors
#[error_code]
pub enum ConfigError {
    /// Program is paused
    #[msg("Program is paused")]
    ProgramPaused,
 
    /// Invalid authority
    #[msg("Invalid authority")]
    InvalidAuthority,
 
    /// Token mint not supported
    #[msg("Token mint not supported")]
    UnsupportedMint,
 
    /// Invalid parameter value
    #[msg("Invalid parameter")]
    InvalidParameter,
 
    /// Already initialized
    #[msg("Already initialized")]
    AlreadyInitialized,
 
    /// Not initialized
    #[msg("Not initialized")]
    NotInitialized,
}
 
/// Compression-related errors
#[error_code]
pub enum CompressionError {
    /// Failed to compress account
    #[msg("Compression failed")]
    CompressionFailed,
 
    /// Failed to decompress account
    #[msg("Decompression failed")]
    DecompressionFailed,
 
    /// Merkle proof verification failed
    #[msg("Invalid merkle proof")]
    InvalidMerkleProof,
 
    /// State tree not initialized
    #[msg("State tree not initialized")]
    StateTreeNotInitialized,
 
    /// Invalid compressed account data
    #[msg("Invalid compressed data")]
    InvalidCompressedData,
}
 
/// Fulfillment-related errors
#[error_code]
pub enum FulfillmentError {
    /// Delivery already confirmed
    #[msg("Delivery already confirmed")]
    DeliveryAlreadyConfirmed,
 
    /// Invalid delivery proof
    #[msg("Invalid delivery proof")]
    InvalidDeliveryProof,
 
    /// Only buyer can confirm delivery
    #[msg("Only buyer can confirm")]
    OnlyBuyerCanConfirm,
 
    /// Shipping address required
    #[msg("Shipping address required")]
    ShippingAddressRequired,
 
    /// Invalid tracking number
    #[msg("Invalid tracking number")]
    InvalidTrackingNumber,
 
    /// Redemption period expired
    #[msg("Redemption period expired")]
    RedemptionExpired,
 
    /// Service already redeemed
    #[msg("Service already redeemed")]
    ServiceAlreadyRedeemed,
}
 
