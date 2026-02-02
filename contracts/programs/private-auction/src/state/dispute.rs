use anchor_lang::prelude::*;
 
/// Dispute reason categories
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum DisputeReason {
    /// Item not delivered
    NonDelivery,
    /// Item significantly different from description
    NotAsDescribed,
    /// Item damaged during shipping
    DamagedInTransit,
    /// Counterfeit/fake item
    Counterfeit,
    /// Seller did not ship item
    SellerNotShipping,
    /// Buyer claims non-receipt but tracking shows delivered
    FalseNonDelivery,
    /// Service not provided as agreed
    ServiceNotProvided,
    /// Digital product access issues
    DigitalAccessIssue,
    /// Other reason
    Other,
}
 
impl Default for DisputeReason {
    fn default() -> Self {
        Self::Other
    }
}
 
/// Dispute status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum DisputeStatus {
    /// Dispute opened, awaiting evidence
    Opened,
    /// Evidence submitted, awaiting review
    EvidenceSubmitted,
    /// Under arbitrator review
    UnderReview,
    /// Awaiting more information
    AwaitingInfo,
    /// Resolved in favor of buyer
    ResolvedBuyer,
    /// Resolved in favor of seller
    ResolvedSeller,
    /// Resolved with partial refund
    ResolvedPartial,
    /// Cancelled by disputer
    Cancelled,
    /// Escalated to higher authority
    Escalated,
}
 
impl Default for DisputeStatus {
    fn default() -> Self {
        Self::Opened
    }
}
 
/// Dispute resolution outcome
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum DisputeOutcome {
    /// Full refund to buyer
    FullRefund,
    /// Partial refund (percentage)
    PartialRefund { percentage: u8 },
    /// Release to seller
    ReleaseToSeller,
    /// Return item for refund
    ReturnForRefund,
    /// Both parties at fault, split
    SplitFault,
}
 
/// Evidence submission
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct Evidence {
    /// Submitter (buyer or seller)
    pub submitter: Pubkey,
 
    /// Evidence type
    pub evidence_type: EvidenceType,
 
    /// Encrypted evidence data (IPFS hash)
    pub encrypted_data: [u8; 64],
 
    /// Submission timestamp
    pub submitted_at: i64,
 
    /// Whether arbitrator has reviewed
    pub reviewed: bool,
}
 
/// Type of evidence
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum EvidenceType {
    /// Photo/screenshot
    Photo,
    /// Video
    Video,
    /// Message/communication log
    MessageLog,
    /// Tracking information
    Tracking,
    /// Receipt/invoice
    Receipt,
    /// Expert opinion
    ExpertOpinion,
    /// Other document
    Other,
}
 
impl Default for EvidenceType {
    fn default() -> Self {
        Self::Other
    }
}
 
/// Dispute account
#[account]
#[derive(Default, Debug)]
pub struct Dispute {
    /// Unique dispute identifier
    pub dispute_id: Pubkey,
 
    /// Associated auction
    pub auction_id: Pubkey,
 
    /// Escrow being disputed
    pub escrow_id: Pubkey,
 
    /// Buyer (typically the disputer)
    pub buyer: Pubkey,
 
    /// Seller (defendant)
    pub seller: Pubkey,
 
    /// Who raised the dispute
    pub raised_by: Pubkey,
 
    /// Dispute reason
    pub reason: DisputeReason,
 
    /// Detailed description (encrypted)
    pub description_encrypted: [u8; 256],
 
    /// Current status
    pub status: DisputeStatus,
 
    /// Amount in dispute
    pub amount: u64,
 
    /// Evidence submitted by buyer
    pub buyer_evidence: Vec<Evidence>,
 
    /// Evidence submitted by seller
    pub seller_evidence: Vec<Evidence>,
 
    /// Assigned arbitrator
    pub arbitrator: Option<Pubkey>,
 
    /// Arbitrator notes (encrypted)
    pub arbitrator_notes: Option<[u8; 256]>,
 
    /// Outcome if resolved
    pub outcome: Option<DisputeOutcome>,
 
    /// Refund amount if partial
    pub refund_amount: Option<u64>,
 
    /// Opened timestamp
    pub opened_at: i64,
 
    /// Last activity timestamp
    pub last_activity: i64,
 
    /// Resolved timestamp
    pub resolved_at: Option<i64>,
 
    /// Deadline for evidence submission
    pub evidence_deadline: i64,
 
    /// Deadline for resolution
    pub resolution_deadline: i64,
 
    /// Number of arbitrator votes collected (for multi-sig)
    pub votes_collected: u8,
 
    /// Votes for buyer
    pub votes_for_buyer: u8,
 
    /// Votes for seller
    pub votes_for_seller: u8,
 
    /// Bump seed for PDA
    pub bump: u8,
}
 
impl Dispute {
    pub const MAX_EVIDENCE_PER_PARTY: usize = 10;
 
    pub const LEN: usize = 8 + // discriminator
        32 + // dispute_id
        32 + // auction_id
        32 + // escrow_id
        32 + // buyer
        32 + // seller
        32 + // raised_by
        1 + // reason
        256 + // description_encrypted
        1 + // status
        8 + // amount
        (4 + Self::MAX_EVIDENCE_PER_PARTY * 128) + // buyer_evidence
        (4 + Self::MAX_EVIDENCE_PER_PARTY * 128) + // seller_evidence
        33 + // arbitrator (Option<Pubkey>)
        (1 + 256) + // arbitrator_notes (Option)
        2 + // outcome (Option<DisputeOutcome>)
        9 + // refund_amount (Option<u64>)
        8 + // opened_at
        8 + // last_activity
        9 + // resolved_at (Option<i64>)
        8 + // evidence_deadline
        8 + // resolution_deadline
        1 + // votes_collected
        1 + // votes_for_buyer
        1 + // votes_for_seller
        1; // bump
 
