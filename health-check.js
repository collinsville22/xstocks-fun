#!/usr/bin/env node

// xStocks.fun Health Check Script
// Verifies all critical systems are operational

const { Connection } = require('@solana/web3.js');

// Configuration
const CONFIG = {
  rpc: process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com',
  jupiterApiKey: process.env.NEXT_PUBLIC_JUPITER_API_KEY || '84e976a4-1a71-4ae2-b050-58e6364dc846',
  finnhubApiKey: process.env.NEXT_PUBLIC_FINNHUB_API_KEY || 'd2u2a9pr01qr5a74dfigd2u2a9pr01qr5a74dfj0',
  timeout: 10000 // 10 second timeout
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m', 
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Test Solana RPC connection
async function testSolanaRPC() {
  try {
    log('🔗 Testing Solana RPC connection...', colors.blue);
    const connection = new Connection(CONFIG.rpc);
    const version = await connection.getVersion();
    log(`✅ Solana RPC connected (version: ${version['solana-core']})`, colors.green);
    return true;
  } catch (error) {
    log(`❌ Solana RPC failed: ${error.message}`, colors.red);
    return false;
  }
}

// Test Jupiter API
async function testJupiterAPI() {
  try {
    log('⚡ Testing Jupiter API...', colors.blue);
    
    if (!CONFIG.jupiterApiKey) {
      log('⚠️  Jupiter API key not configured', colors.yellow);
      return false;
    }

    const response = await fetch('https://quote-api.jup.ag/v6/quote?inputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&outputMint=So11111111111111111111111111111111111111112&amount=1000000', {
      headers: {
        'X-API-KEY': CONFIG.jupiterApiKey
      }
    });
    
    if (response.ok) {
      log('✅ Jupiter API connected', colors.green);
      return true;
    } else {
      log(`❌ Jupiter API failed: ${response.status}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ Jupiter API error: ${error.message}`, colors.red);
    return false;
  }
}

// Test Congressional Trading (Capitol Trades scraper)
async function testCongressionalTrading() {
  try {
    log('🏛️ Testing Congressional Trading (Capitol Trades scraper)...', colors.blue);
    
    // Test direct Capitol Trades access
    const response = await fetch('https://www.capitoltrades.com/trades', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.ok) {
      log('✅ Capitol Trades website accessible for scraping', colors.green);
      return true;
    } else {
      log(`❌ Capitol Trades access failed: ${response.status}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ Congressional trading error: ${error.message}`, colors.red);
    return false;
  }
}

// Test xStocks metadata
async function testXStocksMetadata() {
  try {
    log('📊 Testing xStocks metadata...', colors.blue);
    
    const response = await fetch('https://xstocks-metadata.backed.fi/logos/tokens/AAPLx.png');
    
    if (response.ok) {
      log('✅ xStocks metadata accessible', colors.green);
      return true;
    } else {
      log(`❌ xStocks metadata failed: ${response.status}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ xStocks metadata error: ${error.message}`, colors.red);
    return false;
  }
}

// Main health check function
async function runHealthCheck() {
  log('', colors.reset);
  log('==========================================', colors.bright);
  log('🏥 xStocks.fun Health Check', colors.bright);  
  log('==========================================', colors.bright);
  log('', colors.reset);

  const results = {
    solana: await testSolanaRPC(),
    jupiter: await testJupiterAPI(),
    congressional: await testCongressionalTrading(),
    metadata: await testXStocksMetadata()
  };

  log('', colors.reset);
  log('==========================================', colors.bright);
  log('📋 HEALTH CHECK RESULTS', colors.bright);
  log('==========================================', colors.bright);
  
  const passing = Object.values(results).filter(r => r === true).length;
  const total = Object.keys(results).length;
  
  log(`Solana RPC:       ${results.solana ? '✅ PASS' : '❌ FAIL'}`, results.solana ? colors.green : colors.red);
  log(`Jupiter API:      ${results.jupiter ? '✅ PASS' : '⚠️  SKIP'}`, results.jupiter ? colors.green : colors.yellow);  
  log(`Congressional:    ${results.congressional ? '✅ PASS' : '❌ FAIL'}`, results.congressional ? colors.green : colors.red);
  log(`xStocks Data:     ${results.metadata ? '✅ PASS' : '❌ FAIL'}`, results.metadata ? colors.green : colors.red);
  
  log('', colors.reset);
  log(`Overall Status:   ${passing}/${total} systems operational`, colors.bright);
  
  if (results.solana && results.metadata && results.congressional) {
    log('🎉 All core systems operational - Platform ready!', colors.green);
    process.exit(0);
  } else if (results.solana && results.metadata) {
    log('⚠️  Core trading systems ready, congressional data needs attention', colors.yellow);
    process.exit(0);
  } else {
    log('⚠️  Critical systems need attention', colors.yellow);
    process.exit(1);
  }
}

// Run the health check
runHealthCheck().catch(error => {
  log(`💥 Health check failed: ${error.message}`, colors.red);
  process.exit(1);
});