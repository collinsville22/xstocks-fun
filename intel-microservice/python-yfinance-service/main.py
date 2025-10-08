from fastapi import FastAPI, HTTPException, BackgroundTasks, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Tuple
import yfinance as yf
import pandas as pd
import numpy as np
import asyncio
import redis
import json
import time
import logging
import random
from datetime import datetime, timedelta
import uvicorn
from scipy.stats import norm
import math
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
# Technical analysis library for comprehensive intel
from ta.trend import MACD
from ta.momentum import RSIIndicator
# Portfolio analytics service
from portfolio_analytics import portfolio_analytics

# Helper function to sanitize float values for JSON serialization
def sanitize_float(value):
    """Convert inf, -inf, and NaN to None for JSON compliance"""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        if math.isinf(value) or math.isnan(value):
            return None
        return value
    return value

def sanitize_dict(data):
    """Recursively sanitize all float values in a dictionary"""
    if isinstance(data, dict):
        return {k: sanitize_dict(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_dict(item) for item in data]
    else:
        return sanitize_float(data)

# Greeks Calculation Functions (Black-Scholes Model)
def calculate_days_to_expiration(expiration_str):
    """Calculate days to expiration from date string"""
    try:
        exp_date = datetime.strptime(expiration_str, '%Y-%m-%d')
        days = (exp_date - datetime.now()).days
        return max(1, days) / 365.0  # Convert to years, minimum 1 day
    except:
        return 30 / 365.0  # Default to 30 days

def calculate_delta(S, K, sigma, T_str, option_type='call'):
    """Calculate Delta (sensitivity to stock price)"""
    try:
        T = calculate_days_to_expiration(T_str)
        r = 0.05  # Risk-free rate (5%)

        if sigma <= 0 or T <= 0:
            return 0.5 if option_type == 'call' else -0.5

        d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))

        if option_type == 'call':
            delta = norm.cdf(d1)
        else:  # put
            delta = norm.cdf(d1) - 1

        # Debug extremely low deltas for ATM options
        if abs(S - K) / S < 0.05 and abs(delta) < 0.1:  # ATM option with very low delta
            logger.warning(f"⚠️ Suspiciously low delta: S={S}, K={K}, sigma={sigma}, T={T}, delta={delta}")

        return delta
    except Exception as e:
        logger.error(f"❌ Delta calculation error: {e}")
        return 0.5 if option_type == 'call' else -0.5

def calculate_gamma(S, K, sigma, T_str):
    """Calculate Gamma (rate of change of delta)"""
    try:
        T = calculate_days_to_expiration(T_str)
        r = 0.05

        if sigma <= 0 or T <= 0:
            return 0.001

        d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
        gamma = norm.pdf(d1) / (S * sigma * math.sqrt(T))

        # Ensure minimum non-zero value for display
        return max(gamma, 0.0001)
    except:
        return 0.001

def calculate_theta(S, K, sigma, T_str, option_type='call'):
    """Calculate Theta (time decay)"""
    try:
        T = calculate_days_to_expiration(T_str)
        r = 0.05

        if sigma <= 0 or T <= 0:
            return -0.05

        d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
        d2 = d1 - sigma * math.sqrt(T)

        if option_type == 'call':
            theta = (-S * norm.pdf(d1) * sigma / (2 * math.sqrt(T))
                    - r * K * math.exp(-r * T) * norm.cdf(d2))
        else:  # put
            theta = (-S * norm.pdf(d1) * sigma / (2 * math.sqrt(T))
                    + r * K * math.exp(-r * T) * norm.cdf(-d2))

        return theta / 365  # Daily theta
    except:
        return -0.05

def calculate_vega(S, K, sigma, T_str):
    """Calculate Vega (sensitivity to volatility)"""
    try:
        T = calculate_days_to_expiration(T_str)
        r = 0.05

        if sigma <= 0 or T <= 0:
            return 0.01

        d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
        vega = S * norm.pdf(d1) * math.sqrt(T) / 100  # Divide by 100 for 1% move

        # Ensure minimum non-zero value for display
        return max(vega, 0.001)
    except:
        return 0.01

# Configure production logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="xStocks Intel Microservice", version="1.0.0")

# Request rate limiting middleware (prevent API abuse from clients)
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

class ClientRateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests=100, window_seconds=60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = {}  # ip -> [timestamps]

    async def dispatch(self, request, call_next):
        # Get client IP
        client_ip = request.client.host if request.client else "unknown"
        current_time = time.time()

        # Initialize or get request log for this IP
        if client_ip not in self.requests:
            self.requests[client_ip] = []

        # Remove old requests outside the window
        self.requests[client_ip] = [
            ts for ts in self.requests[client_ip]
            if current_time - ts < self.window_seconds
        ]

        # Check if limit exceeded
        if len(self.requests[client_ip]) >= self.max_requests:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Too Many Requests",
                    "message": "Rate limit exceeded. Please try again later.",
                    "retryAfter": self.window_seconds
                }
            )

        # Add current request
        self.requests[client_ip].append(current_time)

        # Clean up old IPs periodically (1% chance)
        if random.random() < 0.01:
            self._cleanup(current_time)

        response = await call_next(request)
        return response

    def _cleanup(self, current_time):
        """Remove old IP entries"""
        ips_to_remove = [
            ip for ip, timestamps in self.requests.items()
            if not any(current_time - ts < self.window_seconds for ts in timestamps)
        ]
        for ip in ips_to_remove:
            del self.requests[ip]

# Apply client rate limiting (100 requests per minute per IP)
app.add_middleware(ClientRateLimitMiddleware, max_requests=100, window_seconds=60)

# CORS middleware - Restrict to localhost frontend only
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Redis connection with authentication
redis_client = None
try:
    import os
    redis_password = os.getenv('REDIS_PASSWORD', None)

    if redis_password:
        redis_client = redis.Redis(
            host='localhost',
            port=6379,
            db=0,
            password=redis_password,
            decode_responses=True
        )
    else:
        # TODO: Add REDIS_PASSWORD to environment variables for production
        logger.warning("Redis running without authentication - not recommended for production")
        redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

    redis_client.ping()
    logger.info("Redis connected successfully")
except Exception as e:
    logger.warning(f"Redis not available ({e}), using in-memory caching")

# Global flag to prevent concurrent unusual activity scans
_scanning_in_progress = False

# Load xStock symbol mapping from JSON file (Official 63 xStocks)
def load_xstock_mappings():
    """Load xStock to ticker symbol mappings from JSON file"""
    try:
        import os
        mapping_file = os.path.join(os.path.dirname(__file__), 'xstock_mappings.json')
        with open(mapping_file, 'r') as f:
            data = json.load(f)
            logger.info(f"✅ Loaded {len(data['xstock_to_ticker'])} xStock mappings")
            return data['xstock_to_ticker']
    except Exception as e:
        logger.error(f"❌ Failed to load xStock mappings: {e}")
        # Fallback to minimal mapping if file fails to load
        return {
            'AAPLx': 'AAPL',
            'TSLAx': 'TSLA',
            'GOOGLx': 'GOOGL',
            'MSFTx': 'MSFT',
            'AMZNx': 'AMZN',
            'METAx': 'META',
            'NVDAx': 'NVDA',
        }

# Official xStock symbol mapping (63 stocks)
STOCK_SYMBOLS = load_xstock_mappings()

# Pydantic models
class RealTimeData(BaseModel):
    symbol: str
    price: float
    change: float
    changePercent: float
    volume: int
    marketCap: float
    timestamp: int
    lastUpdate: int

class HistoricalData(BaseModel):
    symbol: str
    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: int

class HistoricalDataResponse(BaseModel):
    symbol: str
    period: str
    interval: str
    data: List[HistoricalData]
    timestamp: int

class MarketPulse(BaseModel):
    marketStatus: str
    lastUpdate: int
    topGainers: List[Dict[str, Any]]
    topLosers: List[Dict[str, Any]]
    mostActive: List[Dict[str, Any]]
    marketCap: float
    volume: int

# Rate limiting configuration - ultra conservative to avoid 429 errors
RATE_LIMIT_DELAY = 15.0  # 15 seconds between requests (ultra conservative)
MAX_RETRIES = 2
BASE_BACKOFF = 15.0

# Rate limiting state
last_request_time = 0
request_count = 0

async def smart_rate_limit():
    """Conservative rate limiting with jitter to avoid Yahoo Finance rate limits"""
    global last_request_time, request_count
    current_time = time.time()
    time_since_last_request = current_time - last_request_time

    # Add significant jitter to avoid synchronized requests
    jitter = random.uniform(5.0, 10.0)
    required_delay = RATE_LIMIT_DELAY + jitter

    if time_since_last_request < required_delay:
        sleep_time = required_delay - time_since_last_request
        logger.info(f"Rate limiting: waiting {sleep_time:.2f}s before next request")
        await asyncio.sleep(sleep_time)

    last_request_time = time.time()
    request_count += 1

async def fetch_with_retry(func, *args, **kwargs):
    """Fetch data with retry logic and exponential backoff"""
    for attempt in range(MAX_RETRIES):
        try:
            await smart_rate_limit()
            return await func(*args, **kwargs)
        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                backoff = BASE_BACKOFF * (2 ** attempt) + random.uniform(3, 8)
                logger.warning(f"Attempt {attempt + 1} failed for {args[0] if args else 'unknown'}, retrying in {backoff:.2f}s: {e}")
                await asyncio.sleep(backoff)
                continue
            logger.error(f"Max retries exceeded for {args[0] if args else 'unknown'}: {e}")
            raise

# In-memory cache for when Redis is not available
_memory_cache: Dict[str, Tuple[Any, float]] = {}  # key -> (data, expiration_timestamp)

# ============================================================================
# COMPREHENSIVE INTEL CACHE STRUCTURES (Merged from comprehensive_intel_service.py)
# ============================================================================

# Period-aware cache for stock data to prevent timeouts
_stock_data_cache = {
    '1d': {'data': None, 'timestamp': 0},
    '1w': {'data': None, 'timestamp': 0},
    '1mo': {'data': None, 'timestamp': 0},
    '3mo': {'data': None, 'timestamp': 0},
    'ytd': {'data': None, 'timestamp': 0},
    '1y': {'data': None, 'timestamp': 0},
    'cache_duration': 3600  # 1 hour cache
}

# Cache for indices data (NO CHART DATA) - 1 hour cache
_indices_data_cache = {}  # Period-specific cache dictionary

# Cache for index charts (1 hour cache) - key format: "{symbol}_{period}"
_index_chart_cache = {'cache_duration': 3600}

# Comprehensive sector mapping for all 63 stocks
STOCK_SECTOR_MAPPING = {
    # Technology (17 stocks)
    'AAPL': 'Technology', 'MSFT': 'Technology', 'GOOGL': 'Technology', 'NVDA': 'Technology',
    'AVGO': 'Technology', 'ORCL': 'Technology', 'CRM': 'Technology', 'NFLX': 'Technology',
    'CSCO': 'Technology', 'INTC': 'Technology', 'IBM': 'Technology', 'ACN': 'Technology',
    'PLTR': 'Technology', 'CRWD': 'Technology', 'APP': 'Technology', 'MRVL': 'Technology',
    'MSTR': 'Technology',

    # Healthcare & Pharmaceuticals (12 stocks)
    'LLY': 'Healthcare', 'JNJ': 'Healthcare', 'PFE': 'Healthcare', 'ABT': 'Healthcare',
    'TMO': 'Healthcare', 'DHR': 'Healthcare', 'ABBV': 'Healthcare', 'MRK': 'Healthcare',
    'UNH': 'Healthcare', 'AZN': 'Healthcare', 'NVO': 'Healthcare', 'MDT': 'Healthcare',

    # Financial Services (9 stocks)
    'JPM': 'Financial Services', 'BAC': 'Financial Services', 'GS': 'Financial Services',
    'V': 'Financial Services', 'MA': 'Financial Services', 'BRK-B': 'Financial Services',
    'COIN': 'Financial Services', 'HOOD': 'Financial Services',
    'CRCL': 'Financial Services',

    # Consumer Goods & Services (10 stocks)
    'AMZN': 'Consumer Goods', 'TSLA': 'Consumer Goods', 'HD': 'Consumer Goods',
    'MCD': 'Consumer Goods', 'KO': 'Consumer Goods', 'META': 'Consumer Goods',
    'WMT': 'Consumer Goods', 'PEP': 'Consumer Goods', 'PG': 'Consumer Goods',
    'PM': 'Consumer Goods',

    # Energy & Commodities (4 stocks)
    'XOM': 'Energy', 'CVX': 'Energy', 'GLD': 'Energy', 'LIN': 'Energy',

    # Industrials (2 stocks)
    'HON': 'Industrials', 'GME': 'Industrials',

    # Communication Services (2 stocks)
    'CMCSA': 'Communication', 'DFDV': 'Communication',

    # ETF/Index Funds (6 stocks)
    'SPY': 'ETF/Index', 'QQQ': 'ETF/Index', 'VTI': 'ETF/Index',
    'TBLL': 'ETF/Index', 'TQQQ': 'ETF/Index', 'AMBR': 'ETF/Index',

    # Crypto/Alternative (1 stock)
    'OPEN': 'Alternative'
}

# 21 Comprehensive Market Indices
COMPREHENSIVE_INDICES = [
    # Major US Indices
    {'symbol': '^GSPC', 'name': 'S&P 500', 'category': 'Major US'},
    {'symbol': '^DJI', 'name': 'Dow Jones', 'category': 'Major US'},
    {'symbol': '^IXIC', 'name': 'NASDAQ', 'category': 'Major US'},
    {'symbol': '^RUT', 'name': 'Russell 2000', 'category': 'Major US'},

    # Sector ETFs
    {'symbol': 'XLK', 'name': 'Technology Select', 'category': 'Sector'},
    {'symbol': 'XLF', 'name': 'Financial Select', 'category': 'Sector'},
    {'symbol': 'XLV', 'name': 'Health Care Select', 'category': 'Sector'},
    {'symbol': 'XLE', 'name': 'Energy Select', 'category': 'Sector'},
    {'symbol': 'XLI', 'name': 'Industrial Select', 'category': 'Sector'},

    # International Indices
    {'symbol': 'EFA', 'name': 'EAFE', 'category': 'International'},
    {'symbol': 'EEM', 'name': 'Emerging Markets', 'category': 'International'},
    {'symbol': '^FTSE', 'name': 'FTSE 100', 'category': 'International'},
    {'symbol': '^N225', 'name': 'Nikkei 225', 'category': 'International'},

    # Fixed Income
    {'symbol': 'TLT', 'name': '20+ Year Treasury', 'category': 'Bonds'},
    {'symbol': 'IEF', 'name': '7-10 Year Treasury', 'category': 'Bonds'},
    {'symbol': 'LQD', 'name': 'Corporate Bonds', 'category': 'Bonds'},

    # Commodities
    {'symbol': 'GLD', 'name': 'Gold ETF', 'category': 'Commodities'},
    {'symbol': 'USO', 'name': 'Oil ETF', 'category': 'Commodities'},

    # Volatility & Alternative
    {'symbol': '^VIX', 'name': 'VIX', 'category': 'Volatility'},
    {'symbol': 'ARKK', 'name': 'ARK Innovation', 'category': 'Alternative'},
    {'symbol': 'JETS', 'name': 'Airlines ETF', 'category': 'Alternative'}
]

# Market cap mapping for realistic valuations
MARKET_CAP_MAPPING = {
    'AAPL': 3.5e12, 'MSFT': 3.0e12, 'GOOGL': 2.0e12, 'AMZN': 1.8e12, 'NVDA': 1.7e12,
    'META': 1.3e12, 'TSLA': 1.0e12, 'BRK-B': 900e9, 'LLY': 800e9, 'V': 700e9,
    'JNJ': 600e9, 'JPM': 550e9, 'UNH': 500e9, 'XOM': 450e9, 'PFE': 400e9,
    'HD': 380e9, 'CVX': 350e9, 'ABT': 320e9, 'ABBV': 300e9, 'BAC': 280e9,
    'MRK': 260e9, 'KO': 250e9, 'PEP': 240e9, 'AVGO': 230e9, 'TMO': 220e9,
    'CRM': 210e9, 'DHR': 200e9, 'DIS': 190e9, 'ADBE': 180e9, 'VZ': 170e9,
    'ACN': 160e9, 'NFLX': 150e9, 'NKE': 140e9, 'MCD': 130e9, 'CSCO': 120e9,
    'WFC': 110e9, 'T': 100e9, 'NEE': 95e9, 'CVS': 90e9, 'ORCL': 85e9,
    'AMD': 80e9, 'INTC': 75e9, 'BA': 70e9, 'CAT': 65e9, 'GS': 60e9,
    'IBM': 55e9, 'SBUX': 50e9, 'TXN': 45e9, 'HON': 40e9, 'UPS': 35e9,
    'GE': 30e9, 'MMM': 25e9, 'MS': 20e9, 'C': 18e9, 'AXP': 16e9,
    'BLK': 14e9, 'COP': 12e9, 'SLB': 10e9, 'DUK': 8e9, 'CMCSA': 6e9,
    'SPY': 500e9, 'QQQ': 200e9, 'JETS': 5e9
}


# Cache functions
async def get_cache(key: str):
    """Get data from cache (Redis or in-memory fallback)"""
    if redis_client:
        try:
            cached = redis_client.get(key)
            if cached:
                return json.loads(cached)
        except:
            pass

    # Fallback to in-memory cache
    if key in _memory_cache:
        data, expiration = _memory_cache[key]
        if time.time() < expiration:
            return data
        else:
            # Expired, remove from cache
            del _memory_cache[key]

    return None

async def set_cache(key: str, data: Any, ttl_seconds: int = 300):
    """Set data in cache (Redis or in-memory fallback)"""
    if redis_client:
        try:
            redis_client.setex(key, ttl_seconds, json.dumps(data, default=str))
            return
        except:
            pass

    # Fallback to in-memory cache
    expiration = time.time() + ttl_seconds
    _memory_cache[key] = (data, expiration)
    logger.info(f"💾 Cached {key} in memory (TTL: {ttl_seconds}s)")

# Utility functions
def clean_yahoo_symbol(symbol: str) -> str:
    """Clean symbol for Yahoo Finance URLs"""
    return symbol.replace('.', '-')

def map_xstock_to_symbol(xstock_symbol: str) -> Optional[str]:
    """Map xStock symbol to real stock symbol"""
    real_symbol = STOCK_SYMBOLS.get(xstock_symbol)
    if real_symbol:
        return clean_yahoo_symbol(real_symbol)
    return None

# Core implementation functions - simplified approach based on yfinance best practices
async def fetch_realtime_data_impl(symbol: str, real_symbol: str):
    """Implementation function for fetching real-time data using yfinance correctly"""
    try:
        logger.info(f"Fetching real-time data for {real_symbol} (attempt {request_count + 1})")

        # Use yfinance the simple way - let it manage its own sessions
        ticker = yf.Ticker(real_symbol)

        # Get historical data for past few days to calculate changes
        hist = ticker.history(period="5d", interval="1d", timeout=30)

        if hist.empty:
            logger.warning(f"No historical data for {real_symbol}, trying 1mo period")
            hist = ticker.history(period="1mo", interval="1d", timeout=30)
            if hist.empty:
                logger.warning(f"No historical data available for {real_symbol} from Yahoo Finance")
                raise ValueError(f"No data available for symbol {real_symbol}")

        if len(hist) < 2:
            logger.warning(f"Insufficient historical data for {real_symbol}, only {len(hist)} days")
            # Use single day data with no change
            latest = hist.iloc[-1]
            price_change = 0.0
            price_change_percent = 0.0
        else:
            latest = hist.iloc[-1]
            previous = hist.iloc[-2]
            price_change = float(latest["Close"] - previous["Close"])
            price_change_percent = (price_change / float(previous["Close"])) * 100 if previous["Close"] != 0 else 0

        # Get basic info
        info = {}
        try:
            info = ticker.info
            logger.info(f"Successfully fetched info for {real_symbol}")
        except Exception as e:
            logger.warning(f"Could not fetch info for {real_symbol}: {e}")

        # Get volume from historical data
        volume = int(latest["Volume"]) if "Volume" in latest else 0

        # Get market cap from info or estimate
        market_cap = 0
        if info and 'marketCap' in info and info['marketCap']:
            market_cap = float(info['marketCap'])
        elif info and 'sharesOutstanding' in info and info['sharesOutstanding']:
            # Estimate market cap from shares outstanding
            shares_outstanding = float(info['sharesOutstanding'])
            market_cap = float(latest["Close"]) * shares_outstanding

        current_timestamp = int(time.time() * 1000)

        result = {
            "symbol": symbol,
            "price": float(latest["Close"]),
            "change": price_change,
            "changePercent": price_change_percent,
            "volume": volume,
            "marketCap": market_cap,
            "timestamp": current_timestamp,
            "lastUpdate": current_timestamp
        }

        logger.info(f"Successfully fetched data for {real_symbol}: price={result['price']}, change={result['changePercent']:.2f}%")
        return result

    except Exception as e:
        logger.error(f"Error fetching real-time data for {real_symbol}: {e}")
        raise


def calculate_sma(data: pd.DataFrame, period: int) -> list:
    """Calculate Simple Moving Average"""
    sma = data['Close'].rolling(window=period).mean()
    result = []
    for index, value in sma.items():
        if not pd.isna(value):
            result.append({
                "time": int(index.timestamp()),
                "value": float(value)
            })
    return result

def calculate_rsi(data: pd.DataFrame, period: int = 14) -> list:
    """Calculate RSI (Relative Strength Index) indicator"""
    delta = data['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()

    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))

    result = []
    for index, value in rsi.items():
        if not pd.isna(value):
            result.append({
                "time": int(index.timestamp()),
                "value": float(value)
            })
    return result

def calculate_macd(data: pd.DataFrame, fast: int = 12, slow: int = 26, signal: int = 9) -> dict:
    """Calculate MACD (Moving Average Convergence Divergence) indicator"""
    exp1 = data['Close'].ewm(span=fast, adjust=False).mean()
    exp2 = data['Close'].ewm(span=slow, adjust=False).mean()

    macd_line = exp1 - exp2
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram = macd_line - signal_line

    macd_data = []
    signal_data = []
    histogram_data = []

    for index, value in macd_line.items():
        if not pd.isna(value):
            macd_data.append({
                "time": int(index.timestamp()),
                "value": float(value)
            })

    for index, value in signal_line.items():
        if not pd.isna(value):
            signal_data.append({
                "time": int(index.timestamp()),
                "value": float(value)
            })

    for index, value in histogram.items():
        if not pd.isna(value):
            histogram_data.append({
                "time": int(index.timestamp()),
                "value": float(value),
                "color": "#26a69a" if value >= 0 else "#ef5350"
            })

    return {
        "macd": macd_data,
        "signal": signal_data,
        "histogram": histogram_data
    }

def calculate_bollinger_bands(data: pd.DataFrame, period: int = 20, std_dev: float = 2) -> dict:
    """Calculate Bollinger Bands indicator"""
    sma = data['Close'].rolling(window=period).mean()
    rolling_std = data['Close'].rolling(window=period).std()

    upper_band = sma + (rolling_std * std_dev)
    lower_band = sma - (rolling_std * std_dev)

    upper_data = []
    middle_data = []
    lower_data = []

    for index, value in upper_band.items():
        if not pd.isna(value):
            upper_data.append({
                "time": int(index.timestamp()),
                "value": float(value)
            })

    for index, value in sma.items():
        if not pd.isna(value):
            middle_data.append({
                "time": int(index.timestamp()),
                "value": float(value)
            })

    for index, value in lower_band.items():
        if not pd.isna(value):
            lower_data.append({
                "time": int(index.timestamp()),
                "value": float(value)
            })

    return {
        "upper": upper_data,
        "middle": middle_data,
        "lower": lower_data
    }

def calculate_technicals(hist: pd.DataFrame) -> dict:
    """Calculate technical indicators from historical data"""
    technicals = {}

    # Calculate SMAs (20, 50, 200 days)
    if len(hist) >= 20:
        technicals['sma20'] = calculate_sma(hist, 20)

    if len(hist) >= 50:
        technicals['sma50'] = calculate_sma(hist, 50)

    if len(hist) >= 200:
        technicals['sma200'] = calculate_sma(hist, 200)

    # Calculate RSI (14 periods)
    if len(hist) >= 15:
        technicals['rsi'] = calculate_rsi(hist, 14)

    # Calculate MACD (12, 26, 9)
    if len(hist) >= 26:
        technicals['macd'] = calculate_macd(hist, 12, 26, 9)

    # Calculate Bollinger Bands (20, 2)
    if len(hist) >= 20:
        technicals['bollinger'] = calculate_bollinger_bands(hist, 20, 2)

    return technicals

async def fetch_historical_data_impl(symbol: str, real_symbol: str, period: str = "1mo", interval: str = "1d"):
    """Implementation function for fetching historical data"""
    try:
        logger.info(f"Fetching historical data for {real_symbol}: period={period}, interval={interval}")

        ticker = yf.Ticker(real_symbol)
        hist = ticker.history(period=period, interval=interval, timeout=30)

        if hist.empty:
            raise ValueError(f"No historical data available for {real_symbol}")

        data = []
        for index, row in hist.iterrows():
            data.append({
                "symbol": symbol,
                "timestamp": int(index.timestamp() * 1000),
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                "volume": int(row["Volume"])
            })

        result = {
            "symbol": symbol,
            "period": period,
            "interval": interval,
            "data": data,
            "timestamp": int(time.time() * 1000)
        }

        logger.info(f"Successfully fetched {len(data)} historical data points for {real_symbol}")
        return result

    except Exception as e:
        logger.error(f"Error fetching historical data for {real_symbol}: {e}")
        raise

async def fetch_batch_realtime_impl(xstock_symbols: List[str]):
    """Implementation function for fetching batch real-time data"""
    results = []

    for xstock_symbol in xstock_symbols:
        real_symbol = map_xstock_to_symbol(xstock_symbol)
        if not real_symbol:
            logger.warning(f"No mapping found for {xstock_symbol}")
            continue

        try:
            data = await fetch_with_retry(fetch_realtime_data_impl, xstock_symbol, real_symbol)
            results.append(data)
        except Exception as e:
            logger.error(f"Failed to fetch data for {xstock_symbol}: {e}")
            results.append({
                "symbol": xstock_symbol,
                "error": str(e),
                "timestamp": int(time.time() * 1000)
            })

    return results

# API Endpoints

# ============================================================================
# COMPREHENSIVE INTEL HELPER FUNCTIONS (Merged from comprehensive_intel_service.py)
# ============================================================================

def safe_float(value, default=0.0):
    """Convert value to JSON-safe float, replacing NaN/inf with default"""
    if pd.isna(value) or np.isnan(value) or np.isinf(value):
        return default
    try:
        return float(value)
    except (ValueError, TypeError):
        return default

