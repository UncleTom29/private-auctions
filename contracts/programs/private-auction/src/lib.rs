use anchor_lang::prelude::*;
 
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;
 
use instructions::*;
 
declare_id!("4cerGDg4RFW8LQ9iZNnB8ao5ALfn9gE7Qaq5xGekwiqT");
 
#[program]
pub mod private_auction {
    use super::*;
 
    /// Initialize the auction program with global configuration
    pub fn initialize_program(
        ctx: Context<InitializeProgram>,
        params: InitializeProgramParams,
    ) -> Result<()> {
        instructions::initialize_program::handler(ctx, params)
    }
 
    /// Create a new auction with compressed state
    pub fn create_auction(
        ctx: Context<CreateAuction>,
        params: CreateAuctionParams,
    ) -> Result<()> {
        instructions::create_auction::handler(ctx, params)
    }
 
    /// Submit a bid commitment to the auction (compressed storage)
    pub fn submit_bid(ctx: Context<SubmitBid>, params: SubmitBidParams) -> Result<()> {
        instructions::submit_bid::handler(ctx, params)
    }
 
    /// Reveal a previously submitted bid
    pub fn reveal_bid(ctx: Context<RevealBid>, params: RevealBidParams) -> Result<()> {
        instructions::reveal_bid::handler(ctx, params)
    }
 
    /// Settle the auction and determine winner
    pub fn settle_auction(ctx: Context<SettleAuction>) -> Result<()> {
        instructions::settle_auction::handler(ctx)
    }
 
    /// Cancel an auction (seller only, before any bids)
    pub fn cancel_auction(ctx: Context<CancelAuction>) -> Result<()> {
        instructions::cancel_auction::handler(ctx)
    }
 
    /// Confirm delivery of physical/digital product
    pub fn confirm_delivery(
        ctx: Context<ConfirmDelivery>,
        params: ConfirmDeliveryParams,
    ) -> Result<()> {
        instructions::confirm_delivery::handler(ctx, params)
    }
 
    /// Initiate a dispute
    pub fn raise_dispute(ctx: Context<RaiseDispute>, params: RaiseDisputeParams) -> Result<()> {
        instructions::raise_dispute::handler(ctx, params)
    }
 
    /// Resolve a dispute (arbitrator only)
    pub fn resolve_dispute(
        ctx: Context<ResolveDispute>,
        params: ResolveDisputeParams,
    ) -> Result<()> {
        instructions::resolve_dispute::handler(ctx, params)
    }
 
    /// Update user profile (compressed account)
    pub fn update_profile(
        ctx: Context<UpdateProfile>,
        params: UpdateProfileParams,
    ) -> Result<()> {
        instructions::update_profile::handler(ctx, params)
    }
 
    /// Claim refund for non-winning bidders
    pub fn claim_refund(ctx: Context<ClaimRefund>) -> Result<()> {
        instructions::claim_refund::handler(ctx)
    }
}