use anchor_lang::prelude::*;

/// Real xStocks mint addresses backed by Backed Finance
/// These are the actual tokenized stock mint addresses on Solana
pub mod xstocks_mints {
    use super::*;

    // Base tokens
    pub const USDC_MINT: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    pub const SOL_MINT: &str = "So11111111111111111111111111111111111111112";

    // xStocks mint addresses from xstocks.com/products
    pub const ABTX_MINT: &str = "XsHtf5RpxsQ7jeJ9ivNewouZKJHbPxhPoEy6yYvULr7";    // Abbott Laboratories
    pub const ABBVX_MINT: &str = "XswbinNKyPmzTa5CskMbCPvMW6G5CMnZXZEeQSSQoie";   // AbbVie Inc
    pub const ACNX_MINT: &str = "Xs5UJzmCRQ8DWZjskExdSQDnbE6iLkRu2jjrRAB1JSU";     // Accenture
    pub const GOOGL_MINT: &str = "XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN";   // Alphabet/Google
    pub const AMZN_MINT: &str = "Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg";    // Amazon

    // Additional xStocks - expand as needed
    // TODO: Add all 50+ xStocks from the full list

    /// Get all supported xStocks mint addresses
    pub fn get_supported_xstocks() -> Vec<(&'static str, &'static str)> {
        vec![
            ("ABTx", ABTX_MINT),
            ("ABBVx", ABBVX_MINT),
            ("ACNx", ACNX_MINT),
            ("GOOGLx", GOOGL_MINT),
            ("AMZNx", AMZN_MINT),
        ]
    }

    /// Validate if a mint address is a supported xStock
    pub fn is_supported_xstock(mint_address: &str) -> bool {
        match mint_address {
            ABTX_MINT | ABBVX_MINT | ACNX_MINT | GOOGL_MINT | AMZN_MINT => true,
            USDC_MINT => true, // USDC is always supported
            _ => false,
        }
    }

    /// Get xStock symbol from mint address
    pub fn get_symbol_from_mint(mint_address: &str) -> Option<&'static str> {
        match mint_address {
            ABTX_MINT => Some("ABTx"),
            ABBVX_MINT => Some("ABBVx"),
            ACNX_MINT => Some("ACNx"),
            GOOGL_MINT => Some("GOOGLx"),
            AMZN_MINT => Some("AMZNx"),
            USDC_MINT => Some("USDC"),
            _ => None,
        }
    }

    /// Get mint address from symbol
    pub fn get_mint_from_symbol(symbol: &str) -> Option<&'static str> {
        match symbol {
            "ABTx" => Some(ABTX_MINT),
            "ABBVx" => Some(ABBVX_MINT),
            "ACNx" => Some(ACNX_MINT),
            "GOOGLx" => Some(GOOGL_MINT),
            "AMZNx" => Some(AMZN_MINT),
            "USDC" => Some(USDC_MINT),
            _ => None,
        }
    }
}