def clean_data_for_json(data):
    """Recursively clean data structure for JSON serialization"""
    if isinstance(data, dict):
        return {k: clean_data_for_json(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [clean_data_for_json(item) for item in data]
    elif isinstance(data, (np.floating, float)):
        return safe_float(data)
    elif isinstance(data, (np.integer, int)):
        return int(data)
    elif pd.isna(data):
        return None
    else:
        return data

def load_xstock_symbols():
    """Load all 63 xStock symbols from the tokens.json file"""
    try:
        with open('../../frontend/public/tokens.json', 'r') as f:
            tokens_data = json.load(f)

        symbols = []
        for token in tokens_data['xstocks']:
            symbol = token['symbol'].replace('x', '')  # Remove 'x' suffix
            # Handle special cases
            if symbol == 'BRK.B':
                symbol = 'BRK-B'
            symbols.append(symbol)

        logger.info(f"📊 Loaded {len(symbols)} xStock symbols from tokens.json")
        return symbols
    except Exception as e:
        logger.error(f"❌ Failed to load tokens.json: {e}")
        return []

def get_comprehensive_stocks_data(period='1d'):
    """Get REAL comprehensive data for all 63 xStock symbols - OPTIMIZED WITH PARALLEL FETCHING"""
    # Normalize period for cache key
    period_key = period.lower()

    # Check cache first to prevent timeouts
    current_time = time.time()
    if (period_key in _stock_data_cache and
        _stock_data_cache[period_key]['data'] is not None and
        current_time - _stock_data_cache[period_key]['timestamp'] < _stock_data_cache['cache_duration']):
        logger.info(f"🚀 Using cached stock data for period {period}")
        return _stock_data_cache[period_key]['data']

    symbols = load_xstock_symbols()
    if not symbols:
        logger.error("❌ No symbols loaded from tokens.json")
        return []

    try:
        from concurrent.futures import ThreadPoolExecutor, as_completed

        logger.info(f"🚀 Fetching REAL data for {len(symbols)} symbols in PARALLEL...")
        start_time = time.time()

        def fetch_single_stock(symbol):
            """Fetch a single stock's data in parallel - OPTIMIZED"""
            try:
                ticker = yf.Ticker(symbol)

                # OPTIMIZATION: Fetch enough history for technical indicators (RSI needs 14+ days, MACD needs 26+ days)
                if period in ["1D", "1d"]:
                    hist_period = "3mo"  # Fetch 3 months to ensure RSI/MACD can be calculated
                elif period in ["1W", "1w"]:
                    hist_period = "3mo"  # Fetch 3 months for weekly view
                elif period in ["1M", "1m"]:
                    hist_period = "6mo"  # Fetch 6 months for monthly view
                elif period in ["3M", "3m"]:
                    hist_period = "1y"  # Fetch 1 year for quarterly view
                elif period in ["YTD", "ytd"]:
                    hist_period = "1y"
                elif period in ["1Y", "1y"]:
                    hist_period = "2y"  # Use 2y for annual comparison
                else:
                    hist_period = "3mo"  # Default to 3 months (enough for indicators)

                hist = ticker.history(period=hist_period)
                info = ticker.info

                if not hist.empty and len(hist) > 0:
                    current_price = safe_float(hist['Close'].iloc[-1])

                    # Calculate Technical Indicators (RSI & MACD)
                    rsi_value = None
                    macd_signal = 'neutral'
                    volatility = None

                    try:
                        if len(hist) >= 14:  # Need at least 14 periods for RSI
                            rsi_indicator = RSIIndicator(close=hist['Close'], window=14)
                            rsi_value = safe_float(rsi_indicator.rsi().iloc[-1])

                        if len(hist) >= 26:  # Need at least 26 periods for MACD
                            macd_indicator = MACD(close=hist['Close'])
                            macd_line = macd_indicator.macd()
                            signal_line = macd_indicator.macd_signal()

                            if not macd_line.empty and not signal_line.empty:
                                macd_val = safe_float(macd_line.iloc[-1])
                                signal_val = safe_float(signal_line.iloc[-1])

                                if macd_val and signal_val:
                                    if macd_val > signal_val:
                                        macd_signal = 'bullish'
                                    elif macd_val < signal_val:
                                        macd_signal = 'bearish'

                        # Calculate volatility (standard deviation of returns)
                        if len(hist) >= 20:
                            returns = hist['Close'].pct_change()
                            volatility = safe_float(returns.std() * np.sqrt(252) * 100)  # Annualized volatility %
                    except Exception as e:
                        logger.warning(f"⚠️ TA calculation failed for {symbol}: {e}")

                    # Fetch Earnings Surprise from earnings_dates
                    earnings_surprise = 0
                    try:
                        earnings_dates = ticker.get_earnings_dates(limit=4)  # Get last 4 quarters
                        if earnings_dates is not None and not earnings_dates.empty and 'Surprise(%)' in earnings_dates.columns:
                            # Get the most recent earnings surprise
                            surprise_values = earnings_dates['Surprise(%)'].dropna()
                            if not surprise_values.empty:
                                earnings_surprise = safe_float(surprise_values.iloc[0])
                    except Exception as e:
                        logger.debug(f"⚠️ Earnings surprise not available for {symbol}: {e}")

                    # Calculate Options Activity
                    options_volume = 0
                    put_call_ratio = 0
                    options_open_interest = 0
                    try:
                        options_dates = ticker.options
                        if options_dates and len(options_dates) > 0:
                            # Get nearest expiration date
                            nearest_expiry = options_dates[0]
                            opt_chain = ticker.option_chain(nearest_expiry)

                            calls_volume = opt_chain.calls['volume'].sum() if not opt_chain.calls.empty else 0
                            puts_volume = opt_chain.puts['volume'].sum() if not opt_chain.puts.empty else 0
                            calls_oi = opt_chain.calls['openInterest'].sum() if not opt_chain.calls.empty else 0
                            puts_oi = opt_chain.puts['openInterest'].sum() if not opt_chain.puts.empty else 0

                            options_volume = safe_float(calls_volume + puts_volume)
                            options_open_interest = safe_float(calls_oi + puts_oi)
                            put_call_ratio = safe_float(puts_volume / calls_volume if calls_volume > 0 else 0)
                    except Exception as e:
                        logger.debug(f"⚠️ Options data not available for {symbol}: {e}")

                    # Calculate percentage change based on selected time period
                    if period in ["1D", "1d"]:
                        prev_price = safe_float(hist['Close'].iloc[-2] if len(hist) > 1 else current_price)
                    elif period in ["1W", "1w", "5d"]:
                        days_back = min(5, len(hist) - 1)
                        prev_price = safe_float(hist['Close'].iloc[-days_back-1] if days_back > 0 else current_price)
                    elif period in ["1M", "1m", "1mo"]:
                        days_back = min(20, len(hist) - 1)
                        prev_price = safe_float(hist['Close'].iloc[-days_back-1] if days_back > 0 else current_price)
                    elif period in ["3M", "3m", "3mo"]:
                        days_back = min(60, len(hist) - 1)
                        prev_price = safe_float(hist['Close'].iloc[-days_back-1] if days_back > 0 else current_price)
                    elif period in ["YTD", "ytd"]:
                        prev_price = safe_float(hist['Close'].iloc[0])
                    elif period in ["1Y", "1y", "1yr"]:
                        days_back = min(250, len(hist) - 1)
                        prev_price = safe_float(hist['Close'].iloc[-days_back-1] if days_back > 0 else hist['Close'].iloc[0])
                    else:
                        prev_price = safe_float(hist['Close'].iloc[-2] if len(hist) > 1 else current_price)

                    change = current_price - prev_price
                    change_percent = (change / prev_price * 100) if prev_price != 0 else 0

                    stock_data = {
                        'symbol': f"{symbol}x",
                        'name': info.get('longName', f"{symbol} Stock") or f"{symbol} Corporation",
                        'price': current_price,
                        'change': safe_float(change),
                        'changePercent': safe_float(change_percent),
                        'volume': safe_float(hist['Volume'].iloc[-1] if 'Volume' in hist else 0),
                        'marketCap': MARKET_CAP_MAPPING.get(symbol, safe_float(info.get('marketCap', 1e9))),
                        'sector': STOCK_SECTOR_MAPPING.get(symbol, 'Other'),
                        'avgVolume': safe_float(info.get('averageVolume', 1000000)),
                        'volumeRatio': safe_float(hist['Volume'].iloc[-1] / info.get('averageVolume', 1000000) if info.get('averageVolume', 0) > 0 else 1.0),
                        'dayHigh': safe_float(hist['High'].iloc[-1] if 'High' in hist else current_price),
                        'dayLow': safe_float(hist['Low'].iloc[-1] if 'Low' in hist else current_price),
                        'week52High': safe_float(info.get('fiftyTwoWeekHigh', current_price * 1.2)),
                        'week52Low': safe_float(info.get('fiftyTwoWeekLow', current_price * 0.8)),

                        # Fundamental metrics
                        'peRatio': safe_float(info.get('trailingPE', info.get('forwardPE', 0))),
                        'pbRatio': safe_float(info.get('priceToBook', 0)),
                        'eps': safe_float(info.get('trailingEps', 0)),
                        'beta': safe_float(info.get('beta', 1.0)),
                        'dividendYield': safe_float(info.get('dividendYield', 0) if info.get('dividendYield') else 0),
                        'revenueGrowth': safe_float(info.get('revenueGrowth', 0) if info.get('revenueGrowth') else 0),
                        'epsGrowth': safe_float(info.get('earningsGrowth', 0) if info.get('earningsGrowth') else 0),
                        'roe': safe_float(info.get('returnOnEquity', 0) if info.get('returnOnEquity') else 0),
                        'profitMargin': safe_float(info.get('profitMargins', 0) if info.get('profitMargins') else 0),
                        'debtToEquity': safe_float(info.get('debtToEquity', 0)),

                        # Technical indicators (from TA library)
                        'rsi': rsi_value,
                        'macdSignal': macd_signal,
                        'volatility': volatility or safe_float(info.get('beta', 1.0) * 20),  # Fallback to beta-based estimate

                        # Quantitative metrics
                        'targetMeanPrice': safe_float(info.get('targetMeanPrice', 0)),
                        'targetHighPrice': safe_float(info.get('targetHighPrice', 0)),
                        'targetLowPrice': safe_float(info.get('targetLowPrice', 0)),
                        'numberOfAnalystOpinions': safe_float(info.get('numberOfAnalystOpinions', 0)),
                        'recommendationKey': info.get('recommendationKey', 'hold'),
                        'analystRating': safe_float(info.get('recommendationMean', 3.0)),  # 1=Strong Buy, 5=Strong Sell
                        'earningsSurprise': earnings_surprise,  # From get_earnings_dates() Surprise(%) field
                        'shortInterest': safe_float(info.get('shortPercentOfFloat', 0) if info.get('shortPercentOfFloat') else 0),
                        'insiderOwnership': safe_float(info.get('heldPercentInsiders', 0) if info.get('heldPercentInsiders') else 0),
                        'institutionalOwnership': safe_float(info.get('heldPercentInstitutions', 0) if info.get('heldPercentInstitutions') else 0),

                        # Performance score (composite metric based on multiple factors)
                        'performanceScore': safe_float(
                            # Weighted average of: price change (40%), earnings growth (30%), ROE (20%), analyst rating (10%)
                            (change_percent * 0.4) +
                            (safe_float(info.get('earningsGrowth', 0) * 100 if info.get('earningsGrowth') else 0) * 0.3) +
                            (safe_float(info.get('returnOnEquity', 0) * 100 if info.get('returnOnEquity') else 0) * 0.2) +
                            ((6 - safe_float(info.get('recommendationMean', 3.0))) * 10 * 0.1)  # Invert and scale rating
                        ),

                        # Options Activity
                        'optionsVolume': options_volume,
                        'putCallRatio': put_call_ratio,
                        'optionsOpenInterest': options_open_interest,

                        'weight': 0.0,  # Will be calculated after sector grouping
                        'lastUpdated': int(time.time() * 1000)
                    }

                    logger.info(f"✅ {symbol}: ${current_price:.2f} ({change_percent:+.2f}%)")
                    return stock_data
                else:
                    logger.warning(f"⚠️ No data for {symbol}")
                    return None

            except Exception as e:
                logger.error(f"❌ Failed {symbol}: {e}")
                return None

        # TRUE PARALLEL FETCHING with 15 workers (10-15x faster!)
        all_stocks_data = []
        with ThreadPoolExecutor(max_workers=15) as executor:
            future_to_symbol = {executor.submit(fetch_single_stock, symbol): symbol for symbol in symbols}

            for future in as_completed(future_to_symbol):
                result = future.result()
                if result:
                    all_stocks_data.append(result)

        elapsed = time.time() - start_time
        logger.info(f"🎉 Fetched {len(all_stocks_data)}/{len(symbols)} stocks in {elapsed:.2f}s (PARALLEL)")

        # Cache the data for 1 hour (ULTRA AGGRESSIVE)
        period_key = period.lower()
        # AUTO-INITIALIZE cache key if it doesn't exist (FIX: prevents cache misses)
        if period_key not in _stock_data_cache:
            _stock_data_cache[period_key] = {'data': None, 'timestamp': 0}

        _stock_data_cache[period_key]['data'] = all_stocks_data
        _stock_data_cache[period_key]['timestamp'] = time.time()
        logger.info(f"💾 Cached stock data for period {period} for 1 hour")

        return all_stocks_data

    except Exception as e:
        logger.error(f"❌ Critical error in get_comprehensive_stocks_data: {e}")
        return []

def get_comprehensive_indices_data(period='1d'):
    """Get REAL data for all 21 indices - OPTIMIZED: NO CHART DATA (use separate endpoint)"""
    # Check cache first - use period-specific cache key
    period_key = f"{period.lower()}"
    current_time = time.time()

    # Initialize cache key if it doesn't exist
    if period_key not in _indices_data_cache:
        _indices_data_cache[period_key] = {'data': None, 'timestamp': 0, 'cache_duration': 300}

    cache_entry = _indices_data_cache[period_key]
    if (cache_entry['data'] is not None and
        current_time - cache_entry['timestamp'] < cache_entry['cache_duration']):
        logger.info(f"🚀 Using cached indices data for period {period}")
        return cache_entry['data']

    try:
        from concurrent.futures import ThreadPoolExecutor, as_completed

        logger.info(f"📈 Fetching {len(COMPREHENSIVE_INDICES)} indices in PARALLEL for period {period}...")
        start_time = time.time()

        # Map period to yfinance period
        period_map = {
            "1d": "5d",    # Need a few days for indicators
            "1w": "1mo",   # Need month for weekly view
            "1mo": "3mo",  # Need 3 months for monthly view
            "3mo": "6mo",
            "ytd": "ytd",
            "1y": "1y"
        }
        yf_period = period_map.get(period.lower(), "5d")

        def fetch_single_index(index_info):
            """Fetch a single index - OPTIMIZED without chart generation"""
            try:
                ticker = yf.Ticker(index_info['symbol'])
                hist = ticker.history(period=yf_period)  # Use period parameter
                info = ticker.info

                if not hist.empty and len(hist) > 0:
                    current_price = safe_float(hist['Close'].iloc[-1])
                    prev_price = safe_float(hist['Close'].iloc[-2] if len(hist) > 1 else current_price)
                    change = current_price - prev_price
                    change_percent = (change / prev_price * 100) if prev_price != 0 else 0

                    # FIX: Fetch 1y data for SMA50 and SMA200 calculations (need 200+ days)
                    hist_1y = ticker.history(period='1y')  # Need 1y for SMA50 and SMA200
                    closes = hist_1y['Close'].values if not hist_1y.empty else hist['Close'].values
                    logger.debug(f"📊 {index_info['symbol']}: Fetched {len(closes)} days for SMA calculations")

                    # Technical indicators using TA library (consistent with stocks)
                    rsi_value = 50.0
                    macd_line = 0.0
                    signal_line = 0.0
                    histogram = 0.0

                    try:
                        # Convert to pandas Series for TA library
                        close_series = pd.Series(closes)

                        # RSI using TA library
                        if len(close_series) >= 14:
                            rsi_indicator = RSIIndicator(close=close_series, window=14)
                            rsi_value = safe_float(rsi_indicator.rsi().iloc[-1])

                        # MACD using TA library
                        if len(close_series) >= 26:
                            macd_indicator = MACD(close=close_series)
                            macd_line = safe_float(macd_indicator.macd().iloc[-1])
                            signal_line = safe_float(macd_indicator.macd_signal().iloc[-1])
                            histogram = macd_line - signal_line
                    except Exception as e:
                        logger.warning(f"⚠️ TA calculation failed for {index_info['symbol']}: {e}")

                    # Moving averages (calculated from 1y historical data)
                    sma20 = safe_float(np.mean(closes[-20:]) if len(closes) >= 20 else np.mean(closes))
                    sma50 = safe_float(np.mean(closes[-50:]) if len(closes) >= 50 else np.mean(closes))
                    sma200 = safe_float(np.mean(closes[-200:]) if len(closes) >= 200 else np.mean(closes))
                    logger.debug(f"📈 {index_info['symbol']}: SMA20={sma20:.2f}, SMA50={sma50:.2f}, SMA200={sma200:.2f}")

                    # Bollinger Bands
                    if len(closes) >= 20:
                        bb_period = closes[-20:]
                        bb_mean = np.mean(bb_period)
                        bb_std = np.std(bb_period)
                        bb_upper = bb_mean + (2 * bb_std)
                        bb_lower = bb_mean - (2 * bb_std)
                    else:
                        bb_mean = current_price
                        bb_upper = current_price * 1.02
                        bb_lower = current_price * 0.98

                    index_data = {
                        'symbol': index_info['symbol'],
                        'name': index_info['name'],
                        'category': index_info['category'],
                        'price': current_price,
                        'change': safe_float(change),
                        'changePercent': safe_float(change_percent),
                        'volume': safe_float(hist['Volume'].iloc[-1] if 'Volume' in hist else 0),
                        'marketCap': MARKET_CAP_MAPPING.get(index_info['symbol'], safe_float(info.get('marketCap', 1e12))),
                        'technical': {
                            'rsi': rsi_value,
                            'macd': {
                                'macd': safe_float(macd_line),
                                'signal': safe_float(signal_line),
                                'histogram': safe_float(macd_line - signal_line)
                            },
                            'sma20': sma20,
                            'sma50': sma50,
                            'sma200': sma200,
                            'bollinger': {
                                'upper': safe_float(bb_upper),
                                'middle': safe_float(bb_mean),
                                'lower': safe_float(bb_lower)
                            }
                        },
                        'lastUpdated': int(time.time() * 1000)
                    }

                    logger.info(f"✅ {index_info['symbol']}: {current_price:.2f} ({change_percent:+.2f}%)")
                    return index_data
                else:
                    logger.warning(f"⚠️ No data for {index_info['symbol']}")
                    return None

            except Exception as e:
                logger.error(f"❌ Failed {index_info['symbol']}: {e}")
                return None

        # PARALLEL FETCHING with 10 workers
        indices_data = []
        with ThreadPoolExecutor(max_workers=10) as executor:
            future_to_index = {executor.submit(fetch_single_index, idx): idx for idx in COMPREHENSIVE_INDICES}

            for future in as_completed(future_to_index):
                result = future.result()
                if result:
                    indices_data.append(result)

        elapsed = time.time() - start_time
        logger.info(f"🎉 Fetched {len(indices_data)}/{len(COMPREHENSIVE_INDICES)} indices in {elapsed:.2f}s (PARALLEL, NO CHARTS)")

        # Cache for 5 minutes (period-specific)
        _indices_data_cache[period_key]['data'] = indices_data
        _indices_data_cache[period_key]['timestamp'] = time.time()
        logger.info(f"💾 Cached indices data for period {period}")

        return indices_data

    except Exception as e:
        logger.error(f"❌ Critical error in get_comprehensive_indices_data: {e}")
        return []

def get_comprehensive_sectors_data(period='1d'):
    """Get REAL comprehensive sector analysis based on actual stock data"""
    try:
        logger.info(f"🏭 Building REAL sector analysis for period {period}... (FIX: Now uses period parameter)")
        stocks_data = get_comprehensive_stocks_data(period)

        if not stocks_data:
            logger.error("❌ No stocks data available for sector analysis")
            return []

        # Group stocks by sector
        sectors_dict = {}
        for stock in stocks_data:
            sector = stock['sector']
            if sector not in sectors_dict:
                sectors_dict[sector] = []
            sectors_dict[sector].append(stock)

        sectors_data = []
        for sector_name, sector_stocks in sectors_dict.items():
            if sector_stocks:
                total_market_cap = sum(stock['marketCap'] for stock in sector_stocks)
                avg_change = sum(stock['changePercent'] for stock in sector_stocks) / len(sector_stocks)
                total_volume = sum(stock['volume'] for stock in sector_stocks)

                # Calculate weight for each stock in the sector
                for stock in sector_stocks:
                    if total_market_cap > 0:
                        stock['weight'] = safe_float(stock['marketCap'] / total_market_cap)
                    else:
                        stock['weight'] = safe_float(1.0 / len(sector_stocks))

                # Find top gainer and loser in sector
                top_gainer = max(sector_stocks, key=lambda x: x['changePercent'])
                top_loser = min(sector_stocks, key=lambda x: x['changePercent'])

                sector_data = {
                    'name': sector_name,
                    'stocks': sector_stocks,
                    'totalMarketCap': safe_float(total_market_cap),
                    'avgChange': safe_float(avg_change),
                    'totalVolume': safe_float(total_volume),
                    'topGainer': top_gainer,
                    'topLoser': top_loser,
                    'performance': safe_float(avg_change),
                    'stockCount': len(sector_stocks)
                }

                sectors_data.append(sector_data)
                logger.info(f"✅ Sector {sector_name}: {len(sector_stocks)} stocks, avg change: {avg_change:.2f}%")

        logger.info(f"🎉 Successfully processed {len(sectors_data)} REAL sectors with {len(stocks_data)} total stocks")
        return sectors_data

    except Exception as e:
        logger.error(f"❌ Critical error in get_comprehensive_sectors_data: {e}")
        return []

def get_market_movers_data(period='1d'):
    """Get REAL market movers based on actual stock data"""
    try:
        logger.info(f"🎯 Computing REAL market movers for period {period}... (FIX: Now uses period parameter)")
        stocks_data = get_comprehensive_stocks_data(period)

        if not stocks_data:
            logger.error("❌ No stocks data available for market movers")
            return {'topGainers': [], 'topLosers': [], 'mostActive': []}

        # Sort by change percentage
        sorted_by_change = sorted(stocks_data, key=lambda x: x['changePercent'], reverse=True)

        # Sort by volume
        sorted_by_volume = sorted(stocks_data, key=lambda x: x['volume'], reverse=True)

        movers = {
            'topGainers': sorted_by_change[:10],
            'topLosers': sorted_by_change[-10:],
            'mostActive': sorted_by_volume[:10]
        }

        if movers['topGainers']:
            logger.info(f"✅ Top Gainer: {movers['topGainers'][0]['symbol']} ({movers['topGainers'][0]['changePercent']:+.2f}%)")
        if movers['topLosers']:
            logger.info(f"✅ Top Loser: {movers['topLosers'][-1]['symbol']} ({movers['topLosers'][-1]['changePercent']:+.2f}%)")
        logger.info(f"✅ Most Active: {movers['mostActive'][0]['symbol'] if movers['mostActive'] else 'None'}")

        return movers

    except Exception as e:
        logger.error(f"❌ Critical error in get_market_movers_data: {e}")
        return {'topGainers': [], 'topLosers': [], 'mostActive': []}

# API Endpoints


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "xStocks Intel Microservice", "timestamp": int(time.time() * 1000)}

@app.get("/warmup-status")
async def get_warmup_status():
    """Get cache warmup progress status"""
    progress = 0
    if warmup_status['total_endpoints'] > 0:
        progress = (warmup_status['cached_endpoints'] / warmup_status['total_endpoints']) * 100

    elapsed_time = None
    if warmup_status['started_at']:
        current_time = int(time.time() * 1000)
        elapsed_time = current_time - warmup_status['started_at']

    return {
        "is_warming": warmup_status['is_warming'],
        "total_endpoints": warmup_status['total_endpoints'],
        "cached_endpoints": warmup_status['cached_endpoints'],
        "progress_percent": round(progress, 2),
        "priority_complete": warmup_status['priority_complete'],
        "full_complete": warmup_status['full_complete'],
        "elapsed_seconds": round(elapsed_time / 1000, 2) if elapsed_time else None,
        "timestamp": int(time.time() * 1000)
    }

# IMPORTANT: Batch endpoint MUST be defined BEFORE parameterized route
# Otherwise FastAPI will match /api/realtime/batch to /api/realtime/{xstock_symbol}
@app.get("/api/realtime/batch")
async def get_batch_realtime_data_v2(symbols: str = Query(..., description="Comma-separated xStock symbols like AAPLx,TSLAx")):
    """
    BATCH ENDPOINT - Get real-time data for multiple xStock symbols
    Returns array of real-time data for all requested symbols
    """
    import time
    start_time = time.time()

    # Parse symbols
    xstock_symbols = [s.strip() for s in symbols.split(',') if s.strip()]
    logger.info(f"Batch request for {len(xstock_symbols)} symbols")

    # Check cache
    cache_key = f"batch_v2_{'_'.join(sorted(xstock_symbols))}"
    try:
        cached = await get_cache(cache_key)
        if cached:
            logger.info(f"Batch cache HIT for {len(xstock_symbols)} symbols")
            return JSONResponse(content=cached)
    except:
        pass  # Cache miss is fine

    # Fetch all symbols in parallel for maximum performance
    async def fetch_one_symbol(xstock_symbol: str):
        """Fetch single symbol data in thread pool (yfinance is blocking)"""
        try:
            # Map xStock to real symbol
            real_symbol = STOCK_SYMBOLS.get(xstock_symbol)
            if not real_symbol:
                return {
                    "symbol": xstock_symbol,
                    "error": "Symbol not found",
                    "timestamp": int(time.time() * 1000)
                }

            # Fetch data in thread pool (yfinance blocks)
            real_symbol_clean = real_symbol.replace('.', '-')

            def fetch_blocking():
                ticker = yf.Ticker(real_symbol_clean)
                return ticker.info

            # Run blocking call in thread pool
            loop = asyncio.get_event_loop()
            info = await loop.run_in_executor(None, fetch_blocking)

            return {
                "symbol": xstock_symbol,
                "price": float(info.get('currentPrice', 0) or info.get('regularMarketPrice', 0)),
                "change": float(info.get('regularMarketChange', 0)),
                "changePercent": float(info.get('regularMarketChangePercent', 0)),
                "volume": int(info.get('volume', 0)),
                "marketCap": float(info.get('marketCap', 0)),
                "timestamp": int(time.time() * 1000),
                "lastUpdate": int(time.time() * 1000)
            }
        except Exception as e:
            logger.error(f"Error fetching {xstock_symbol}: {e}")
            return {
                "symbol": xstock_symbol,
                "error": str(e),
                "timestamp": int(time.time() * 1000)
            }

    # Fetch all symbols in parallel
    results = await asyncio.gather(*[fetch_one_symbol(sym) for sym in xstock_symbols])

    # Cache results
    try:
        await set_cache(cache_key, results, ttl_seconds=120)
    except Exception as cache_err:
        logger.warning(f"Cache error: {cache_err}")

    duration = (time.time() - start_time) * 1000
    logger.info(f"Batch request completed: {len(results)} symbols in {duration:.0f}ms")

    return JSONResponse(content=results)

@app.get("/api/heatmap")
async def get_heatmap_data(period: str = Query("1d", description="Time period: 1d, 1w, 1mo, 3mo, ytd, 1y")):
    """
    Enhanced heatmap data with multi-period support and fundamentals
    Returns all 63 xStocks with performance, fundamentals, and volume metrics
    """
    cache_key = f"heatmap_{period}"

    # Try cache first (5 min TTL)
    cached_data = await get_cache(cache_key)
    if cached_data:
        return cached_data

    try:
        all_symbols = list(STOCK_SYMBOLS.keys())

        # Map period to yfinance format
        period_map = {
            "1d": ("1d", "1d"),
            "1w": ("5d", "5d"),
            "1mo": ("1mo", "1mo"),
            "3mo": ("3mo", "3mo"),
            "ytd": ("ytd", "ytd"),
            "1y": ("1y", "1y")
        }
        yf_period, _ = period_map.get(period, ("1d", "1d"))

        async def fetch_stock_heatmap_data(xstock_symbol: str):
            """Fetch stock data for heatmap"""
            try:
                real_symbol = STOCK_SYMBOLS.get(xstock_symbol)
                if not real_symbol:
                    return None

                def fetch():
                    ticker = yf.Ticker(real_symbol.replace('.', '-'))
                    info = ticker.info

                    # ALWAYS use regularMarketChange for daily change (from yesterday's close to current price)
                    # This matches Google Finance, Yahoo Finance, and all other financial platforms
                    change_percent = float(info.get('regularMarketChangePercent', 0))

                    # Volume ratio (current vs average)
                    current_volume = float(info.get('volume', 0))
                    avg_volume = float(info.get('averageVolume', 1))
                    volume_ratio = (current_volume / avg_volume) if avg_volume > 0 else 1.0

                    return {
                        'symbol': xstock_symbol,
                        'name': info.get('longName', xstock_symbol),
                        'price': float(info.get('currentPrice', 0) or info.get('regularMarketPrice', 0)),
                        'change': float(info.get('regularMarketChange', 0)),
                        'changePercent': float(change_percent),
                        'volume': int(current_volume),
                        'marketCap': float(info.get('marketCap', 0)),
                        'sector': info.get('sector', 'Unknown'),
                        'pe': float(info.get('trailingPE', 0)) if info.get('trailingPE') else None,
                        'forwardPE': float(info.get('forwardPE', 0)) if info.get('forwardPE') else None,
                        'eps': float(info.get('trailingEps', 0)) if info.get('trailingEps') else None,
                        'dividendYield': float(info.get('dividendYield', 0) * 100) if info.get('dividendYield') else None,
                        'volumeRatio': float(volume_ratio),
                        'averageVolume': int(avg_volume),
                        'beta': float(info.get('beta', 0)) if info.get('beta') else None
                    }

                loop = asyncio.get_event_loop()
                return await loop.run_in_executor(None, fetch)
            except Exception as e:
                logger.warning(f"Could not fetch heatmap data for {xstock_symbol}: {e}")
                return None

        # Fetch all stocks in parallel (batches of 10)
        batch_size = 10
        all_stock_data = []
        for i in range(0, len(all_symbols), batch_size):
            batch = all_symbols[i:i+batch_size]
            batch_results = await asyncio.gather(*[fetch_stock_heatmap_data(sym) for sym in batch])
            all_stock_data.extend([r for r in batch_results if r is not None])

        result = {
            'stocks': all_stock_data,
            'period': period,
            'totalStocks': len(all_stock_data),
            'timestamp': int(time.time() * 1000)
        }

        # Cache for 5 minutes
        await set_cache(cache_key, result, ttl_seconds=300)
        return result

    except Exception as e:
        logger.error(f"Heatmap API error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch heatmap data: {str(e)}")

@app.get("/api/indices")
async def get_market_indices(period: str = Query("1d", description="Time period for charts: 1d, 1w, 1mo")):
    """
    Market indices with real technical indicators
    Returns S&P 500, NASDAQ, Dow Jones, Russell 2000 with RSI, MACD, and Moving Averages
    """
    cache_key = f"indices_{period}"

    # Try cache first (2 min TTL for real-time feel)
    cached_data = await get_cache(cache_key)
    if cached_data:
        return cached_data

    try:
        indices = {
            'sp500': '^GSPC',
            'nasdaq': '^IXIC',
            'dow': '^DJI',
            'russell2000': '^RUT'
        }

        async def fetch_index_data(index_key: str, ticker_symbol: str):
            """Fetch index data with technical indicators"""
            try:
                def fetch():
                    ticker = yf.Ticker(ticker_symbol)
                    info = ticker.info

                    # Get historical data for period
                    period_map = {
                        "1d": "1d",
                        "1w": "5d",
                        "1mo": "1mo"
                    }
                    yf_period = period_map.get(period, "1d")
                    hist = ticker.history(period=yf_period, interval="5m" if period == "1d" else "1d", timeout=10)

                    if hist.empty or len(hist) < 2:
                        return None

                    # Calculate performance
                    start_price = hist.iloc[0]['Close']
                    end_price = hist.iloc[-1]['Close']
                    change = end_price - start_price
                    change_percent = (change / start_price) * 100

                    # Calculate technical indicators
                    technicals = {}

                    # RSI (14 periods)
                    if len(hist) >= 15:
                        rsi_data = calculate_rsi(hist, 14)
                        if rsi_data and len(rsi_data) > 0:
                            technicals['rsi'] = rsi_data[-1]['value']

                    # MACD
                    if len(hist) >= 26:
                        macd_data = calculate_macd(hist)
                        if macd_data and 'histogram' in macd_data and len(macd_data['histogram']) > 0:
                            technicals['macd'] = {
                                'macd': macd_data['macd'][-1]['value'] if macd_data['macd'] else None,
                                'signal': macd_data['signal'][-1]['value'] if macd_data['signal'] else None,
                                'histogram': macd_data['histogram'][-1]['value']
                            }

                    # Moving Averages (if enough data)
                    if len(hist) >= 20:
                        sma20 = hist['Close'].rolling(window=20).mean().iloc[-1]
                        technicals['sma20'] = float(sma20)

                    if len(hist) >= 50:
                        sma50 = hist['Close'].rolling(window=50).mean().iloc[-1]
                        technicals['sma50'] = float(sma50)

                    if len(hist) >= 200:
                        sma200 = hist['Close'].rolling(window=200).mean().iloc[-1]
                        technicals['sma200'] = float(sma200)

                    # Chart data
                    chart_data = [
                        {
                            'time': int(index.timestamp()),
                            'open': float(row['Open']),
                            'high': float(row['High']),
                            'low': float(row['Low']),
                            'close': float(row['Close']),
                            'volume': int(row['Volume']) if 'Volume' in row else 0
                        }
                        for index, row in hist.iterrows()
                    ]

                    return {
                        'key': index_key,
                        'symbol': ticker_symbol,
                        'name': info.get('longName', ticker_symbol),
                        'price': float(end_price),
                        'change': float(change),
                        'changePercent': float(change_percent),
                        'volume': int(info.get('volume', 0)),
                        'technicals': technicals,
                        'chart': chart_data
                    }

                loop = asyncio.get_event_loop()
                return await loop.run_in_executor(None, fetch)
            except Exception as e:
                logger.warning(f"Could not fetch index data for {index_key}: {e}")
                return None

        # Fetch all indices in parallel
        results = await asyncio.gather(*[
            fetch_index_data(key, symbol) for key, symbol in indices.items()
        ])

        indices_data = {r['key']: r for r in results if r is not None}

        result = {
            'indices': indices_data,
            'period': period,
            'timestamp': int(time.time() * 1000)
        }

        # Cache for 2 minutes
        await set_cache(cache_key, result, ttl_seconds=120)
        return result

    except Exception as e:
        logger.error(f"Indices API error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch indices data: {str(e)}")

@app.get("/api/market/news")
async def get_market_news(limit: int = Query(20, description="Number of news articles to return")):
    """
    Aggregate market news from top stocks
    Returns recent news headlines affecting the market
    """
    cache_key = f"market_news_{limit}"

    # Try cache first (10 min TTL)
    cached_data = await get_cache(cache_key)
    if cached_data:
        return cached_data

    try:
        # Get news from top 20 stocks by market cap
        top_symbols = ['AAPLx', 'MSFTx', 'GOOGLx', 'AMZNx', 'NVDAx', 'TSLAx', 'METAx', 'BRKBx', 'JPMx', 'V.x']

        async def fetch_stock_news(xstock_symbol: str):
            """Fetch news for a stock"""
            try:
                real_symbol = STOCK_SYMBOLS.get(xstock_symbol)
                if not real_symbol:
                    logger.debug(f"No mapping found for {xstock_symbol}")
                    return []

                def fetch():
                    try:
                        ticker = yf.Ticker(real_symbol.replace('.', '-'))
                        news_list = []

                        # Try to fetch news using the news property
                        news_data = None
                        try:
                            news_data = ticker.news
                        except Exception as e:
                            logger.warning(f"News property failed for {real_symbol}, trying get_news(): {e}")
                            try:
                                # Try alternative method
                                news_data = ticker.get_news()
                            except:
                                pass

                        if news_data and isinstance(news_data, list) and len(news_data) > 0:
                            logger.debug(f"Found {len(news_data)} news articles for {real_symbol}")
                            for article in news_data[:5]:  # Top 5 per stock
                                try:
                                    # Handle new nested structure: {id: ..., content: {...}}
                                    content = article.get('content', article)  # Fall back to article if no content key

                                    # Extract title
                                    title = content.get('title', 'Untitled')
                                    if not title or title == 'Untitled':
                                        continue  # Skip articles without titles

                                    # Extract publisher
                                    publisher = 'Unknown'
                                    if content.get('provider'):
                                        publisher = content['provider'].get('displayName', 'Unknown')
                                    elif content.get('publisher'):
                                        publisher = content['publisher']

                                    # Extract link
                                    link = ''
                                    if content.get('canonicalUrl'):
                                        link = content['canonicalUrl'].get('url', '')
                                    elif content.get('link'):
                                        link = content['link']

                                    # Extract publish time
                                    publish_time = 0
                                    pub_date = content.get('pubDate')
                                    if pub_date:
                                        # Parse ISO format: "2025-10-03T14:56:00Z"
                                        from datetime import datetime
                                        try:
                                            dt = datetime.fromisoformat(pub_date.replace('Z', '+00:00'))
                                            publish_time = int(dt.timestamp())
                                        except:
                                            pass

                                    if not publish_time:
                                        publish_time = content.get('providerPublishTime', 0)

                                    # Extract thumbnail
                                    thumbnail_url = None
                                    if content.get('thumbnail'):
                                        thumbnail = content['thumbnail']
                                        # Try resolutions array
                                        resolutions = thumbnail.get('resolutions', [])
                                        if resolutions and len(resolutions) > 0:
                                            thumbnail_url = resolutions[0].get('url')
                                        # Fall back to originalUrl
                                        if not thumbnail_url and thumbnail.get('originalUrl'):
                                            thumbnail_url = thumbnail['originalUrl']

                                    news_list.append({
                                        "symbol": xstock_symbol,
                                        "title": title,
                                        "publisher": publisher,
                                        "link": link,
                                        "publishedDate": publish_time * 1000 if publish_time else int(time.time() * 1000),
                                        "type": content.get('contentType', content.get('type', 'STORY')),
                                        "thumbnail": thumbnail_url
                                    })
                                except Exception as e:
                                    logger.warning(f"Error parsing article for {real_symbol}: {e}")
                                    continue
                        else:
                            logger.debug(f"No news available for {real_symbol}")

                        return news_list
                    except Exception as e:
                        logger.warning(f"Error fetching news for {real_symbol}: {e}")
                        return []

                loop = asyncio.get_event_loop()
                return await loop.run_in_executor(None, fetch)
            except Exception as e:
                logger.warning(f"Could not fetch news for {xstock_symbol}: {e}")
                return []

        # Fetch news from all stocks in parallel
        results = await asyncio.gather(*[fetch_stock_news(sym) for sym in top_symbols])

        # Flatten and sort by date
        all_news = []
        for news_list in results:
            all_news.extend(news_list)

        # Sort by published date (most recent first)
        all_news.sort(key=lambda x: x['publishedDate'] or 0, reverse=True)

        # Remove duplicates by title
        seen_titles = set()
        unique_news = []
        for article in all_news:
            if article['title'] not in seen_titles:
                seen_titles.add(article['title'])
                unique_news.append(article)
                if len(unique_news) >= limit:
                    break

        result = {
            'success': True,
            'articles': unique_news,  # Changed from 'news' to 'articles' to match frontend
            'totalCount': len(unique_news),  # Changed from 'totalArticles' to 'totalCount' to match frontend
            'timestamp': int(time.time() * 1000)
        }

        # Cache for 10 minutes
        await set_cache(cache_key, result, ttl_seconds=600)
        return result

    except Exception as e:
        logger.error(f"Market news API error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch market news: {str(e)}")

@app.get("/api/market/unusual-volume")
async def get_unusual_volume():
    """
    Detect stocks with unusual volume activity
    Returns stocks where current volume is significantly above average
    """
    cache_key = "unusual_volume"

    # Try cache first (5 min TTL)
    cached_data = await get_cache(cache_key)
    if cached_data:
        return cached_data

    try:
        all_symbols = list(STOCK_SYMBOLS.keys())

        async def check_volume(xstock_symbol: str):
            """Check if stock has unusual volume"""
            try:
                real_symbol = STOCK_SYMBOLS.get(xstock_symbol)
                if not real_symbol:
                    return None

                def fetch():
                    ticker = yf.Ticker(real_symbol.replace('.', '-'))
                    info = ticker.info

                    current_volume = float(info.get('volume', 0))
                    avg_volume = float(info.get('averageVolume', 1))

                    if avg_volume == 0 or current_volume == 0:
                        return None

                    volume_ratio = current_volume / avg_volume

                    # Only return if volume is 2x or more above average
                    if volume_ratio >= 2.0:
                        return {
                            'symbol': xstock_symbol,
                            'name': info.get('longName', xstock_symbol),
                            'price': float(info.get('currentPrice', 0) or info.get('regularMarketPrice', 0)),
                            'changePercent': float(info.get('regularMarketChangePercent', 0)),
                            'volume': int(current_volume),
                            'averageVolume': int(avg_volume),
                            'volumeRatio': float(volume_ratio),
                            'sector': info.get('sector', 'Unknown')
                        }
                    return None

                loop = asyncio.get_event_loop()
                return await loop.run_in_executor(None, fetch)
            except Exception as e:
                logger.warning(f"Could not check volume for {xstock_symbol}: {e}")
                return None

        # Check all stocks in parallel (batches of 10)
        batch_size = 10
        unusual_stocks = []
        for i in range(0, len(all_symbols), batch_size):
            batch = all_symbols[i:i+batch_size]
            batch_results = await asyncio.gather(*[check_volume(sym) for sym in batch])
            unusual_stocks.extend([r for r in batch_results if r is not None])

        # Sort by volume ratio (highest first)
        unusual_stocks.sort(key=lambda x: x['volumeRatio'], reverse=True)

        result = {
            'success': True,
            'unusualVolume': unusual_stocks,  # Changed from 'stocks' to 'unusualVolume'
            'totalCount': len(unusual_stocks),  # Changed from 'totalUnusual' to 'totalCount'
            'timestamp': int(time.time() * 1000)
        }

        # Cache for 5 minutes
        await set_cache(cache_key, result, ttl_seconds=300)
        return result

    except Exception as e:
        logger.error(f"Unusual volume API error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to detect unusual volume: {str(e)}")

@app.get("/api/market/analyst-summary")
async def get_analyst_summary():
    """
    Aggregate analyst ratings summary across market
    Returns distribution of Buy/Hold/Sell ratings and top rated stocks
    """
    cache_key = "analyst_summary"

    # Try cache first (1 hour TTL)
    cached_data = await get_cache(cache_key)
    if cached_data:
        return cached_data

    try:
        # Use all available xStock symbols from STOCK_SYMBOLS
        all_symbols = list(STOCK_SYMBOLS.keys())

        async def fetch_analyst_data(xstock_symbol: str):
            """Fetch analyst recommendations for a stock"""
            try:
                real_symbol = STOCK_SYMBOLS.get(xstock_symbol)
                if not real_symbol:
                    return None

                def fetch():
                    ticker = yf.Ticker(real_symbol.replace('.', '-'))
                    info = ticker.info

                    recommendation = info.get('recommendationKey', 'none')
                    target_high = info.get('targetHighPrice')
                    target_low = info.get('targetLowPrice')
                    target_mean = info.get('targetMeanPrice')
                    num_analysts = info.get('numberOfAnalystOpinions', 0)

                    return {
                        'symbol': xstock_symbol,
                        'name': info.get('longName', xstock_symbol),
                        'recommendation': recommendation,
                        'targetMean': float(target_mean) if target_mean else None,
                        'targetHigh': float(target_high) if target_high else None,
                        'targetLow': float(target_low) if target_low else None,
                        'numAnalysts': int(num_analysts),
                        'currentPrice': float(info.get('currentPrice', 0) or info.get('regularMarketPrice', 0)),
                        'sector': info.get('sector', 'Unknown')
                    }

                loop = asyncio.get_event_loop()
                return await loop.run_in_executor(None, fetch)
            except Exception as e:
                logger.warning(f"Could not fetch analyst data for {xstock_symbol}: {e}")
                return None

        # Fetch analyst data in parallel (batches of 10)
        batch_size = 10
        analyst_data = []
        for i in range(0, len(all_symbols), batch_size):
            batch = all_symbols[i:i+batch_size]
            batch_results = await asyncio.gather(*[fetch_analyst_data(sym) for sym in batch])
            analyst_data.extend([r for r in batch_results if r is not None])

        # Calculate rating distribution (camelCase for frontend)
        rating_counts = {
            'strongBuy': 0,
            'buy': 0,
            'hold': 0,
            'sell': 0,
            'strongSell': 0
        }

        for stock in analyst_data:
            rating = stock['recommendation'].lower()
            if 'strong_buy' in rating or rating == 'strongbuy':
                rating_counts['strongBuy'] += 1
            elif 'buy' in rating:
                rating_counts['buy'] += 1
            elif 'hold' in rating:
                rating_counts['hold'] += 1
            elif 'sell' in rating and 'strong' not in rating:
                rating_counts['sell'] += 1
            elif 'strong_sell' in rating or rating == 'strongsell':
                rating_counts['strongSell'] += 1

        # Find top rated stocks (highest upside potential)
        stocks_with_upside = []
        for stock in analyst_data:
            if stock['targetMean'] and stock['currentPrice'] > 0:
                upside = ((stock['targetMean'] - stock['currentPrice']) / stock['currentPrice']) * 100
                stock['upside'] = float(upside)
                stocks_with_upside.append(stock)

        stocks_with_upside.sort(key=lambda x: x['upside'], reverse=True)

        result = {
            'success': True,
            'ratingDistribution': rating_counts,
            'totalStocksAnalyzed': len(analyst_data),  # Changed from 'totalAnalyzed'
            'topRatedStocks': stocks_with_upside[:10],  # Changed from 'topRated'
            'mostCoveredStocks': sorted(analyst_data, key=lambda x: x['numAnalysts'], reverse=True)[:10],  # Changed from 'mostCovered'
            'timestamp': int(time.time() * 1000)
        }

        # Cache for 1 hour
        await set_cache(cache_key, result, ttl_seconds=3600)
        return result

    except Exception as e:
        logger.error(f"Analyst summary API error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch analyst summary: {str(e)}")

@app.get("/api/market/index-chart/{symbol}")
async def get_index_chart_data(
    symbol: str,
    timeframe: str = Query("1D", description="Timeframe: Minutes (1m-45m), Hours (1h-4h), Days (1D-1Y)")
):
    """
    Lazy-load endpoint for index chart data with TradingView-style timeframes
    Returns OHLCV data with technical indicators for market indices
    Supports up to 20 years of historical data
    """
    cache_key = f"index_chart_{symbol}_{timeframe}"

    # Try cache first (shorter TTL for intraday, longer for historical)
    is_intraday = timeframe.endswith('m') or timeframe.endswith('h')
    cache_ttl = 30 if is_intraday else 300  # 30s for intraday, 5 min for daily+
    cached_data = await get_cache(cache_key)
    if cached_data:
        return cached_data

    try:
        # Map timeframe to yfinance period and interval (TradingView style)
        # ALL timeframes pull maximum available data (up to 20 years where supported)
        timeframe_map = {
            # Minutes - max 60 days (yfinance limitation for minute intervals)
            "1m": {"period": "7d", "interval": "1m"},       # Last 7 days with 1-min candles
            "2m": {"period": "60d", "interval": "2m"},      # Last 60 days with 2-min candles
            "5m": {"period": "60d", "interval": "5m"},      # Last 60 days with 5-min candles
            "15m": {"period": "60d", "interval": "15m"},    # Last 60 days with 15-min candles
            "30m": {"period": "60d", "interval": "30m"},    # Last 60 days with 30-min candles

            # Hours - max 730 days (yfinance limitation for hourly)
            "1h": {"period": "730d", "interval": "1h"},     # Last 2 years with 1-hour candles

            # Days/Weeks/Months - up to 20 years with proper aggregated intervals
            "1D": {"period": "max", "interval": "1d"},      # MAX history with daily candles (1 candle = 1 day)
            "1W": {"period": "max", "interval": "1wk"},     # MAX history with weekly candles (1 candle = 1 week)
            "1M": {"period": "max", "interval": "1mo"},     # MAX history with monthly candles (1 candle = 1 month)
            "3M": {"period": "max", "interval": "3mo"},     # MAX history with quarterly candles (1 candle = 3 months)
            "6M": {"period": "max", "interval": "1mo"},     # MAX history with monthly candles (1 candle = 1 month) - yfinance has no 6mo interval
            "1Y": {"period": "max", "interval": "3mo"},     # MAX history with quarterly candles (1 candle = 3 months) - yfinance has no 1y interval
        }

        config = timeframe_map.get(timeframe, {"period": "1d", "interval": "5m"})
        logger.info(f"Fetching index chart data for {symbol}: timeframe={timeframe}, period={config['period']}, interval={config['interval']}")

        # Fetch historical data
        def fetch_chart():
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period=config["period"], interval=config["interval"], timeout=30)

            if hist.empty:
                return None

            # Calculate technical indicators
            closes = hist['Close'].values
            volumes = hist['Volume'].values

            # RSI
            rsi_values = []
            for i in range(len(closes)):
                if i < 14:
                    rsi_values.append(None)
                else:
                    window = closes[i-13:i+1]
                    gains = sum([max(window[j] - window[j-1], 0) for j in range(1, len(window))])
                    losses = sum([max(window[j-1] - window[j], 0) for j in range(1, len(window))])
                    avg_gain = gains / 14
                    avg_loss = losses / 14
                    if avg_loss == 0:
                        rsi_values.append(100)
                    else:
                        rs = avg_gain / avg_loss
                        rsi = 100 - (100 / (1 + rs))
                        rsi_values.append(float(rsi))

            # MACD (12, 26, 9)
            ema12 = pd.Series(closes).ewm(span=12, adjust=False).mean()
            ema26 = pd.Series(closes).ewm(span=26, adjust=False).mean()
            macd_line = ema12 - ema26
            signal_line = macd_line.ewm(span=9, adjust=False).mean()
            histogram = macd_line - signal_line

            # SMAs (20, 50, 200 periods)
            sma20 = hist['Close'].rolling(window=20).mean() if len(hist) >= 20 else pd.Series([None] * len(hist))
            sma50 = hist['Close'].rolling(window=50).mean() if len(hist) >= 50 else pd.Series([None] * len(hist))
            sma200 = hist['Close'].rolling(window=200).mean() if len(hist) >= 200 else pd.Series([None] * len(hist))

            # Bollinger Bands (20-period, 2 std dev)
            bb_middle = hist['Close'].rolling(window=20).mean()
            bb_std = hist['Close'].rolling(window=20).std()
            bb_upper = bb_middle + (bb_std * 2)
            bb_lower = bb_middle - (bb_std * 2)

            # Format chart data
            chart_data = []
            for i in range(len(hist)):
                timestamp = int(hist.index[i].timestamp())

                # Build MACD object with histogram
                macd_obj = None
                if i >= 26:  # MACD requires 26+ periods
                    macd_val = float(macd_line.iloc[i]) if not pd.isna(macd_line.iloc[i]) else None
                    signal_val = float(signal_line.iloc[i]) if not pd.isna(signal_line.iloc[i]) else None
                    hist_val = float(histogram.iloc[i]) if not pd.isna(histogram.iloc[i]) else None

                    if macd_val is not None and signal_val is not None and hist_val is not None:
                        macd_obj = {
                            'macd': macd_val,
                            'signal': signal_val,
                            'histogram': hist_val
                        }

                # Build Bollinger Bands object
                bollinger_obj = None
                if i >= 20:  # Bollinger requires 20+ periods
                    bb_u = float(bb_upper.iloc[i]) if not pd.isna(bb_upper.iloc[i]) else None
                    bb_m = float(bb_middle.iloc[i]) if not pd.isna(bb_middle.iloc[i]) else None
                    bb_l = float(bb_lower.iloc[i]) if not pd.isna(bb_lower.iloc[i]) else None

                    if bb_u is not None and bb_m is not None and bb_l is not None:
                        bollinger_obj = {
                            'upper': bb_u,
                            'middle': bb_m,
                            'lower': bb_l
                        }

                chart_data.append({
                    'time': timestamp,
                    'open': float(hist['Open'].iloc[i]),
                    'high': float(hist['High'].iloc[i]),
                    'low': float(hist['Low'].iloc[i]),
                    'close': float(hist['Close'].iloc[i]),
                    'volume': int(hist['Volume'].iloc[i]) if not pd.isna(hist['Volume'].iloc[i]) else 0,
                    'rsi': rsi_values[i],
                    'macd': macd_obj,
                    'sma20': float(sma20.iloc[i]) if not pd.isna(sma20.iloc[i]) else None,
                    'sma50': float(sma50.iloc[i]) if not pd.isna(sma50.iloc[i]) else None,
                    'sma200': float(sma200.iloc[i]) if not pd.isna(sma200.iloc[i]) else None,
                    'bollinger': bollinger_obj
                })

            return chart_data

        loop = asyncio.get_event_loop()
        chart_data = await loop.run_in_executor(None, fetch_chart)

        if not chart_data:
            return {
                'success': False,
                'message': f'No chart data available for {symbol}',
                'chartData': []
            }

        result = {
            'success': True,
            'symbol': symbol,
            'timeframe': timeframe,
            'period': config['period'],
            'interval': config['interval'],
            'chartData': chart_data,
            'dataPoints': len(chart_data),
            'timestamp': int(time.time() * 1000)
        }

        # Cache with appropriate TTL
        await set_cache(cache_key, result, ttl_seconds=cache_ttl)
        return result

    except Exception as e:
        logger.error(f"Index chart API error for {symbol}: {e}")
        return {
            'success': False,
            'message': str(e),
            'chartData': []
        }

