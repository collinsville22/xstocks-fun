use anchor_lang::prelude::*;
use anchor_spl::token::Token;

// Real xStocks integration modules
pub mod xstocks_mints;
pub mod jupiter_real_integration;
use jupiter_real_integration::jupiter_integration;
use xstocks_mints::xstocks_mints::*;

declare_id!("GeP82ZB8YSjxf3zSxNGkvmZ8avwAzEdwGo4cy1rpvpGY");

#[program]
pub mod xstocks_fun {
    use super::*;

    // Initialize a new basket of tokenized stocks
    pub fn initialize_basket(
        ctx: Context<InitializeBasket>,
        basket_name: String,
        basket_symbol: String,
        xstock_mints: Vec<Pubkey>,
        weights: Vec<u16>,
        min_investment_usdc: u64,
    ) -> Result<()> {
        require!(xstock_mints.len() == weights.len(), ErrorCode::MismatchedArrays);
        require!(xstock_mints.len() <= 20, ErrorCode::TooManyStocks);
        require!(basket_name.len() <= 32, ErrorCode::NameTooLong);
        require!(basket_symbol.len() <= 10, ErrorCode::SymbolTooLong);
        
        let basket = &mut ctx.accounts.basket;
        basket.authority = *ctx.accounts.authority.key;
        basket.name = basket_name;
        basket.symbol = basket_symbol;
        basket.xstock_mints = xstock_mints;
        basket.weights = weights;
        basket.min_investment_usdc = min_investment_usdc;
        basket.total_invested = 0;
        basket.created_at = Clock::get()?.unix_timestamp;
        basket.is_active = true;
        
        emit!(BasketInitialized {
            basket: basket.key(),
            authority: basket.authority,
            name: basket.name.clone(),
            symbol: basket.symbol.clone(),
            stocks_count: basket.xstock_mints.len() as u8,
        });

        Ok(())
    }

    // Invest in a basket with USDC
    pub fn invest_in_basket(
        ctx: Context<InvestInBasket>,
        usdc_amount: u64,
    ) -> Result<()> {
        // First collect basket data without mutable borrow
        let basket_weights = ctx.accounts.basket.weights.clone();
        let basket_xstock_mints = ctx.accounts.basket.xstock_mints.clone();
        let is_active = ctx.accounts.basket.is_active;
        let min_investment = ctx.accounts.basket.min_investment_usdc;
        
        require!(is_active, ErrorCode::BasketInactive);
        require!(usdc_amount >= min_investment, ErrorCode::InvestmentTooSmall);

        // Calculate proportional amounts for each stock
        let total_weight: u16 = basket_weights.iter().sum();
        
        for (i, &weight) in basket_weights.iter().enumerate() {
            let stock_amount = (usdc_amount as u128 * weight as u128 / total_weight as u128) as u64;
            
            // Skip swap if amount is too small
            if stock_amount < 1000 { // Less than 0.001 USDC
                continue;
            }
            
            // Get target xStock mint address
            let target_xstock_mint = basket_xstock_mints[i].to_string();
            
            // Validate this is a real supported xStock
            if !is_supported_xstock(&target_xstock_mint) {
                msg!("Unsupported xStock mint: {}", target_xstock_mint);
                return Err(ErrorCode::UnsupportedXStock.into());
            }
            
            // Execute REAL Jupiter swap to xStock
            match jupiter_integration::execute_real_xstock_swap(
                &ctx,
                stock_amount,
                &target_xstock_mint,
                300, // 3% slippage tolerance
                50,  // 0.5% platform fee
                stock_amount * 99 / 100, // Expected output (placeholder - should come from Jupiter quote)
            ) {
                Ok(received_amount) => {
                    let symbol = get_symbol_from_mint(&target_xstock_mint)
                        .unwrap_or("Unknown");
                    msg!("✅ REAL SWAP SUCCESS: {} USDC -> {} {} tokens", 
                         stock_amount, received_amount, symbol);
                },
                Err(e) => {
                    msg!("❌ REAL SWAP FAILED for {}: {:?}", target_xstock_mint, e);
                    return Err(e);
                }
            }
        }

        // Now we can mutably borrow basket to update it
        let basket = &mut ctx.accounts.basket;
        basket.total_invested = basket.total_invested.checked_add(usdc_amount)
            .ok_or(ErrorCode::Overflow)?;

        // Update user's investment record
        let user_investment = &mut ctx.accounts.user_investment;
        user_investment.user = *ctx.accounts.user.key;
        user_investment.basket = basket.key();
        user_investment.total_invested = user_investment.total_invested
            .checked_add(usdc_amount)
            .ok_or(ErrorCode::Overflow)?;
        user_investment.last_investment = Clock::get()?.unix_timestamp;

        emit!(InvestmentMade {
            user: user_investment.user,
            basket: basket.key(),
            amount: usdc_amount,
            timestamp: user_investment.last_investment,
        });

        Ok(())
    }

