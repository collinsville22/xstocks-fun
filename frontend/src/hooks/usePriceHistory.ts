import { useState, useEffect } from 'react';

interface PricePoint {
  timestamp: number;
  price: number;
}

interface PriceHistory {
  [mint: string]: PricePoint[];
}

const STORAGE_KEY = 'token_price_history';
const MAX_DATA_POINTS = 100; // Keep last 100 price points per token
const CACHE_INTERVAL = 30000; // Cache price every 30 seconds

export const usePriceHistory = (mint: string | null, currentPrice: number | null) => {
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);

  useEffect(() => {
    if (!mint) return;

    // Load existing history from localStorage
    const loadHistory = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const allHistory: PriceHistory = stored ? JSON.parse(stored) : {};
        return allHistory[mint] || [];
      } catch (error) {
        console.error('Error loading price history:', error);
        return [];
      }
    };

    setPriceHistory(loadHistory());
  }, [mint]);

  useEffect(() => {
    if (!mint || currentPrice === null || currentPrice === 0) return;

    const cachePrice = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const allHistory: PriceHistory = stored ? JSON.parse(stored) : {};

        const tokenHistory = allHistory[mint] || [];
        const now = Date.now();

        // Add new price point
        const newPoint: PricePoint = {
          timestamp: now,
          price: currentPrice
        };

        // Avoid duplicate timestamps (same minute)
        const lastPoint = tokenHistory[tokenHistory.length - 1];
        if (lastPoint && now - lastPoint.timestamp < CACHE_INTERVAL) {
          return;
        }

        // Add point and limit to MAX_DATA_POINTS
        const updatedHistory = [...tokenHistory, newPoint].slice(-MAX_DATA_POINTS);

        // Save to localStorage
        allHistory[mint] = updatedHistory;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allHistory));

        setPriceHistory(updatedHistory);
      } catch (error) {
        console.error('Error caching price:', error);
      }
    };

    // Cache immediately
    cachePrice();

    // Cache at regular intervals
    const interval = setInterval(cachePrice, CACHE_INTERVAL);
    return () => clearInterval(interval);
  }, [mint, currentPrice]);

  return priceHistory;
};