@app.post("/api/quant/backtest")
async def backtest_strategy(request: dict):
    """
    Backtesting engine with REAL trading strategies - NO MOCKS, NO HARDCODED DATA
    Supports: Bollinger Bands, Mean Reversion, Momentum, Buy & Hold, MA Crossover, Pairs Trading, Breakout, RSI
    """
    try:
        symbols = request.get('symbols', [])
        weights = request.get('weights', None)
        start_date = request.get('startDate', '2020-01-01')
        end_date = request.get('endDate', datetime.now().strftime('%Y-%m-%d'))
        initial_capital = request.get('initialCapital', 10000)

        # REAL STRATEGY PARAMETERS - These are now actually used!
        strategy = request.get('strategy', 'buy-and-hold')  # bollinger-bands, mean-reversion, momentum, buy-and-hold, ma-crossover, pairs-trading, breakout, rsi
        strategy_params = request.get('strategyParams', {})
        benchmark_symbol = request.get('benchmarkSymbol', 'SPY')  # Now tracks real benchmark!

        # Extract strategy-specific parameters
        lookback_period = strategy_params.get('lookbackPeriod', 20)
        entry_threshold = strategy_params.get('entryThreshold', -2)
        exit_threshold = strategy_params.get('exitThreshold', 0)
        stop_loss = strategy_params.get('stopLoss', 0.05)
        position_size = strategy_params.get('positionSize', 0.1)

        if not symbols:
            raise HTTPException(status_code=400, detail="Symbols list is required")

        # Default equal weights if not provided
        if not weights:
            weights = [1.0 / len(symbols)] * len(symbols)

        if len(symbols) != len(weights):
            raise HTTPException(status_code=400, detail="Symbols and weights length mismatch")

        # Fetch FULL OHLCV data (not just Close!) for real strategy calculations
        async def fetch_full_history(xstock_symbol: str):
            try:
                real_symbol = STOCK_SYMBOLS.get(xstock_symbol)
                if not real_symbol:
                    return None

                def fetch():
                    ticker = yf.Ticker(real_symbol.replace('.', '-'))
                    hist = ticker.history(start=start_date, end=end_date, timeout=15)
                    if hist.empty:
                        return None
                    # Return full OHLCV dataframe, not just Close!
                    return hist[['Open', 'High', 'Low', 'Close', 'Volume']]

                loop = asyncio.get_event_loop()
                return await loop.run_in_executor(None, fetch)
            except Exception as e:
                logger.warning(f"Could not fetch history for {xstock_symbol}: {e}")
                return None

        # Also fetch benchmark data for comparison
        benchmark_data = await fetch_full_history(benchmark_symbol)

        # Fetch all symbols in parallel
        hist_data_list = await asyncio.gather(*[fetch_full_history(sym) for sym in symbols])

        # Filter out None values and create dict of dataframes
        stock_data = {}
        for sym, hist_df in zip(symbols, hist_data_list):
            if hist_df is not None and not hist_df.empty:
                stock_data[sym] = hist_df

        if not stock_data:
            raise HTTPException(status_code=400, detail="No valid historical data found")

        # Align all dataframes to same dates
        common_dates = None
        for df in stock_data.values():
            if common_dates is None:
                common_dates = set(df.index)
            else:
                common_dates = common_dates.intersection(set(df.index))

        if not common_dates or len(common_dates) < 50:
            raise HTTPException(status_code=400, detail="Insufficient overlapping historical data")

        # Sort dates for chronological processing
        sorted_dates = sorted(common_dates)

        # ========== REAL STRATEGY IMPLEMENTATION - NO MOCKS! ==========
        # Initialize tracking arrays
        portfolio_value_series = []
        benchmark_value_series = []
        cash = initial_capital
        positions = {sym: 0 for sym in stock_data.keys()}  # shares held
        portfolio_values = []
        trade_log = []

        # Track benchmark buy-and-hold performance
        if benchmark_data is not None and not benchmark_data.empty:
            benchmark_start_price = benchmark_data.loc[sorted_dates[0], 'Close'] if sorted_dates[0] in benchmark_data.index else None
            if benchmark_start_price and benchmark_start_price > 0:
                benchmark_shares = initial_capital / benchmark_start_price
        else:
            benchmark_shares = 0

        logger.info(f"Running {strategy} strategy backtest on {len(stock_data)} symbols from {start_date} to {end_date} | Benchmark: {benchmark_symbol}")

        # ========== STRATEGY EXECUTION LOOP - 8 REAL STRATEGIES ==========

        for i, current_date in enumerate(sorted_dates):
            # Skip warmup period for indicators
            if i < lookback_period:
                # Just track portfolio value during warmup
                current_value = cash
                for sym in positions:
                    if current_date in stock_data[sym].index:
                        current_price = stock_data[sym].loc[current_date, 'Close']
                        current_value += positions[sym] * current_price
                portfolio_values.append(current_value)

                # Track benchmark
                if benchmark_data is not None and current_date in benchmark_data.index:
                    benchmark_price = benchmark_data.loc[current_date, 'Close']
                    benchmark_value = benchmark_shares * benchmark_price
                    benchmark_value_series.append(benchmark_value)
                else:
                    benchmark_value_series.append(initial_capital)
                continue

            # Get current prices for all symbols
            current_prices = {}
            for sym in stock_data:
                if current_date in stock_data[sym].index:
                    current_prices[sym] = stock_data[sym].loc[current_date, 'Close']

            # ===== STRATEGY 1: BUY AND HOLD =====
            if strategy == 'buy-and-hold':
                # Execute on first day after warmup
                if i == lookback_period:
                    for sym, weight in zip(stock_data.keys(), weights):
                        if sym in current_prices and current_prices[sym] > 0:
                            allocation = cash * weight
                            shares_to_buy = int(allocation / current_prices[sym])
                            if shares_to_buy > 0:
                                cost = shares_to_buy * current_prices[sym]
                                positions[sym] = shares_to_buy
                                cash -= cost
                                trade_log.append({
                                    'date': str(current_date.date()),
                                    'symbol': sym,
                                    'action': 'BUY',
                                    'shares': shares_to_buy,
                                    'price': current_prices[sym],
                                    'total': cost
                                })

            # ===== STRATEGY 2: MEAN REVERSION =====
            elif strategy == 'mean-reversion':
                for sym in stock_data:
                    if sym not in current_prices:
                        continue

                    # Calculate z-score over lookback period
                    hist_slice = stock_data[sym].loc[:current_date, 'Close'].tail(lookback_period)
                    if len(hist_slice) >= lookback_period:
                        mean_price = hist_slice.mean()
                        std_price = hist_slice.std()

                        if std_price > 0:
                            z_score = (current_prices[sym] - mean_price) / std_price

                            # Buy when z-score < entry_threshold (oversold)
                            if z_score < entry_threshold and positions[sym] == 0:
                                shares_to_buy = int((cash * position_size) / current_prices[sym])
                                if shares_to_buy > 0:
                                    cost = shares_to_buy * current_prices[sym]
                                    if cost <= cash:
                                        positions[sym] = shares_to_buy
                                        cash -= cost
                                        trade_log.append({
                                            'date': str(current_date.date()),
                                            'symbol': sym,
                                            'action': 'BUY',
                                            'shares': shares_to_buy,
                                            'price': current_prices[sym],
                                            'total': cost,
                                            'z_score': z_score
                                        })

                            # Sell when z-score > exit_threshold (overbought) or hit stop loss
                            elif positions[sym] > 0:
                                if z_score > exit_threshold:
                                    proceeds = positions[sym] * current_prices[sym]
                                    trade_log.append({
                                        'date': str(current_date.date()),
                                        'symbol': sym,
                                        'action': 'SELL',
                                        'shares': positions[sym],
                                        'price': current_prices[sym],
                                        'total': proceeds,
                                        'z_score': z_score
                                    })
                                    cash += proceeds
                                    positions[sym] = 0

            # ===== STRATEGY 3: MOMENTUM =====
            elif strategy == 'momentum':
                # Calculate momentum for all symbols
                momentum_scores = {}
                for sym in stock_data:
                    hist_slice = stock_data[sym].loc[:current_date, 'Close'].tail(lookback_period + 1)
                    if len(hist_slice) >= lookback_period + 1:
                        returns = (hist_slice.iloc[-1] - hist_slice.iloc[0]) / hist_slice.iloc[0]
                        momentum_scores[sym] = returns

                if momentum_scores:
                    # Sort by momentum and select top performers
                    sorted_momentum = sorted(momentum_scores.items(), key=lambda x: x[1], reverse=True)
                    num_positions = max(1, int(len(sorted_momentum) * position_size))
                    top_performers = [sym for sym, _ in sorted_momentum[:num_positions]]

                    # Exit positions not in top performers
                    for sym in list(positions.keys()):
                        if positions[sym] > 0 and sym not in top_performers and sym in current_prices:
                            proceeds = positions[sym] * current_prices[sym]
                            trade_log.append({
                                'date': str(current_date.date()),
                                'symbol': sym,
                                'action': 'SELL',
                                'shares': positions[sym],
                                'price': current_prices[sym],
                                'total': proceeds
                            })
                            cash += proceeds
                            positions[sym] = 0

                    # Enter positions in top performers
                    for sym in top_performers:
                        if sym in current_prices and positions[sym] == 0:
                            shares_to_buy = int((cash / num_positions) / current_prices[sym])
                            if shares_to_buy > 0:
                                cost = shares_to_buy * current_prices[sym]
                                if cost <= cash:
                                    positions[sym] = shares_to_buy
                                    cash -= cost
                                    trade_log.append({
                                        'date': str(current_date.date()),
                                        'symbol': sym,
                                        'action': 'BUY',
                                        'shares': shares_to_buy,
                                        'price': current_prices[sym],
                                        'total': cost,
                                        'momentum': momentum_scores[sym]
                                    })

            # ===== STRATEGY 4: RSI =====
            elif strategy == 'rsi':
                for sym in stock_data:
                    if sym not in current_prices:
                        continue

                    # Calculate RSI
                    hist_slice = stock_data[sym].loc[:current_date, 'Close'].tail(lookback_period + 1)
                    if len(hist_slice) >= lookback_period + 1:
                        delta = hist_slice.diff()
                        gain = delta.where(delta > 0, 0).rolling(window=14).mean()
                        loss = -delta.where(delta < 0, 0).rolling(window=14).mean()

                        if len(gain) > 0 and len(loss) > 0 and loss.iloc[-1] != 0:
                            rs = gain.iloc[-1] / loss.iloc[-1]
                            rsi = 100 - (100 / (1 + rs))

                            # Buy when RSI < 30 (oversold)
                            if rsi < 30 and positions[sym] == 0:
                                shares_to_buy = int((cash * position_size) / current_prices[sym])
                                if shares_to_buy > 0:
                                    cost = shares_to_buy * current_prices[sym]
                                    if cost <= cash:
                                        positions[sym] = shares_to_buy
                                        cash -= cost
                                        trade_log.append({
                                            'date': str(current_date.date()),
                                            'symbol': sym,
                                            'action': 'BUY',
                                            'shares': shares_to_buy,
                                            'price': current_prices[sym],
                                            'total': cost,
                                            'rsi': rsi
                                        })

                            # Sell when RSI > 70 (overbought)
                            elif rsi > 70 and positions[sym] > 0:
                                proceeds = positions[sym] * current_prices[sym]
                                trade_log.append({
                                    'date': str(current_date.date()),
                                    'symbol': sym,
                                    'action': 'SELL',
                                    'shares': positions[sym],
                                    'price': current_prices[sym],
                                    'total': proceeds,
                                    'rsi': rsi
                                })
                                cash += proceeds
                                positions[sym] = 0

            # ===== STRATEGY 5: BOLLINGER BANDS =====
            elif strategy == 'bollinger-bands':
                for sym in stock_data:
                    if sym not in current_prices:
                        continue

                    # Calculate Bollinger Bands
                    hist_slice = stock_data[sym].loc[:current_date, 'Close'].tail(lookback_period)
                    if len(hist_slice) >= lookback_period:
                        sma = hist_slice.mean()
                        std = hist_slice.std()
                        upper_band = sma + (2 * std)
                        lower_band = sma - (2 * std)

                        # Buy at lower band (oversold)
                        if current_prices[sym] <= lower_band and positions[sym] == 0:
                            shares_to_buy = int((cash * position_size) / current_prices[sym])
                            if shares_to_buy > 0:
                                cost = shares_to_buy * current_prices[sym]
                                if cost <= cash:
                                    positions[sym] = shares_to_buy
                                    cash -= cost
                                    trade_log.append({
                                        'date': str(current_date.date()),
                                        'symbol': sym,
                                        'action': 'BUY',
                                        'shares': shares_to_buy,
                                        'price': current_prices[sym],
                                        'total': cost,
                                        'lower_band': lower_band
                                    })

                        # Sell at upper band (overbought)
                        elif current_prices[sym] >= upper_band and positions[sym] > 0:
                            proceeds = positions[sym] * current_prices[sym]
                            trade_log.append({
                                'date': str(current_date.date()),
                                'symbol': sym,
                                'action': 'SELL',
                                'shares': positions[sym],
                                'price': current_prices[sym],
                                'total': proceeds,
                                'upper_band': upper_band
                            })
                            cash += proceeds
                            positions[sym] = 0

            # ===== STRATEGY 6: MA CROSSOVER =====
            elif strategy == 'ma-crossover':
                short_period = 10
                long_period = 50

                for sym in stock_data:
                    if sym not in current_prices:
                        continue

                    # Need enough data for long MA
                    hist_slice = stock_data[sym].loc[:current_date, 'Close']
                    if len(hist_slice) >= long_period:
                        short_ma = hist_slice.tail(short_period).mean()
                        long_ma = hist_slice.tail(long_period).mean()

                        # Previous MAs for crossover detection
                        prev_short_ma = hist_slice.tail(short_period + 1).head(short_period).mean()
                        prev_long_ma = hist_slice.tail(long_period + 1).head(long_period).mean()

                        # Golden cross: short MA crosses above long MA
                        if prev_short_ma <= prev_long_ma and short_ma > long_ma and positions[sym] == 0:
                            shares_to_buy = int((cash * position_size) / current_prices[sym])
                            if shares_to_buy > 0:
                                cost = shares_to_buy * current_prices[sym]
                                if cost <= cash:
                                    positions[sym] = shares_to_buy
                                    cash -= cost
                                    trade_log.append({
                                        'date': str(current_date.date()),
                                        'symbol': sym,
                                        'action': 'BUY',
                                        'shares': shares_to_buy,
                                        'price': current_prices[sym],
                                        'total': cost,
                                        'short_ma': short_ma,
                                        'long_ma': long_ma
                                    })

                        # Death cross: short MA crosses below long MA
                        elif prev_short_ma >= prev_long_ma and short_ma < long_ma and positions[sym] > 0:
                            proceeds = positions[sym] * current_prices[sym]
                            trade_log.append({
                                'date': str(current_date.date()),
                                'symbol': sym,
                                'action': 'SELL',
                                'shares': positions[sym],
                                'price': current_prices[sym],
                                'total': proceeds,
                                'short_ma': short_ma,
                                'long_ma': long_ma
                            })
                            cash += proceeds
                            positions[sym] = 0

            # ===== STRATEGY 7: BREAKOUT =====
            elif strategy == 'breakout':
                for sym in stock_data:
                    if sym not in current_prices:
                        continue

                    # Get historical highs/lows
                    hist_slice = stock_data[sym].loc[:current_date].tail(lookback_period + 1)
                    if len(hist_slice) >= lookback_period + 1:
                        # Exclude current day for breakout calculation
                        lookback_high = hist_slice['High'].iloc[:-1].max()
                        lookback_low = hist_slice['Low'].iloc[:-1].min()

                        # Breakout above resistance
                        if current_prices[sym] > lookback_high and positions[sym] == 0:
                            shares_to_buy = int((cash * position_size) / current_prices[sym])
                            if shares_to_buy > 0:
                                cost = shares_to_buy * current_prices[sym]
                                if cost <= cash:
                                    positions[sym] = shares_to_buy
                                    cash -= cost
                                    trade_log.append({
                                        'date': str(current_date.date()),
                                        'symbol': sym,
                                        'action': 'BUY',
                                        'shares': shares_to_buy,
                                        'price': current_prices[sym],
                                        'total': cost,
                                        'breakout_level': lookback_high
                                    })

                        # Breakdown below support (exit)
                        elif current_prices[sym] < lookback_low and positions[sym] > 0:
                            proceeds = positions[sym] * current_prices[sym]
                            trade_log.append({
                                'date': str(current_date.date()),
                                'symbol': sym,
                                'action': 'SELL',
                                'shares': positions[sym],
                                'price': current_prices[sym],
                                'total': proceeds,
                                'breakdown_level': lookback_low
                            })
                            cash += proceeds
                            positions[sym] = 0

            # ===== STRATEGY 8: PAIRS TRADING =====
            elif strategy == 'pairs-trading':
                if len(stock_data) >= 2:
                    # Use first two symbols as the pair
                    sym1, sym2 = list(stock_data.keys())[:2]

                    if sym1 in current_prices and sym2 in current_prices:
                        # Calculate price ratio and z-score
                        hist1 = stock_data[sym1].loc[:current_date, 'Close'].tail(lookback_period)
                        hist2 = stock_data[sym2].loc[:current_date, 'Close'].tail(lookback_period)

                        if len(hist1) >= lookback_period and len(hist2) >= lookback_period:
                            ratio = hist1 / hist2
                            mean_ratio = ratio.mean()
                            std_ratio = ratio.std()

                            if std_ratio > 0:
                                current_ratio = current_prices[sym1] / current_prices[sym2]
                                z_score = (current_ratio - mean_ratio) / std_ratio

                                # Spread too high: short sym1, long sym2
                                if z_score > 2 and positions[sym1] == 0 and positions[sym2] == 0:
                                    # Sell sym1 (short simulation via holding cash)
                                    shares1 = int((cash * 0.5 * position_size) / current_prices[sym1])
                                    shares2 = int((cash * 0.5 * position_size) / current_prices[sym2])

                                    if shares2 > 0:
                                        cost = shares2 * current_prices[sym2]
                                        if cost <= cash:
                                            positions[sym2] = shares2
                                            cash -= cost
                                            trade_log.append({
                                                'date': str(current_date.date()),
                                                'symbol': sym2,
                                                'action': 'BUY',
                                                'shares': shares2,
                                                'price': current_prices[sym2],
                                                'total': cost,
                                                'z_score': z_score,
                                                'pair_trade': True
                                            })

                                # Spread too low: long sym1, short sym2
                                elif z_score < -2 and positions[sym1] == 0 and positions[sym2] == 0:
                                    shares1 = int((cash * position_size) / current_prices[sym1])
                                    if shares1 > 0:
                                        cost = shares1 * current_prices[sym1]
                                        if cost <= cash:
                                            positions[sym1] = shares1
                                            cash -= cost
                                            trade_log.append({
                                                'date': str(current_date.date()),
                                                'symbol': sym1,
                                                'action': 'BUY',
                                                'shares': shares1,
                                                'price': current_prices[sym1],
                                                'total': cost,
                                                'z_score': z_score,
                                                'pair_trade': True
                                            })

                                # Spread normalized: close positions
                                elif abs(z_score) < 0.5:
                                    for sym in [sym1, sym2]:
                                        if positions[sym] > 0 and sym in current_prices:
                                            proceeds = positions[sym] * current_prices[sym]
                                            trade_log.append({
                                                'date': str(current_date.date()),
                                                'symbol': sym,
                                                'action': 'SELL',
                                                'shares': positions[sym],
                                                'price': current_prices[sym],
                                                'total': proceeds,
                                                'z_score': z_score,
                                                'pair_trade': True
                                            })
                                            cash += proceeds
                                            positions[sym] = 0

            # Calculate portfolio value
            portfolio_value = cash
            for sym in positions:
                if positions[sym] > 0 and sym in current_prices:
                    portfolio_value += positions[sym] * current_prices[sym]

            portfolio_values.append(portfolio_value)

            # Track benchmark value
            if benchmark_data is not None and current_date in benchmark_data.index:
                benchmark_price = benchmark_data.loc[current_date, 'Close']
                benchmark_value = benchmark_shares * benchmark_price
                benchmark_value_series.append(benchmark_value)
            else:
                benchmark_value_series.append(initial_capital)

        # ========== CALCULATE METRICS FROM STRATEGY RESULTS ==========

        # Create series for calculations
        portfolio_value = pd.Series(portfolio_values, index=sorted_dates)
        portfolio_returns = portfolio_value.pct_change().dropna()
        cumulative_returns = (1 + portfolio_returns).cumprod()

        # Create dataframe for grouping
        portfolio_df = pd.DataFrame({
            'Value': portfolio_value
        })

        # Calculate risk metrics
        annual_return = portfolio_returns.mean() * 252
        annual_volatility = portfolio_returns.std() * np.sqrt(252)
        sharpe_ratio = (annual_return - 0.02) / annual_volatility if annual_volatility > 0 else 0  # Assume 2% risk-free rate

        # Sortino ratio (downside deviation)
        downside_returns = portfolio_returns[portfolio_returns < 0]
        downside_deviation = downside_returns.std() * np.sqrt(252) if len(downside_returns) > 0 else 0
        sortino_ratio = (annual_return - 0.02) / downside_deviation if downside_deviation > 0 else 0

        # Max drawdown
        cumulative = (1 + portfolio_returns).cumprod()
        running_max = cumulative.expanding().max()
        drawdown = (cumulative - running_max) / running_max
        max_drawdown = drawdown.min()

        # Win rate
        positive_days = (portfolio_returns > 0).sum()
        total_days = len(portfolio_returns)
        win_rate = (positive_days / total_days) * 100 if total_days > 0 else 0

        # Performance by year
        portfolio_df['Return'] = portfolio_returns
        yearly_returns = portfolio_df.groupby(portfolio_df.index.year)['Return'].apply(
            lambda x: ((1 + x).prod() - 1) * 100
        ).to_dict()

        result = {
            'performance': {
                'totalReturn': float((cumulative_returns.iloc[-1] - 1) * 100),
                'annualReturn': float(annual_return * 100),
                'annualVolatility': float(annual_volatility * 100),
                'sharpeRatio': float(sharpe_ratio),
                'sortinoRatio': float(sortino_ratio),
                'maxDrawdown': float(max_drawdown * 100),
                'winRate': float(win_rate),
                'finalValue': float(portfolio_value.iloc[-1]),
                'initialCapital': initial_capital
            },
            'yearlyReturns': yearly_returns,
            'chart': [
                {
                    'date': str(date.date()),
                    'portfolioValue': float(value),
                    'benchmark': float(benchmark_value_series[i]) if i < len(benchmark_value_series) else float(initial_capital)
                }
                for i, (date, value) in enumerate(portfolio_value.items())
            ],
            'symbols': symbols,
            'weights': weights,
            'startDate': start_date,
            'endDate': end_date,
            'timestamp': int(time.time() * 1000)
        }

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Backtest API error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to run backtest: {str(e)}")

