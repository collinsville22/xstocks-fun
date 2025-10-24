import { useState, useEffect, useMemo } from 'react';
import { Token } from '../types';

interface TokenPrice {
  mint: string;
  price: number;
}

export const useTokenPrices = (tokens: Token[]) => {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  // Create stable token mints string to prevent unnecessary re-fetches
  const tokenMints = useMemo(() => tokens.map(t => t.mint).join(','), [tokens]);

  useEffect(() => {
    if (!tokens.length) return;

    const fetchPrices = async () => {
      setLoading(true);
      const newPrices: Record<string, number> = {};

      try {
        // Get all token mints (max 50 per request)
        const mints = tokens.map(t => t.mint).join(',');

        // Fetch prices from Jupiter Price API v3
        const response = await fetch(`https://lite-api.jup.ag/price/v3?ids=${mints}`);
        const data = await response.json();

        // v3 returns prices directly keyed by mint address
        Object.entries(data).forEach(([mint, priceData]: [string, any]) => {
          newPrices[mint] = priceData.usdPrice || 0;
        });

        setPrices(newPrices);
      } catch (error) {
        console.error('Error fetching token prices:', error);
        setPrices(newPrices);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();

    // Refresh prices every 30 seconds
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, [tokenMints]);

  return { prices, loading };
};