    /// Default evidence deadline: 7 days
    pub const DEFAULT_EVIDENCE_PERIOD: i64 = 7 * 24 * 60 * 60;
 
    /// Default resolution deadline: 14 days
    pub const DEFAULT_RESOLUTION_PERIOD: i64 = 14 * 24 * 60 * 60;
 
    /// Minimum votes for resolution (multi-sig threshold)
    pub const MIN_VOTES_FOR_RESOLUTION: u8 = 2;
 
    /// Check if dispute can accept evidence
    pub fn can_submit_evidence(&self, current_time: i64) -> bool {
        matches!(
            self.status,
            DisputeStatus::Opened | DisputeStatus::AwaitingInfo
        ) && current_time < self.evidence_deadline
    }
 
    /// Check if dispute can be resolved
    pub fn can_resolve(&self, current_time: i64) -> bool {
        (self.status == DisputeStatus::UnderReview
            || self.status == DisputeStatus::EvidenceSubmitted)
            && self.votes_collected >= Self::MIN_VOTES_FOR_RESOLUTION
    }
 
    /// Add evidence from a party
    pub fn add_evidence(&mut self, evidence: Evidence, is_buyer: bool) -> Result<()> {
        let evidence_list = if is_buyer {
            &mut self.buyer_evidence
        } else {
            &mut self.seller_evidence
        };
 
        require!(
            evidence_list.len() < Self::MAX_EVIDENCE_PER_PARTY,
            crate::errors::DisputeError::MaxEvidenceReached
        );
 
        evidence_list.push(evidence);
        self.last_activity = Clock::get()?.unix_timestamp;
 
        if self.status == DisputeStatus::Opened {
            self.status = DisputeStatus::EvidenceSubmitted;
        }
 
        Ok(())
    }
 
    /// Record arbitrator vote
    pub fn record_vote(&mut self, for_buyer: bool) {
        self.votes_collected += 1;
        if for_buyer {
            self.votes_for_buyer += 1;
        } else {
            self.votes_for_seller += 1;
        }
    }
 
    /// Determine outcome based on votes
    pub fn determine_outcome(&self) -> DisputeOutcome {
        if self.votes_for_buyer > self.votes_for_seller {
            DisputeOutcome::FullRefund
        } else if self.votes_for_seller > self.votes_for_buyer {
            DisputeOutcome::ReleaseToSeller
        } else {
            DisputeOutcome::SplitFault
        }
    }
 
    /// Resolve the dispute
    pub fn resolve(&mut self, outcome: DisputeOutcome, refund_amount: Option<u64>) {
        self.outcome = Some(outcome);
        self.refund_amount = refund_amount;
        self.resolved_at = Some(Clock::get().unwrap().unix_timestamp);
 
        self.status = match outcome {
            DisputeOutcome::FullRefund => DisputeStatus::ResolvedBuyer,
            DisputeOutcome::ReleaseToSeller => DisputeStatus::ResolvedSeller,
            DisputeOutcome::PartialRefund { .. } | DisputeOutcome::SplitFault => {
                DisputeStatus::ResolvedPartial
            }
            DisputeOutcome::ReturnForRefund => DisputeStatus::ResolvedBuyer,
        };
    }
}
 
/// Arbitrator record
#[account]
#[derive(Default, Debug)]
pub struct ArbitratorRecord {
    /// Arbitrator pubkey
    pub arbitrator: Pubkey,
 
    /// Total cases handled
    pub cases_handled: u32,
 
    /// Cases resolved
    pub cases_resolved: u32,
 
    /// Average resolution time (seconds)
    pub avg_resolution_time: u64,
 
    /// Rating from parties (0-50)
    pub rating: u8,
 
    /// Number of ratings
    pub rating_count: u32,
 
    /// Total fees earned
    pub fees_earned: u64,
 
    /// Active cases currently assigned
    pub active_cases: u8,
 
    /// Maximum concurrent cases
    pub max_cases: u8,
 
    /// Whether arbitrator is active
    pub active: bool,
 
    /// Joined timestamp
    pub joined_at: i64,
 
    /// Last activity
    pub last_activity: i64,
 
    /// Bump seed for PDA
    pub bump: u8,
}
 
impl ArbitratorRecord {
    pub const LEN: usize = 8 + 32 + 4 + 4 + 8 + 1 + 4 + 8 + 1 + 1 + 1 + 8 + 8 + 1;
 
    /// Default max concurrent cases
    pub const DEFAULT_MAX_CASES: u8 = 10;
 
    /// Check if arbitrator can take new case
    pub fn can_take_case(&self) -> bool {
        self.active && self.active_cases < self.max_cases
    }
 
    /// Assign a new case
    pub fn assign_case(&mut self) {
        self.active_cases += 1;
        self.cases_handled += 1;
        self.last_activity = Clock::get().unwrap().unix_timestamp;
    }
 
    /// Complete a case
    pub fn complete_case(&mut self, resolution_time: u64, fee: u64) {
        self.active_cases = self.active_cases.saturating_sub(1);
        self.cases_resolved += 1;
        self.fees_earned += fee;
 
        // Update average resolution time
        let total_time =
            self.avg_resolution_time * (self.cases_resolved - 1) as u64 + resolution_time;
        self.avg_resolution_time = total_time / self.cases_resolved as u64;
 
        self.last_activity = Clock::get().unwrap().unix_timestamp;
    }
 
    /// Update rating
    pub fn update_rating(&mut self, new_rating: u8) {
        let total = self.rating as u32 * self.rating_count + new_rating as u32;
        self.rating_count += 1;
        self.rating = (total / self.rating_count) as u8;
    }
}