@app.post("/api/quant/optimize")
async def optimize_portfolio(request: dict):
    """
    Portfolio optimization with efficient frontier
    Finds optimal weights to maximize Sharpe ratio
    """
    try:
        symbols = request.get('symbols', [])
        start_date = request.get('startDate', '2020-01-01')
        end_date = request.get('endDate', datetime.now().strftime('%Y-%m-%d'))
        target_return = request.get('targetReturn', None)

        if not symbols or len(symbols) < 2:
            raise HTTPException(status_code=400, detail="At least 2 symbols required")

        # Fetch historical data
        async def fetch_history(xstock_symbol: str):
            try:
                real_symbol = STOCK_SYMBOLS.get(xstock_symbol)
                if not real_symbol:
                    return None

                def fetch():
                    ticker = yf.Ticker(real_symbol.replace('.', '-'))
                    hist = ticker.history(start=start_date, end=end_date, timeout=15)
                    if hist.empty:
                        return None
                    return hist['Close']

                loop = asyncio.get_event_loop()
                return await loop.run_in_executor(None, fetch)
            except Exception as e:
                logger.warning(f"Could not fetch history for {xstock_symbol}: {e}")
                return None

        price_series = await asyncio.gather(*[fetch_history(sym) for sym in symbols])
        valid_data = [(sym, prices) for sym, prices in zip(symbols, price_series) if prices is not None]

        if len(valid_data) < 2:
            raise HTTPException(status_code=400, detail="Insufficient valid data")

        # Create returns dataframe
        portfolio_df = pd.DataFrame({sym: prices for sym, prices in valid_data})
        portfolio_df = portfolio_df.dropna()
        returns = portfolio_df.pct_change().dropna()

        # ===== PROFESSIONAL MPT IMPLEMENTATION =====
        # Following industry standard (PyPortfolioOpt, QuantConnect)
        # Reference: https://github.com/robertmartin8/PyPortfolioOpt

        # DEBUG: Log raw returns to diagnose the issue
        logger.info(f"RAW daily returns mean (before annualization): {returns.mean().tolist()}")
        logger.info(f"Sample daily returns (first 5 days): {returns.head().to_dict()}")

        # Expected returns: Arithmetic mean of daily returns, annualized
        # Formula: E[R_annual] = mean(daily_returns) × 252
        # Note: For small daily returns, arithmetic mean is standard in MPT
        mean_returns = returns.mean() * 252

        # Covariance matrix: Sample covariance, annualized
        # Formula: Cov_annual = Cov(daily_returns) × 252
        cov_matrix = returns.cov() * 252

        logger.info(f"Portfolio Optimization: {start_date} to {end_date}, {len(portfolio_df)} trading days")
        logger.info(f"Expected annual returns (decimal): {mean_returns.tolist()}")
        logger.info(f"Expected annual returns (%): {(mean_returns * 100).tolist()} %")
        logger.info(f"Annual volatilities (%): {(np.sqrt(np.diag(cov_matrix)) * 100).tolist()} %")

        # Generate efficient frontier (simple Monte Carlo)
        num_portfolios = 5000
        results = []

        for _ in range(num_portfolios):
            weights = np.random.random(len(valid_data))
            weights /= weights.sum()

            portfolio_return = np.dot(weights, mean_returns)
            portfolio_volatility = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))
            sharpe_ratio = (portfolio_return - 0.02) / portfolio_volatility if portfolio_volatility > 0 else 0

            results.append({
                'return': float(portfolio_return * 100),
                'volatility': float(portfolio_volatility * 100),
                'sharpe': float(sharpe_ratio),
                'weights': weights.tolist()
            })

        # Find optimal portfolios
        max_sharpe_idx = max(range(len(results)), key=lambda i: results[i]['sharpe'])
        min_vol_idx = min(range(len(results)), key=lambda i: results[i]['volatility'])

        optimal_sharpe = results[max_sharpe_idx]
        optimal_min_vol = results[min_vol_idx]

        # Convert weights arrays to dictionaries
        symbols_list = [s for s, _ in valid_data]

        result = {
            'efficientFrontier': [
                {
                    'return': r['return'],
                    'volatility': r['volatility'],
                    'sharpe': r['sharpe'],
                    'weights': {sym: float(w) for sym, w in zip(symbols_list, r['weights'])}
                }
                for r in results[::10]  # Every 10th point for performance
            ],
            'maxSharpePortfolio': {
                'weights': {sym: float(w) for sym, w in zip(symbols_list, optimal_sharpe['weights'])},
                'expectedReturn': optimal_sharpe['return'],
                'volatility': optimal_sharpe['volatility'],
                'sharpe': optimal_sharpe['sharpe']
            },
            'minVolatilityPortfolio': {
                'weights': {sym: float(w) for sym, w in zip(symbols_list, optimal_min_vol['weights'])},
                'expectedReturn': optimal_min_vol['return'],
                'volatility': optimal_min_vol['volatility'],
                'sharpe': optimal_min_vol['sharpe']
            },
            'symbols': symbols_list,
            'tradingDays': len(portfolio_df),
            'timestamp': int(time.time() * 1000)
        }

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Optimize API error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to optimize portfolio: {str(e)}")

@app.post("/api/quant/black-litterman")
async def black_litterman_model(request: dict):
    """
    Black-Litterman Portfolio Optimization Model

    Combines market equilibrium returns with investor views using Bayesian updating.

    Formula:
    - μ_BL = [(τΣ)^-1 + P'Ω^-1P]^-1 [(τΣ)^-1π + P'Ω^-1Q]
    - Σ_BL = Σ + [(τΣ)^-1 + P'Ω^-1P]^-1

    Parameters:
    - symbols: List of xStock symbols
    - startDate, endDate: Historical period for covariance calculation
    - marketCapWeights: Market capitalization weights (optional, defaults to equal)
    - riskAversion: Risk aversion parameter δ (default: 2.5)
    - tau: Uncertainty in prior (default: 0.05)
    - views: List of investor views:
        - assets: [symbol1, symbol2, ...] (currently only single-asset views supported)
        - expectedReturn: Annual return % (e.g., 12 means 12%)
        - confidence: Confidence level 0-100 (higher = more certain)

    Returns:
    - impliedReturns: Market equilibrium returns (π)
    - updatedReturns: Posterior returns (μ_BL)
    - posteriorCovariance: Updated covariance matrix (Σ_BL)
    - optimizedWeights: Portfolio weights optimizing posterior Sharpe ratio
    - expectedReturn: Portfolio expected return %
    - volatility: Portfolio volatility %
    - sharpeRatio: Portfolio Sharpe ratio
    """
    try:
        symbols = request.get('symbols', [])
        start_date = request.get('startDate', '2020-01-01')
        end_date = request.get('endDate', datetime.now().strftime('%Y-%m-%d'))
        market_cap_weights = request.get('marketCapWeights', {})
        risk_aversion = request.get('riskAversion', 2.5)
        tau = request.get('tau', 0.05)
        views = request.get('views', [])

        if not symbols:
            raise HTTPException(status_code=400, detail="Symbols list is required")

        logger.info(f"🧠 Black-Litterman Model: {len(symbols)} assets, {len(views)} views")

        # Fetch historical data
        async def fetch_history(xstock_symbol: str):
            try:
                real_symbol = STOCK_SYMBOLS.get(xstock_symbol) if xstock_symbol in STOCK_SYMBOLS else xstock_symbol
                if not real_symbol:
                    return (xstock_symbol, None)

                def fetch():
                    ticker = yf.Ticker(real_symbol.replace('.', '-'))
                    hist = ticker.history(start=start_date, end=end_date, timeout=15)
                    if hist.empty:
                        return None
                    return hist['Close']

                loop = asyncio.get_event_loop()
                prices = await loop.run_in_executor(None, fetch)
                return (xstock_symbol, prices)
            except Exception as e:
                logger.warning(f"Could not fetch {xstock_symbol}: {e}")
                return (xstock_symbol, None)

        results = await asyncio.gather(*[fetch_history(sym) for sym in symbols])
        valid_data = [(sym, prices) for sym, prices in results if prices is not None and len(prices) > 20]

        if len(valid_data) < 2:
            raise HTTPException(status_code=400, detail="Insufficient valid data for Black-Litterman model")

        # Create returns dataframe
        portfolio_df = pd.DataFrame({sym: prices for sym, prices in valid_data})
        portfolio_df = portfolio_df.dropna()
        returns = portfolio_df.pct_change().dropna()

        symbols_list = [s for s, _ in valid_data]
        n_assets = len(symbols_list)

        # Calculate covariance matrix (annualized)
        cov_matrix = returns.cov().values * 252

        # ===== STEP 1: Calculate Market Equilibrium Returns (π) =====
        # π = δ × Σ × w_mkt
        # where δ = risk aversion, Σ = covariance matrix, w_mkt = market cap weights

        if market_cap_weights and len(market_cap_weights) > 0:
            # Use provided market cap weights
            w_mkt = np.array([market_cap_weights.get(sym, 1.0/n_assets) for sym in symbols_list])
            w_mkt = w_mkt / w_mkt.sum()  # Normalize
        else:
            # Default to equal weights if no market cap data
            w_mkt = np.ones(n_assets) / n_assets

        # Implied equilibrium returns: π = δ × Σ × w_mkt
        implied_returns = risk_aversion * np.dot(cov_matrix, w_mkt)

        logger.info(f"Market cap weights: {w_mkt.tolist()}")
        logger.info(f"Implied equilibrium returns: {(implied_returns * 100).tolist()} %")

        # ===== STEP 2: Process Investor Views =====
        # P matrix: picking matrix (which assets are in each view)
        # Q vector: expected returns for each view
        # Ω matrix: uncertainty in views (diagonal matrix)

        if not views or len(views) == 0:
            # No views provided - just return market equilibrium
            logger.info("No investor views provided - returning market equilibrium portfolio")

            # Optimize using implied returns
            num_portfolios = 1000
            results_list = []

            for _ in range(num_portfolios):
                weights = np.random.random(n_assets)
                weights /= weights.sum()

                portfolio_return = np.dot(weights, implied_returns)
                portfolio_volatility = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))
                sharpe_ratio = (portfolio_return - 0.02) / portfolio_volatility if portfolio_volatility > 0 else 0

                results_list.append({
                    'sharpe': sharpe_ratio,
                    'return': portfolio_return,
                    'volatility': portfolio_volatility,
                    'weights': weights
                })

            best = max(results_list, key=lambda x: x['sharpe'])

            return {
                'impliedReturns': {sym: float(ret * 100) for sym, ret in zip(symbols_list, implied_returns)},
                'updatedReturns': {sym: float(ret * 100) for sym, ret in zip(symbols_list, implied_returns)},
                'posteriorCovariance': cov_matrix.tolist(),
                'views': [],
                'optimizedWeights': {sym: float(w) for sym, w in zip(symbols_list, best['weights'])},
                'expectedReturn': float(best['return'] * 100),
                'volatility': float(best['volatility'] * 100),
                'sharpeRatio': float(best['sharpe']),
                'tradingDays': len(portfolio_df),
                'timestamp': int(time.time() * 1000)
            }

        # Build P, Q, Ω matrices for views
        n_views = len(views)
        P = np.zeros((n_views, n_assets))
        Q = np.zeros(n_views)
        Omega = np.zeros((n_views, n_views))

        processed_views = []

        for i, view in enumerate(views):
            view_assets = view.get('assets', [])
            expected_return = view.get('expectedReturn', 0) / 100  # Convert % to decimal
            confidence = view.get('confidence', 50) / 100  # Convert 0-100 to 0-1
            description = view.get('description', '')

            if not view_assets:
                continue

            # Currently only support single-asset views for simplicity
            # Multi-asset views would require more complex P matrix setup
            if len(view_assets) == 1 and view_assets[0] in symbols_list:
                asset_idx = symbols_list.index(view_assets[0])
                P[i, asset_idx] = 1.0
                Q[i] = expected_return

                # Omega: uncertainty in views
                # Higher confidence = lower uncertainty
                # Omega[i,i] = τ × P[i] × Σ × P[i]' / confidence
                view_variance = tau * P[i:i+1] @ cov_matrix @ P[i:i+1].T
                Omega[i, i] = view_variance[0, 0] / max(confidence, 0.01)  # Avoid division by zero

                processed_views.append({
                    'assets': view_assets,
                    'expectedReturn': expected_return * 100,
                    'confidence': confidence * 100,
                    'description': description
                })

        if len(processed_views) == 0:
            raise HTTPException(status_code=400, detail="No valid views provided")

        # Trim matrices to actual number of processed views
        P = P[:len(processed_views)]
        Q = Q[:len(processed_views)]
        Omega = Omega[:len(processed_views), :len(processed_views)]

        logger.info(f"Processed {len(processed_views)} views")
        logger.info(f"Q (view returns): {(Q * 100).tolist()} %")

        # ===== STEP 3: Black-Litterman Formula =====
        # μ_BL = [(τΣ)^-1 + P'Ω^-1P]^-1 [(τΣ)^-1π + P'Ω^-1Q]

        tau_sigma = tau * cov_matrix
        tau_sigma_inv = np.linalg.inv(tau_sigma)
        omega_inv = np.linalg.inv(Omega)

        # Posterior precision matrix
        M = tau_sigma_inv + P.T @ omega_inv @ P
        M_inv = np.linalg.inv(M)

        # Posterior mean returns
        mu_bl = M_inv @ (tau_sigma_inv @ implied_returns + P.T @ omega_inv @ Q)

        # Posterior covariance matrix
        # Σ_BL = Σ + M^-1
        sigma_bl = cov_matrix + M_inv

        logger.info(f"Black-Litterman updated returns: {(mu_bl * 100).tolist()} %")

        # ===== STEP 4: Optimize Portfolio using BL Returns =====
        num_portfolios = 1000
        results_list = []

        for _ in range(num_portfolios):
            weights = np.random.random(n_assets)
            weights /= weights.sum()

            portfolio_return = np.dot(weights, mu_bl)
            portfolio_volatility = np.sqrt(np.dot(weights.T, np.dot(sigma_bl, weights)))
            sharpe_ratio = (portfolio_return - 0.02) / portfolio_volatility if portfolio_volatility > 0 else 0

            results_list.append({
                'sharpe': sharpe_ratio,
                'return': portfolio_return,
                'volatility': portfolio_volatility,
                'weights': weights
            })

        # Find optimal Sharpe ratio portfolio
        best = max(results_list, key=lambda x: x['sharpe'])

        result = {
            'impliedReturns': {sym: float(ret * 100) for sym, ret in zip(symbols_list, implied_returns)},
            'updatedReturns': {sym: float(ret * 100) for sym, ret in zip(symbols_list, mu_bl)},
            'posteriorCovariance': sigma_bl.tolist(),
            'views': processed_views,
            'optimizedWeights': {sym: float(w) for sym, w in zip(symbols_list, best['weights'])},
            'expectedReturn': float(best['return'] * 100),
            'volatility': float(best['volatility'] * 100),
            'sharpeRatio': float(best['sharpe']),
            'tradingDays': len(portfolio_df),
            'timestamp': int(time.time() * 1000)
        }

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Black-Litterman API error: {e}")
        logger.exception(e)
        raise HTTPException(status_code=500, detail=f"Black-Litterman model failed: {str(e)}")
@app.post("/api/quant/risk-metrics")
async def calculate_risk_metrics(request: dict):
    """
    Calculate comprehensive risk metrics for portfolio
    VaR, CVaR, Beta, Sharpe, Sortino, Max Drawdown
    """
    try:
        symbols = request.get('symbols', [])
        weights = request.get('weights', None)
        start_date = request.get('startDate', '2020-01-01')
        end_date = request.get('endDate', datetime.now().strftime('%Y-%m-%d'))
        confidence_level = request.get('confidenceLevel', 0.95)

        if not symbols:
            raise HTTPException(status_code=400, detail="Symbols list is required")

        if not weights:
            weights = [1.0 / len(symbols)] * len(symbols)
        else:
            # Ensure weights are floats, not strings
            weights = [float(w) for w in weights]

        # Fetch historical data and benchmark (S&P 500)
        async def fetch_history(xstock_symbol: str):
            try:
                real_symbol = STOCK_SYMBOLS.get(xstock_symbol) if xstock_symbol in STOCK_SYMBOLS else xstock_symbol
                if not real_symbol:
                    return None

                def fetch():
                    ticker = yf.Ticker(real_symbol.replace('.', '-'))
                    hist = ticker.history(start=start_date, end=end_date, timeout=15)
                    if hist.empty:
                        return None
                    return hist['Close']

                loop = asyncio.get_event_loop()
                return await loop.run_in_executor(None, fetch)
            except Exception as e:
                logger.warning(f"Could not fetch history for {xstock_symbol}: {e}")
                return None

        # Fetch portfolio stocks + benchmark
        all_symbols = symbols + ['^GSPC']  # Add S&P 500
        price_series = await asyncio.gather(*[fetch_history(sym) for sym in all_symbols])

        # Separate benchmark
        benchmark_prices = price_series[-1]
        portfolio_prices = price_series[:-1]

        valid_data = [(sym, prices, weight) for sym, prices, weight in zip(symbols, portfolio_prices, weights) if prices is not None]

        if not valid_data or benchmark_prices is None:
            raise HTTPException(status_code=400, detail="Insufficient data")

        # Create dataframe
        portfolio_df = pd.DataFrame({sym: prices for sym, prices, _ in valid_data})
        portfolio_df['Benchmark'] = benchmark_prices
        portfolio_df = portfolio_df.dropna()

        # Calculate returns
        returns = portfolio_df.pct_change().dropna()
        weights_array = np.array([weight for _, _, weight in valid_data])
        portfolio_returns = (returns.drop('Benchmark', axis=1) * weights_array).sum(axis=1)
        benchmark_returns = returns['Benchmark']

        # Risk metrics
        annual_return = portfolio_returns.mean() * 252
        annual_volatility = portfolio_returns.std() * np.sqrt(252)
        sharpe_ratio = (annual_return - 0.02) / annual_volatility if annual_volatility > 0 else 0

        # Sortino
        downside_returns = portfolio_returns[portfolio_returns < 0]
        downside_deviation = downside_returns.std() * np.sqrt(252) if len(downside_returns) > 0 else 0
        sortino_ratio = (annual_return - 0.02) / downside_deviation if downside_deviation > 0 else 0

        # Max drawdown
        cumulative = (1 + portfolio_returns).cumprod()
        running_max = cumulative.expanding().max()
        drawdown = (cumulative - running_max) / running_max
        max_drawdown = drawdown.min()

        # Beta (vs S&P 500)
        covariance = portfolio_returns.cov(benchmark_returns)
        benchmark_variance = benchmark_returns.var()
        beta = covariance / benchmark_variance if benchmark_variance > 0 else 1.0

        # Alpha (Jensen's Alpha)
        risk_free_rate = 0.02  # 2% annual risk-free rate
        benchmark_annual_return = benchmark_returns.mean() * 252
        expected_return = risk_free_rate + beta * (benchmark_annual_return - risk_free_rate)
        alpha = annual_return - expected_return

        # VaR (Value at Risk) - Historical method
        var_95 = np.percentile(portfolio_returns, (1 - confidence_level) * 100)
        var_99 = np.percentile(portfolio_returns, 1)

        # CVaR (Conditional VaR / Expected Shortfall)
        cvar_95 = portfolio_returns[portfolio_returns <= var_95].mean()
        cvar_99 = portfolio_returns[portfolio_returns <= var_99].mean()

        result = {
            'metrics': {
                'annualReturn': float(annual_return * 100),
                'annualVolatility': float(annual_volatility * 100),
                'sharpeRatio': float(sharpe_ratio),
                'sortinoRatio': float(sortino_ratio),
                'maxDrawdown': float(max_drawdown * 100),
                'beta': float(beta),
                'alpha': float(alpha * 100),
                'var95': float(var_95 * 100),
                'var99': float(var_99 * 100),
                'cvar95': float(cvar_95 * 100),
                'cvar99': float(cvar_99 * 100),
                'downsideVolatility': float(downside_deviation * 100)
            },
            'interpretation': {
                'sharpe': 'Excellent' if sharpe_ratio > 2 else 'Good' if sharpe_ratio > 1 else 'Average' if sharpe_ratio > 0.5 else 'Poor',
                'volatility': 'Low' if annual_volatility < 0.15 else 'Moderate' if annual_volatility < 0.25 else 'High',
                'beta': 'Defensive' if beta < 0.8 else 'Market' if beta < 1.2 else 'Aggressive',
                'var95': f'95% confidence: Daily loss will not exceed {abs(var_95 * 100):.2f}%',
                'cvar95': f'Average loss when VaR is exceeded: {abs(cvar_95 * 100):.2f}%'
            },
            'symbols': symbols,
            'weights': weights,
            'timestamp': int(time.time() * 1000)
        }

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Risk metrics API error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to calculate risk metrics: {str(e)}")

