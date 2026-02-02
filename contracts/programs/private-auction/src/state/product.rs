use anchor_lang::prelude::*;
 
use super::ProductType;
 
/// Product category for marketplace organization
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum Category {
    // NFT Categories
    Art,
    Collectibles,
    Gaming,
    Music,
    Photography,
    Sports,
 
    // Physical Categories
    Electronics,
    Fashion,
    HomeGarden,
    Jewelry,
    Vehicles,
    Antiques,
 
    // Digital Categories
    Software,
    Ebooks,
    Courses,
    Templates,
    Domains,
 
    // Service Categories
    Consulting,
    Design,
    Development,
    Marketing,
    Writing,
 
    // Generic
    Other,
}
 
impl Default for Category {
    fn default() -> Self {
        Self::Other
    }
}
 
/// Product condition (for physical goods)
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum Condition {
    New,
    LikeNew,
    Excellent,
    Good,
    Fair,
    ForParts,
}
 
impl Default for Condition {
    fn default() -> Self {
        Self::New
    }
}
 
/// Shipping options for physical products
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ShippingOptions {
    /// Domestic shipping available
    pub domestic: bool,
 
    /// International shipping available
    pub international: bool,
 
    /// Estimated shipping cost (in cents)
    pub estimated_cost: u64,
 
    /// Estimated delivery days
    pub estimated_days: u8,
 
    /// Shipping carriers supported
    pub carriers: Vec<String>,
 
    /// Ships from location (country code)
    pub ships_from: String,
 
    /// Restricted destinations (country codes)
    pub restricted_destinations: Vec<String>,
}
 
impl Default for ShippingOptions {
    fn default() -> Self {
        Self {
            domestic: true,
            international: false,
            estimated_cost: 0,
            estimated_days: 7,
            carriers: vec![],
            ships_from: String::from("US"),
            restricted_destinations: vec![],
        }
    }
}
 
/// Digital product delivery options
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct DigitalDelivery {
    /// File format (e.g., PDF, MP4, ZIP)
    pub format: String,
 
    /// File size in bytes
    pub file_size: u64,
 
    /// Encrypted download link (revealed to winner)
    pub encrypted_link: Vec<u8>,
 
    /// License type
    pub license_type: LicenseType,
 
    /// Number of downloads allowed
    pub max_downloads: u8,
 
    /// Download expiry (Unix timestamp)
    pub expires_at: i64,
}
 
impl Default for DigitalDelivery {
    fn default() -> Self {
        Self {
            format: String::new(),
            file_size: 0,
            encrypted_link: vec![],
            license_type: LicenseType::Personal,
            max_downloads: 3,
            expires_at: 0,
        }
    }
}
 
/// License type for digital products
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum LicenseType {
    Personal,
    Commercial,
    Enterprise,
    Unlimited,
}
 
impl Default for LicenseType {
    fn default() -> Self {
        Self::Personal
    }
}
 
/// Service details for service auctions
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ServiceDetails {
    /// Service type description
    pub service_type: String,
 
    /// Duration of service (hours)
    pub duration_hours: u32,
 
    /// Service must be redeemed before this date
    pub redemption_deadline: i64,
 
    /// Whether service is delivered remotely
    pub remote: bool,
 
    /// Location if in-person (encrypted)
    pub location_encrypted: Vec<u8>,
 
    /// Provider qualifications/credentials
    pub qualifications: String,
}
 
impl Default for ServiceDetails {
    fn default() -> Self {
        Self {
            service_type: String::new(),
            duration_hours: 1,
            redemption_deadline: 0,
            remote: true,
            location_encrypted: vec![],
            qualifications: String::new(),
        }
    }
}
 
/// Product metadata account (COMPRESSED via Light Protocol)
#[account]
#[derive(Default, Debug)]
pub struct ProductMetadata {
    /// Unique product identifier
    pub product_id: Pubkey,
 
    /// Associated auction
    pub auction_id: Pubkey,
 
    /// Product type
    pub product_type: ProductType,
 
    /// Category for marketplace
    pub category: Category,
 
    /// IPFS hash for full metadata JSON
    pub ipfs_hash: String,
 
    /// Title (short, for display)
    pub title: String,
 
    /// Brief description
    pub description: String,
 
    /// Image URLs (stored in R2/CDN)
    pub images: Vec<String>,
 
    /// Seller's pubkey
    pub seller: Pubkey,
 
    /// Condition (for physical goods)
    pub condition: Option<Condition>,
 
    /// Shipping options (for physical goods)
    pub shipping: Option<ShippingOptions>,
 
    /// Digital delivery (for digital goods)
    pub digital_delivery: Option<DigitalDelivery>,
 
    /// Service details (for services)
    pub service_details: Option<ServiceDetails>,
 
    /// NFT mint (for NFT auctions)
    pub nft_mint: Option<Pubkey>,
 
    /// Created timestamp
    pub created_at: i64,
 
    /// Verified by platform
    pub verified: bool,
 
    /// Bump seed for PDA
    pub bump: u8,
}
 
impl ProductMetadata {
    pub const MAX_TITLE_LEN: usize = 100;
    pub const MAX_DESCRIPTION_LEN: usize = 500;
    pub const MAX_IMAGES: usize = 10;
    pub const MAX_IPFS_HASH_LEN: usize = 64;
 
    pub const LEN: usize = 8 + // discriminator
        32 + // product_id
        32 + // auction_id
        1 + // product_type
        1 + // category
        (4 + Self::MAX_IPFS_HASH_LEN) + // ipfs_hash
        (4 + Self::MAX_TITLE_LEN) + // title
        (4 + Self::MAX_DESCRIPTION_LEN) + // description
        (4 + Self::MAX_IMAGES * 100) + // images
        32 + // seller
        2 + // condition (Option<Condition>)
        256 + // shipping (Option<ShippingOptions>) approx
        256 + // digital_delivery (Option<DigitalDelivery>) approx
        256 + // service_details (Option<ServiceDetails>) approx
        33 + // nft_mint (Option<Pubkey>)
        8 + // created_at
        1 + // verified
        1; // bump
 
    /// Validate product metadata
    pub fn validate(&self) -> Result<()> {
        require!(
            self.title.len() <= Self::MAX_TITLE_LEN,
            anchor_lang::error::ErrorCode::AccountDidNotSerialize
        );
        require!(
            self.description.len() <= Self::MAX_DESCRIPTION_LEN,
            anchor_lang::error::ErrorCode::AccountDidNotSerialize
        );
        require!(
            self.images.len() <= Self::MAX_IMAGES,
            anchor_lang::error::ErrorCode::AccountDidNotSerialize
        );
        Ok(())
    }
}
 
/// Compressed product metadata for Light Protocol
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CompressedProductMetadata {
    pub product_id: [u8; 32],
    pub auction_id: [u8; 32],
    pub product_type: u8,
    pub category: u8,
    pub ipfs_hash: [u8; 64],
    pub seller: [u8; 32],
    pub created_at: i64,
}
 
impl CompressedProductMetadata {
    pub const SERIALIZED_SIZE: usize = 32 + 32 + 1 + 1 + 64 + 32 + 8;
}
 