    // TODO: Implement Jupiter CPI integration here
    // Will add execute_jupiter_swap function when Jupiter dependencies are resolved

    // Set up advanced Dollar Cost Averaging (DCA) schedule with sophisticated strategies
    pub fn setup_advanced_dca(
        ctx: Context<SetupDCA>,
        amount_per_period: u64,
        frequency_seconds: i64,
        total_periods: u32,
        dca_strategy: DCAStrategy,
        price_trigger_percentage: Option<u8>, // For price-based triggers
        volatility_threshold: Option<u16>, // Volatility threshold in basis points
        max_slippage_bps: u16,
        auto_rebalance: bool,
    ) -> Result<()> {
        require!(frequency_seconds >= 3600, ErrorCode::FrequencyTooLow); // Minimum 1 hour
        require!(total_periods > 0 && total_periods <= 1095, ErrorCode::InvalidPeriods); // Up to 3 years
        require!(max_slippage_bps <= 1000, ErrorCode::SlippageTooHigh); // Max 10%
        require!(amount_per_period >= 1000, ErrorCode::InvestmentTooSmall); // Min $0.001

        // Validate strategy-specific parameters
        match dca_strategy {
            DCAStrategy::FixedAmount => {
                // No additional validation needed
            },
            DCAStrategy::ValueAveraging => {
                // Value averaging requires target value growth
                require!(amount_per_period > 0, ErrorCode::InvalidAmount);
            },
            DCAStrategy::PriceBased => {
                require!(
                    price_trigger_percentage.is_some() && price_trigger_percentage.unwrap() <= 50,
                    ErrorCode::InvalidPriceTrigger
                );
            },
            DCAStrategy::VolatilityAdaptive => {
                require!(
                    volatility_threshold.is_some() && volatility_threshold.unwrap() <= 5000, // Max 50%
                    ErrorCode::InvalidVolatilityThreshold
                );
            },
        }
        
        let dca = &mut ctx.accounts.dca;
        dca.user = *ctx.accounts.user.key;
        dca.basket = ctx.accounts.basket.key();
        dca.amount_per_period = amount_per_period;
        dca.frequency_seconds = frequency_seconds;
        dca.total_periods = total_periods;
        dca.periods_executed = 0;
        dca.next_execution = Clock::get()?.unix_timestamp + frequency_seconds;
        dca.is_active = true;
        dca.created_at = Clock::get()?.unix_timestamp;
        
        // Advanced DCA fields
        dca.strategy = dca_strategy;
        dca.price_trigger_percentage = price_trigger_percentage;
        dca.volatility_threshold = volatility_threshold;
        dca.max_slippage_bps = max_slippage_bps;
        dca.auto_rebalance = auto_rebalance;
        dca.total_invested_so_far = 0;
        dca.last_portfolio_value = 0;
        dca.consecutive_executions = 0;
        dca.last_volatility_reading = 0;

        emit!(AdvancedDCAScheduleCreated {
            user: dca.user,
            basket: dca.basket,
            amount_per_period,
            frequency_seconds,
            total_periods,
            strategy: dca_strategy,
            max_slippage_bps,
            auto_rebalance,
        });

        Ok(())
    }