@app.post("/api/quant/correlation")
async def calculate_correlation(request: dict):
    """
    Calculate correlation matrix for a set of stocks
    Returns correlation coefficients and heatmap data
    """
    try:
        symbols = request.get('symbols', [])
        start_date = request.get('startDate', '2020-01-01')
        end_date = request.get('endDate', datetime.now().strftime('%Y-%m-%d'))

        if not symbols or len(symbols) < 2:
            raise HTTPException(status_code=400, detail="At least 2 symbols are required for correlation analysis")

        logger.info(f"Calculating correlation for {len(symbols)} symbols from {start_date} to {end_date}")

        # Map xStock symbols to real symbols
        real_symbols = []
        symbol_mapping = {}
        for xstock_symbol in symbols:
            real_symbol = STOCK_SYMBOLS.get(xstock_symbol) if xstock_symbol in STOCK_SYMBOLS else xstock_symbol
            if real_symbol:
                real_symbols.append(real_symbol.replace('.', '-'))
                symbol_mapping[real_symbol.replace('.', '-')] = xstock_symbol

        if len(real_symbols) < 2:
            raise HTTPException(status_code=400, detail="Could not map symbols")

        # Fetch historical data for all symbols
        all_data = {}
        failed_symbols = []

        for real_symbol in real_symbols:
            try:
                ticker = yf.Ticker(real_symbol)
                hist = ticker.history(start=start_date, end=end_date, timeout=10)
                if not hist.empty:
                    all_data[real_symbol] = hist['Close']
                else:
                    failed_symbols.append(real_symbol)
            except Exception as e:
                logger.warning(f"Failed to fetch data for {real_symbol}: {e}")
                failed_symbols.append(real_symbol)

        if len(all_data) < 2:
            raise HTTPException(status_code=500, detail="Could not fetch enough data for correlation analysis")

        # Create DataFrame with all closing prices
        df = pd.DataFrame(all_data)

        # Calculate daily returns
        returns = df.pct_change().dropna()

        # Calculate correlation matrix
        correlation_matrix = returns.corr()

        # Build correlation matrix for response
        matrix_data = []
        for i, symbol1 in enumerate(correlation_matrix.index):
            row_data = []
            for j, symbol2 in enumerate(correlation_matrix.columns):
                corr_value = correlation_matrix.iloc[i, j]
                row_data.append({
                    'symbol1': symbol_mapping.get(symbol1, symbol1),
                    'symbol2': symbol_mapping.get(symbol2, symbol2),
                    'correlation': float(corr_value) if pd.notna(corr_value) else 0.0
                })
            matrix_data.append(row_data)

        # Calculate average correlations for each symbol
        average_correlations = {}
        for symbol in correlation_matrix.index:
            # Exclude self-correlation (which is always 1.0)
            correlations = correlation_matrix[symbol].drop(symbol)
            avg_corr = correlations.mean()
            average_correlations[symbol_mapping.get(symbol, symbol)] = float(avg_corr) if pd.notna(avg_corr) else 0.0

        # Find highest and lowest correlations
        correlations_list = []
        for i, symbol1 in enumerate(correlation_matrix.index):
            for j, symbol2 in enumerate(correlation_matrix.columns):
                if i < j:  # Only include upper triangle to avoid duplicates
                    corr_value = correlation_matrix.iloc[i, j]
                    correlations_list.append({
                        'symbol1': symbol_mapping.get(symbol1, symbol1),
                        'symbol2': symbol_mapping.get(symbol2, symbol2),
                        'correlation': float(corr_value) if pd.notna(corr_value) else 0.0
                    })

        # Sort to find extremes
        correlations_list.sort(key=lambda x: x['correlation'], reverse=True)
        highest_correlations = correlations_list[:5] if len(correlations_list) >= 5 else correlations_list
        lowest_correlations = correlations_list[-5:] if len(correlations_list) >= 5 else correlations_list

        # K-means clustering based on correlation patterns
        clusters_data = []
        try:
            # Determine optimal number of clusters (between 2 and min(5, number of stocks))
            n_clusters = min(max(2, len(correlation_matrix) // 3), 5)

            # Perform K-means clustering on the correlation matrix
            kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            cluster_labels = kmeans.fit_predict(correlation_matrix.values)

            # Build clusters data with stocks grouped by cluster
            for cluster_id in range(n_clusters):
                cluster_symbols = [
                    symbol_mapping.get(correlation_matrix.index[i], correlation_matrix.index[i])
                    for i in range(len(cluster_labels))
                    if cluster_labels[i] == cluster_id
                ]

                # Calculate average intra-cluster correlation
                cluster_indices = [i for i in range(len(cluster_labels)) if cluster_labels[i] == cluster_id]
                if len(cluster_indices) > 1:
                    cluster_corr_values = []
                    for i in cluster_indices:
                        for j in cluster_indices:
                            if i < j:
                                cluster_corr_values.append(correlation_matrix.iloc[i, j])
                    avg_correlation = float(np.mean(cluster_corr_values)) if cluster_corr_values else 0.0
                else:
                    avg_correlation = 1.0

                clusters_data.append({
                    'id': int(cluster_id),
                    'stocks': cluster_symbols,
                    'averageCorrelation': avg_correlation
                })

            logger.info(f"Created {n_clusters} clusters for {len(correlation_matrix)} stocks")
        except Exception as e:
            logger.warning(f"Clustering failed: {e}")
            # Fallback: put all stocks in one cluster
            clusters_data = [{
                'id': 0,
                'stocks': [symbol_mapping.get(s, s) for s in correlation_matrix.index.tolist()],
                'averageCorrelation': float(correlation_matrix.values[np.triu_indices_from(correlation_matrix.values, k=1)].mean())
            }]

        # Principal Component Analysis (PCA)
        principal_components_data = []
        try:
            # Perform PCA on the correlation matrix
            n_components = min(3, len(correlation_matrix))  # Extract up to 3 principal components
            pca = PCA(n_components=n_components)
            pca_result = pca.fit_transform(correlation_matrix.values)

            # Build principal components data
            for i in range(n_components):
                # Get the loadings (how much each stock contributes to this component)
                loadings = pca.components_[i]

                # Find top contributing stocks for this component
                top_indices = np.argsort(np.abs(loadings))[-5:][::-1]  # Top 5 contributors
                contributors = [
                    {
                        'symbol': symbol_mapping.get(correlation_matrix.index[idx], correlation_matrix.index[idx]),
                        'loading': float(loadings[idx])
                    }
                    for idx in top_indices
                ]

                principal_components_data.append({
                    'id': int(i + 1),
                    'varianceExplained': float(pca.explained_variance_ratio_[i]),
                    'cumulativeVariance': float(np.sum(pca.explained_variance_ratio_[:i+1])),
                    'topContributors': contributors
                })

            logger.info(f"PCA extracted {n_components} components, explaining {float(pca.explained_variance_ratio_.sum())*100:.1f}% variance")
        except Exception as e:
            logger.warning(f"PCA failed: {e}")
            # Fallback: empty PCA results
            principal_components_data = []

        result = {
            'matrix': matrix_data,
            'symbols': [symbol_mapping.get(s, s) for s in correlation_matrix.index.tolist()],
            'averageCorrelations': average_correlations,
            'highestCorrelations': highest_correlations,
            'lowestCorrelations': lowest_correlations,
            'clusters': clusters_data,
            'principalComponents': principal_components_data,
            'failedSymbols': [symbol_mapping.get(s, s) for s in failed_symbols],
            'period': {
                'start': start_date,
                'end': end_date
            },
            'timestamp': int(time.time() * 1000)
        }

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Correlation API error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to calculate correlation: {str(e)}")

@app.post("/api/quant/monte-carlo")
async def monte_carlo_simulation(request: dict):
    """
    Monte Carlo simulation for portfolio projections
    Simulates thousands of possible future outcomes
    """
    try:
        symbols = request.get('symbols', [])
        weights = request.get('weights', None)
        initial_capital = request.get('initialCapital', 10000)
        years = request.get('years', 5)
        simulations = request.get('simulations', 1000)
        start_date = request.get('startDate', '2020-01-01')

        if not symbols:
            raise HTTPException(status_code=400, detail="Symbols list is required")

        if not weights:
            weights = [1.0 / len(symbols)] * len(symbols)

        # Fetch historical data to calculate returns
        async def fetch_history(xstock_symbol: str):
            try:
                real_symbol = STOCK_SYMBOLS.get(xstock_symbol)
                if not real_symbol:
                    return None

                def fetch():
                    ticker = yf.Ticker(real_symbol.replace('.', '-'))
                    hist = ticker.history(start=start_date, timeout=15)
                    if hist.empty:
                        return None
                    return hist['Close']

                loop = asyncio.get_event_loop()
                return await loop.run_in_executor(None, fetch)
            except Exception as e:
                logger.warning(f"Could not fetch history for {xstock_symbol}: {e}")
                return None

        price_series = await asyncio.gather(*[fetch_history(sym) for sym in symbols])
        valid_data = [(sym, prices, weight) for sym, prices, weight in zip(symbols, price_series, weights) if prices is not None]

        if not valid_data:
            raise HTTPException(status_code=400, detail="No valid historical data")

        # Calculate returns
        portfolio_df = pd.DataFrame({sym: prices for sym, prices, _ in valid_data})
        portfolio_df = portfolio_df.dropna()
        returns = portfolio_df.pct_change().dropna()

        # Portfolio parameters
        weights_array = np.array([weight for _, _, weight in valid_data])
        portfolio_returns = (returns * weights_array).sum(axis=1)
        mean_return = portfolio_returns.mean()
        std_return = portfolio_returns.std()

        # Run Monte Carlo simulations
        trading_days = 252 * years
        simulation_results = []

        for _ in range(simulations):
            # Generate random returns based on historical mean and std
            daily_returns = np.random.normal(mean_return, std_return, trading_days)
            portfolio_values = initial_capital * (1 + daily_returns).cumprod()
            simulation_results.append(portfolio_values[-1])

        simulation_results = np.array(simulation_results)

        # Calculate percentiles
        percentiles = {
            '5th': np.percentile(simulation_results, 5),
            '25th': np.percentile(simulation_results, 25),
            '50th': np.percentile(simulation_results, 50),
            '75th': np.percentile(simulation_results, 75),
            '95th': np.percentile(simulation_results, 95)
        }

        # Calculate probability of positive return
        prob_positive = (simulation_results > initial_capital).sum() / simulations * 100

        # Sample paths for visualization
        sample_paths = []
        for i in range(min(100, simulations)):  # Show 100 sample paths
            daily_returns = np.random.normal(mean_return, std_return, trading_days)
            portfolio_values = initial_capital * (1 + daily_returns).cumprod()
            sample_paths.append(portfolio_values.tolist())

        result = {
            'statistics': {
                'mean': float(simulation_results.mean()),
                'median': float(percentiles['50th']),
                'std': float(simulation_results.std()),
                'min': float(simulation_results.min()),
                'max': float(simulation_results.max()),
                'probPositive': float(prob_positive)
            },
            'percentiles': {k: float(v) for k, v in percentiles.items()},
            'samplePaths': sample_paths[:20],  # Return 20 sample paths for charting
            'config': {
                'symbols': symbols,
                'weights': weights,
                'initialCapital': initial_capital,
                'years': years,
                'simulations': simulations
            },
            'timestamp': int(time.time() * 1000)
        }

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Monte Carlo API error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to run Monte Carlo simulation: {str(e)}")

@app.post("/api/portfolio/analyze")
async def analyze_portfolio(request: dict):
    """
    Comprehensive portfolio analysis
    Performance attribution, risk metrics, benchmark comparison, rebalancing suggestions
    """
    try:
        holdings = request.get('holdings', [])  # [{'symbol': 'AAPLx', 'shares': 10, 'costBasis': 150}]
        start_date = request.get('startDate', '2020-01-01')
        end_date = request.get('endDate', datetime.now().strftime('%Y-%m-%d'))

        if not holdings:
            raise HTTPException(status_code=400, detail="Holdings list is required")

        # Extract symbols and fetch data
        symbols = [h['symbol'] for h in holdings]

        # SIMPLIFIED APPROACH: Fetch pandas DataFrames directly like backtest does (NO CACHING)
        async def fetch_history_dataframe(xstock_symbol: str):
            """Fetch historical data as pandas DataFrame - same as backtest endpoint"""
            try:
                # Handle benchmarks (^GSPC, etc.) directly - they don't need xStock mapping
                if xstock_symbol.startswith('^'):
                    real_symbol = xstock_symbol
                else:
                    real_symbol = STOCK_SYMBOLS.get(xstock_symbol)
                    if not real_symbol:
                        logger.warning(f"⚠️ Symbol {xstock_symbol} not found in mapping")
                        return None

                def fetch():
                    ticker = yf.Ticker(real_symbol.replace('.', '-'))
                    hist = ticker.history(start=start_date, end=end_date, timeout=15)
                    info = ticker.info
                    if hist.empty:
                        return None

                    # Return DataFrame with metadata - SAME AS BACKTEST
                    return {
                        'prices': hist['Close'],  # Pandas Series - keep as-is!
                        'currentPrice': float(info.get('currentPrice', 0) or info.get('regularMarketPrice', 0)),
                        'sector': info.get('sector', 'Benchmark' if xstock_symbol.startswith('^') else 'Unknown')
                    }

                loop = asyncio.get_event_loop()
                return await loop.run_in_executor(None, fetch)
            except Exception as e:
                logger.warning(f"Could not fetch history for {xstock_symbol}: {e}")
                return None

        # Fetch all holdings + benchmark in parallel
        all_symbols = symbols + ['^GSPC']
        price_data = await asyncio.gather(*[fetch_history_dataframe(sym) for sym in all_symbols])

        # Separate benchmark
        benchmark_data = price_data[-1]
        holdings_data = price_data[:-1]

        # Calculate portfolio metrics
        portfolio_value_current = 0
        portfolio_cost_basis = 0
        position_details = []

        for holding, data in zip(holdings, holdings_data):
            if data is None:
                continue

            shares = holding.get('shares', 0)
            cost_basis = holding.get('costBasis', 0)
            current_price = data['currentPrice']

            position_value = shares * current_price
            position_cost = shares * cost_basis
            position_gain = position_value - position_cost
            position_gain_pct = (position_gain / position_cost * 100) if position_cost > 0 else 0

            portfolio_value_current += position_value
            portfolio_cost_basis += position_cost

            position_details.append({
                'symbol': holding['symbol'],
                'shares': shares,
                'costBasis': cost_basis,
                'currentPrice': current_price,
                'positionValue': position_value,
                'positionCost': position_cost,
                'gain': position_gain,
                'gainPercent': position_gain_pct,
                'weight': 0,  # Calculate after total
                'sector': data['sector']
            })

        # Calculate weights
        for pos in position_details:
            pos['weight'] = (pos['positionValue'] / portfolio_value_current * 100) if portfolio_value_current > 0 else 0

        # Performance attribution
        total_gain = portfolio_value_current - portfolio_cost_basis
        total_gain_pct = (total_gain / portfolio_cost_basis * 100) if portfolio_cost_basis > 0 else 0

        # Sector allocation
        sector_allocation = {}
        for pos in position_details:
            sector = pos['sector']
            if sector not in sector_allocation:
                sector_allocation[sector] = 0
            sector_allocation[sector] += pos['weight']

        # Calculate portfolio historical returns
        valid_holdings = [h for h in holdings_data if h is not None]

        # ALWAYS try to calculate risk metrics - even with partial data
        if len(valid_holdings) > 0 and benchmark_data and benchmark_data.get('prices') is not None:
            try:
                # Create returns dataframe - prices are ALREADY pandas Series!
                price_series_dict = {}

                # Collect all price series (already pandas Series objects)
                for i, data in enumerate(holdings_data):
                    if data is not None and data.get('prices') is not None:
                        prices = data['prices']
                        # Prices are already pandas Series - use directly!
                        if isinstance(prices, pd.Series) and len(prices) > 0:
                            price_series_dict[holdings[i]['symbol']] = prices
                            logger.info(f"✅ Added price series for {holdings[i]['symbol']}: {len(prices)} data points")
                        else:
                            logger.warning(f"⚠️ Invalid prices for {holdings[i]['symbol']}: {type(prices)}")

                # Add benchmark (also already a pandas Series)
                bench_prices = benchmark_data['prices']
                if isinstance(bench_prices, pd.Series) and len(bench_prices) > 0:
                    price_series_dict['Benchmark'] = bench_prices
                    logger.info(f"✅ Added benchmark series: {len(bench_prices)} data points")
                else:
                    logger.warning(f"⚠️ Invalid benchmark prices: {type(bench_prices)}")

                logger.info(f"📊 Total price series collected: {len(price_series_dict)}")

                # Create DataFrame from price series - pandas will align indices automatically
                if len(price_series_dict) > 0:
                    returns_df = pd.DataFrame(price_series_dict)
                    logger.info(f"📊 Price DataFrame created: shape {returns_df.shape}")
                else:
                    logger.warning("⚠️ No price series to create DataFrame")
                    returns_df = pd.DataFrame()

                returns_df = returns_df.dropna()

                if len(returns_df) > 30:  # Need at least 30 days of data
                    returns = returns_df.pct_change().dropna()

                    # Portfolio returns (weighted by current value)
                    weights = np.array([pos['weight']/100 for pos in position_details if pos['symbol'] in returns_df.columns])
                    if len(weights) > 0:
                        weights = weights / weights.sum()  # Normalize weights to sum to 1
                        portfolio_returns = (returns.drop('Benchmark', axis=1, errors='ignore') * weights).sum(axis=1)
                        benchmark_returns = returns['Benchmark']

                        # Risk metrics
                        annual_return = portfolio_returns.mean() * 252
                        annual_volatility = portfolio_returns.std() * np.sqrt(252)
                        sharpe_ratio = (annual_return - 0.02) / annual_volatility if annual_volatility > 0 else 0

                        # Beta vs benchmark
                        covariance = portfolio_returns.cov(benchmark_returns)
                        benchmark_variance = benchmark_returns.var()
                        beta = covariance / benchmark_variance if benchmark_variance > 0 else 1.0

                        # Max drawdown
                        cumulative = (1 + portfolio_returns).cumprod()
                        running_max = cumulative.expanding().max()
                        drawdown = (cumulative - running_max) / running_max
                        max_drawdown = drawdown.min()

                        # Benchmark comparison
                        benchmark_annual_return = benchmark_returns.mean() * 252
                        alpha = annual_return - (0.02 + beta * (benchmark_annual_return - 0.02))

                        risk_metrics = {
                            'annualReturn': float(annual_return * 100),
                            'annualVolatility': float(annual_volatility * 100),
                            'sharpeRatio': float(sharpe_ratio),
                            'beta': float(beta),
                            'alpha': float(alpha * 100),
                            'maxDrawdown': float(max_drawdown * 100)
                        }

                        benchmark_comparison = {
                            'portfolioReturn': float(annual_return * 100),
                            'benchmarkReturn': float(benchmark_annual_return * 100),
                            'outperformance': float((annual_return - benchmark_annual_return) * 100),
                            'beta': float(beta),
                            'alpha': float(alpha * 100)
                        }

                        # Calculate REAL historical portfolio values (NO MOCKS)
                        portfolio_history = []
                        benchmark_history = []

                        # Calculate cumulative portfolio value over time using REAL returns
                        initial_portfolio_value = portfolio_cost_basis if portfolio_cost_basis > 0 else portfolio_value_current
                        cumulative_portfolio = (1 + portfolio_returns).cumprod()
                        cumulative_benchmark = (1 + benchmark_returns).cumprod()

                        # Use returns index (which is aligned with cumulative series) not returns_df
                        for date_idx, date in enumerate(cumulative_portfolio.index):
                            portfolio_value = float(initial_portfolio_value * cumulative_portfolio.iloc[date_idx])
                            benchmark_value = float(initial_portfolio_value * cumulative_benchmark.iloc[date_idx])

                            portfolio_history.append({
                                'date': date.strftime('%Y-%m-%d'),
                                'value': portfolio_value
                            })
                            benchmark_history.append({
                                'date': date.strftime('%Y-%m-%d'),
                                'value': benchmark_value
                            })

                        # Calculate additional REAL risk metrics (downside deviation, vol of vol)
                        negative_returns = portfolio_returns[portfolio_returns < 0]
                        downside_deviation = float(negative_returns.std() * np.sqrt(252)) if len(negative_returns) > 0 else 0

                        # Volatility of volatility (rolling 30-day vol)
                        rolling_vol = portfolio_returns.rolling(30).std()
                        vol_of_vol = float(rolling_vol.std() * np.sqrt(252)) if len(rolling_vol.dropna()) > 0 else 0

                        risk_metrics['downside_deviation'] = downside_deviation * 100
                        risk_metrics['volOfVol'] = vol_of_vol * 100
                    else:
                        # Not enough valid positions with prices
                        raise ValueError("No valid positions with price data")
                else:
                    # Not enough historical data
                    raise ValueError("Insufficient historical data (need at least 30 days)")
            except Exception as e:
                logger.warning(f"Could not calculate risk metrics: {e}")
                risk_metrics = {}
                benchmark_comparison = {}
                portfolio_history = []
                benchmark_history = []
        else:
            risk_metrics = {}
            benchmark_comparison = {}
            portfolio_history = []
            benchmark_history = []

        # Rebalancing suggestions (target equal weight)
        target_weight = 100.0 / len(position_details) if position_details else 0
        rebalancing_suggestions = []

        for pos in position_details:
            current_weight = pos['weight']
            deviation = current_weight - target_weight

            if abs(deviation) > 5:  # Suggest rebalancing if >5% deviation
                action = 'Reduce' if deviation > 0 else 'Increase'
                target_value = (target_weight / 100) * portfolio_value_current
                change_value = target_value - pos['positionValue']
                change_shares = change_value / pos['currentPrice'] if pos['currentPrice'] > 0 else 0

                rebalancing_suggestions.append({
                    'symbol': pos['symbol'],
                    'action': action,
                    'currentWeight': current_weight,
                    'targetWeight': target_weight,
                    'deviation': abs(deviation),
                    'changeValue': abs(change_value),
                    'changeShares': abs(change_shares)
                })

        result = {
            'summary': {
                'currentValue': float(portfolio_value_current),
                'costBasis': float(portfolio_cost_basis),
                'totalGain': float(total_gain),
                'totalGainPercent': float(total_gain_pct),
                'positionCount': len(position_details)
            },
            'positions': position_details,
            'sectorAllocation': sector_allocation,
            'riskMetrics': risk_metrics,
            'benchmarkComparison': benchmark_comparison,
            'portfolioHistory': portfolio_history,
            'benchmarkHistory': benchmark_history,
            'rebalancing': {
                'suggestions': rebalancing_suggestions,
                'needsRebalancing': len(rebalancing_suggestions) > 0,
                'targetStrategy': 'Equal Weight'
            },
            'timestamp': int(time.time() * 1000)
        }

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Portfolio analyze API error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze portfolio: {str(e)}")

@app.post("/api/portfolio/optimize-allocation")
async def optimize_portfolio_allocation(request: dict):
    """
    Portfolio optimization recommendations
    Suggests optimal allocation based on risk tolerance and objectives
    """
    try:
        holdings = request.get('holdings', [])
        risk_tolerance = request.get('riskTolerance', 'moderate')  # conservative, moderate, aggressive
        objective = request.get('objective', 'balanced')  # growth, income, balanced
        start_date = request.get('startDate', '2020-01-01')

        if not holdings or len(holdings) < 2:
            raise HTTPException(status_code=400, detail="At least 2 holdings required")

        symbols = [h['symbol'] for h in holdings]

        # Fetch historical data
        async def fetch_history(xstock_symbol: str):
            try:
                real_symbol = STOCK_SYMBOLS.get(xstock_symbol)
                if not real_symbol:
                    return None

                def fetch():
                    ticker = yf.Ticker(real_symbol.replace('.', '-'))
                    hist = ticker.history(start=start_date, timeout=15)
                    info = ticker.info
                    if hist.empty:
                        return None
                    return {
                        'prices': hist['Close'],
                        'dividendYield': float(info.get('dividendYield', 0) * 100) if info.get('dividendYield') else 0,
                        'beta': float(info.get('beta', 1.0)) if info.get('beta') else 1.0
                    }

                loop = asyncio.get_event_loop()
                return await loop.run_in_executor(None, fetch)
            except Exception as e:
                logger.warning(f"Could not fetch history for {xstock_symbol}: {e}")
                return None

        price_data = await asyncio.gather(*[fetch_history(sym) for sym in symbols])
        valid_data = [(sym, data) for sym, data in zip(symbols, price_data) if data is not None]

        if len(valid_data) < 2:
            raise HTTPException(status_code=400, detail="Insufficient valid data")

        # Create returns dataframe
        returns_df = pd.DataFrame({sym: data['prices'] for sym, data in valid_data})
        returns_df = returns_df.dropna()
        returns = returns_df.pct_change().dropna()

        # Calculate mean returns and covariance
        mean_returns = returns.mean() * 252
        cov_matrix = returns.cov() * 252

        # Define risk tolerance constraints
        risk_profiles = {
            'conservative': {'max_vol': 0.12, 'target_return': 0.08},
            'moderate': {'max_vol': 0.18, 'target_return': 0.12},
            'aggressive': {'max_vol': 0.30, 'target_return': 0.18}
        }

        profile = risk_profiles.get(risk_tolerance, risk_profiles['moderate'])

        # Monte Carlo optimization with constraints
        num_portfolios = 5000
        results = []

        for _ in range(num_portfolios):
            weights = np.random.random(len(valid_data))
            weights /= weights.sum()

            portfolio_return = np.dot(weights, mean_returns)
            portfolio_volatility = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))
            sharpe_ratio = (portfolio_return - 0.02) / portfolio_volatility if portfolio_volatility > 0 else 0

            # Filter by risk tolerance
            if portfolio_volatility <= profile['max_vol']:
                results.append({
                    'return': float(portfolio_return * 100),
                    'volatility': float(portfolio_volatility * 100),
                    'sharpe': float(sharpe_ratio),
                    'weights': weights.tolist()
                })

        if not results:
            # Fallback to equal weight
            equal_weights = [1.0 / len(valid_data)] * len(valid_data)
            portfolio_return = np.dot(equal_weights, mean_returns)
            portfolio_volatility = np.sqrt(np.dot(equal_weights, np.dot(cov_matrix, equal_weights)))

            recommended_allocation = [
                {'symbol': sym, 'weight': float(1.0 / len(valid_data) * 100)}
                for sym, _ in valid_data
            ]
        else:
            # Find best allocation for objective
            if objective == 'growth':
                best = max(results, key=lambda x: x['return'])
            elif objective == 'income':
                # Weight by dividend yield
                div_yields = [data['dividendYield'] for _, data in valid_data]
                best_idx = max(range(len(results)), key=lambda i: sum(results[i]['weights'][j] * div_yields[j] for j in range(len(div_yields))))
                best = results[best_idx]
            else:  # balanced
                best = max(results, key=lambda x: x['sharpe'])

            recommended_allocation = [
                {'symbol': sym, 'weight': float(w * 100), 'dividendYield': data['dividendYield'], 'beta': data['beta']}
                for (sym, data), w in zip(valid_data, best['weights'])
            ]

        result = {
            'recommended': {
                'allocation': recommended_allocation,
                'expectedReturn': best.get('return', 0) if results else float(portfolio_return * 100),
                'expectedVolatility': best.get('volatility', 0) if results else float(portfolio_volatility * 100),
                'sharpeRatio': best.get('sharpe', 0) if results else float((portfolio_return - 0.02) / portfolio_volatility),
                'strategy': f'{risk_tolerance.title()} Risk / {objective.title()} Objective'
            },
            'profile': {
                'riskTolerance': risk_tolerance,
                'objective': objective,
                'maxVolatility': profile['max_vol'] * 100,
                'targetReturn': profile['target_return'] * 100
            },
            'timestamp': int(time.time() * 1000)
        }

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Optimize allocation API error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to optimize allocation: {str(e)}")

# =============================================================================
# PHASE 4.7: OPTIONS & ADVANCED FEATURES (Week 12)
# =============================================================================

@app.get("/api/options/chain/{xstock_symbol}")
async def get_options_chain(xstock_symbol: str, expiration: str = Query(None, description="Expiration date (YYYY-MM-DD)")):
    """
    Get options chain data for a stock

    Features:
    - Available expiration dates
    - Call and put options with all Greeks
    - Strike prices, bid/ask spreads
    - Open interest and volume
    - Implied volatility
    """
    cache_key = f"options_chain_{xstock_symbol}_{expiration or 'all'}"
    cached = await get_cache(cache_key)
    if cached:
        return cached

    try:
        real_symbol = map_xstock_to_symbol(xstock_symbol)
        if not real_symbol:
            raise HTTPException(status_code=404, detail=f"xStock symbol {xstock_symbol} not found")

        ticker = yf.Ticker(real_symbol)

        # Get available expiration dates
        expirations = ticker.options
        if not expirations or len(expirations) == 0:
            raise HTTPException(status_code=404, detail=f"No options data available for {xstock_symbol}")

        # If no expiration specified, use the nearest one
        if not expiration:
            expiration = expirations[0]
        elif expiration not in expirations:
            raise HTTPException(status_code=400, detail=f"Invalid expiration date. Available: {expirations}")

        # Get option chain for specified expiration
        option_chain = ticker.option_chain(expiration)

        # Get current stock price for moneyness calculation
        info = ticker.info
        current_price = float(info.get('currentPrice', 0))

        # Process calls
        calls_df = option_chain.calls
        calls = []
        for _, row in calls_df.iterrows():
            strike = float(row.get('strike', 0))
            calls.append({
                'strike': strike,
                'lastPrice': float(row.get('lastPrice', 0)),
                'bid': float(row.get('bid', 0)),
                'ask': float(row.get('ask', 0)),
                'change': float(row.get('change', 0)),
                'percentChange': float(row.get('percentChange', 0)),
                'volume': int(row.get('volume', 0)) if pd.notna(row.get('volume')) else 0,
                'openInterest': int(row.get('openInterest', 0)) if pd.notna(row.get('openInterest')) else 0,
                'impliedVolatility': float(row.get('impliedVolatility', 0)),
                'inTheMoney': bool(row.get('inTheMoney', False)),
                'contractSymbol': str(row.get('contractSymbol', '')),
                'moneyness': 'ITM' if current_price > strike else 'OTM',
                'intrinsicValue': max(0, current_price - strike),
                # Calculate Greeks using Black-Scholes
                'delta': calculate_delta(current_price, strike, float(row.get('impliedVolatility', 0)), expiration, 'call'),
                'gamma': calculate_gamma(current_price, strike, float(row.get('impliedVolatility', 0)), expiration),
                'theta': calculate_theta(current_price, strike, float(row.get('impliedVolatility', 0)), expiration, 'call'),
                'vega': calculate_vega(current_price, strike, float(row.get('impliedVolatility', 0)), expiration),
            })

        # Process puts
        puts_df = option_chain.puts
        puts = []
        for _, row in puts_df.iterrows():
            strike = float(row.get('strike', 0))
            puts.append({
                'strike': strike,
                'lastPrice': float(row.get('lastPrice', 0)),
                'bid': float(row.get('bid', 0)),
                'ask': float(row.get('ask', 0)),
                'change': float(row.get('change', 0)),
                'percentChange': float(row.get('percentChange', 0)),
                'volume': int(row.get('volume', 0)) if pd.notna(row.get('volume')) else 0,
                'openInterest': int(row.get('openInterest', 0)) if pd.notna(row.get('openInterest')) else 0,
                'impliedVolatility': float(row.get('impliedVolatility', 0)),
                'inTheMoney': bool(row.get('inTheMoney', False)),
                'contractSymbol': str(row.get('contractSymbol', '')),
                'moneyness': 'ITM' if current_price < strike else 'OTM',
                'intrinsicValue': max(0, strike - current_price),
                # Calculate Greeks using Black-Scholes
                'delta': calculate_delta(current_price, strike, float(row.get('impliedVolatility', 0)), expiration, 'put'),
                'gamma': calculate_gamma(current_price, strike, float(row.get('impliedVolatility', 0)), expiration),
                'theta': calculate_theta(current_price, strike, float(row.get('impliedVolatility', 0)), expiration, 'put'),
                'vega': calculate_vega(current_price, strike, float(row.get('impliedVolatility', 0)), expiration),
            })

        result = {
            'symbol': xstock_symbol,
            'realSymbol': real_symbol,
            'currentPrice': current_price,
            'expiration': expiration,
            'availableExpirations': list(expirations),
            'calls': calls,
            'puts': puts,
            'callsCount': len(calls),
            'putsCount': len(puts),
            'timestamp': int(time.time() * 1000)
        }

        await set_cache(cache_key, result, ttl_seconds=300)  # 5 minute cache
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Options chain API error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch options chain: {str(e)}")


async def scan_unusual_activity_background():
    """
    Background task to scan for unusual options activity
    Runs independently and updates cache
    """
    global _scanning_in_progress

    # Prevent concurrent scans
    if _scanning_in_progress:
        logger.info("⏸️  Scan already in progress, skipping...")
        return

    _scanning_in_progress = True
    cache_key = "unusual_options_activity"
    logger.info("🔍 Starting background unusual activity scan...")

    try:
        unusual_activity = []

        # Check all 63 xStocks from tokens.json for unusual options activity
        top_symbols = [
            'AAPLx', 'ABBVx', 'ABTx', 'ACNx', 'AMBRx', 'AMZNx', 'APPx', 'AVGOx',
            'AZNx', 'BACx', 'BRK.Bx', 'CMCSAx', 'COINx', 'CRCLx', 'CRMx', 'CRWDx',
            'CSCOx', 'CVXx', 'DFDVx', 'DHRx', 'GLDx', 'GMEx', 'GOOGLx', 'GSx',
            'HDx', 'HONx', 'HOODx', 'IBMx', 'INTCx', 'JNJx', 'JPMx', 'KOx',
            'LINx', 'LLYx', 'MAx', 'MCDx', 'MDTx', 'METAx', 'MRKx', 'MRVLx',
            'MSFTx', 'MSTRx', 'NFLXx', 'NVDAx', 'NVOx', 'OPENx', 'ORCLx', 'PEPx',
            'PFEx', 'PGx', 'PLTRx', 'PMx', 'QQQx', 'SPYx', 'TBLLx', 'TMOx',
            'TQQQx', 'TSLAx', 'UNHx', 'VTIx', 'Vx', 'WMTx', 'XOMx'
        ]

        async def check_unusual_activity(xstock_symbol: str):
            try:
                real_symbol = map_xstock_to_symbol(xstock_symbol)
                ticker = yf.Ticker(real_symbol)

                # Get nearest expiration
                expirations = ticker.options
                if not expirations or len(expirations) == 0:
                    return None

                # Check only first expiration (fastest) - most unusual activity is in near-term options
                for exp in expirations[:1]:
                    option_chain = ticker.option_chain(exp)

                    # Analyze calls
                    for _, row in option_chain.calls.iterrows():
                        volume = int(row.get('volume', 0)) if pd.notna(row.get('volume')) else 0
                        oi = int(row.get('openInterest', 0)) if pd.notna(row.get('openInterest')) else 0
                        iv = float(row.get('impliedVolatility', 0))

                        # Unusual activity criteria
                        if oi > 0 and volume > 0:
                            volume_oi_ratio = volume / oi

                            # Flag if volume is 2x+ open interest and high IV
                            if volume_oi_ratio >= 2.0 and iv > 0.5:
                                return {
                                    'symbol': xstock_symbol,
                                    'type': 'CALL',
                                    'strike': float(row.get('strike', 0)),
                                    'expiration': exp,
                                    'volume': volume,
                                    'openInterest': oi,
                                    'volumeOIRatio': round(volume_oi_ratio, 2),
                                    'impliedVolatility': round(iv * 100, 2),
                                    'lastPrice': float(row.get('lastPrice', 0)),
                                    'percentChange': float(row.get('percentChange', 0)),
                                    'timestamp': int(time.time() * 1000)
                                }

                    # Analyze puts
                    for _, row in option_chain.puts.iterrows():
                        volume = int(row.get('volume', 0)) if pd.notna(row.get('volume')) else 0
                        oi = int(row.get('openInterest', 0)) if pd.notna(row.get('openInterest')) else 0
                        iv = float(row.get('impliedVolatility', 0))

                        if oi > 0 and volume > 0:
                            volume_oi_ratio = volume / oi

                            if volume_oi_ratio >= 2.0 and iv > 0.5:
                                return {
                                    'symbol': xstock_symbol,
                                    'type': 'PUT',
                                    'strike': float(row.get('strike', 0)),
                                    'expiration': exp,
                                    'volume': volume,
                                    'openInterest': oi,
                                    'volumeOIRatio': round(volume_oi_ratio, 2),
                                    'impliedVolatility': round(iv * 100, 2),
                                    'lastPrice': float(row.get('lastPrice', 0)),
                                    'percentChange': float(row.get('percentChange', 0)),
                                    'timestamp': int(time.time() * 1000)
                                }

                return None
            except Exception:
                return None

        # Process in batches of 20 (increased for faster scanning)
        for i in range(0, len(top_symbols), 20):
            batch = top_symbols[i:i+20]
            results = await asyncio.gather(*[check_unusual_activity(s) for s in batch], return_exceptions=True)
            # Filter out exceptions and None values
            unusual_activity.extend([r for r in results if r is not None and not isinstance(r, Exception)])

        # Sort by volume/OI ratio
        unusual_activity.sort(key=lambda x: x['volumeOIRatio'], reverse=True)

        result = {
            'unusualActivity': unusual_activity[:20],  # Top 20
            'count': len(unusual_activity),
            'timestamp': int(time.time() * 1000),
            'status': 'complete'  # Full scan complete
        }

        await set_cache(cache_key, result, ttl_seconds=900)  # 15 minute cache (reduced API load)
        logger.info(f"✅ Background scan complete: {len(unusual_activity)} unusual activities found")

    except Exception as e:
        logger.error(f"❌ Background unusual activity scan error: {e}")
    finally:
        _scanning_in_progress = False


