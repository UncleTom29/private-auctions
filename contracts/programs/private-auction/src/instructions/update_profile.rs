use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, transfer, Transfer};
 
use crate::state::*;
use crate::errors::*;
use crate::events::{ProfileCreated, StakeDeposited, StakeWithdrawn};
 
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct UpdateProfileParams {
    /// Encrypted preferences update
    pub encrypted_preferences: Option<[u8; 64]>,
    /// KYC level update (requires external verification)
    pub kyc_level: Option<KycLevel>,
    /// Stake amount to add (0 = no change)
    pub stake_amount: u64,
    /// Whether to withdraw stake
    pub withdraw_stake: bool,
}
 
#[derive(Accounts)]
#[instruction(params: UpdateProfileParams)]
pub struct UpdateProfile<'info> {
    #[account(
        seeds = [b"program_config"],
        bump = config.bump
    )]
    pub config: Account<'info, ProgramConfig>,
 
    #[account(
        mut,
        seeds = [b"program_stats"],
        bump = stats.bump
    )]
    pub stats: Account<'info, ProgramStats>,
 
    #[account(
        init_if_needed,
        payer = user,
        space = UserProfile::LEN,
        seeds = [b"user_profile", user.key().as_ref()],
        bump
    )]
    pub profile: Account<'info, UserProfile>,
 
    #[account(
        init_if_needed,
        payer = user,
        space = ReputationStake::LEN,
        seeds = [b"reputation_stake", user.key().as_ref()],
        bump
    )]
    pub stake_account: Account<'info, ReputationStake>,
 
    #[account(
        init_if_needed,
        payer = user,
        token::mint = stake_mint,
        token::authority = stake_account,
        seeds = [b"stake_vault", user.key().as_ref()],
        bump
    )]
    pub stake_vault: Account<'info, TokenAccount>,
 
    /// Stake token mint (e.g., USDC)
    pub stake_mint: Account<'info, anchor_spl::token::Mint>,
 
    #[account(
        mut,
        constraint = user_token_account.owner == user.key(),
        constraint = user_token_account.mint == stake_mint.key()
    )]
    pub user_token_account: Account<'info, TokenAccount>,
 
    #[account(mut)]
    pub user: Signer<'info>,
 
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
 
pub fn handler(ctx: Context<UpdateProfile>, params: UpdateProfileParams) -> Result<()> {
    let profile = &mut ctx.accounts.profile;
    let stake_account = &mut ctx.accounts.stake_account;
    let stats = &mut ctx.accounts.stats;
    let clock = Clock::get()?;
 
    let is_new_profile = profile.created_at == 0;
 
    // Initialize new profile if needed
    if is_new_profile {
        profile.user_pubkey = ctx.accounts.user.key();
        profile.reputation_score = 500; // Neutral starting score
        profile.auctions_as_seller = 0;
        profile.auctions_as_buyer = 0;
        profile.successful_deliveries = 0;
        profile.disputes_against = 0;
        profile.disputes_raised = 0;
        profile.disputes_won = 0;
        profile.total_volume = 0;
        profile.average_rating = 25; // 2.5 stars default
        profile.rating_count = 0;
        profile.kyc_level = KycLevel::None;
        profile.created_at = clock.unix_timestamp;
        profile.last_active = clock.unix_timestamp;
        profile.platform_verified = false;
        profile.staked_amount = 0;
        profile.bump = ctx.bumps.profile;
 
        // Initialize stake account
        stake_account.user = ctx.accounts.user.key();
        stake_account.token_mint = ctx.accounts.stake_mint.key();
        stake_account.token_account = ctx.accounts.stake_vault.key();
        stake_account.amount = 0;
        stake_account.lock_until = 0;
        stake_account.locked_for_dispute = false;
        stake_account.bump = ctx.bumps.stake_account;
 
        stats.user_registered();
 
        emit!(ProfileCreated {
            user: ctx.accounts.user.key(),
            reputation_score: profile.reputation_score,
            kyc_level: profile.kyc_level as u8,
            timestamp: clock.unix_timestamp,
        });
 
        msg!("Profile created for {}", ctx.accounts.user.key());
    }
 
    // Update preferences if provided
    if let Some(prefs) = params.encrypted_preferences {
        profile.encrypted_preferences = prefs;
    }
 
    // Update KYC level if provided (would require external verification in production)
    if let Some(kyc) = params.kyc_level {
        profile.kyc_level = kyc;
    }
 
    // Handle stake deposit
    if params.stake_amount > 0 {
        transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.stake_vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            params.stake_amount,
        )?;
 
        stake_account.amount += params.stake_amount;
        // Lock for 30 days minimum
        stake_account.lock_until = clock.unix_timestamp + (30 * 24 * 60 * 60);
        profile.staked_amount = stake_account.amount;
 
        emit!(StakeDeposited {
            user: ctx.accounts.user.key(),
            amount: params.stake_amount,
            total_stake: stake_account.amount,
            lock_until: stake_account.lock_until,
            timestamp: clock.unix_timestamp,
        });
 
        msg!(
            "Stake deposited: {} (total: {})",
            params.stake_amount,
            stake_account.amount
        );
    }
 
    // Handle stake withdrawal
    if params.withdraw_stake {
        require!(
            stake_account.can_withdraw(clock.unix_timestamp),
            ProfileError::StakeLocked
        );
 
        let withdraw_amount = stake_account.amount;
 
        let user_key = ctx.accounts.user.key();
        let stake_vault_seeds = &[
            b"stake_vault".as_ref(),
            user_key.as_ref(),
            &[ctx.bumps.stake_vault],
        ];
 
        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.stake_vault.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.stake_vault.to_account_info(),
                },
                &[stake_vault_seeds],
            ),
            withdraw_amount,
        )?;
 
        stake_account.amount = 0;
        profile.staked_amount = 0;
 
        emit!(StakeWithdrawn {
            user: ctx.accounts.user.key(),
            amount: withdraw_amount,
            remaining_stake: 0,
            timestamp: clock.unix_timestamp,
        });
 
        msg!("Stake withdrawn: {}", withdraw_amount);
    }
 
    // Update last active timestamp
    profile.last_active = clock.unix_timestamp;
 
    Ok(())
}
 