    // Legacy DCA setup for backward compatibility
    pub fn setup_dca(
        ctx: Context<SetupDCA>,
        amount_per_period: u64,
        frequency_seconds: i64,
        total_periods: u32,
    ) -> Result<()> {
        // Call advanced DCA with default strategy
        Self::setup_advanced_dca(
            ctx,
            amount_per_period,
            frequency_seconds,
            total_periods,
            DCAStrategy::FixedAmount,
            None,
            None,
            300, // 3% max slippage
            false,
        )
    }

    // Execute DCA investment (can be called by anyone/cron)
    pub fn execute_dca(ctx: Context<ExecuteDCA>) -> Result<()> {
        let dca = &mut ctx.accounts.dca;
        require!(dca.is_active, ErrorCode::DCAInactive);
        require!(dca.periods_executed < dca.total_periods, ErrorCode::DCACompleted);
        
        let current_time = Clock::get()?.unix_timestamp;
        require!(current_time >= dca.next_execution, ErrorCode::DCANotReady);

        // Execute the investment (similar to invest_in_basket)
        let basket = &ctx.accounts.basket;
        let total_weight: u16 = basket.weights.iter().sum();
        
        for (i, &weight) in basket.weights.iter().enumerate() {
            let stock_amount = (dca.amount_per_period as u128 * weight as u128 / total_weight as u128) as u64;
            msg!("DCA investing {} USDC in stock {}", stock_amount, basket.xstock_mints[i]);
        }

        // Update DCA schedule
        dca.periods_executed += 1;
        dca.next_execution = current_time + dca.frequency_seconds;
        
        if dca.periods_executed >= dca.total_periods {
            dca.is_active = false;
        }

        emit!(DCAExecuted {
            user: dca.user,
            basket: dca.basket,
            amount: dca.amount_per_period,
            period: dca.periods_executed,
            next_execution: if dca.is_active { Some(dca.next_execution) } else { None },
        });

        Ok(())
    }

    // Withdraw from basket (redeem basket tokens for underlying assets)
    pub fn withdraw_from_basket(
        ctx: Context<WithdrawFromBasket>,
        percentage: u8, // 1-100
    ) -> Result<()> {
        require!(percentage > 0 && percentage <= 100, ErrorCode::InvalidPercentage);
        
        let user_investment = &mut ctx.accounts.user_investment;
        let withdrawal_amount = user_investment.total_invested * percentage as u64 / 100;
        
        user_investment.total_invested = user_investment.total_invested
            .checked_sub(withdrawal_amount)
            .ok_or(ErrorCode::InsufficientFunds)?;

        // In real implementation, would sell proportional amounts of each stock
        msg!("Withdrawing {} USDC worth of assets", withdrawal_amount);

        emit!(WithdrawalMade {
            user: user_investment.user,
            basket: user_investment.basket,
            amount: withdrawal_amount,
            percentage,
        });

        Ok(())
    }
}

// Account structures
#[account]
pub struct Basket {
    pub authority: Pubkey,
    pub name: String,
    pub symbol: String,
    pub xstock_mints: Vec<Pubkey>,
    pub weights: Vec<u16>,
    pub min_investment_usdc: u64,
    pub total_invested: u64,
    pub created_at: i64,
    pub is_active: bool,
}

#[account]
pub struct UserInvestment {
    pub user: Pubkey,
    pub basket: Pubkey,
    pub total_invested: u64,
    pub last_investment: i64,
}

#[account]
pub struct DCASchedule {
    pub user: Pubkey,
    pub basket: Pubkey,
    pub amount_per_period: u64,
    pub frequency_seconds: i64,
    pub total_periods: u32,
    pub periods_executed: u32,
    pub next_execution: i64,
    pub is_active: bool,
    pub created_at: i64,
}