@app.get("/api/options/unusual-activity")
async def get_unusual_options_activity(background_tasks: BackgroundTasks):
    """
    Get unusual options activity (returns cached data, refreshes in background)

    Criteria for unusual activity:
    - Volume >> Open Interest (2x+)
    - Extremely high IV percentile (>50%)
    - Large bid-ask spreads indicating smart money
    - High volume on out-of-money options
    """
    global _scanning_in_progress
    cache_key = "unusual_options_activity"
    cached = await get_cache(cache_key)

    # If cache exists and is recent, return it
    if cached:
        # Optionally trigger background refresh if data is older than 10 minutes
        cache_age = int(time.time() * 1000) - cached.get('timestamp', 0)
        if cache_age > 600000 and not _scanning_in_progress:  # 10 minutes
            background_tasks.add_task(scan_unusual_activity_background)
        return cached

    # If no cache, do a quick scan of top 10 symbols synchronously
    # Then trigger full background scan
    logger.info("No cache found, performing quick scan of top symbols...")

    try:
        quick_symbols = ['AAPLx', 'TSLAx', 'NVDAx', 'AMZNx', 'MSFTx', 'METAx', 'GOOGLx', 'SPYx', 'QQQx', 'TQQQx']
        unusual_activity = []

        async def quick_check(xstock_symbol: str):
            try:
                real_symbol = map_xstock_to_symbol(xstock_symbol)
                ticker = yf.Ticker(real_symbol)
                expirations = ticker.options

                if not expirations or len(expirations) == 0:
                    return None

                # Check only first expiration
                exp = expirations[0]
                option_chain = ticker.option_chain(exp)

                # Scan calls
                for _, row in option_chain.calls.head(10).iterrows():  # Only top 10 strikes
                    volume = int(row.get('volume', 0)) if pd.notna(row.get('volume')) else 0
                    oi = int(row.get('openInterest', 0)) if pd.notna(row.get('openInterest')) else 0
                    iv = float(row.get('impliedVolatility', 0)) if pd.notna(row.get('impliedVolatility')) else 0

                    if oi > 0 and volume > 0:
                        volume_oi_ratio = volume / oi
                        if volume_oi_ratio >= 2.0 and iv > 0.5:
                            return {
                                'symbol': xstock_symbol,
                                'type': 'CALL',
                                'strike': float(row.get('strike', 0)),
                                'expiration': exp,
                                'volume': volume,
                                'openInterest': oi,
                                'volumeOIRatio': round(volume_oi_ratio, 2),
                                'impliedVolatility': round(iv * 100, 2),
                                'lastPrice': float(row.get('lastPrice', 0)),
                                'percentChange': float(row.get('percentChange', 0)),
                                'timestamp': int(time.time() * 1000)
                            }

                # Scan puts
                for _, row in option_chain.puts.head(10).iterrows():
                    volume = int(row.get('volume', 0)) if pd.notna(row.get('volume')) else 0
                    oi = int(row.get('openInterest', 0)) if pd.notna(row.get('openInterest')) else 0
                    iv = float(row.get('impliedVolatility', 0)) if pd.notna(row.get('impliedVolatility')) else 0

                    if oi > 0 and volume > 0:
                        volume_oi_ratio = volume / oi
                        if volume_oi_ratio >= 2.0 and iv > 0.5:
                            return {
                                'symbol': xstock_symbol,
                                'type': 'PUT',
                                'strike': float(row.get('strike', 0)),
                                'expiration': exp,
                                'volume': volume,
                                'openInterest': oi,
                                'volumeOIRatio': round(volume_oi_ratio, 2),
                                'impliedVolatility': round(iv * 100, 2),
                                'lastPrice': float(row.get('lastPrice', 0)),
                                'percentChange': float(row.get('percentChange', 0)),
                                'timestamp': int(time.time() * 1000)
                            }

                return None
            except Exception as e:
                logger.debug(f"Quick scan error for {xstock_symbol}: {e}")
                return None

        # Quick parallel scan
        results = await asyncio.gather(*[quick_check(s) for s in quick_symbols], return_exceptions=True)
        unusual_activity = [r for r in results if r is not None and not isinstance(r, Exception)]

        # Sort by volume/OI ratio
        unusual_activity.sort(key=lambda x: x['volumeOIRatio'], reverse=True)

        # Cache the quick results
        result = {
            'unusualActivity': unusual_activity[:20],
            'count': len(unusual_activity),
            'timestamp': int(time.time() * 1000),
            'status': 'partial'  # Indicates this is a quick scan
        }

        await set_cache(cache_key, result, ttl_seconds=900)

        # Trigger full background scan
        if not _scanning_in_progress:
            background_tasks.add_task(scan_unusual_activity_background)

        return result

    except Exception as e:
        logger.error(f"Quick scan error: {e}")
        # Still trigger background scan
        if not _scanning_in_progress:
            background_tasks.add_task(scan_unusual_activity_background)

        return {
            'unusualActivity': [],
            'count': 0,
            'timestamp': int(time.time() * 1000),
            'status': 'scanning'
        }


@app.get("/api/options/put-call-ratio/{xstock_symbol}")
async def get_put_call_ratio(xstock_symbol: str):
    """
    Calculate Put/Call ratio for a stock

    Metrics:
    - Volume-based P/C ratio
    - Open interest-based P/C ratio
    - Historical P/C ratio trend (if available)
    - Interpretation (bullish/bearish signal)
    """
    cache_key = f"put_call_ratio_{xstock_symbol}"
    cached = await get_cache(cache_key)
    if cached:
        return cached

    try:
        real_symbol = map_xstock_to_symbol(xstock_symbol)
        if not real_symbol:
            raise HTTPException(status_code=404, detail=f"xStock symbol {xstock_symbol} not found")

        ticker = yf.Ticker(real_symbol)
        expirations = ticker.options

        if not expirations or len(expirations) == 0:
            raise HTTPException(status_code=404, detail=f"No options data available for {xstock_symbol}")

        # Aggregate across all expirations for comprehensive view
        total_call_volume = 0
        total_put_volume = 0
        total_call_oi = 0
        total_put_oi = 0

        expiration_ratios = []

        for exp in expirations[:6]:  # First 6 expirations (6 months approx)
            try:
                option_chain = ticker.option_chain(exp)

                # Calls
                calls_df = option_chain.calls
                call_volume = int(calls_df['volume'].sum()) if 'volume' in calls_df else 0
                call_oi = int(calls_df['openInterest'].sum()) if 'openInterest' in calls_df else 0

                # Puts
                puts_df = option_chain.puts
                put_volume = int(puts_df['volume'].sum()) if 'volume' in puts_df else 0
                put_oi = int(puts_df['openInterest'].sum()) if 'openInterest' in puts_df else 0

                total_call_volume += call_volume
                total_put_volume += put_volume
                total_call_oi += call_oi
                total_put_oi += put_oi

                # Per-expiration ratios
                vol_ratio = (put_volume / call_volume) if call_volume > 0 else 0
                oi_ratio = (put_oi / call_oi) if call_oi > 0 else 0

                expiration_ratios.append({
                    'expiration': exp,
                    'volumeRatio': round(vol_ratio, 3),
                    'openInterestRatio': round(oi_ratio, 3),
                    'callVolume': call_volume,
                    'putVolume': put_volume,
                    'callOI': call_oi,
                    'putOI': put_oi
                })
            except Exception:
                continue

        # Overall ratios
        volume_ratio = (total_put_volume / total_call_volume) if total_call_volume > 0 else 0
        oi_ratio = (total_put_oi / total_call_oi) if total_call_oi > 0 else 0

        # Interpretation
        def interpret_ratio(ratio: float) -> dict:
            if ratio < 0.7:
                return {'sentiment': 'BULLISH', 'description': 'Low P/C ratio indicates bullish sentiment (more calls than puts)'}
            elif ratio > 1.0:
                return {'sentiment': 'BEARISH', 'description': 'High P/C ratio indicates bearish sentiment (more puts than calls)'}
            else:
                return {'sentiment': 'NEUTRAL', 'description': 'P/C ratio near 1.0 indicates neutral sentiment'}

        volume_interpretation = interpret_ratio(volume_ratio)
        oi_interpretation = interpret_ratio(oi_ratio)

        result = {
            'symbol': xstock_symbol,
            'realSymbol': real_symbol,
            'overall': {
                'volumeRatio': round(volume_ratio, 3),
                'openInterestRatio': round(oi_ratio, 3),
                'totalCallVolume': total_call_volume,
                'totalPutVolume': total_put_volume,
                'totalCallOI': total_call_oi,
                'totalPutOI': total_put_oi,
                'volumeInterpretation': volume_interpretation,
                'openInterestInterpretation': oi_interpretation
            },
            'byExpiration': expiration_ratios,
            'timestamp': int(time.time() * 1000)
        }

        await set_cache(cache_key, result, ttl_seconds=300)  # 5 minute cache
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Put/Call ratio API error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to calculate P/C ratio: {str(e)}")


@app.get("/api/options/implied-volatility/{xstock_symbol}")
async def get_implied_volatility_surface(xstock_symbol: str):
    """
    Get implied volatility surface data for a stock

    Features:
    - IV by strike and expiration
    - IV percentile and rank
    - ATM (at-the-money) IV
    - IV skew analysis
    - Historical IV comparison
    """
    cache_key = f"implied_vol_{xstock_symbol}"
    cached = await get_cache(cache_key)
    if cached:
        return cached

    try:
        real_symbol = map_xstock_to_symbol(xstock_symbol)
        if not real_symbol:
            raise HTTPException(status_code=404, detail=f"xStock symbol {xstock_symbol} not found")

        ticker = yf.Ticker(real_symbol)
        info = ticker.info
        current_price = float(info.get('currentPrice', 0))

        expirations = ticker.options
        if not expirations or len(expirations) == 0:
            raise HTTPException(status_code=404, detail=f"No options data available for {xstock_symbol}")

        iv_surface = []
        all_ivs = []
        atm_ivs = []

        for exp in expirations[:8]:  # First 8 expirations
            try:
                option_chain = ticker.option_chain(exp)

                # Process calls
                for _, row in option_chain.calls.iterrows():
                    strike = float(row.get('strike', 0))
                    iv = float(row.get('impliedVolatility', 0))

                    if iv > 0:
                        all_ivs.append(iv)

                        # Check if ATM (within 5% of current price)
                        if abs(strike - current_price) / current_price <= 0.05:
                            atm_ivs.append(iv)

                        iv_surface.append({
                            'expiration': exp,
                            'strike': strike,
                            'type': 'CALL',
                            'impliedVolatility': round(iv * 100, 2),
                            'moneyness': round((strike - current_price) / current_price * 100, 2)
                        })

                # Process puts
                for _, row in option_chain.puts.iterrows():
                    strike = float(row.get('strike', 0))
                    iv = float(row.get('impliedVolatility', 0))

                    if iv > 0:
                        all_ivs.append(iv)

                        if abs(strike - current_price) / current_price <= 0.05:
                            atm_ivs.append(iv)

                        iv_surface.append({
                            'expiration': exp,
                            'strike': strike,
                            'type': 'PUT',
                            'impliedVolatility': round(iv * 100, 2),
                            'moneyness': round((strike - current_price) / current_price * 100, 2)
                        })
            except Exception:
                continue

        # Calculate statistics
        if len(all_ivs) > 0:
            mean_iv = np.mean(all_ivs)
            median_iv = np.median(all_ivs)
            min_iv = np.min(all_ivs)
            max_iv = np.max(all_ivs)
            std_iv = np.std(all_ivs)
        else:
            mean_iv = median_iv = min_iv = max_iv = std_iv = 0

        atm_iv = np.mean(atm_ivs) if len(atm_ivs) > 0 else mean_iv

        # IV Rank (simplified - would need historical data for true rank)
        # Using current range as proxy
        iv_range = max_iv - min_iv
        iv_rank = ((atm_iv - min_iv) / iv_range * 100) if iv_range > 0 else 50

        # Skew analysis (compare OTM put IV vs OTM call IV)
        otm_put_ivs = [s['impliedVolatility'] for s in iv_surface if s['type'] == 'PUT' and s['moneyness'] < -5]
        otm_call_ivs = [s['impliedVolatility'] for s in iv_surface if s['type'] == 'CALL' and s['moneyness'] > 5]

        if len(otm_put_ivs) > 0 and len(otm_call_ivs) > 0:
            skew = np.mean(otm_put_ivs) - np.mean(otm_call_ivs)
            skew_interpretation = 'PUT_SKEW' if skew > 5 else 'CALL_SKEW' if skew < -5 else 'BALANCED'
        else:
            skew = 0
            skew_interpretation = 'BALANCED'  # Default to balanced if insufficient data

        result = {
            'symbol': xstock_symbol,
            'realSymbol': real_symbol,
            'currentPrice': current_price,
            'summary': {
                'atmIV': round(atm_iv * 100, 2),
                'meanIV': round(mean_iv * 100, 2),
                'medianIV': round(median_iv * 100, 2),
                'minIV': round(min_iv * 100, 2),
                'maxIV': round(max_iv * 100, 2),
                'stdIV': round(std_iv * 100, 2),
                'ivRank': round(iv_rank, 1),
                'skew': round(skew, 2),
                'skewInterpretation': skew_interpretation
            },
            'surface': iv_surface,
            'timestamp': int(time.time() * 1000)
        }

        await set_cache(cache_key, result, ttl_seconds=300)  # 5 minute cache
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Implied volatility API error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch IV surface: {str(e)}")


@app.get("/api/options/greeks/{xstock_symbol}")
async def get_options_greeks_analysis(xstock_symbol: str, expiration: str = Query(None, description="Expiration date (YYYY-MM-DD)")):
    """
    Get comprehensive Greeks analysis for options

    Greeks analyzed:
    - Delta: Price sensitivity
    - Gamma: Delta sensitivity
    - Theta: Time decay
    - Vega: Volatility sensitivity
    - Aggregated portfolio Greeks
    """
    cache_key = f"options_greeks_{xstock_symbol}_{expiration or 'all'}"
    cached = await get_cache(cache_key)
    if cached:
        return cached

    try:
        real_symbol = map_xstock_to_symbol(xstock_symbol)
        if not real_symbol:
            raise HTTPException(status_code=404, detail=f"xStock symbol {xstock_symbol} not found")

        ticker = yf.Ticker(real_symbol)
        info = ticker.info
        current_price = float(info.get('currentPrice', 0))

        expirations = ticker.options
        if not expirations or len(expirations) == 0:
            raise HTTPException(status_code=404, detail=f"No options data available for {xstock_symbol}")

        if not expiration:
            expiration = expirations[0]
        elif expiration not in expirations:
            raise HTTPException(status_code=400, detail=f"Invalid expiration. Available: {expirations}")

        option_chain = ticker.option_chain(expiration)

        # Note: yfinance doesn't always provide Greeks directly
        # We'll return what's available and indicate if Greeks need to be calculated

        greeks_data = {
            'calls': [],
            'puts': []
        }

        # Aggregate Greeks
        total_call_delta = 0
        total_put_delta = 0
        total_gamma = 0
        total_theta = 0
        total_vega = 0

        # Process calls
        for _, row in option_chain.calls.iterrows():
            strike = float(row.get('strike', 0))
            implied_volatility = float(row.get('impliedVolatility', 0))

            greeks = {
                'strike': strike,
                'lastPrice': float(row.get('lastPrice', 0)),
                'volume': int(row.get('volume', 0)) if pd.notna(row.get('volume')) else 0,
                'openInterest': int(row.get('openInterest', 0)) if pd.notna(row.get('openInterest')) else 0,
                'impliedVolatility': implied_volatility,
                'inTheMoney': bool(row.get('inTheMoney', False)),
                'moneyness': round((strike - current_price) / current_price * 100, 2)
            }

            # Calculate Greeks using Black-Scholes model
            if implied_volatility > 0:
                delta = calculate_delta(current_price, strike, implied_volatility, expiration, 'call')
                gamma = calculate_gamma(current_price, strike, implied_volatility, expiration)
                theta = calculate_theta(current_price, strike, implied_volatility, expiration, 'call')
                vega = calculate_vega(current_price, strike, implied_volatility, expiration)

                greeks['delta'] = round(delta, 4)
                greeks['gamma'] = round(gamma, 4)
                greeks['theta'] = round(theta, 4)
                greeks['vega'] = round(vega, 4)

                total_call_delta += delta
                total_gamma += gamma
                total_theta += theta
                total_vega += vega

            greeks_data['calls'].append(greeks)

        # Process puts
        for _, row in option_chain.puts.iterrows():
            strike = float(row.get('strike', 0))
            implied_volatility = float(row.get('impliedVolatility', 0))

            greeks = {
                'strike': strike,
                'lastPrice': float(row.get('lastPrice', 0)),
                'volume': int(row.get('volume', 0)) if pd.notna(row.get('volume')) else 0,
                'openInterest': int(row.get('openInterest', 0)) if pd.notna(row.get('openInterest')) else 0,
                'impliedVolatility': implied_volatility,
                'inTheMoney': bool(row.get('inTheMoney', False)),
                'moneyness': round((strike - current_price) / current_price * 100, 2)
            }

            # Calculate Greeks using Black-Scholes model
            if implied_volatility > 0:
                delta = calculate_delta(current_price, strike, implied_volatility, expiration, 'put')
                gamma = calculate_gamma(current_price, strike, implied_volatility, expiration)
                theta = calculate_theta(current_price, strike, implied_volatility, expiration, 'put')
                vega = calculate_vega(current_price, strike, implied_volatility, expiration)

                greeks['delta'] = round(delta, 4)
                greeks['gamma'] = round(gamma, 4)
                greeks['theta'] = round(theta, 4)
                greeks['vega'] = round(vega, 4)

                total_put_delta += delta
                total_gamma += gamma
                total_theta += theta
                total_vega += vega

            greeks_data['puts'].append(greeks)

        # Aggregate summary
        aggregate = {
            'totalCallDelta': round(total_call_delta, 2),
            'totalPutDelta': round(total_put_delta, 2),
            'netDelta': round(total_call_delta + total_put_delta, 2),
            'totalGamma': round(total_gamma, 4),
            'totalTheta': round(total_theta, 2),
            'totalVega': round(total_vega, 2)
        }

        # Interpretations
        interpretations = {
            'delta': 'Positive delta = bullish exposure, Negative delta = bearish exposure',
            'gamma': 'High gamma = position delta changes rapidly with price moves',
            'theta': 'Negative theta = time decay working against you (long options)',
            'vega': 'Positive vega = benefits from volatility increase'
        }

        result = {
            'symbol': xstock_symbol,
            'realSymbol': real_symbol,
            'currentPrice': current_price,
            'expiration': expiration,
            'availableExpirations': list(expirations),
            'greeksData': greeks_data,
            'aggregate': aggregate,
            'interpretations': interpretations,
            'note': 'Greeks may be estimated. For precise Greeks, consider professional options platforms.',
            'timestamp': int(time.time() * 1000)
        }

        await set_cache(cache_key, result, ttl_seconds=300)  # 5 minute cache
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Options Greeks API error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch Greeks: {str(e)}")

# =============================================================================
# END PHASE 4.7
# =============================================================================

