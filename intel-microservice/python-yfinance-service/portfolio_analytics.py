"""
Portfolio Analytics Service - Production Ready
Replicates Intel's successful data architecture for portfolio risk metrics

Based on: intel-microservice/quantitative_engine.py patterns
Date: 2025-01-05
"""

import yfinance as yf
import numpy as np
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class PortfolioAnalyticsService:
    """
    Portfolio analytics using Intel's proven data fetching patterns

    Features:
    - Parallel historical data fetching (10 workers)
    - Real risk metrics (Sharpe, Beta, VaR, CVaR, Max Drawdown)
    - Portfolio optimization with Modern Portfolio Theory
    - Monte Carlo simulation with correlated returns
    """

    def __init__(self, risk_free_rate: float = 0.04):
        """Initialize portfolio analytics service

        Args:
            risk_free_rate: Annual risk-free rate (default: 4% = 0.04)
        """
        self.risk_free_rate = risk_free_rate

    def fetch_historical_data(
        self,
        symbols: List[str],
        start_date: str,
        end_date: str
    ) -> Dict[str, pd.DataFrame]:
        """
        Fetch historical data for multiple symbols in parallel

        Pattern: intel-microservice/quantitative_engine.py:38-72
        Uses ThreadPoolExecutor with 10 workers for parallel fetching

        Args:
            symbols: List of stock symbols
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)

        Returns:
            Dict mapping symbols to historical dataframes
        """
        def fetch_symbol(symbol: str):
            try:
                ticker = yf.Ticker(symbol)
                hist = ticker.history(start=start_date, end=end_date)
                if not hist.empty:
                    logger.info(f"✅ Fetched {len(hist)} days for {symbol}")
                    return symbol, hist
                else:
                    logger.warning(f"⚠️ No data for {symbol}")
                    return symbol, None
            except Exception as e:
                logger.error(f"❌ Error fetching {symbol}: {e}")
                return symbol, None

        historical_data = {}

        # Parallel fetching with 10 workers (Intel pattern)
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(fetch_symbol, sym) for sym in symbols]

            for future in as_completed(futures):
                symbol, data = future.result()
                if data is not None:
                    historical_data[symbol] = data

        logger.info(f"📊 Fetched historical data for {len(historical_data)}/{len(symbols)} symbols")
        return historical_data

    def align_data_by_dates(
        self,
        historical_data: Dict[str, pd.DataFrame]
    ) -> pd.DataFrame:
        """
        Align all historical data to common trading dates

        Pattern: intel-microservice/quantitative_engine.py:74-102
        Forward-fills missing dates to ensure synchronized data

        Args:
            historical_data: Dict of symbol -> historical dataframe

        Returns:
            DataFrame with aligned close prices
        """
        close_prices = {}

        for symbol, data in historical_data.items():
            if 'Close' in data.columns:
                close_prices[symbol] = data['Close']

        # Combine all close prices into one dataframe
        df = pd.DataFrame(close_prices)

        # Forward fill missing values
        df = df.ffill()

        # Drop any remaining NaN
        df = df.dropna()

        logger.info(f"📅 Aligned data to {len(df)} common trading days")
        return df

    def calculate_returns(self, prices: pd.DataFrame) -> pd.DataFrame:
        """Calculate daily returns from price data

        Args:
            prices: DataFrame of aligned prices

        Returns:
            DataFrame of daily returns
        """
        returns = prices.pct_change().dropna()
        return returns

    def calculate_portfolio_metrics(
        self,
        symbols: List[str],
        start_date: str,
        end_date: str,
        portfolio_weights: Optional[Dict[str, float]] = None,
        benchmark_symbol: str = "SPY"
    ) -> Dict:
        """
        Calculate comprehensive portfolio risk metrics

        Pattern: intel-microservice/quantitative_engine.py:537-605
        Real calculation using historical data - NO FAKE METRICS

        Args:
            symbols: List of portfolio holdings symbols
            start_date: Analysis start date
            end_date: Analysis end date
            portfolio_weights: Dict of symbol -> weight (defaults to equal weights)
            benchmark_symbol: Market benchmark (default: SPY)

        Returns:
            Dict with all portfolio metrics:
            - sharpeRatio: Annualized Sharpe ratio
            - volatility: Annualized volatility
            - beta: Portfolio beta vs benchmark
            - alpha: Annualized alpha
            - var95: Value at Risk (95% confidence)
            - var99: Value at Risk (99% confidence)
            - cvar95: Conditional VaR (95%)
            - cvar99: Conditional VaR (99%)
            - maxDrawdown: Maximum drawdown percentage
            - downsideVolatility: Downside deviation
            - sortinoRatio: Sortino ratio
        """
        logger.info(f"📊 Calculating portfolio metrics for {len(symbols)} symbols")

        # Fetch portfolio data
        historical_data = self.fetch_historical_data(symbols, start_date, end_date)
        if not historical_data:
            raise ValueError("No historical data available for portfolio symbols")

        prices = self.align_data_by_dates(historical_data)
        returns = self.calculate_returns(prices)

        # Default to equal weights if not provided
        if portfolio_weights is None:
            portfolio_weights = {sym: 1.0 / len(symbols) for sym in symbols}

        # Ensure weights sum to 1.0
        total_weight = sum(portfolio_weights.values())
        if abs(total_weight - 1.0) > 0.01:
            logger.warning(f"⚠️ Portfolio weights sum to {total_weight}, normalizing...")
            portfolio_weights = {k: v / total_weight for k, v in portfolio_weights.items()}

        # Calculate portfolio returns
        weights = np.array([portfolio_weights.get(sym, 0) for sym in prices.columns])
        portfolio_returns = (returns * weights).sum(axis=1)

        # Fetch benchmark data
        benchmark_data = self.fetch_historical_data([benchmark_symbol], start_date, end_date)
        if benchmark_data:
            benchmark_prices = self.align_data_by_dates(benchmark_data)
            benchmark_returns = self.calculate_returns(benchmark_prices).iloc[:, 0]

            # Align portfolio and benchmark returns
            common_dates = portfolio_returns.index.intersection(benchmark_returns.index)
            portfolio_returns_aligned = portfolio_returns.loc[common_dates]
            benchmark_returns_aligned = benchmark_returns.loc[common_dates]
        else:
            logger.warning(f"⚠️ Could not fetch benchmark {benchmark_symbol}")
            portfolio_returns_aligned = portfolio_returns
            benchmark_returns_aligned = None

        # Calculate metrics
        metrics = {}

        # 1. Volatility (annualized)
        volatility = float(portfolio_returns_aligned.std() * np.sqrt(252))
        metrics['volatility'] = volatility

        # 2. Sharpe Ratio
        portfolio_mean_return = float(portfolio_returns_aligned.mean() * 252)  # Annualized
        sharpe_ratio = (portfolio_mean_return - self.risk_free_rate) / volatility if volatility > 0 else 0
        metrics['sharpeRatio'] = float(sharpe_ratio)

        # 3. Beta and Alpha (vs benchmark)
        if benchmark_returns_aligned is not None:
            covariance = np.cov(portfolio_returns_aligned, benchmark_returns_aligned)[0, 1]
            benchmark_variance = np.var(benchmark_returns_aligned)
            beta = float(covariance / benchmark_variance) if benchmark_variance > 0 else 1.0

            benchmark_mean_return = float(benchmark_returns_aligned.mean() * 252)  # Annualized
            alpha = portfolio_mean_return - (self.risk_free_rate + beta * (benchmark_mean_return - self.risk_free_rate))

            metrics['beta'] = beta
            metrics['alpha'] = float(alpha)
        else:
            metrics['beta'] = None
            metrics['alpha'] = None

        # 4. VaR (Historical method)
        var_95 = float(np.percentile(portfolio_returns_aligned, 5))  # 5th percentile
        var_99 = float(np.percentile(portfolio_returns_aligned, 1))  # 1st percentile
        metrics['var95'] = var_95 * 100  # Convert to percentage
        metrics['var99'] = var_99 * 100

        # 5. CVaR (Conditional VaR / Expected Shortfall)
        cvar_95 = float(portfolio_returns_aligned[portfolio_returns_aligned <= var_95].mean())
        cvar_99 = float(portfolio_returns_aligned[portfolio_returns_aligned <= var_99].mean())
        metrics['cvar95'] = cvar_95 * 100
        metrics['cvar99'] = cvar_99 * 100

        # 6. Maximum Drawdown
        cumulative = (1 + portfolio_returns_aligned).cumprod()
        running_max = cumulative.cummax()
        drawdown = (cumulative - running_max) / running_max
        max_drawdown = float(drawdown.min())
        metrics['maxDrawdown'] = max_drawdown * 100

        # 7. Downside Volatility (for Sortino Ratio)
        downside_returns = portfolio_returns_aligned[portfolio_returns_aligned < 0]
        downside_volatility = float(downside_returns.std() * np.sqrt(252)) if len(downside_returns) > 0 else 0
        metrics['downsideVolatility'] = downside_volatility

        # 8. Sortino Ratio
        sortino_ratio = (portfolio_mean_return - self.risk_free_rate) / downside_volatility if downside_volatility > 0 else 0
        metrics['sortinoRatio'] = float(sortino_ratio)

        logger.info(f"✅ Portfolio metrics calculated: Sharpe={sharpe_ratio:.2f}, Beta={metrics.get('beta', 0):.2f}")
        return metrics

    def optimize_portfolio(
        self,
        symbols: List[str],
        start_date: str,
        end_date: str,
        min_weight: float = 0.0,
        max_weight: float = 1.0,
        n_portfolios: int = 1000
    ) -> Dict:
        """
        Portfolio optimization using Modern Portfolio Theory

        Pattern: intel-microservice/quantitative_engine.py:232-435
        Generates efficient frontier and finds optimal portfolios

        Args:
            symbols: List of stock symbols
            start_date: Historical data start date
            end_date: Historical data end date
            min_weight: Minimum weight per asset (0.0 = 0%)
            max_weight: Maximum weight per asset (1.0 = 100%)
            n_portfolios: Number of portfolios to simulate for efficient frontier

        Returns:
            Dict with:
            - maxSharpePortfolio: Optimal portfolio maximizing Sharpe ratio
            - minVolatilityPortfolio: Minimum variance portfolio
            - efficientFrontier: Array of portfolios on efficient frontier
        """
        from scipy.optimize import minimize

        logger.info(f"🎯 Optimizing portfolio for {len(symbols)} symbols")

        # Fetch historical data
        historical_data = self.fetch_historical_data(symbols, start_date, end_date)
        if not historical_data:
            raise ValueError("No historical data available")

        prices = self.align_data_by_dates(historical_data)
        returns = self.calculate_returns(prices)

        # Calculate expected returns and covariance
        mean_returns = returns.mean() * 252  # Annualized
        cov_matrix = returns.cov() * 252      # Annualized

        n_assets = len(symbols)

        # Find Max Sharpe Portfolio
        def neg_sharpe(weights):
            port_return = np.dot(weights, mean_returns)
            port_vol = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))
            return -(port_return - self.risk_free_rate) / port_vol if port_vol > 0 else 0

        constraints = [{'type': 'eq', 'fun': lambda w: np.sum(w) - 1}]
        bounds = tuple((min_weight, max_weight) for _ in range(n_assets))
        initial_weights = np.array([1.0 / n_assets] * n_assets)

        result = minimize(
            neg_sharpe,
            initial_weights,
            method='SLSQP',
            bounds=bounds,
            constraints=constraints
        )

        max_sharpe_weights = result.x
        max_sharpe_return = float(np.dot(max_sharpe_weights, mean_returns))
        max_sharpe_vol = float(np.sqrt(np.dot(max_sharpe_weights.T, np.dot(cov_matrix, max_sharpe_weights))))
        max_sharpe_sharpe = (max_sharpe_return - self.risk_free_rate) / max_sharpe_vol if max_sharpe_vol > 0 else 0

        # Find Min Volatility Portfolio
        def portfolio_volatility(weights):
            return np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))

        result = minimize(
            portfolio_volatility,
            initial_weights,
            method='SLSQP',
            bounds=bounds,
            constraints=constraints
        )

        min_vol_weights = result.x
        min_vol_return = float(np.dot(min_vol_weights, mean_returns))
        min_vol_vol = float(np.sqrt(np.dot(min_vol_weights.T, np.dot(cov_matrix, min_vol_weights))))
        min_vol_sharpe = (min_vol_return - self.risk_free_rate) / min_vol_vol if min_vol_vol > 0 else 0

        # Generate efficient frontier
        efficient_frontier = []
        target_returns = np.linspace(min_vol_return, max_sharpe_return, n_portfolios)

        for target_ret in target_returns:
            constraints_with_return = [
                {'type': 'eq', 'fun': lambda w: np.sum(w) - 1},
                {'type': 'eq', 'fun': lambda w: np.dot(w, mean_returns) - target_ret}
            ]

            result = minimize(
                portfolio_volatility,
                initial_weights,
                method='SLSQP',
                bounds=bounds,
                constraints=constraints_with_return
            )

            if result.success:
                weights = result.x
                port_return = float(np.dot(weights, mean_returns))
                port_vol = float(np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights))))
                port_sharpe = (port_return - self.risk_free_rate) / port_vol if port_vol > 0 else 0

                efficient_frontier.append({
                    'return': port_return,
                    'volatility': port_vol,
                    'sharpe': float(port_sharpe),
                    'weights': {symbols[i]: float(weights[i]) for i in range(n_assets)}
                })

        logger.info(f"✅ Portfolio optimization complete: Max Sharpe={max_sharpe_sharpe:.2f}")

        return {
            'maxSharpePortfolio': {
                'weights': {symbols[i]: float(max_sharpe_weights[i]) for i in range(n_assets)},
                'expectedReturn': max_sharpe_return,
                'volatility': max_sharpe_vol,
                'sharpe': float(max_sharpe_sharpe)
            },
            'minVolatilityPortfolio': {
                'weights': {symbols[i]: float(min_vol_weights[i]) for i in range(n_assets)},
                'expectedReturn': min_vol_return,
                'volatility': min_vol_vol,
                'sharpe': float(min_vol_sharpe)
            },
            'efficientFrontier': efficient_frontier,
            'symbols': symbols,
            'tradingDays': len(returns)
        }

    def run_monte_carlo(
        self,
        symbols: List[str],
        start_date: str,
        end_date: str,
        initial_capital: float,
        time_horizon_days: int,
        num_simulations: int,
        portfolio_weights: Optional[Dict[str, float]] = None
    ) -> Dict:
        """
        Monte Carlo simulation with correlated returns

        Pattern: intel-microservice/quantitative_engine.py:439-533
        Uses Cholesky decomposition for correlation structure

        Args:
            symbols: List of stock symbols
            start_date: Historical data start
            end_date: Historical data end
            initial_capital: Starting portfolio value
            time_horizon_days: Days to simulate forward
            num_simulations: Number of simulation paths
            portfolio_weights: Dict of symbol -> weight

        Returns:
            Dict with simulation results and statistics
        """
        logger.info(f"🎲 Running {num_simulations} Monte Carlo simulations for {time_horizon_days} days")

        # Fetch historical data
        historical_data = self.fetch_historical_data(symbols, start_date, end_date)
        prices = self.align_data_by_dates(historical_data)
        returns = self.calculate_returns(prices)

        # Default to equal weights
        if portfolio_weights is None:
            portfolio_weights = {sym: 1.0 / len(symbols) for sym in symbols}

        # Calculate portfolio statistics
        mean_returns = returns.mean()
        cov_matrix = returns.cov()

        # Cholesky decomposition for correlated returns
        L = np.linalg.cholesky(cov_matrix)

        weights = np.array([portfolio_weights.get(sym, 0) for sym in returns.columns])

        # Run simulations
        simulation_paths = np.zeros((num_simulations, time_horizon_days + 1))
        simulation_paths[:, 0] = initial_capital

        for sim in range(num_simulations):
            portfolio_value = initial_capital

            for day in range(time_horizon_days):
                # Generate correlated random returns
                random_returns = np.dot(L, np.random.randn(len(symbols)))
                daily_returns = mean_returns.values + random_returns

                # Calculate portfolio return
                portfolio_return = np.dot(weights, daily_returns)
                portfolio_value *= (1 + portfolio_return)

                simulation_paths[sim, day + 1] = portfolio_value

        # Calculate statistics
        final_values = simulation_paths[:, -1]

        statistics = {
            'mean': float(np.mean(final_values)),
            'median': float(np.median(final_values)),
            'std': float(np.std(final_values)),
            'min': float(np.min(final_values)),
            'max': float(np.max(final_values)),
            'percentile5': float(np.percentile(final_values, 5)),
            'percentile25': float(np.percentile(final_values, 25)),
            'percentile75': float(np.percentile(final_values, 75)),
            'percentile95': float(np.percentile(final_values, 95)),
            'probPositive': float(np.mean(final_values > initial_capital))
        }

        # Calculate percentile paths
        percentile_paths = {
            5: simulation_paths[np.argmin(np.abs(final_values - statistics['percentile5']))].tolist(),
            25: simulation_paths[np.argmin(np.abs(final_values - statistics['percentile25']))].tolist(),
            50: simulation_paths[np.argmin(np.abs(final_values - statistics['percentile50']))].tolist(),
            75: simulation_paths[np.argmin(np.abs(final_values - statistics['percentile75']))].tolist(),
            95: simulation_paths[np.argmin(np.abs(final_values - statistics['percentile95']))].tolist()
        }

        # Sample paths for visualization
        sample_indices = np.random.choice(num_simulations, min(100, num_simulations), replace=False)
        sample_paths = simulation_paths[sample_indices].tolist()

        logger.info(f"✅ Monte Carlo complete: Mean={statistics['mean']:.2f}, Median={statistics['median']:.2f}")

        return {
            'statistics': statistics,
            'percentilePaths': percentile_paths,
            'samplePaths': sample_paths,
            'initialCapital': initial_capital,
            'timeHorizonDays': time_horizon_days,
            'numSimulations': num_simulations
        }


# Export singleton instance
portfolio_analytics = PortfolioAnalyticsService()
