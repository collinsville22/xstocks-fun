# xStocks.fun - Your Gateway to Stock Investing on Solana

A straightforward platform for investing in real US stocks through tokenized securities (xStocks) on Solana. No complicated interfaces, no confusing jargon - just simple stock investing powered by blockchain technology.

## What This Actually Does

This platform lets you buy real US stocks using crypto. Each xStock token represents actual shares of companies like Apple, Google, or Tesla, backed 1:1 by the real securities. Think of it as buying stocks with USDC instead of dollars.

## Real Features (Not Marketing Fluff)

### ✅ Working Right Now
- **62 Real xStocks**: All tokens from xstocks.com with real contract addresses
- **Jupiter Integration**: Swap USDC/SOL for any xStock with best prices
- **Smart Baskets**: Pre-made portfolios like "Tech Giants" or "Healthcare Focus"
- **Cross-Chain Deposits**: Bring money from Ethereum, Polygon, etc. via Wormhole
- **Basic Portfolio Tracking**: See what you own and how much it's worth

### ✅ Dollar Cost Averaging (DCA)
- Set up automatic weekly/monthly stock purchases
- Choose your amount ($10, $100, whatever)
- Pick your stocks and allocation percentages
- Platform handles the buying automatically

### ✅ Portfolio Rebalancing
- Set target allocations (like 30% Apple, 20% Google, etc.)
- System tells you when you're off-balance
- One-click rebalancing to get back on track
- Multiple strategies: equal weight, market cap weighted, risk-focused

### ✅ Social & Copy Trading
- **Congressional Trading Data**: Live copy trading from Capitol Trades website
- **Social Trading Framework**: Infrastructure for following successful traders  
- **Privacy-focused Sharing**: Share wins/losses while protecting user data

### ✅ Gamified Experience  
- **Achievement System**: 15+ badges across trading, savings, social, learning categories
- **Daily/Weekly Challenges**: Active challenges with point rewards and special badges
- **Global Leaderboards**: Compete by points, portfolio value, trades, and savings streaks
- **User Levels & Rankings**: Progressive leveling system with XP points

### ✅ Daily Savings Auto-Invest
- **Round-up Investing**: Automatically invest spare change from purchases
- **Automatic Daily Investments**: Set daily amounts ($5-50+) with auto-execution  
- **5 Pre-made Goals**: Emergency Fund, House Down Payment, Vacation, Retirement, Education
- **Progress Analytics**: Real-time tracking, completion predictions, goal management

### ✅ Built-in Education  
- **Company Explanations**: "What is Apple?" style simple explanations
- **Sector Guides**: "Why invest in healthcare stocks?" educational content
- **Stock Market Basics**: Built-in learning modules with gamified progress
- **Risk Assessment**: Portfolio analysis and risk scoring tools

## Future Enhancements

### 🔮 Advanced Features (Roadmap)
- **Mobile App**: React Native app for iOS/Android
- **Advanced Analytics**: Deeper portfolio insights and predictions
- **Social Features**: User-to-user trade copying and social feeds  
- **Options Trading**: Expand beyond stocks to options and derivatives

## The xStocks We Support

All 62 xStocks from Backed Finance, including:

**Tech Giants**: Apple (AAPL), Microsoft (MSFT), Google (GOOGL), NVIDIA (NVDA), Meta (META)  
**Finance**: JPMorgan (JPM), Visa (V), Mastercard (MA), Berkshire Hathaway (BRK.B)  
**Healthcare**: Johnson & Johnson (JNJ), Pfizer (PFE), UnitedHealth (UNH)  
**Consumer**: Walmart (WMT), Coca-Cola (KO), McDonald's (MCD)  
**ETFs**: S&P 500 (SPY), Nasdaq (QQQ), Gold (GLD)

Each xStock is backed 1:1 by real shares held by Backed Finance. When you buy AAPLx, there's actual Apple stock backing it.

## How Much Does It Cost?

- **Platform Fee**: 0.1% per trade (so $1 fee on a $1000 trade)
- **Bridge Fees**: ~$5-20 depending on which chain you're coming from
- **No Monthly Fees**: Only pay when you trade

## Getting Started

1. **Connect a Solana Wallet** (Phantom, Solflare, etc.)
2. **Get Some USDC** (buy directly or bridge from another chain)
3. **Pick Some Stocks** (start with a pre-made basket if unsure)
4. **Buy and Hold** (or set up DCA for regular investing)

## Technical Details

Built with:
- **Next.js** for the frontend
- **Solana Web3.js** for blockchain stuff
- **Jupiter** for finding best swap prices
- **Wormhole** for bringing money from other chains
- **Real xStock contracts** (not test tokens)

## Current Limitations

- Only works with Solana wallets
- Limited to the 62 available xStocks
- No fractional shares (yet)
- US persons have restrictions (due to SEC regulations)
- Copy trading data requires manual updates for now

## Why Build This?

Traditional stock investing has high fees, complex interfaces, and geographic restrictions. Crypto has solved payments and cross-border transfers, but most people still want exposure to real businesses like Apple or Tesla, not just speculative tokens.

This bridges that gap - buy real stocks with crypto, hold them on-chain, and use DeFi tools for things like automated investing and rebalancing.

## Development Status

This is actively being built. Core trading works, DCA is functional, rebalancing is implemented. Social features and education modules are next priorities.

Current focus: Making the copy trading feature work reliably with congressional trade data, and building out the educational content for each stock.

## Running Locally

```bash
npm install
npm run dev
```

Set up your `.env.local` with:
```
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_JUPITER_API_KEY=your_key_here
```

## Contributing

This is an open source project. If you want to help build features like:
- Better portfolio analytics
- Educational content
- Social trading features
- Mobile app

Feel free to submit PRs or reach out with ideas.

---

*Note: This involves real money and real stocks. Only invest what you can afford to lose, and understand that stock prices go up and down. Not financial advice.*