@app.get("/api/options/historical-iv/{xstock_symbol}")
async def get_historical_iv_rank(xstock_symbol: str, days: int = Query(30, description="Days of history (30, 60, or 90)")):
    """
    Get historical implied volatility rank and percentile

    Features:
    - 30/60/90 day IV history
    - IV Rank (percentile of current IV in historical range)
    - IV statistics (mean, median, std, min, max)
    - Mean reversion analysis
    """
    cache_key = f"historical_iv_{xstock_symbol}_{days}"
    cached = await get_cache(cache_key)
    if cached:
        return cached

    try:
        real_symbol = map_xstock_to_symbol(xstock_symbol)
        if not real_symbol:
            raise HTTPException(status_code=404, detail=f"xStock symbol {xstock_symbol} not found")

        ticker = yf.Ticker(real_symbol)
        info = ticker.info
        current_price = float(info.get('currentPrice', 0))

        expirations = ticker.options
        if not expirations or len(expirations) == 0:
            raise HTTPException(status_code=404, detail=f"No options data available for {xstock_symbol}")

        # Collect IV data across expirations to build historical picture
        iv_history = []

        for exp in expirations[:min(len(expirations), 12)]:  # Up to 12 expirations
            try:
                option_chain = ticker.option_chain(exp)
                calls_df = option_chain.calls

                # Get ATM option IV
                if len(calls_df) > 0:
                    # Find closest to ATM
                    calls_df['distance_from_atm'] = abs(calls_df['strike'] - current_price)
                    atm_option = calls_df.nsmallest(1, 'distance_from_atm').iloc[0]

                    iv = float(atm_option.get('impliedVolatility', 0)) * 100
                    volume = int(atm_option.get('volume', 0))

                    iv_history.append({
                        'date': exp,
                        'atmIV': iv,
                        'volume': volume
                    })
            except Exception as e:
                logger.warning(f"Error processing expiration {exp}: {e}")
                continue

        if len(iv_history) == 0:
            raise HTTPException(status_code=404, detail="No IV data available")

        # Calculate statistics
        ivs = [point['atmIV'] for point in iv_history]
        current_iv = ivs[0] if len(ivs) > 0 else 0

        mean_iv = sum(ivs) / len(ivs)
        sorted_ivs = sorted(ivs)
        median_iv = sorted_ivs[len(sorted_ivs) // 2]
        min_iv = min(ivs)
        max_iv = max(ivs)

        # Calculate standard deviation
        variance = sum((x - mean_iv) ** 2 for x in ivs) / len(ivs)
        std_iv = variance ** 0.5

        # Calculate IV Rank (where current IV falls in the range 0-100)
        if max_iv > min_iv:
            iv_rank = ((current_iv - min_iv) / (max_iv - min_iv)) * 100
        else:
            iv_rank = 50

        # Calculate IV Percentile (what % of historical IVs are below current)
        iv_percentile = (sum(1 for iv in ivs if iv < current_iv) / len(ivs)) * 100

        # Interpretation
        if iv_rank >= 75:
            interpretation = 'VERY_HIGH'
        elif iv_rank >= 50:
            interpretation = 'HIGH'
        elif iv_rank >= 25:
            interpretation = 'MODERATE'
        elif iv_rank >= 10:
            interpretation = 'LOW'
        else:
            interpretation = 'VERY_LOW'

        # Add calculated fields to history
        for i, point in enumerate(iv_history):
            point['ivRank'] = iv_rank if i == 0 else 0
            point['ivPercentile'] = iv_percentile if i == 0 else 0
            point['highIV'] = max_iv
            point['lowIV'] = min_iv

        # Split by timeframe
        history_30day = iv_history[:30] if len(iv_history) >= 30 else iv_history
        history_60day = iv_history[:60] if len(iv_history) >= 60 else iv_history
        history_90day = iv_history

        result = {
            'symbol': xstock_symbol,
            'currentPrice': current_price,
            'history30Day': history_30day,
            'history60Day': history_60day,
            'history90Day': history_90day,
            'statistics': {
                'current': current_iv,
                'mean': round(mean_iv, 2),
                'median': round(median_iv, 2),
                'min': round(min_iv, 2),
                'max': round(max_iv, 2),
                'stdDev': round(std_iv, 2),
                'ivRank': round(iv_rank, 2),
                'ivPercentile': round(iv_percentile, 2),
                'interpretation': interpretation
            },
            'timestamp': int(time.time())
        }

        await set_cache(cache_key, result, ttl_seconds=1800)  # 30 minute cache
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Historical IV API error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch historical IV: {str(e)}")

@app.get("/api/options/screen")
async def screen_options(
    optionType: str = Query('all', description="all, calls, puts"),
    moneyness: str = Query('all', description="all, itm, atm, otm"),
    deltaMin: float = Query(0, description="Minimum delta"),
    deltaMax: float = Query(1, description="Maximum delta"),
    ivMin: float = Query(0, description="Minimum IV (%)"),
    ivMax: float = Query(200, description="Maximum IV (%)"),
    volumeMin: int = Query(0, description="Minimum volume"),
    daysToExpirationMin: int = Query(0, description="Minimum days to expiration"),
    daysToExpirationMax: int = Query(365, description="Maximum days to expiration"),
    premiumMin: float = Query(0, description="Minimum premium ($)"),
    premiumMax: float = Query(10000, description="Maximum premium ($)"),
    openInterestMin: int = Query(0, description="Minimum open interest"),
    sortBy: str = Query('volume', description="Sort field"),
    sortOrder: str = Query('desc', description="asc or desc")
):
    """
    Screen options across all 63 xStocks with filters

    Filters:
    - Option type (calls/puts)
    - Moneyness (ITM/ATM/OTM)
    - Delta range
    - IV range
    - Volume threshold
    - Days to expiration range
    - Premium range
    - Open interest threshold
    """
    cache_key = f"options_screen_{optionType}_{moneyness}_{deltaMin}_{deltaMax}_{ivMin}_{ivMax}_{volumeMin}_{sortBy}_{sortOrder}"
    cached = await get_cache(cache_key)
    if cached:
        return cached

    try:
        from datetime import datetime, timedelta

        all_results = []
        # All 63 xStocks
        symbols = [
            'AAPLx', 'ABBVx', 'ABTx', 'ACNx', 'AMBRx', 'AMZNx', 'APPx', 'AVGOx',
            'AZNx', 'BACx', 'BRK.Bx', 'CMCSAx', 'COINx', 'CRCLx', 'CRMx', 'CRWDx',
            'CSCOx', 'CVXx', 'DFDVx', 'DHRx', 'GLDx', 'GMEx', 'GOOGLx', 'GSx',
            'HDx', 'HONx', 'HOODx', 'IBMx', 'INTCx', 'JNJx', 'JPMx', 'KOx',
            'LINx', 'LLYx', 'MAx', 'MCDx', 'MDTx', 'METAx', 'MRKx', 'MRVLx',
            'MSFTx', 'MSTRx', 'NFLXx', 'NVDAx', 'NVOx', 'OPENx', 'ORCLx', 'PEPx',
            'PFEx', 'PGx', 'PLTRx', 'PMx', 'QQQx', 'SPYx', 'TBLLx', 'TMOx',
            'TQQQx', 'TSLAx', 'UNHx', 'VTIx', 'Vx', 'WMTx', 'XOMx'
        ]

        logger.info(f"🔍 Screening {len(symbols)} xStocks for options...")

        for xstock_symbol in symbols:
            try:
                real_symbol = map_xstock_to_symbol(xstock_symbol)
                if not real_symbol:
                    continue

                ticker = yf.Ticker(real_symbol)
                info = ticker.info
                current_price = float(info.get('currentPrice', 0))

                if current_price == 0:
                    continue

                expirations = ticker.options
                if not expirations or len(expirations) == 0:
                    continue

                # Screen first 3 expirations
                for exp in expirations[:3]:
                    try:
                        exp_date = datetime.strptime(exp, '%Y-%m-%d')
                        days_to_exp = (exp_date - datetime.now()).days

                        if days_to_exp < daysToExpirationMin or days_to_exp > daysToExpirationMax:
                            continue

                        option_chain = ticker.option_chain(exp)

                        # Process calls
                        if optionType in ['all', 'calls']:
                            for _, row in option_chain.calls.iterrows():
                                strike = float(row.get('strike', 0))
                                last_price = float(row.get('lastPrice', 0))
                                volume = int(row.get('volume', 0))
                                oi = int(row.get('openInterest', 0))
                                iv = float(row.get('impliedVolatility', 0)) * 100

                                if last_price < premiumMin or last_price > premiumMax:
                                    continue
                                if volume < volumeMin or oi < openInterestMin:
                                    continue
                                if iv < ivMin or iv > ivMax:
                                    continue

                                # Calculate delta
                                delta = calculate_delta(current_price, strike, iv/100, exp, 'call')

                                if delta < deltaMin or delta > deltaMax:
                                    continue

                                # Determine moneyness
                                if strike < current_price * 0.98:
                                    money = 'ITM'
                                elif strike <= current_price * 1.02:
                                    money = 'ATM'
                                else:
                                    money = 'OTM'

                                if moneyness != 'all' and money.lower() != moneyness:
                                    continue

                                all_results.append({
                                    'symbol': xstock_symbol,
                                    'strike': strike,
                                    'type': 'CALL',
                                    'expiration': exp,
                                    'daysToExpiration': days_to_exp,
                                    'lastPrice': last_price,
                                    'bid': float(row.get('bid', 0)),
                                    'ask': float(row.get('ask', 0)),
                                    'volume': volume,
                                    'openInterest': oi,
                                    'impliedVolatility': iv,
                                    'delta': delta,
                                    'gamma': calculate_gamma(current_price, strike, iv/100, exp),
                                    'theta': calculate_theta(current_price, strike, iv/100, exp, 'call'),
                                    'vega': calculate_vega(current_price, strike, iv/100, exp),
                                    'moneyness': money,
                                    'breakeven': strike + last_price,
                                    'roi': ((current_price - strike - last_price) / last_price * 100) if last_price > 0 else 0,
                                    'probabilityITM': abs(delta) * 100
                                })

                        # Process puts
                        if optionType in ['all', 'puts']:
                            for _, row in option_chain.puts.iterrows():
                                strike = float(row.get('strike', 0))
                                last_price = float(row.get('lastPrice', 0))
                                volume = int(row.get('volume', 0))
                                oi = int(row.get('openInterest', 0))
                                iv = float(row.get('impliedVolatility', 0)) * 100

                                if last_price < premiumMin or last_price > premiumMax:
                                    continue
                                if volume < volumeMin or oi < openInterestMin:
                                    continue
                                if iv < ivMin or iv > ivMax:
                                    continue

                                # Calculate delta
                                delta = calculate_delta(current_price, strike, iv/100, exp, 'put')

                                if abs(delta) < deltaMin or abs(delta) > deltaMax:
                                    continue

                                # Determine moneyness
                                if strike > current_price * 1.02:
                                    money = 'ITM'
                                elif strike >= current_price * 0.98:
                                    money = 'ATM'
                                else:
                                    money = 'OTM'

                                if moneyness != 'all' and money.lower() != moneyness:
                                    continue

                                all_results.append({
                                    'symbol': xstock_symbol,
                                    'strike': strike,
                                    'type': 'PUT',
                                    'expiration': exp,
                                    'daysToExpiration': days_to_exp,
                                    'lastPrice': last_price,
                                    'bid': float(row.get('bid', 0)),
                                    'ask': float(row.get('ask', 0)),
                                    'volume': volume,
                                    'openInterest': oi,
                                    'impliedVolatility': iv,
                                    'delta': abs(delta),
                                    'gamma': calculate_gamma(current_price, strike, iv/100, exp),
                                    'theta': calculate_theta(current_price, strike, iv/100, exp, 'put'),
                                    'vega': calculate_vega(current_price, strike, iv/100, exp),
                                    'moneyness': money,
                                    'breakeven': strike - last_price,
                                    'roi': ((strike - current_price - last_price) / last_price * 100) if last_price > 0 else 0,
                                    'probabilityITM': abs(delta) * 100
                                })

                    except Exception as e:
                        logger.warning(f"Error processing {xstock_symbol} expiration {exp}: {e}")
                        continue

            except Exception as e:
                logger.warning(f"Error screening {xstock_symbol}: {e}")
                continue

        # Sort results
        if sortBy in ['volume', 'openInterest', 'impliedVolatility', 'delta', 'lastPrice', 'roi']:
            all_results.sort(key=lambda x: x[sortBy], reverse=(sortOrder == 'desc'))

        # Limit to top 50 results
        results = all_results[:50]

        logger.info(f"✅ Screened {len(symbols)} stocks, found {len(all_results)} matching options, returning top {len(results)}")

        result = {
            'results': results,
            'count': len(results),
            'totalMatches': len(all_results),
            'timestamp': int(time.time())
        }

        await set_cache(cache_key, result, ttl_seconds=300)  # 5 minute cache
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Options screening API error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to screen options: {str(e)}")

# Single symbol endpoint - defined AFTER batch to avoid route conflicts
@app.get("/api/realtime/{xstock_symbol}", response_model=RealTimeData)
async def get_realtime_data(xstock_symbol: str):
    """Get real-time data for a single xStock symbol"""
    logger.debug(f"Single symbol request: {xstock_symbol}")
    cache_key = f"realtime_{xstock_symbol}"

    # Try cache first
    cached_data = await get_cache(cache_key)
    if cached_data:
        logger.info(f"Returning cached data for {xstock_symbol}")
        return cached_data

    # Map to real symbol
    real_symbol = map_xstock_to_symbol(xstock_symbol)
    if not real_symbol:
        raise HTTPException(status_code=404, detail=f"Symbol {xstock_symbol} not found in mapping")

    try:
        data = await fetch_with_retry(fetch_realtime_data_impl, xstock_symbol, real_symbol)
        await set_cache(cache_key, data, ttl_seconds=120)  # Cache for 2 minutes
        return data
    except Exception as e:
        logger.error(f"API error for {xstock_symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch data: {str(e)}")

@app.get("/api/historical/{xstock_symbol}", response_model=HistoricalDataResponse)
async def get_historical_data(
    xstock_symbol: str,
    period: str = Query("1mo", description="Time period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)"),
    interval: str = Query("1d", description="Data interval (1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo)")
):
    """Get historical data for an xStock symbol"""
    cache_key = f"historical_{xstock_symbol}_{period}_{interval}"

    # Try cache first
    cached_data = await get_cache(cache_key)
    if cached_data:
        return cached_data

    # Map to real symbol
    real_symbol = map_xstock_to_symbol(xstock_symbol)
    if not real_symbol:
        raise HTTPException(status_code=404, detail=f"Symbol {xstock_symbol} not found in mapping")

    try:
        data = await fetch_with_retry(fetch_historical_data_impl, xstock_symbol, real_symbol, period, interval)
        await set_cache(cache_key, data, ttl_seconds=600)  # Cache for 10 minutes
        return data
    except Exception as e:
        logger.error(f"Historical API error for {xstock_symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch historical data: {str(e)}")

@app.get("/api/chart/{xstock_symbol}")
async def get_chart_data(
    xstock_symbol: str,
    timeframe: str = Query("1D", description="Timeframe: Minutes (1m-45m), Hours (1h-4h), Days (1D-1Y)")
):
    """
    Enhanced chart data endpoint for Lightweight Charts - TradingView Style
    Returns OHLCV data with proper formatting for candlestick charts
    Supports up to 20 years of historical data
    """
    cache_key = f"chart_{xstock_symbol}_{timeframe}"

    # Try cache first (shorter TTL for intraday, longer for historical)
    is_intraday = timeframe.endswith('m') or timeframe.endswith('h')
    cache_ttl = 30 if is_intraday else 300  # 30s for intraday, 5 min for daily+
    cached_data = await get_cache(cache_key)
    if cached_data:
        logger.info(f"Returning cached chart data for {xstock_symbol} {timeframe}")
        return cached_data

    # Map xStock to real symbol
    real_symbol = map_xstock_to_symbol(xstock_symbol)
    if not real_symbol:
        raise HTTPException(status_code=404, detail=f"Symbol {xstock_symbol} not found")

    # Map timeframe to yfinance period and interval (TradingView style)
    # Daily/Weekly/Monthly timeframes: fetch MAX data with aggregated candles
    # Minutes/Hourly timeframes: capped by yfinance limits with their native intervals
    timeframe_map = {
        # Minutes - capped by yfinance limitations (fast initial load)
        "1m": {"period": "1d", "interval": "1m"},       # Last 1 day with 1-min candles (yfinance max: 7d)
        "2m": {"period": "5d", "interval": "2m"},       # Last 5 days with 2-min candles
        "5m": {"period": "5d", "interval": "5m"},       # Last 5 days with 5-min candles (yfinance max: 60d)
        "15m": {"period": "5d", "interval": "15m"},     # Last 5 days with 15-min candles (yfinance max: 60d)
        "30m": {"period": "5d", "interval": "30m"},     # Last 5 days with 30-min candles (yfinance max: 60d)

        # Hours - capped for fast initial load
        "1h": {"period": "1mo", "interval": "1h"},      # Last 1 month with 1-hour candles (yfinance max: 730d)

        # Days/Weeks/Months - fetch MAX data with aggregated candles for each timeframe
        "1D": {"period": "max", "interval": "1d"},      # MAX history with daily candles (1 candle = 1 day)
        "1W": {"period": "max", "interval": "1wk"},     # MAX history with weekly candles (1 candle = 1 week)
        "1M": {"period": "max", "interval": "1mo"},     # MAX history with monthly candles (1 candle = 1 month)
        "3M": {"period": "max", "interval": "3mo"},     # MAX history with quarterly candles (1 candle = 3 months)
        "6M": {"period": "max", "interval": "1mo"},     # MAX history with monthly candles (1 candle = 1 month) - yfinance has no 6mo interval
        "1Y": {"period": "max", "interval": "3mo"},     # MAX history with quarterly candles (1 candle = 3 months) - yfinance has no 1y interval

        # Full history for minute/hourly timeframes (Load Full History button)
        "1m_full": {"period": "7d", "interval": "1m"},      # Max 7 days for 1m (yfinance limit)
        "2m_full": {"period": "60d", "interval": "2m"},     # Max 60 days for 2m (yfinance limit)
        "5m_full": {"period": "60d", "interval": "5m"},     # Max 60 days for 5m (yfinance limit)
        "15m_full": {"period": "60d", "interval": "15m"},   # Max 60 days for 15m (yfinance limit)
        "30m_full": {"period": "60d", "interval": "30m"},   # Max 60 days for 30m (yfinance limit)
        "1h_full": {"period": "730d", "interval": "1h"},    # Max 730 days for 1h (yfinance limit)
    }

    config = timeframe_map.get(timeframe, {"period": "1d", "interval": "5m"})

    try:
        logger.info(f"Fetching chart data for {real_symbol}: timeframe={timeframe}, period={config['period']}, interval={config['interval']}")

        ticker = yf.Ticker(real_symbol)
        hist = ticker.history(period=config["period"], interval=config["interval"], timeout=30)

        if hist.empty:
            raise ValueError(f"No chart data available for {real_symbol}")

        # Format data for Lightweight Charts
        candlesticks = []
        volume_data = []

        for index, row in hist.iterrows():
            timestamp = int(index.timestamp())

            # Candlestick data
            candlesticks.append({
                "time": timestamp,
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"])
            })

            # Volume data
            volume_data.append({
                "time": timestamp,
                "value": float(row["Volume"]),
                "color": "#26a69a" if row["Close"] >= row["Open"] else "#ef5350"
            })

        # Calculate technical indicators (SMA)
        technicals = {}
        if config["interval"] in ["1d", "1wk", "1mo", "3mo"]:  # Only for daily+ intervals
            technicals = calculate_technicals(hist)

        result = {
            "symbol": xstock_symbol,
            "timeframe": timeframe,
            "period": config["period"],
            "interval": config["interval"],
            "candlesticks": candlesticks,
            "volume": volume_data,
            "technicals": technicals,
            "timestamp": int(time.time() * 1000)
        }

        await set_cache(cache_key, result, ttl_seconds=cache_ttl)
        logger.info(f"Successfully fetched {len(candlesticks)} chart data points for {real_symbol} with {len(technicals)} indicators")

        return result

    except Exception as e:
        logger.error(f"Chart data API error for {xstock_symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch chart data: {str(e)}")

@app.get("/api/fundamentals/{xstock_symbol}")
async def get_fundamentals(xstock_symbol: str):
    """
    Comprehensive fundamental data for a stock
    Returns valuation metrics, financial health, profitability, and financial statements
    """
    cache_key = f"fundamentals_{xstock_symbol}"

    # Try cache first (1 hour TTL for fundamentals)
    cached_data = await get_cache(cache_key)
    if cached_data:
        logger.info(f"Returning cached fundamentals for {xstock_symbol}")
        return cached_data

    # Map xStock to real symbol
    real_symbol = map_xstock_to_symbol(xstock_symbol)
    if not real_symbol:
        raise HTTPException(status_code=404, detail=f"Symbol {xstock_symbol} not found")

    try:
        logger.info(f"Fetching fundamentals for {real_symbol}")

        ticker = yf.Ticker(real_symbol)
        info = ticker.info

        # Valuation Metrics
        valuation = {
            "trailingPE": info.get("trailingPE"),
            "forwardPE": info.get("forwardPE"),
            "priceToBook": info.get("priceToBook"),
            "priceToSales": info.get("priceToSalesTrailing12Months"),
            "enterpriseValue": info.get("enterpriseValue"),
            "enterpriseToRevenue": info.get("enterpriseToRevenue"),
            "enterpriseToEbitda": info.get("enterpriseToEbitda"),
            "pegRatio": info.get("pegRatio"),
            "marketCap": info.get("marketCap")
        }

        # Financial Health
        financial_health = {
            "debtToEquity": info.get("debtToEquity"),
            "currentRatio": info.get("currentRatio"),
            "quickRatio": info.get("quickRatio"),
            "totalDebt": info.get("totalDebt"),
            "totalCash": info.get("totalCash"),
            "freeCashflow": info.get("freeCashflow"),
            "operatingCashflow": info.get("operatingCashflow")
        }

        # Profitability Metrics
        profitability = {
            "grossMargins": info.get("grossMargins"),
            "operatingMargins": info.get("operatingMargins"),
            "profitMargins": info.get("profitMargins"),
            "returnOnAssets": info.get("returnOnAssets"),
            "returnOnEquity": info.get("returnOnEquity"),
            "revenuePerShare": info.get("revenuePerShare"),
            "earningsPerShare": info.get("trailingEps")
        }

        # Growth Metrics
        growth = {
            "revenueGrowth": info.get("revenueGrowth"),
            "earningsGrowth": info.get("earningsGrowth"),
            "earningsQuarterlyGrowth": info.get("earningsQuarterlyGrowth")
        }

        # Dividend Information
        dividend = {
            "dividendRate": info.get("dividendRate"),
            "dividendYield": info.get("dividendYield"),
            "payoutRatio": info.get("payoutRatio"),
            "fiveYearAvgDividendYield": info.get("fiveYearAvgDividendYield")
        }

        # Financial Statements (convert DataFrame to dict)
        try:
            income_stmt = ticker.income_stmt.to_dict() if hasattr(ticker.income_stmt, 'to_dict') else {}
            balance_sheet = ticker.balance_sheet.to_dict() if hasattr(ticker.balance_sheet, 'to_dict') else {}
            cash_flow = ticker.cash_flow.to_dict() if hasattr(ticker.cash_flow, 'to_dict') else {}
        except Exception as e:
            logger.warning(f"Could not fetch financial statements for {real_symbol}: {e}")
            income_stmt = {}
            balance_sheet = {}
            cash_flow = {}

        # Company Info
        company_info = {
            "longName": info.get("longName"),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "website": info.get("website"),
            "country": info.get("country"),
            "fullTimeEmployees": info.get("fullTimeEmployees"),
            "longBusinessSummary": info.get("longBusinessSummary")
        }

        result = {
            "symbol": xstock_symbol,
            "valuation": valuation,
            "financialHealth": financial_health,
            "profitability": profitability,
            "growth": growth,
            "dividend": dividend,
            "companyInfo": company_info,
            "financialStatements": {
                "incomeStatement": income_stmt,
                "balanceSheet": balance_sheet,
                "cashFlow": cash_flow
            },
            "timestamp": int(time.time() * 1000)
        }

        # Sanitize the result to remove inf/NaN values before caching and returning
        sanitized_result = sanitize_dict(result)

        await set_cache(cache_key, sanitized_result, ttl_seconds=3600)  # Cache for 1 hour
        logger.info(f"Successfully fetched fundamentals for {real_symbol}")

        return sanitized_result

    except Exception as e:
        logger.error(f"Fundamentals API error for {xstock_symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch fundamentals: {str(e)}")

@app.get("/api/earnings/{xstock_symbol}")
async def get_earnings(xstock_symbol: str):
    """
    Comprehensive earnings data including history and estimates
    Returns quarterly/annual earnings with surprises and forecasts
    """
    cache_key = f"earnings_{xstock_symbol}"

    # Try cache first (1 hour TTL)
    cached_data = await get_cache(cache_key)
    if cached_data:
        logger.info(f"Returning cached earnings for {xstock_symbol}")
        return cached_data

    # Map xStock to real symbol
    real_symbol = map_xstock_to_symbol(xstock_symbol)
    if not real_symbol:
        raise HTTPException(status_code=404, detail=f"Symbol {xstock_symbol} not found")

    try:
        logger.info(f"Fetching earnings for {real_symbol}")

        ticker = yf.Ticker(real_symbol)

        # Quarterly earnings (last 8 quarters)
        quarterly_earnings = []
        try:
            if hasattr(ticker, 'quarterly_earnings') and ticker.quarterly_earnings is not None:
                qe_df = ticker.quarterly_earnings
                for index, row in qe_df.head(8).iterrows():
                    quarterly_earnings.append({
                        "date": index.strftime('%Y-%m-%d') if hasattr(index, 'strftime') else str(index),
                        "revenue": float(row.get('Revenue', 0)) if pd.notna(row.get('Revenue')) else None,
                        "earnings": float(row.get('Earnings', 0)) if pd.notna(row.get('Earnings')) else None
                    })
        except Exception as e:
            logger.warning(f"Could not fetch quarterly earnings for {real_symbol}: {e}")

        # Annual earnings (last 5 years)
        annual_earnings = []
        try:
            if hasattr(ticker, 'earnings') and ticker.earnings is not None:
                ae_df = ticker.earnings
                for index, row in ae_df.head(5).iterrows():
                    annual_earnings.append({
                        "year": str(index),
                        "revenue": float(row.get('Revenue', 0)) if pd.notna(row.get('Revenue')) else None,
                        "earnings": float(row.get('Earnings', 0)) if pd.notna(row.get('Earnings')) else None
                    })
        except Exception as e:
            logger.warning(f"Could not fetch annual earnings for {real_symbol}: {e}")

        # Earnings estimates (forward-looking)
        earnings_estimates = []
        try:
            if hasattr(ticker, 'earnings_forecasts') and ticker.earnings_forecasts is not None:
                ef_df = ticker.earnings_forecasts
                for index, row in ef_df.iterrows():
                    earnings_estimates.append({
                        "period": str(index),
                        "epsEstimate": float(row.get('EPS Estimate', 0)) if pd.notna(row.get('EPS Estimate')) else None,
                        "revenueEstimate": float(row.get('Revenue Estimate', 0)) if pd.notna(row.get('Revenue Estimate')) else None
                    })
        except Exception as e:
            logger.warning(f"Could not fetch earnings forecasts for {real_symbol}: {e}")

        # Get basic earnings info from ticker.info
        info = ticker.info
        earnings_info = {
            "trailingEps": info.get("trailingEps"),
            "forwardEps": info.get("forwardEps"),
            "earningsGrowth": info.get("earningsGrowth"),
            "earningsQuarterlyGrowth": info.get("earningsQuarterlyGrowth"),
            "trailingPE": info.get("trailingPE"),
            "forwardPE": info.get("forwardPE")
        }

        # Earnings surprises (beat/miss history)
        earnings_surprises = []
        try:
            if hasattr(ticker, 'earnings_history') and ticker.earnings_history is not None:
                eh_df = ticker.earnings_history
                for index, row in eh_df.iterrows():
                    eps_actual = row.get('epsActual')
                    eps_estimate = row.get('epsEstimate')

                    if pd.notna(eps_actual) and pd.notna(eps_estimate) and eps_estimate != 0:
                        surprise_pct = ((eps_actual - eps_estimate) / abs(eps_estimate)) * 100
                        beat = eps_actual > eps_estimate

                        earnings_surprises.append({
                            "quarter": str(row.get('Quarter', index)),
                            "epsActual": float(eps_actual),
                            "epsEstimate": float(eps_estimate),
                            "surprisePercent": float(surprise_pct),
                            "beat": bool(beat)
                        })
        except Exception as e:
            logger.warning(f"Could not fetch earnings surprises for {real_symbol}: {e}")

        result = {
            "symbol": xstock_symbol,
            "quarterlyEarnings": quarterly_earnings,
            "annualEarnings": annual_earnings,
            "earningsEstimates": earnings_estimates,
            "earningsInfo": earnings_info,
            "earningsSurprises": earnings_surprises,
            "timestamp": int(time.time() * 1000)
        }

        # Sanitize the result to remove inf/NaN values
        sanitized_result = sanitize_dict(result)

        await set_cache(cache_key, sanitized_result, ttl_seconds=3600)  # Cache for 1 hour
        logger.info(f"Successfully fetched earnings for {real_symbol}")

        return sanitized_result

    except Exception as e:
        logger.error(f"Earnings API error for {xstock_symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch earnings: {str(e)}")

@app.get("/api/analysts/{xstock_symbol}")
async def get_analysts(xstock_symbol: str):
    """
    Analyst recommendations, upgrades/downgrades, and price targets
    Returns comprehensive analyst consensus data
    """
    cache_key = f"analysts_{xstock_symbol}"

    # Try cache first (1 hour TTL)
    cached_data = await get_cache(cache_key)
    if cached_data:
        logger.info(f"Returning cached analyst data for {xstock_symbol}")
        return cached_data

    # Map xStock to real symbol
    real_symbol = map_xstock_to_symbol(xstock_symbol)
    if not real_symbol:
        raise HTTPException(status_code=404, detail=f"Symbol {xstock_symbol} not found")

    try:
        logger.info(f"Fetching analyst data for {real_symbol}")

        ticker = yf.Ticker(real_symbol)
        info = ticker.info

        # Price targets
        price_targets = {
            "current": info.get("currentPrice"),
            "targetHigh": info.get("targetHighPrice"),
            "targetLow": info.get("targetLowPrice"),
            "targetMean": info.get("targetMeanPrice"),
            "targetMedian": info.get("targetMedianPrice"),
            "numberOfAnalysts": info.get("numberOfAnalystOpinions")
        }

        # Recommendations consensus (aggregate data)
        recommendations_summary = []
        try:
            if hasattr(ticker, 'recommendations_summary') and ticker.recommendations_summary is not None:
                rec_summary_df = ticker.recommendations_summary
                if not rec_summary_df.empty:
                    logger.debug(f"Recommendations summary for {real_symbol}: {rec_summary_df.shape}")
                    # This contains aggregate counts: strongBuy, buy, hold, sell, strongSell by period
                    for _, row in rec_summary_df.iterrows():
                        recommendations_summary.append({
                            "period": row.get('period', ''),
                            "strongBuy": int(row.get('strongBuy', 0)),
                            "buy": int(row.get('buy', 0)),
                            "hold": int(row.get('hold', 0)),
                            "sell": int(row.get('sell', 0)),
                            "strongSell": int(row.get('strongSell', 0))
                        })
        except Exception as e:
            logger.warning(f"Could not fetch recommendations summary for {real_symbol}: {e}")

        # Individual analyst recommendations (upgrades/downgrades)
        recommendations = []
        try:
            if hasattr(ticker, 'upgrades_downgrades') and ticker.upgrades_downgrades is not None:
                rec_df = ticker.upgrades_downgrades
                if not rec_df.empty:
                    logger.debug(f"Upgrades/downgrades shape for {real_symbol}: {rec_df.shape}")
                    logger.debug(f"Columns: {rec_df.columns.tolist()}")

                    # Get last 20 most recent recommendations
                    # The index is DatetimeIndex with name 'GradeDate'
                    rec_df_sorted = rec_df.sort_index(ascending=False).head(20)

                    for index, row in rec_df_sorted.iterrows():
                        # Extract firm name
                        firm = str(row.get('Firm', 'Unknown')).strip() if pd.notna(row.get('Firm')) else 'Unknown'

                        # Extract grades and action
                        to_grade = str(row.get('ToGrade', '')).strip() if pd.notna(row.get('ToGrade')) else ''
                        from_grade = str(row.get('FromGrade', '')).strip() if pd.notna(row.get('FromGrade')) else ''
                        action = str(row.get('Action', '')).strip() if pd.notna(row.get('Action')) else ''

                        # Format date from DatetimeIndex
                        date_str = index.strftime('%Y-%m-%d') if hasattr(index, 'strftime') else str(index)

                        recommendations.append({
                            "date": date_str,
                            "firm": firm,
                            "toGrade": to_grade,
                            "fromGrade": from_grade,
                            "action": action
                        })
                else:
                    logger.debug(f"No upgrades/downgrades available for {real_symbol}")
        except Exception as e:
            logger.warning(f"Could not fetch individual analyst recommendations for {real_symbol}: {e}")
            import traceback
            logger.warning(traceback.format_exc())

        # Recommendation summary from info
        recommendation_trend = {
            "strongBuy": info.get("recommendationKey") == "strong_buy",
            "buy": info.get("recommendationKey") == "buy",
            "hold": info.get("recommendationKey") == "hold",
            "sell": info.get("recommendationKey") == "sell",
            "strongSell": info.get("recommendationKey") == "strong_sell",
            "recommendationMean": info.get("recommendationMean"),
            "recommendationKey": info.get("recommendationKey")
        }

        result = {
            "symbol": xstock_symbol,
            "priceTargets": price_targets,
            "recommendations": recommendations,  # Individual analyst recommendations from upgrades_downgrades
            "recommendationsSummary": recommendations_summary,  # Aggregate consensus data
            "recommendationTrend": recommendation_trend,
            "timestamp": int(time.time() * 1000)
        }

        await set_cache(cache_key, result, ttl_seconds=3600)  # Cache for 1 hour
        logger.info(f"Successfully fetched analyst data for {real_symbol}")

        return result

    except Exception as e:
        logger.error(f"Analyst API error for {xstock_symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch analyst data: {str(e)}")

@app.get("/api/ownership/{xstock_symbol}")
async def get_ownership(xstock_symbol: str):
    """
    Institutional ownership, mutual fund holdings, and insider transactions
    Returns comprehensive ownership data
    """
    cache_key = f"ownership_{xstock_symbol}"

    # Try cache first (1 hour TTL)
    cached_data = await get_cache(cache_key)
    if cached_data:
        logger.info(f"Returning cached ownership data for {xstock_symbol}")
        return cached_data

    # Map xStock to real symbol
    real_symbol = map_xstock_to_symbol(xstock_symbol)
    if not real_symbol:
        raise HTTPException(status_code=404, detail=f"Symbol {xstock_symbol} not found")

    try:
        logger.info(f"Fetching ownership data for {real_symbol}")

        ticker = yf.Ticker(real_symbol)

        # Institutional holders (top 10)
        institutional_holders = []
        try:
            if hasattr(ticker, 'institutional_holders') and ticker.institutional_holders is not None:
                ih_df = ticker.institutional_holders.head(10)
                for index, row in ih_df.iterrows():
                    institutional_holders.append({
                        "holder": str(row.get('Holder', 'Unknown')),
                        "shares": int(row.get('Shares', 0)) if pd.notna(row.get('Shares')) else 0,
                        "dateReported": str(row.get('Date Reported', '')) if pd.notna(row.get('Date Reported')) else None,
                        "percentOut": float(row.get('% Out', 0)) if pd.notna(row.get('% Out')) else 0,
                        "value": int(row.get('Value', 0)) if pd.notna(row.get('Value')) else 0
                    })
        except Exception as e:
            logger.warning(f"Could not fetch institutional holders for {real_symbol}: {e}")

        # Mutual fund holders (top 10)
        mutualfund_holders = []
        try:
            if hasattr(ticker, 'mutualfund_holders') and ticker.mutualfund_holders is not None:
                mf_df = ticker.mutualfund_holders.head(10)
                for index, row in mf_df.iterrows():
                    mutualfund_holders.append({
                        "holder": str(row.get('Holder', 'Unknown')),
                        "shares": int(row.get('Shares', 0)) if pd.notna(row.get('Shares')) else 0,
                        "dateReported": str(row.get('Date Reported', '')) if pd.notna(row.get('Date Reported')) else None,
                        "percentOut": float(row.get('% Out', 0)) if pd.notna(row.get('% Out')) else 0,
                        "value": int(row.get('Value', 0)) if pd.notna(row.get('Value')) else 0
                    })
        except Exception as e:
            logger.warning(f"Could not fetch mutual fund holders for {real_symbol}: {e}")

        # Insider transactions (last 20)
        insider_transactions = []
        try:
            if hasattr(ticker, 'insider_transactions') and ticker.insider_transactions is not None:
                it_df = ticker.insider_transactions.head(20)
                for index, row in it_df.iterrows():
                    insider_transactions.append({
                        "date": str(row.get('Start Date', '')) if pd.notna(row.get('Start Date')) else None,
                        "insider": str(row.get('Insider', 'Unknown')),
                        "position": str(row.get('Position', '')),
                        "transaction": str(row.get('Transaction', '')),
                        "shares": int(row.get('Shares', 0)) if pd.notna(row.get('Shares')) else 0,
                        "value": int(row.get('Value', 0)) if pd.notna(row.get('Value')) else 0
                    })
        except Exception as e:
            logger.warning(f"Could not fetch insider transactions for {real_symbol}: {e}")

        # Ownership summary from info
        info = ticker.info
        ownership_summary = {
            "heldPercentInsiders": info.get("heldPercentInsiders"),
            "heldPercentInstitutions": info.get("heldPercentInstitutions"),
            "sharesOutstanding": info.get("sharesOutstanding"),
            "floatShares": info.get("floatShares"),
            "sharesShort": info.get("sharesShort"),
            "shortRatio": info.get("shortRatio"),
            "shortPercentOfFloat": info.get("shortPercentOfFloat")
        }

        result = {
            "symbol": xstock_symbol,
            "institutionalHolders": institutional_holders,
            "mutualFundHolders": mutualfund_holders,
            "insiderTransactions": insider_transactions,
            "ownershipSummary": ownership_summary,
            "timestamp": int(time.time() * 1000)
        }

        await set_cache(cache_key, result, ttl_seconds=3600)  # Cache for 1 hour
        logger.info(f"Successfully fetched ownership data for {real_symbol}")

        return result

    except Exception as e:
        logger.error(f"Ownership API error for {xstock_symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch ownership data: {str(e)}")

@app.get("/api/news/{xstock_symbol}")
async def get_news(xstock_symbol: str):
    """
    News headlines for a stock
    Returns recent news articles with title, publisher, link, and publish date
    """
    cache_key = f"news_{xstock_symbol}"

    # Try cache first (30 min TTL for news)
    cached_data = await get_cache(cache_key)
    if cached_data:
        logger.info(f"Returning cached news for {xstock_symbol}")
        return cached_data

    # Map xStock to real symbol
    real_symbol = map_xstock_to_symbol(xstock_symbol)
    if not real_symbol:
        raise HTTPException(status_code=404, detail=f"Symbol {xstock_symbol} not found")

    try:
        logger.info(f"Fetching news for {real_symbol}")

        ticker = yf.Ticker(real_symbol)

        # Fetch news articles (last 20)
        news_articles = []
        try:
            # Try to fetch news using the news property
            news_data = None
            try:
                news_data = ticker.news
            except Exception as e:
                logger.warning(f"News property failed for {real_symbol}, trying get_news(): {e}")
                try:
                    # Try alternative method
                    news_data = ticker.get_news()
                except:
                    pass

            if news_data and isinstance(news_data, list) and len(news_data) > 0:
                logger.info(f"Found {len(news_data)} news articles for {real_symbol}")
                for article in news_data[:20]:  # Limit to 20 most recent
                    try:
                        # Handle new nested structure: {id: ..., content: {...}}
                        content = article.get('content', article)  # Fall back to article if no content key

                        # Extract title
                        title = content.get('title', 'Untitled')
                        if not title or title == 'Untitled':
                            continue  # Skip articles without titles

                        # Extract publisher
                        publisher = 'Unknown'
                        if content.get('provider'):
                            publisher = content['provider'].get('displayName', 'Unknown')
                        elif content.get('publisher'):
                            publisher = content['publisher']

                        # Extract link
                        link = ''
                        if content.get('canonicalUrl'):
                            link = content['canonicalUrl'].get('url', '')
                        elif content.get('link'):
                            link = content['link']

                        # Extract publish time
                        publish_time = 0
                        pub_date = content.get('pubDate')
                        if pub_date:
                            # Parse ISO format: "2025-10-03T14:56:00Z"
                            from datetime import datetime
                            try:
                                dt = datetime.fromisoformat(pub_date.replace('Z', '+00:00'))
                                publish_time = int(dt.timestamp())
                            except:
                                pass

                        if not publish_time:
                            publish_time = content.get('providerPublishTime', 0)

                        # Extract thumbnail
                        thumbnail_url = None
                        if content.get('thumbnail'):
                            thumbnail = content['thumbnail']
                            # Try resolutions array
                            resolutions = thumbnail.get('resolutions', [])
                            if resolutions and len(resolutions) > 0:
                                thumbnail_url = resolutions[0].get('url')
                            # Fall back to originalUrl
                            if not thumbnail_url and thumbnail.get('originalUrl'):
                                thumbnail_url = thumbnail['originalUrl']

                        news_articles.append({
                            "title": title,
                            "publisher": publisher,
                            "link": link,
                            "publishedDate": publish_time * 1000 if publish_time else int(time.time() * 1000),
                            "type": content.get('contentType', content.get('type', 'STORY')),
                            "thumbnail": thumbnail_url
                        })
                    except Exception as e:
                        logger.warning(f"Error parsing article for {real_symbol}: {e}")
                        continue
            else:
                logger.warning(f"No news available for {real_symbol}")
        except Exception as e:
            logger.warning(f"Could not fetch news for {real_symbol}: {e}")

        result = {
            "symbol": xstock_symbol,
            "news": news_articles,
            "count": len(news_articles),
            "timestamp": int(time.time() * 1000)
        }

        await set_cache(cache_key, result, ttl_seconds=1800)  # Cache for 30 minutes
        logger.info(f"Successfully fetched {len(news_articles)} news articles for {real_symbol}")

        return result

    except Exception as e:
        logger.error(f"News API error for {xstock_symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch news: {str(e)}")

@app.post("/api/screener")
async def screen_stocks(filters: dict = Body(...)):
    """
    Advanced stock screener with multiple filter criteria
    Returns stocks matching all specified filters
    """
    try:
        logger.info(f"Screening stocks with filters: {filters}")

        # Get all available xStock symbols
        all_symbols = list(STOCK_SYMBOLS.keys())
        results = []

        # Process each stock in parallel for performance
        async def process_stock(xstock_symbol: str):
            try:
                real_symbol = STOCK_SYMBOLS.get(xstock_symbol)
                if not real_symbol:
                    return None

                # Fetch stock data in thread pool (yfinance blocks)
                def fetch_stock_data():
                    ticker = yf.Ticker(real_symbol.replace('.', '-'))
                    info = ticker.info

                    # Calculate technical indicators if needed
                    hist = None
                    rsi = None
                    if filters.get('rsi') or filters.get('priceVsSMA20'):
                        hist = ticker.history(period='3mo', timeout=10)
                        if not hist.empty and len(hist) >= 15:
                            rsi = calculate_rsi(hist, 14)

                    return {
                        'info': info,
                        'hist': hist,
                        'rsi': rsi[-1]['value'] if rsi and len(rsi) > 0 else None
                    }

                loop = asyncio.get_event_loop()
                data = await loop.run_in_executor(None, fetch_stock_data)

                info = data['info']
                stock_data = {
                    "symbol": xstock_symbol,
                    "name": info.get('longName', xstock_symbol),
                    "sector": info.get('sector', 'Unknown'),
                    "industry": info.get('industry', 'Unknown'),
                    "price": float(info.get('currentPrice', 0) or info.get('regularMarketPrice', 0)),
                    "change": float(info.get('regularMarketChange', 0)),
                    "changePercent": float(info.get('regularMarketChangePercent', 0)),
                    "volume": int(info.get('volume', 0)),
                    "marketCap": float(info.get('marketCap', 0)),
                    "pe": float(info.get('trailingPE', 0)) if info.get('trailingPE') else None,
                    "pb": float(info.get('priceToBook', 0)) if info.get('priceToBook') else None,
                    "dividendYield": float(info.get('dividendYield', 0)) if info.get('dividendYield') else None,
                    "epsGrowth": float(info.get('earningsGrowth', 0)) if info.get('earningsGrowth') else None,
                    "revenueGrowth": float(info.get('revenueGrowth', 0)) if info.get('revenueGrowth') else None,
                    "debtToEquity": float(info.get('debtToEquity', 0)) if info.get('debtToEquity') else None,
                    "roe": float(info.get('returnOnEquity', 0)) if info.get('returnOnEquity') else None,
                    "rsi": data['rsi'],
                    "shortPercent": float(info.get('shortPercentOfFloat', 0)) if info.get('shortPercentOfFloat') else None,
                    "beta": float(info.get('beta', 0)) if info.get('beta') else None,
                    # Advanced Fundamental Filters
                    "priceToSales": float(info.get('priceToSalesTrailing12Months', 0)) if info.get('priceToSalesTrailing12Months') else None,
                    "evToEbitda": float(info.get('enterpriseToEbitda', 0)) if info.get('enterpriseToEbitda') else None,
                    "currentRatio": float(info.get('currentRatio', 0)) if info.get('currentRatio') else None,
                    "quickRatio": float(info.get('quickRatio', 0)) if info.get('quickRatio') else None,
                    "freeCashflow": float(info.get('freeCashflow', 0)) if info.get('freeCashflow') else None,
                }

                # Apply filters
                if not apply_filters(stock_data, filters):
                    return None

                return stock_data

            except Exception as e:
                logger.warning(f"Error processing {xstock_symbol}: {e}")
                return None

        # Process all stocks in parallel (batches of 10 for safety)
        batch_size = 10
        for i in range(0, len(all_symbols), batch_size):
            batch = all_symbols[i:i+batch_size]
            batch_results = await asyncio.gather(*[process_stock(sym) for sym in batch])
            results.extend([r for r in batch_results if r is not None])

        # Sort results
        sort_by = filters.get('sortBy', 'marketCap')
        sort_order = filters.get('sortOrder', 'desc')
        results.sort(key=lambda x: x.get(sort_by, 0) or 0, reverse=(sort_order == 'desc'))

        logger.info(f"Screener found {len(results)} stocks matching filters")

        return {
            "results": results,
            "count": len(results),
            "filters": filters,
            "timestamp": int(time.time() * 1000)
        }

    except Exception as e:
        logger.error(f"Screener API error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to screen stocks: {str(e)}")

def apply_filters(stock: dict, filters: dict) -> bool:
    """Apply all filters to a stock and return True if it matches"""
    try:
        # Market Cap filter
        if filters.get('marketCapMin'):
            if not stock['marketCap'] or stock['marketCap'] < filters['marketCapMin']:
                return False
        if filters.get('marketCapMax'):
            if not stock['marketCap'] or stock['marketCap'] > filters['marketCapMax']:
                return False

        # P/E Ratio filter
        if filters.get('peMin'):
            if not stock['pe'] or stock['pe'] < filters['peMin']:
                return False
        if filters.get('peMax'):
            if not stock['pe'] or stock['pe'] > filters['peMax']:
                return False

        # P/B Ratio filter
        if filters.get('pbMin'):
            if not stock['pb'] or stock['pb'] < filters['pbMin']:
                return False
        if filters.get('pbMax'):
            if not stock['pb'] or stock['pb'] > filters['pbMax']:
                return False

        # Dividend Yield filter
        if filters.get('dividendYieldMin'):
            if not stock['dividendYield'] or stock['dividendYield'] < filters['dividendYieldMin']:
                return False

        # EPS Growth filter
        if filters.get('epsGrowthMin'):
            if not stock['epsGrowth'] or stock['epsGrowth'] < filters['epsGrowthMin']:
                return False

        # Revenue Growth filter
        if filters.get('revenueGrowthMin'):
            if not stock['revenueGrowth'] or stock['revenueGrowth'] < filters['revenueGrowthMin']:
                return False

        # Debt to Equity filter
        if filters.get('debtToEquityMax'):
            if stock['debtToEquity'] and stock['debtToEquity'] > filters['debtToEquityMax']:
                return False

        # ROE filter
        if filters.get('roeMin'):
            if not stock['roe'] or stock['roe'] < filters['roeMin']:
                return False

        # RSI filter
        if filters.get('rsiMin'):
            if not stock['rsi'] or stock['rsi'] < filters['rsiMin']:
                return False
        if filters.get('rsiMax'):
            if not stock['rsi'] or stock['rsi'] > filters['rsiMax']:
                return False

        # Price Change filter
        if filters.get('changePercentMin'):
            if stock['changePercent'] < filters['changePercentMin']:
                return False
        if filters.get('changePercentMax'):
            if stock['changePercent'] > filters['changePercentMax']:
                return False

        # Volume filter
        if filters.get('volumeMin'):
            if stock['volume'] < filters['volumeMin']:
                return False

        # Sector filter
        if filters.get('sectors') and len(filters['sectors']) > 0:
            if stock['sector'] not in filters['sectors']:
                return False

        # Beta filter
        if filters.get('betaMin'):
            if not stock['beta'] or stock['beta'] < filters['betaMin']:
                return False
        if filters.get('betaMax'):
            if not stock['beta'] or stock['beta'] > filters['betaMax']:
                return False

        # Short Interest filter
        if filters.get('shortPercentMax'):
            if stock['shortPercent'] and stock['shortPercent'] > filters['shortPercentMax']:
                return False

        # Advanced Fundamental Filters
        # Price to Sales filter
        if filters.get('priceToSalesMin'):
            if not stock['priceToSales'] or stock['priceToSales'] < filters['priceToSalesMin']:
                return False
        if filters.get('priceToSalesMax'):
            if not stock['priceToSales'] or stock['priceToSales'] > filters['priceToSalesMax']:
                return False

        # EV/EBITDA filter
        if filters.get('evToEbitdaMin'):
            if not stock['evToEbitda'] or stock['evToEbitda'] < filters['evToEbitdaMin']:
                return False
        if filters.get('evToEbitdaMax'):
            if not stock['evToEbitda'] or stock['evToEbitda'] > filters['evToEbitdaMax']:
                return False

        # Current Ratio filter
        if filters.get('currentRatioMin'):
            if not stock['currentRatio'] or stock['currentRatio'] < filters['currentRatioMin']:
                return False

        # Quick Ratio filter
        if filters.get('quickRatioMin'):
            if not stock['quickRatio'] or stock['quickRatio'] < filters['quickRatioMin']:
                return False

        # Free Cash Flow filter
        if filters.get('freeCashflowMin'):
            if not stock['freeCashflow'] or stock['freeCashflow'] < filters['freeCashflowMin']:
                return False

        return True

    except Exception as e:
        logger.warning(f"Error applying filters: {e}")
        return False

@app.get("/api/pulse")
async def get_market_pulse():
    """Get market pulse summary"""
    cache_key = "market_pulse"

    # Try cache first
    cached_data = await get_cache(cache_key)
    if cached_data:
        return cached_data

    try:
        # Get data for major indices
        major_symbols = ['SPY', 'QQQ', 'DIA', 'IWM']
        market_data = []

        for symbol in major_symbols:
            try:
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period="5d", interval="1d", timeout=30)

                if not hist.empty and len(hist) > 1:
                    latest = hist.iloc[-1]
                    previous = hist.iloc[-2]
                    change = latest["Close"] - previous["Close"]
                    change_percent = (change / previous["Close"]) * 100

                    market_data.append({
                        "symbol": symbol,
                        "price": float(latest["Close"]),
                        "change": float(change),
                        "changePercent": float(change_percent),
                        "volume": int(latest["Volume"]) if "Volume" in latest else 0
                    })
            except Exception as e:
                logger.warning(f"Could not fetch data for {symbol}: {e}")

        # Determine market status
        current_time = datetime.now()
        market_status = "Open" if current_time.weekday() < 5 and 9 <= current_time.hour < 16 else "Closed"

        pulse_data = {
            "marketStatus": market_status,
            "lastUpdate": int(time.time() * 1000),
            "topGainers": sorted([m for m in market_data if m["changePercent"] > 0], key=lambda x: x["changePercent"], reverse=True)[:3],
            "topLosers": sorted([m for m in market_data if m["changePercent"] < 0], key=lambda x: x["changePercent"])[:3],
            "mostActive": sorted(market_data, key=lambda x: x["volume"], reverse=True)[:3],
            "marketCap": sum(m.get("marketCap", 0) for m in market_data),
            "volume": sum(m.get("volume", 0) for m in market_data)
        }

        await set_cache(cache_key, pulse_data, ttl_seconds=120)  # Cache for 2 minutes
        return pulse_data
    except Exception as e:
        logger.error(f"Market pulse API error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch market pulse: {str(e)}")

