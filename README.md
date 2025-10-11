# xStocksFun Trading Platform

A production-ready trading platform for tokenized stocks on Solana, featuring real-time market intelligence and instant swaps of 63 xStocks tokens.

## What We Built

xStocksFun is a complete trading and market intelligence platform that combines instant token swaps with comprehensive stock market analytics. We built this to make trading tokenized stocks as straightforward as traditional finance, but with the speed and transparency of DeFi.

## Core Features

### Trading
- **Instant Swaps**: Buy and sell xStocks using SOL, USDC, or USDT
- **Raydium Integration**: Direct swaps for xStocks tokens via Raydium DEX
- **Jupiter Price Data**: Real-time price feeds from Jupiter aggregator (price data only, not swap routing)
- **Multi-Wallet Support**: Phantom, Solflare, and all major Solana wallets

### Market Intelligence Dashboard
Our Intel dashboard provides professional-grade market analysis across 7 specialized tools:

1. **Market Intelligence**: 63-stock heatmap with real-time indices, sector performance, and top movers
2. **Sector Analysis**: Comprehensive breakdown of all 11 market sectors with composition and fundamentals
3. **Advanced Screener**: Multi-criteria stock filtering with technical, fundamental, and quantitative metrics
4. **Stock Analysis**: Deep-dive individual stock analysis with live market data
5. **Quantitative Analytics**: Professional quantitative tools including Monte Carlo simulation, efficient frontier analysis, and backtesting
6. **Portfolio Management**: Portfolio tracking, rebalancing optimization, risk analysis, and performance attribution
7. **Options Analysis**: Options chain data, Greeks calculation, IV surface visualization, and probability calculators

### Cross-Chain Bridge
- **Wormhole Integration**: Transfer USDC and USDT across 8+ blockchains
- **Native CCTP**: Faster transfers using Circle's Cross-Chain Transfer Protocol
- **Multi-Chain**: Supports Ethereum, Arbitrum, Optimism, Base, Polygon, Avalanche, BNB Chain, and Solana

### Fiat Onramp
- Educational content about purchasing crypto with fiat currency
- Links to trusted onramp providers
- Getting started guides for new users

## Supported Assets

**63 xStocks Tokens** including:
- **Tech**: AAPL, TSLA, GOOGL, MSFT, AMZN, META, NVDA
- **Finance**: JPM, V, MA, BAC, WFC
- **Healthcare**: JNJ, UNH, PFE, ABBV
- **Consumer**: KO, PEP, WMT, HD, NKE
- **Indices**: SPY, QQQ, IWM, DIA

**Base Currencies**: SOL, USDC, USDT

All tokens are backed by Backed Finance on Solana.

## Technology Stack

### Frontend
- React 18 with TypeScript
- Vite for fast builds
- Tailwind CSS for styling
- Solana Wallet Adapter
- TanStack Query for data fetching
- Lightweight Charts for price visualization
- D3.js for advanced visualizations

### Backend
- Node.js + Express
- Solana Web3.js
- WebSocket for real-time data
- Rate limiting and validation middleware

### Intel Microservice
- Python 3.11 + FastAPI
- yfinance for market data
- NumPy/SciPy for quantitative calculations
- Real-time data processing

### Trading Infrastructure
- Raydium Trade API for xStocks swaps
- Jupiter Price API v2 for market data
- Wormhole SDK for cross-chain transfers

## Installation

### Prerequisites
- Node.js 18+
- Python 3.11+
- pnpm (recommended) or npm
- Solana wallet

### Quick Start

```bash
# Clone the repository
cd xstocksfun-platform

# Install dependencies
pnpm install

# Start all services
# Terminal 1 - Frontend
cd frontend
pnpm run dev

# Terminal 2 - Backend
cd backend
npm run dev

# Terminal 3 - Intel Service
cd intel-microservice/python-yfinance-service
python main.py
```

### Environment Setup

**Backend (.env)**:
```env
PORT=3001
HELIUS_RPC_URL=your_helius_rpc_url_here
```

**Frontend** uses Vite's built-in env handling. No additional configuration needed for local development.

## Architecture

The platform uses a microservices architecture for clean separation of concerns:

```
Frontend (React)
├── Trade Components (Swap, Bridge, Buy)
├── Intel Dashboard (7 specialized tools)
└── Wallet Integration

Backend API (Node.js)
├── Token Service
├── Jupiter Service (price data)
├── WebSocket Service
└── Wallet Operations

Intel Microservice (Python)
├── Market Data Processing
├── Portfolio Analytics
├── Quantitative Calculations
└── Options Pricing
```

## How It Works

### Trading Flow
1. User connects Solana wallet
2. Selects tokens to swap (e.g., SOL → AAPLx)
3. Frontend fetches real-time quote from Raydium
4. User confirms transaction in wallet
5. Transaction executes on Solana blockchain
6. Tokens appear in wallet within seconds

### Market Data Flow
1. Intel microservice fetches real-time data from yfinance
2. Data processed and cached for performance
3. Frontend polls or subscribes via WebSocket
4. Dashboard components render with live data
5. Updates every 15 seconds for active stocks

### Price Discovery
- Jupiter Price API v2 for reference prices
- Raydium pools for actual swap execution
- Real-time updates via WebSocket connections

## API Endpoints

### Token Operations
- `GET /api/tokens` - All available tokens
- `GET /api/tokens/xstocks` - xStocks only
- `GET /api/tokens/base` - Base currencies

### Trading
- `GET /api/jupiter/quote` - Get price quote
- `POST /api/jupiter/swap` - Execute swap

### Intel Data
- `GET /api/intel/all-xstocks` - All stock data
- `GET /api/intel/stock/:symbol` - Individual stock
- `GET /api/portfolio/analytics` - Portfolio analysis
- `GET /api/quantitative/backtest` - Backtest strategy

## Development Workflow

### Running Tests
```bash
# Frontend type checking
cd frontend
pnpm run build  # Runs tsc --noEmit && vite build

# Backend (start server and verify endpoints)
cd backend
npm run dev
```

## Deployment Considerations

### Frontend
- Static build output from Vite
- Environment variables via .env files
- Works with Vercel, Netlify, or any static host

### Backend
- Node.js server (PM2 recommended for production)
- Environment variables for configuration
- Reverse proxy (nginx) recommended

### Intel Service
- Python FastAPI application
- uvicorn ASGI server
- Systemd service recommended

## Known Limitations

- Intel data limited to US market hours for real-time updates
- Some xStocks may have low liquidity
- Cross-chain bridge transfers take 2-5 minutes
- Requires SOL for transaction fees

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

For questions or support, please refer to our documentation or contact the development team.

---

**Built for traders who demand professional tools with DeFi speed.**