// Context structures
#[derive(Accounts)]
#[instruction(basket_name: String)]
pub struct InitializeBasket<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 10 + (32 * 20) + (2 * 20) + 8 + 8 + 8 + 1 + 200, // Extra space for dynamic data
        seeds = [b"basket", basket_name.as_bytes()],
        bump
    )]
    pub basket: Account<'info, Basket>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InvestInBasket<'info> {
    #[account(mut)]
    pub basket: Account<'info, Basket>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 32 + 32 + 8 + 8,
        seeds = [b"investment", user.key().as_ref(), basket.key().as_ref()],
        bump
    )]
    pub user_investment: Account<'info, UserInvestment>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// Token program for SPL token operations
    pub token_program: Program<'info, Token>,
    
    /// System program for account creation
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetupDCA<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 32 + 8 + 8 + 4 + 4 + 8 + 1 + 8,
        seeds = [b"dca", user.key().as_ref(), basket.key().as_ref()],
        bump
    )]
    pub dca: Account<'info, DCASchedule>,
    
    pub basket: Account<'info, Basket>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteDCA<'info> {
    #[account(mut)]
    pub dca: Account<'info, DCASchedule>,
    
    pub basket: Account<'info, Basket>,
}

#[derive(Accounts)]
pub struct WithdrawFromBasket<'info> {
    #[account(mut)]
    pub user_investment: Account<'info, UserInvestment>,
    
    pub user: Signer<'info>,
}

// Events
#[event]
pub struct BasketInitialized {
    pub basket: Pubkey,
    pub authority: Pubkey,
    pub name: String,
    pub symbol: String,
    pub stocks_count: u8,
}

#[event]
pub struct InvestmentMade {
    pub user: Pubkey,
    pub basket: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct DCAScheduleCreated {
    pub user: Pubkey,
    pub basket: Pubkey,
    pub amount_per_period: u64,
    pub frequency_seconds: i64,
    pub total_periods: u32,
}

#[event]
pub struct DCAExecuted {
    pub user: Pubkey,
    pub basket: Pubkey,
    pub amount: u64,
    pub period: u32,
    pub next_execution: Option<i64>,
}

#[event]
pub struct WithdrawalMade {
    pub user: Pubkey,
    pub basket: Pubkey,
    pub amount: u64,
    pub percentage: u8,
}

// Custom error codes
#[error_code]
pub enum ErrorCode {
    #[msg("Array lengths don't match")]
    MismatchedArrays,
    #[msg("Too many stocks in basket (max 20)")]
    TooManyStocks,
    #[msg("Basket name too long (max 32 chars)")]
    NameTooLong,
    #[msg("Basket symbol too long (max 10 chars)")]
    SymbolTooLong,
    #[msg("Basket is not active")]
    BasketInactive,
    #[msg("Investment amount too small")]
    InvestmentTooSmall,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("DCA frequency too low (minimum 1 hour)")]
    FrequencyTooLow,
    #[msg("Invalid number of periods")]
    InvalidPeriods,
    #[msg("DCA is not active")]
    DCAInactive,
    #[msg("DCA has completed all periods")]
    DCACompleted,
    #[msg("DCA not ready for execution")]
    DCANotReady,
    #[msg("Invalid percentage (1-100)")]
    InvalidPercentage,
    #[msg("Insufficient funds")]
    InsufficientFunds,
    // Jupiter Integration Errors
    #[msg("Invalid swap amount")]
    InvalidAmount,
    #[msg("Slippage tolerance too high (max 10%)")]
    SlippageTooHigh,
    #[msg("Jupiter swap failed")]
    SwapFailed,
    #[msg("Invalid Jupiter program")]
    InvalidJupiterProgram,
    #[msg("Token account mismatch")]
    TokenAccountMismatch,
    #[msg("Unsupported xStock mint address")]
    UnsupportedXStock,
    #[msg("Invalid input token for swap")]
    InvalidInputToken,
}