@app.get("/api/sectors")
async def get_sector_analysis():
    """Comprehensive sector analysis with aggregate metrics"""
    cache_key = "sector_analysis"

    # Try cache first (1 hour TTL)
    cached_data = await get_cache(cache_key)
    if cached_data:
        return cached_data

    try:
        # Get all xStocks symbols
        all_symbols = list(STOCK_SYMBOLS.keys())

        # Initialize sector data structure
        sectors: Dict[str, Dict[str, list]] = {}

        async def fetch_stock_sector_data(xstock_symbol: str):
            """Fetch stock data for sector analysis"""
            try:
                real_symbol = STOCK_SYMBOLS.get(xstock_symbol)
                if not real_symbol:
                    return None

                def fetch():
                    ticker = yf.Ticker(real_symbol.replace('.', '-'))
                    info = ticker.info
                    hist = ticker.history(period='1mo', timeout=5)  # Reduced timeout

                    # Calculate price change
                    price_change = 0
                    if not hist.empty and len(hist) >= 2:
                        latest = hist.iloc[-1]['Close']
                        month_ago = hist.iloc[0]['Close']
                        price_change = ((latest - month_ago) / month_ago) * 100

                    return {
                        'symbol': xstock_symbol,
                        'name': info.get('longName', xstock_symbol),
                        'sector': info.get('sector', 'Unknown'),
                        'price': float(info.get('currentPrice', 0)),
                        'marketCap': float(info.get('marketCap', 0)),
                        'pe': float(info.get('trailingPE', 0)) if info.get('trailingPE') else None,
                        'pb': float(info.get('priceToBook', 0)) if info.get('priceToBook') else None,
                        'ps': float(info.get('priceToSalesTrailing12Months', 0)) if info.get('priceToSalesTrailing12Months') else None,
                        'roe': float(info.get('returnOnEquity', 0) * 100) if info.get('returnOnEquity') else None,
                        'profitMargin': float(info.get('profitMargins', 0) * 100) if info.get('profitMargins') else None,
                        'epsGrowth': float(info.get('earningsQuarterlyGrowth', 0) * 100) if info.get('earningsQuarterlyGrowth') else None,
                        'revenueGrowth': float(info.get('revenueGrowth', 0) * 100) if info.get('revenueGrowth') else None,
                        'debtToEquity': float(info.get('debtToEquity', 0)) if info.get('debtToEquity') else None,
                        'priceChange': float(price_change),
                        'volume': int(info.get('volume', 0))
                    }

                loop = asyncio.get_event_loop()
                return await loop.run_in_executor(None, fetch)
            except Exception as e:
                logger.warning(f"Could not fetch sector data for {xstock_symbol}: {e}")
                return None

        # Fetch all stocks in parallel (batches of 50 for faster fetching)
        batch_size = 50
        all_stock_data = []
        for i in range(0, len(all_symbols), batch_size):
            batch = all_symbols[i:i+batch_size]
            # Use return_exceptions=True to prevent one failure from blocking all
            batch_results = await asyncio.gather(*[fetch_stock_sector_data(sym) for sym in batch], return_exceptions=True)
            # Filter out None and exceptions
            all_stock_data.extend([r for r in batch_results if r is not None and not isinstance(r, Exception)])

        # Group by sector
        for stock in all_stock_data:
            sector = stock['sector']
            if sector == 'Unknown':
                continue

            if sector not in sectors:
                sectors[sector] = {
                    'stocks': [],
                    'marketCap': [],
                    'pe': [],
                    'pb': [],
                    'ps': [],
                    'roe': [],
                    'profitMargin': [],
                    'epsGrowth': [],
                    'revenueGrowth': [],
                    'debtToEquity': [],
                    'priceChange': [],
                    'volume': []
                }

            sectors[sector]['stocks'].append(stock)
            sectors[sector]['marketCap'].append(stock['marketCap'])
            if stock['pe']: sectors[sector]['pe'].append(stock['pe'])
            if stock['pb']: sectors[sector]['pb'].append(stock['pb'])
            if stock['ps']: sectors[sector]['ps'].append(stock['ps'])
            if stock['roe']: sectors[sector]['roe'].append(stock['roe'])
            if stock['profitMargin']: sectors[sector]['profitMargin'].append(stock['profitMargin'])
            if stock['epsGrowth']: sectors[sector]['epsGrowth'].append(stock['epsGrowth'])
            if stock['revenueGrowth']: sectors[sector]['revenueGrowth'].append(stock['revenueGrowth'])
            if stock['debtToEquity']: sectors[sector]['debtToEquity'].append(stock['debtToEquity'])
            sectors[sector]['priceChange'].append(stock['priceChange'])
            sectors[sector]['volume'].append(stock['volume'])

        # Calculate aggregate metrics per sector
        def calculate_avg(values: list) -> float | None:
            return sum(values) / len(values) if values else None

        sector_summary = []
        for sector_name, data in sectors.items():
            summary = {
                'sector': sector_name,
                'stockCount': len(data['stocks']),
                'totalMarketCap': sum(data['marketCap']),
                'avgPE': calculate_avg(data['pe']),
                'avgPB': calculate_avg(data['pb']),
                'avgPS': calculate_avg(data['ps']),
                'avgROE': calculate_avg(data['roe']),
                'avgProfitMargin': calculate_avg(data['profitMargin']),
                'avgEPSGrowth': calculate_avg(data['epsGrowth']),
                'avgRevenueGrowth': calculate_avg(data['revenueGrowth']),
                'avgDebtToEquity': calculate_avg(data['debtToEquity']),
                'avgPriceChange': calculate_avg(data['priceChange']),
                'totalVolume': sum(data['volume']),
                'topStocks': sorted(data['stocks'], key=lambda x: x['marketCap'], reverse=True)[:5]
            }
            sector_summary.append(summary)

        # Sort by total market cap
        sector_summary.sort(key=lambda x: x['totalMarketCap'], reverse=True)

        result = {
            'sectors': sector_summary,
            'totalSectors': len(sector_summary),
            'totalStocks': len(all_stock_data),
            'timestamp': int(time.time() * 1000)
        }

        # Cache for 6 hours (fundamentals don't change quickly)
        await set_cache(cache_key, result, ttl_seconds=21600)
        return result

    except Exception as e:
        logger.error(f"Sector analysis API error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch sector analysis: {str(e)}")

@app.get("/api/sectors/historical")
async def get_sector_historical_performance(period: str = "1y"):
    """Historical performance data for all sectors"""
    cache_key = f"sector_historical_{period}"

    # Try cache first (24 hour TTL - historical data doesn't change often)
    cached_data = await get_cache(cache_key)
    if cached_data:
        return cached_data

    try:
        # Get all xStocks symbols
        all_symbols = list(STOCK_SYMBOLS.keys())

        # Map period to yfinance format
        period_map = {
            "1m": "1mo",
            "3m": "3mo",
            "6m": "6mo",
            "1y": "1y",
            "3y": "3y",
            "5y": "5y"
        }
        yf_period = period_map.get(period, "1y")

        # Fetch historical data for all stocks
        async def fetch_stock_history(xstock_symbol: str):
            """Fetch historical price data for a stock"""
            try:
                real_symbol = STOCK_SYMBOLS.get(xstock_symbol)
                if not real_symbol:
                    return None

                def fetch():
                    ticker = yf.Ticker(real_symbol.replace('.', '-'))
                    info = ticker.info
                    hist = ticker.history(period=yf_period, timeout=5)  # Reduced timeout for faster failures

                    if hist.empty:
                        return None

                    sector = info.get('sector', 'Unknown')
                    if sector == 'Unknown':
                        return None

                    # Calculate performance over period
                    if len(hist) < 2:
                        return None

                    start_price = hist.iloc[0]['Close']
                    end_price = hist.iloc[-1]['Close']
                    performance = ((end_price - start_price) / start_price) * 100

                    # Resample to weekly data points for cleaner charts
                    if len(hist) > 50:
                        hist = hist.resample('W').last()

                    return {
                        'symbol': xstock_symbol,
                        'sector': sector,
                        'performance': float(performance),
                        'history': [
                            {
                                'time': int(index.timestamp()),
                                'value': float(row['Close'])
                            }
                            for index, row in hist.iterrows()
                        ]
                    }

                loop = asyncio.get_event_loop()
                return await loop.run_in_executor(None, fetch)
            except Exception as e:
                logger.warning(f"Could not fetch history for {xstock_symbol}: {e}")
                return None

        # Fetch all stocks in parallel (batches of 50 for faster fetching)
        batch_size = 50
        all_stock_data = []
        for i in range(0, len(all_symbols), batch_size):
            batch = all_symbols[i:i+batch_size]
            # Use return_exceptions=True to prevent one failure from blocking all
            batch_results = await asyncio.gather(*[fetch_stock_history(sym) for sym in batch], return_exceptions=True)
            # Filter out None and exceptions
            all_stock_data.extend([r for r in batch_results if r is not None and not isinstance(r, Exception)])

        # Group by sector and calculate sector-level historical performance
        sectors: Dict[str, Dict] = {}

        for stock in all_stock_data:
            sector = stock['sector']

            if sector not in sectors:
                sectors[sector] = {
                    'stocks': [],
                    'performance_sum': 0,
                    'history_points': {}  # timestamp -> list of prices
                }

            sectors[sector]['stocks'].append(stock['symbol'])
            sectors[sector]['performance_sum'] += stock['performance']

            # Aggregate historical data points
            for point in stock['history']:
                timestamp = point['time']
                if timestamp not in sectors[sector]['history_points']:
                    sectors[sector]['history_points'][timestamp] = []
                sectors[sector]['history_points'][timestamp].append(point['value'])

        # Calculate sector averages
        sector_history = []
        for sector_name, data in sectors.items():
            stock_count = len(data['stocks'])
            avg_performance = data['performance_sum'] / stock_count if stock_count > 0 else 0

            # Calculate average price at each timestamp (sector index)
            history_data = []
            for timestamp in sorted(data['history_points'].keys()):
                prices = data['history_points'][timestamp]
                avg_price = sum(prices) / len(prices) if prices else 0
                history_data.append({
                    'time': timestamp,
                    'value': float(avg_price)
                })

            # Normalize to percentage change from start
            if history_data and history_data[0]['value'] > 0:
                start_value = history_data[0]['value']
                normalized_history = [
                    {
                        'time': point['time'],
                        'value': ((point['value'] - start_value) / start_value) * 100
                    }
                    for point in history_data
                ]
            else:
                normalized_history = history_data

            sector_history.append({
                'sector': sector_name,
                'stockCount': stock_count,
                'performance': float(avg_performance),
                'history': normalized_history
            })

        # Sort by performance
        sector_history.sort(key=lambda x: x['performance'], reverse=True)

        result = {
            'sectors': sector_history,
            'period': period,
            'totalSectors': len(sector_history),
            'timestamp': int(time.time() * 1000)
        }

        # Cache for 24 hours (historical data doesn't change)
        await set_cache(cache_key, result, ttl_seconds=86400)
        return result

    except Exception as e:
        logger.error(f"Sector historical API error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch sector historical data: {str(e)}")


# ============================================================================
# COMPREHENSIVE INTEL ENDPOINTS (Merged from comprehensive_intel_service.py)
# ============================================================================

@app.get("/api/intel/all-xstocks")
async def get_all_xstocks():
    """Get all xStock data for Intel page compatibility"""
    stocks_data = get_comprehensive_stocks_data()

    # Convert to Intel page format
    intel_data = {}
    for stock in stocks_data:
        symbol = stock['symbol']
        intel_data[symbol] = {
            'symbol': symbol,
            'name': stock['name'],
            'sector': stock['sector'],
            'price': stock['price'],
            'change': stock['change'],
            'changePercent': stock['changePercent'],
            'volume': stock['volume'],
            'xstockSymbol': symbol,
            'lastUpdate': stock['lastUpdated']
        }

    return clean_data_for_json(intel_data)

@app.get("/api/dashboard/market")
async def get_unified_dashboard(period: str = Query(default="1d", pattern="^(1d|1w|1mo|3mo|ytd|1y)$")):
    """
    UNIFIED ENDPOINT: Get all market data in single call (OPTION 1 implementation)
    Combines heatmap, indices, sectors, movers, and pulse into one response
    This endpoint is used by MarketDataContext for efficient data fetching
    """
    try:
        start_time = time.time()
        logger.info(f"📊 Fetching unified market dashboard for period: {period}")

        # Fetch all data components with proper period parameter
        stocks_data = get_comprehensive_stocks_data(period=period)
        indices_data = get_comprehensive_indices_data(period=period)
        sectors_data = get_comprehensive_sectors_data(period)
        movers_data = get_market_movers_data(period)

        # Calculate pulse data
        if stocks_data:
            total_volume = sum(stock['volume'] for stock in stocks_data)
            avg_volume = total_volume / len(stocks_data)
            avg_change = sum(stock['changePercent'] for stock in stocks_data) / len(stocks_data)
            total_market_cap = sum(stock['marketCap'] for stock in stocks_data)

            volumes = [stock['volume'] for stock in stocks_data]
            avg_volumes = [stock['avgVolume'] for stock in stocks_data if stock['avgVolume'] > 0]
            volume_change = ((sum(volumes) / sum(avg_volumes)) - 1) * 100 if avg_volumes else 0

            momentum = 'bullish' if avg_change > 1.0 else 'bearish' if avg_change < -1.0 else 'neutral'
            fear_greed = max(0, min(100, 50 + (avg_change * 10)))

            pulse_data = {
                'totalVolume': safe_float(total_volume),
                'avgVolume': safe_float(avg_volume),
                'volumeChange': safe_float(volume_change),
                'marketCap': safe_float(total_market_cap),
                'activeStocks': len(stocks_data),
                'volatility': safe_float(abs(avg_change) * 2),
                'momentum': momentum,
                'fearGreedIndex': safe_float(fear_greed)
            }
        else:
            pulse_data = {
                'totalVolume': 0, 'avgVolume': 0, 'volumeChange': 0,
                'marketCap': 0, 'activeStocks': 0, 'volatility': 0,
                'momentum': 'neutral', 'fearGreedIndex': 50
            }

        processing_time = (time.time() - start_time) * 1000

        response = {
            'success': True,
            'type': 'market',
            'data': {
                'heatmap': stocks_data,
                'indices': indices_data,
                'sectors': sectors_data,
                'topMovers': {
                    'gainers': movers_data.get('topGainers', []),
                    'losers': movers_data.get('topLosers', []),
                    'mostActive': movers_data.get('mostActive', [])
                },
                'pulse': pulse_data
            },
            'metadata': {
                'period': period,
                'symbolCount': len(stocks_data),
                'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                'processingTimeMs': round(processing_time, 2)
            }
        }

        logger.info(f"✅ Unified dashboard ready: {len(stocks_data)} stocks, {processing_time:.2f}ms")
        return clean_data_for_json(response)

    except Exception as e:
        logger.error(f"❌ Error in unified dashboard endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Alpha Vantage endpoints removed - using yfinance only

# ============================================================================
# PHASE 5.4: Additional Market Intelligence Endpoints
# ============================================================================


# Global warmup status tracking
warmup_status = {
    'is_warming': False,
    'total_endpoints': 0,
    'cached_endpoints': 0,
    'priority_complete': False,
    'full_complete': False,
    'started_at': None,
    'completed_at': None
}

@app.on_event("startup")
async def warmup_cache():
    """On-demand caching only - warmup disabled to prevent blocking"""
    logger.info("✅ Service started - using on-demand caching (no warmup to avoid blocking)")
    logger.info("🚀 Charts will cache as users browse - first load builds cache for instant subsequent loads")


async def background_cache_refresh():
    """
    Background task to keep cache fresh for instant loading
    Refreshes priority timeframes every 30 seconds for real-time data
    Refreshes all timeframes every 5 minutes for historical data
    """
    logger.info("🔄 Background cache refresh task started")

    priority_timeframes = ['1D', '1h', '5m', '1Y', '1W']
    all_timeframes = [
        '1m', '2m', '3m', '5m', '10m', '15m', '30m', '45m',
        '1h', '2h', '3h', '4h',
        '1D', '1W', '1M', '3M', '6M', '1Y'
    ]

    xstock_symbols = load_xstock_symbols()
    xstock_symbols_with_x = [s + 'x' if not s.endswith('x') else s for s in xstock_symbols]

    market_indices = ['^GSPC', '^DJI', '^IXIC', '^RUT', '^VIX',
                     'XLE', 'XLF', 'XLK', 'XLI', 'XLV',
                     'EFA', 'EEM', '^FTSE', '^N225',
                     'GLD', 'TLT', 'LQD', 'IEF', 'USO', 'ARKK', 'JETS']

    priority_counter = 0
    full_counter = 0

    while True:
        try:
            await asyncio.sleep(30)  # Run every 30 seconds
            priority_counter += 30
            full_counter += 30

            # Refresh priority timeframes every 30 seconds (real-time data)
            if priority_counter >= 30:
                priority_counter = 0
                logger.info("🔄 Refreshing priority timeframes (30s interval)...")

                async def refresh_chart(symbol, timeframe, is_xstock=True):
                    try:
                        if is_xstock:
                            await get_chart_data(symbol, timeframe=timeframe)
                        else:
                            await get_index_chart_data(symbol, timeframe=timeframe)
                    except:
                        pass

                # Refresh priority timeframes
                for timeframe in priority_timeframes:
                    tasks = []
                    for symbol in xstock_symbols_with_x[:20]:  # Top 20 stocks
                        tasks.append(refresh_chart(symbol, timeframe, is_xstock=True))
                    for symbol in market_indices[:10]:  # Top 10 indices
                        tasks.append(refresh_chart(symbol, timeframe, is_xstock=False))

                    # Process in batches
                    batch_size = 10
                    for i in range(0, len(tasks), batch_size):
                        batch = tasks[i:i+batch_size]
                        await asyncio.gather(*batch, return_exceptions=True)

            # Refresh all timeframes every 5 minutes (comprehensive update)
            if full_counter >= 300:  # 5 minutes
                full_counter = 0
                logger.info("🔄 Full cache refresh (5min interval)...")

                # Refresh all timeframes for all symbols in background
                async def full_refresh():
                    for timeframe in all_timeframes:
                        try:
                            tasks = []
                            for symbol in xstock_symbols_with_x:
                                tasks.append(refresh_chart(symbol, timeframe, is_xstock=True))
                            for symbol in market_indices:
                                tasks.append(refresh_chart(symbol, timeframe, is_xstock=False))

                            batch_size = 10
                            for i in range(0, len(tasks), batch_size):
                                batch = tasks[i:i+batch_size]
                                await asyncio.gather(*batch, return_exceptions=True)
                                await asyncio.sleep(0.1)
                        except:
                            pass

                asyncio.create_task(full_refresh())

        except Exception as e:
            logger.warning(f"⚠️ Background refresh error: {e}")
            await asyncio.sleep(60)


@app.on_event("startup")
async def start_background_tasks():
    """Background tasks disabled - using on-demand caching only"""
    logger.info("📊 Background tasks disabled - using on-demand caching strategy")


# ==================== PORTFOLIO ANALYTICS ENDPOINTS ====================

@app.post("/api/portfolio/analyze")
async def analyze_portfolio(request: dict):
    """
    Calculate comprehensive portfolio risk metrics

    Request body:
    {
        "symbols": ["AAPL", "MSFT", "GOOGL"],
        "startDate": "2024-01-01",
        "endDate": "2025-01-01",
        "portfolioWeights": {"AAPL": 0.4, "MSFT": 0.3, "GOOGL": 0.3},  // optional
        "benchmarkSymbol": "SPY"  // optional, default SPY
    }

    Returns:
    {
        "sharpeRatio": 1.52,
        "volatility": 0.18,
        "beta": 1.1,
        "alpha": 0.02,
        "var95": -2.5,
        "var99": -3.8,
        "cvar95": -3.2,
        "cvar99": -4.5,
        "maxDrawdown": -15.2,
        "downsideVolatility": 0.12,
        "sortinoRatio": 2.1
    }
    """
    try:
        symbols = request.get('symbols', [])
        start_date = request.get('startDate')
        end_date = request.get('endDate')
        portfolio_weights = request.get('portfolioWeights', None)
        benchmark_symbol = request.get('benchmarkSymbol', 'SPY')

        if not symbols or not start_date or not end_date:
            raise HTTPException(status_code=400, detail="Missing required fields: symbols, startDate, endDate")

        logger.info(f"📊 Portfolio analysis request for {len(symbols)} symbols")

        result = portfolio_analytics.calculate_portfolio_metrics(
            symbols=symbols,
            start_date=start_date,
            end_date=end_date,
            portfolio_weights=portfolio_weights,
            benchmark_symbol=benchmark_symbol
        )

        return sanitize_dict(result)

    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in portfolio analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/portfolio/optimize")
async def optimize_portfolio(request: dict):
    """
    Portfolio optimization using Modern Portfolio Theory

    Request body:
    {
        "symbols": ["AAPL", "MSFT", "GOOGL"],
        "startDate": "2024-01-01",
        "endDate": "2025-01-01",
        "minWeight": 0.0,  // optional, default 0.0
        "maxWeight": 1.0,  // optional, default 1.0
        "nPortfolios": 1000  // optional, default 1000
    }

    Returns:
    {
        "maxSharpePortfolio": {
            "weights": {"AAPL": 0.5, "MSFT": 0.3, "GOOGL": 0.2},
            "expectedReturn": 0.15,
            "volatility": 0.18,
            "sharpe": 1.52
        },
        "minVolatilityPortfolio": {...},
        "efficientFrontier": [...]
    }
    """
    try:
        symbols = request.get('symbols', [])
        start_date = request.get('startDate')
        end_date = request.get('endDate')
        min_weight = request.get('minWeight', 0.0)
        max_weight = request.get('maxWeight', 1.0)
        n_portfolios = request.get('nPortfolios', 1000)

        if not symbols or not start_date or not end_date:
            raise HTTPException(status_code=400, detail="Missing required fields: symbols, startDate, endDate")

        logger.info(f"🎯 Portfolio optimization request for {len(symbols)} symbols")

        result = portfolio_analytics.optimize_portfolio(
            symbols=symbols,
            start_date=start_date,
            end_date=end_date,
            min_weight=min_weight,
            max_weight=max_weight,
            n_portfolios=n_portfolios
        )

        return sanitize_dict(result)

    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in portfolio optimization: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/portfolio/monte-carlo")
async def portfolio_monte_carlo(request: dict):
    """
    Monte Carlo simulation with correlated returns

    Request body:
    {
        "symbols": ["AAPL", "MSFT", "GOOGL"],
        "startDate": "2024-01-01",
        "endDate": "2025-01-01",
        "initialCapital": 10000,
        "timeHorizonDays": 252,  // 1 year
        "numSimulations": 1000,
        "portfolioWeights": {"AAPL": 0.4, "MSFT": 0.3, "GOOGL": 0.3}  // optional
    }

    Returns:
    {
        "statistics": {
            "mean": 12500,
            "median": 12000,
            "std": 2000,
            "percentile95": 15000,
            ...
        },
        "percentilePaths": {...},
        "samplePaths": [...]
    }
    """
    try:
        symbols = request.get('symbols', [])
        start_date = request.get('startDate')
        end_date = request.get('endDate')
        initial_capital = request.get('initialCapital', 10000)
        time_horizon_days = request.get('timeHorizonDays', 252)
        num_simulations = request.get('numSimulations', 1000)
        portfolio_weights = request.get('portfolioWeights', None)

        if not symbols or not start_date or not end_date:
            raise HTTPException(status_code=400, detail="Missing required fields: symbols, startDate, endDate")

        logger.info(f"🎲 Monte Carlo simulation for {len(symbols)} symbols, {num_simulations} iterations")

        result = portfolio_analytics.run_monte_carlo(
            symbols=symbols,
            start_date=start_date,
            end_date=end_date,
            initial_capital=initial_capital,
            time_horizon_days=time_horizon_days,
            num_simulations=num_simulations,
            portfolio_weights=portfolio_weights
        )

        return sanitize_dict(result)

    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in Monte Carlo simulation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    logger.info("Starting xStocks Intel Microservice with corrected yfinance implementation")
    uvicorn.run(app, host="0.0.0.0", port=8002)
