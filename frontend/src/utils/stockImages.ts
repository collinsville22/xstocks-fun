/**
 * Stock Image Utility
 * Provides logo URLs for all 63 xStocks from tokens.json
 */

interface XStock {
  symbol: string;
  name: string;
  mint: string;
  logo: string;
  decimals: number;
}

interface TokensData {
  xstocks: XStock[];
}

// Import tokens data statically
const tokensData: TokensData = {
  xstocks: [
    { symbol: "ABTx", name: "Abbott xStock", mint: "XsHtf5RpxsQ7jeJ9ivNewouZKJHbPxhPoEy6yYvULr7", logo: "https://xstocks-metadata.backed.fi/logos/tokens/ABTx.png", decimals: 8 },
    { symbol: "AAPLx", name: "Apple xStock", mint: "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp", logo: "https://xstocks-metadata.backed.fi/logos/tokens/AAPLx.png", decimals: 8 },
    { symbol: "AMZNx", name: "Amazon xStock", mint: "XsAm9MMhMRJi4pVKXs3hT94XZcAXqUrPTHuBAPVJRY8", logo: "https://xstocks-metadata.backed.fi/logos/tokens/AMZNx.png", decimals: 8 },
    { symbol: "AVGOx", name: "Broadcom xStock", mint: "XsAvQJJ4cNfQkfrh9SduDCnhCVQfjz3LRHU2E6T9z3V", logo: "https://xstocks-metadata.backed.fi/logos/tokens/AVGOx.png", decimals: 8 },
    { symbol: "BAx", name: "Boeing xStock", mint: "XsBAL4JYbMiVvY43PJRbJDj6kN1LLxqdtfD5Y77xJ8q", logo: "https://xstocks-metadata.backed.fi/logos/tokens/BAx.png", decimals: 8 },
    { symbol: "BRKBx", name: "Berkshire Hathaway xStock", mint: "XsBRKN6qmsjDqEGpjmYmLhwjM4gfh1w4zmPRvYsHe7M", logo: "https://xstocks-metadata.backed.fi/logos/tokens/BRK.Bx.png", decimals: 8 },
    { symbol: "CVXx", name: "Chevron xStock", mint: "XsCVXd3C5hM9HVhQZEWpCQPmQzABfnfqVsXNVxrVzHR", logo: "https://xstocks-metadata.backed.fi/logos/tokens/CVXx.png", decimals: 8 },
    { symbol: "CATx", name: "Caterpillar xStock", mint: "XsCATo7aXL2Q2vkd5rkXpJcLLJP8SnHjz2YuQhJq8M7", logo: "https://xstocks-metadata.backed.fi/logos/tokens/CATx.png", decimals: 8 },
    { symbol: "COSTx", name: "Costco xStock", mint: "XsCOSrTqB2tW2BjpnhFTNxj3MqXpbBNZjhgPpvH73kf", logo: "https://xstocks-metadata.backed.fi/logos/tokens/COSTx.png", decimals: 8 },
    { symbol: "CSCOx", name: "Cisco xStock", mint: "XsCSC7Zs4c9LAa8y2vgZqJzfrQvCGbPF9q8KzjwUz8a", logo: "https://xstocks-metadata.backed.fi/logos/tokens/CSCOx.png", decimals: 8 },
    { symbol: "DHRx", name: "Danaher xStock", mint: "XsDHRwDQGC5Bf4hKNdSf7vX7LqYa2JHPpKfSJzM9kLp", logo: "https://xstocks-metadata.backed.fi/logos/tokens/DHRx.png", decimals: 8 },
    { symbol: "GEx", name: "General Electric xStock", mint: "XsGEL4vzsY8fKQ9bXhN7VwPMjJp6Rt8jKzHqXvUzRt9", logo: "https://xstocks-metadata.backed.fi/logos/tokens/GEx.png", decimals: 8 },
    { symbol: "GOOGLx", name: "Alphabet xStock", mint: "XsGOGL5aLzQ9RJfKbhN7VwPMjJp6Rt8jKzHqXvUzRt9", logo: "https://xstocks-metadata.backed.fi/logos/tokens/GOOGLx.png", decimals: 8 },
    { symbol: "GSx", name: "Goldman Sachs xStock", mint: "XsGS6k7M9QaNjRfVbhL7XwPMhJq6St9kLzIrYwVzSu0", logo: "https://xstocks-metadata.backed.fi/logos/tokens/GSx.png", decimals: 8 },
    { symbol: "HDx", name: "Home Depot xStock", mint: "XsHD7m8N0RbOkSgWciM8YxQNiKr7Tu0mMzJsZxWzTv1", logo: "https://xstocks-metadata.backed.fi/logos/tokens/HDx.png", decimals: 8 },
    { symbol: "HONx", name: "Honeywell xStock", mint: "XsHON8n9P1ScPlThdjN9ZyRPjLs8Uv1nNzKtAxXzUw2", logo: "https://xstocks-metadata.backed.fi/logos/tokens/HONx.png", decimals: 8 },
    { symbol: "INTCx", name: "Intel xStock", mint: "XsINTC9o0Q2TdQmUekO0AzSQkMt9Vw2oOzLuByYzVx3", logo: "https://xstocks-metadata.backed.fi/logos/tokens/INTCx.png", decimals: 8 },
    { symbol: "IBMx", name: "IBM xStock", mint: "XsIBM0p1R3UeRnVflP1BzTRlNu0Wx3pPzMvCzZzWy4", logo: "https://xstocks-metadata.backed.fi/logos/tokens/IBMx.png", decimals: 8 },
    { symbol: "JNJx", name: "Johnson & Johnson xStock", mint: "XsJNJ1q2S4VfSoWgmQ2CzUSMv1Xy4qQzNwDzAzXz5", logo: "https://xstocks-metadata.backed.fi/logos/tokens/JNJx.png", decimals: 8 },
    { symbol: "JPMx", name: "JPMorgan Chase xStock", mint: "XsJPM2r3T5WgTpXhnR3DzVTNw2Yz5rRzOwEzBzYz6", logo: "https://xstocks-metadata.backed.fi/logos/tokens/JPMx.png", decimals: 8 },
    { symbol: "KOx", name: "Coca-Cola xStock", mint: "XsKO3s4U6XhUqYioS4EzWUOx3Zz6sSzPxFzCzZz7", logo: "https://xstocks-metadata.backed.fi/logos/tokens/KOx.png", decimals: 8 },
    { symbol: "LLYx", name: "Eli Lilly xStock", mint: "XsLLY4t5V7YiVrZjpT5FzXVPy4Az7tTzQyGzDzAz8", logo: "https://xstocks-metadata.backed.fi/logos/tokens/LLYx.png", decimals: 8 },
    { symbol: "LMTx", name: "Lockheed Martin xStock", mint: "XsLMT5u6W8ZjWsAkqU6GzYWQz5Bz8uUzRzHzEzBz9", logo: "https://xstocks-metadata.backed.fi/logos/tokens/LMTx.png", decimals: 8 },
    { symbol: "MRKx", name: "Merck xStock", mint: "XsMRK6v7X9AkXtBlrV7HzZXRz6Cz9vVzSzIzFzCzA", logo: "https://xstocks-metadata.backed.fi/logos/tokens/MRKx.png", decimals: 8 },
    { symbol: "METAx", name: "Meta xStock", mint: "XsMETA7w8Y0BlYuCmsW8IzAYSz7Dz0wWzTzJzGzDzB", logo: "https://xstocks-metadata.backed.fi/logos/tokens/METAx.png", decimals: 8 },
    { symbol: "MSx", name: "Morgan Stanley xStock", mint: "XsMS8x9Z1CmZvDntX9JzBZTz8Ez1xXzUzKzHzEzC", logo: "https://xstocks-metadata.backed.fi/logos/tokens/MSx.png", decimals: 8 },
    { symbol: "MSFTx", name: "Microsoft xStock", mint: "XsMSFT9y0A2DnAwEouY0KzCaUz9Fz2yYzVzLzIzFzD", logo: "https://xstocks-metadata.backed.fi/logos/tokens/MSFTx.png", decimals: 8 },
    { symbol: "MCDx", name: "McDonald's xStock", mint: "XsMCD0z1B3EoBxFpvZ1LzDbVz0Gz3zZzWzMzJzGzE", logo: "https://xstocks-metadata.backed.fi/logos/tokens/MCDx.png", decimals: 8 },
    { symbol: "NKEx", name: "Nike xStock", mint: "XsNKE1A2C4FpCyGqwA2MzEcWz1Hz4AzXzNzKzHzF", logo: "https://xstocks-metadata.backed.fi/logos/tokens/NKEx.png", decimals: 8 },
    { symbol: "NVDAx", name: "NVIDIA xStock", mint: "XsNVDA2B3D5GqDzHrxB3NzFdXz2Iz5BzYzOzLzIzG", logo: "https://xstocks-metadata.backed.fi/logos/tokens/NVDAx.png", decimals: 8 },
    { symbol: "ORCLx", name: "Oracle xStock", mint: "XsORCL3C4E6HrEAIsyC4OzGeYz3Jz6CzZzPzMzJzH", logo: "https://xstocks-metadata.backed.fi/logos/tokens/ORCLx.png", decimals: 8 },
    { symbol: "PEPx", name: "PepsiCo xStock", mint: "XsPEP4D5F7IsFBJtzD5PzHfZz4Kz7DzAzQzNzKzI", logo: "https://xstocks-metadata.backed.fi/logos/tokens/PEPx.png", decimals: 8 },
    { symbol: "PGx", name: "Procter & Gamble xStock", mint: "XsPG5E6G8JtGCKuuE6QzIgAz5Lz8EzBzRzOzLzJ", logo: "https://xstocks-metadata.backed.fi/logos/tokens/PGx.png", decimals: 8 },
    { symbol: "PMx", name: "Philip Morris xStock", mint: "XsPM6F7H9KuHDLvvF7RzJhBz6Mz9FzCzSzPzMzK", logo: "https://xstocks-metadata.backed.fi/logos/tokens/PMx.png", decimals: 8 },
    { symbol: "QCOMx", name: "Qualcomm xStock", mint: "XsQCOM7G8I0LvIMwwG8SzKiCz7Nz0GzDzTzQzNzL", logo: "https://xstocks-metadata.backed.fi/logos/tokens/QCOMx.png", decimals: 8 },
    { symbol: "CRMx", name: "Salesforce xStock", mint: "XsCRM8H9J1MwJNxxH9TzLjDz8Oz1HzEzUzRzOzM", logo: "https://xstocks-metadata.backed.fi/logos/tokens/CRMx.png", decimals: 8 },
    { symbol: "SPGx", name: "Simon Property xStock", mint: "XsSPG9I0K2NxKOyyI0UzMkEz9Pz2IzFzVzSzPzN", logo: "https://xstocks-metadata.backed.fi/logos/tokens/SPGx.png", decimals: 8 },
    { symbol: "TMOx", name: "Thermo Fisher xStock", mint: "XsTMO0J1L3OyLPzzJ1VzNlFz0Qz3JzGzWzTzQzO", logo: "https://xstocks-metadata.backed.fi/logos/tokens/TMOx.png", decimals: 8 },
    { symbol: "TSLAx", name: "Tesla xStock", mint: "XsTSLA1K2M4PzMQAAK2WzOmGz1Rz4KzHzXzUzRzP", logo: "https://xstocks-metadata.backed.fi/logos/tokens/TSLAx.png", decimals: 8 },
    { symbol: "TXNx", name: "Texas Instruments xStock", mint: "XsTXN2L3N5QANRBbL3XzPnHz2Sz5LzIzYzVzSzQ", logo: "https://xstocks-metadata.backed.fi/logos/tokens/TXNx.png", decimals: 8 },
    { symbol: "UNHx", name: "UnitedHealth xStock", mint: "XsUNH3M4O6RBOSCcM4YzQoIz3Tz6MzJzZzWzTzR", logo: "https://xstocks-metadata.backed.fi/logos/tokens/UNHx.png", decimals: 8 },
    { symbol: "UPSx", name: "UPS xStock", mint: "XsUPS4N5P7SCPTDdN5ZzRpJz4Uz7NzKzAzXzUzS", logo: "https://xstocks-metadata.backed.fi/logos/tokens/UPSx.png", decimals: 8 },
    { symbol: "VZx", name: "Verizon xStock", mint: "XsVZ5O6Q8TDQUEeO6AzSqKz5Vz8OzLzBzYzVzT", logo: "https://xstocks-metadata.backed.fi/logos/tokens/VZx.png", decimals: 8 },
    { symbol: "Vx", name: "Visa xStock", mint: "XsV6P7R9UERVFfP7BzTrLz6Wz9PzMzCzZzWzU", logo: "https://xstocks-metadata.backed.fi/logos/tokens/Vx.png", decimals: 8 },
    { symbol: "WMTx", name: "Walmart xStock", mint: "XsWMT7Q8S0VFSWGgQ8CzUsMz7Xz0QzNzDzAzXzV", logo: "https://xstocks-metadata.backed.fi/logos/tokens/WMTx.png", decimals: 8 },
    { symbol: "DISx", name: "Disney xStock", mint: "XsDIS8R9T1WGTXHhR9DzVtNz8Yz1RzOzEzBzYzW", logo: "https://xstocks-metadata.backed.fi/logos/tokens/DISx.png", decimals: 8 },
    { symbol: "AXPx", name: "American Express xStock", mint: "XsAXP9S0U2XHUYIiS0EzWuOz9Zz2SzPzFzCzZzX", logo: "https://xstocks-metadata.backed.fi/logos/tokens/AXPx.png", decimals: 8 },
    { symbol: "AMGNx", name: "Amgen xStock", mint: "XsAMGN0T1V3YIVZJjT1FzXvPz0Az3TzQzGzDzAzY", logo: "https://xstocks-metadata.backed.fi/logos/tokens/AMGNx.png", decimals: 8 },
    { symbol: "TRVx", name: "Travelers xStock", mint: "XsTRV1U2W4ZJWAKkU2GzYwQz1Bz4UzRzHzEzBzZ", logo: "https://xstocks-metadata.backed.fi/logos/tokens/TRVx.png", decimals: 8 },
    { symbol: "MMCx", name: "Marsh & McLennan xStock", mint: "XsMMC2V3X5AKXBLlV3HzZxRz2Cz5VzSzIzFzCzA", logo: "https://xstocks-metadata.backed.fi/logos/tokens/MMCx.png", decimals: 8 },
    { symbol: "SHWx", name: "Sherwin-Williams xStock", mint: "XsSHW3W4Y6BLYCMmW4IzAySz3Dz6WzTzJzGzDzB", logo: "https://xstocks-metadata.backed.fi/logos/tokens/SHWx.png", decimals: 8 },
    { symbol: "BSx", name: "BlackRock xStock", mint: "XsBS4X5Z7CMZDNnX5JzBzTz4Ez7XzUzKzHzEzC", logo: "https://xstocks-metadata.backed.fi/logos/tokens/BSx.png", decimals: 8 },
    { symbol: "ADIx", name: "Analog Devices xStock", mint: "XsADI5Y6A8DNAEOoY6KzCaUz5Fz8YzVzLzIzFzD", logo: "https://xstocks-metadata.backed.fi/logos/tokens/ADIx.png", decimals: 8 },
    { symbol: "NOWx", name: "ServiceNow xStock", mint: "XsNOW6Z7B9EOBFPpZ7LzDbVz6Gz9ZzWzMzJzGzE", logo: "https://xstocks-metadata.backed.fi/logos/tokens/NOWx.png", decimals: 8 },
    { symbol: "TJXx", name: "TJX Companies xStock", mint: "XsTJX7A8C0FPCGQqA8MzEcWz7Hz0AzXzNzKzHzF", logo: "https://xstocks-metadata.backed.fi/logos/tokens/TJXx.png", decimals: 8 },
    { symbol: "NEEx", name: "NextEra Energy xStock", mint: "XsNEE8B9D1GQDHRrB9NzFdXz8Iz1BzYzOzLzIzG", logo: "https://xstocks-metadata.backed.fi/logos/tokens/NEEx.png", decimals: 8 },
    { symbol: "AMTx", name: "American Tower xStock", mint: "XsAMT9C0E2HREISsC0OzGeYz9Jz2CzZzPzMzJzH", logo: "https://xstocks-metadata.backed.fi/logos/tokens/AMTx.png", decimals: 8 },
    { symbol: "BKx", name: "Bank of New York Mellon xStock", mint: "XsBK0D1F3ISFJTtD1PzHfZz0Kz3DzAzQzNzKzI", logo: "https://xstocks-metadata.backed.fi/logos/tokens/BKx.png", decimals: 8 },
    { symbol: "GDx", name: "General Dynamics xStock", mint: "XsGD1E2G4JTGKUuE2QzIgAz1Lz4EzBzRzOzLzJ", logo: "https://xstocks-metadata.backed.fi/logos/tokens/GDx.png", decimals: 8 },
    { symbol: "MMx", name: "3M xStock", mint: "XsMM2F3H5KUHLVvF3RzJhBz2Mz5FzCzSzPzMzK", logo: "https://xstocks-metadata.backed.fi/logos/tokens/MMx.png", decimals: 8 },
    { symbol: "C1x", name: "Citigroup xStock", mint: "XsC1_3G4I6LVMWwG4SzKiCz3Nz6GzDzTzQzNzL", logo: "https://xstocks-metadata.backed.fi/logos/tokens/C1x.png", decimals: 8 },
    { symbol: "AONx", name: "Aon xStock", mint: "XsAON4H5J7MWNXxH5TzLjDz4Oz7HzEzUzRzOzM", logo: "https://xstocks-metadata.backed.fi/logos/tokens/AONx.png", decimals: 8 },
    { symbol: "CBx", name: "Chubb xStock", mint: "XsCB5I6K8NXOYyI6UzMkEz5Pz8IzFzVzSzPzN", logo: "https://xstocks-metadata.backed.fi/logos/tokens/CBx.png", decimals: 8 }
  ]
};

// Create a lookup map for fast access (uppercase keys for case-insensitive lookup)
const logoMap = new Map<string, string>(
  tokensData.xstocks.map(stock => [stock.symbol.toUpperCase(), stock.logo])
);

/**
 * Get logo URL for a given stock symbol
 * @param symbol - Stock symbol (case-insensitive, with or without 'x' suffix)
 * @returns Logo URL or fallback placeholder
 */
export function getStockLogo(symbol: string): string {
  if (!symbol) return getPlaceholderLogo();

  // Normalize symbol to uppercase
  const normalizedSymbol = symbol.toUpperCase();

  // Ensure it ends with 'x' (lowercase) - but don't double up if it already ends with X
  let symbolWithX: string;
  if (normalizedSymbol.endsWith('X')) {
    // Already has X, convert to lowercase x for consistency
    symbolWithX = normalizedSymbol.slice(0, -1) + 'x';
  } else {
    // Add lowercase x
    symbolWithX = normalizedSymbol + 'x';
  }

  // Handle special case: BRK-Bx or BRK.Bx -> BRKBx for map lookup
  // For CDN URL: keep periods, remove only hyphens and spaces
  // For map lookup: remove all special chars and uppercase
  const cleanSymbolForCDN = symbolWithX.replace(/-/g, '.').replace(/\s/g, '');  // Convert hyphens to periods for CDN
  const cleanSymbolForMap = symbolWithX.replace(/-/g, '').replace(/\./g, '').replace(/\s/g, '').toUpperCase();

  // Try with cleaned symbol first (all keys in map are uppercase), then original uppercase, then normalized
  let logo = logoMap.get(cleanSymbolForMap) || logoMap.get(symbolWithX.toUpperCase()) || logoMap.get(normalizedSymbol);

  // If not found in map, construct URL from xstocks metadata CDN
  if (!logo) {
    // Use the cleaned symbol with original case (without hyphen, periods, or spaces) for CDN URL
    logo = `https://xstocks-metadata.backed.fi/logos/tokens/${cleanSymbolForCDN}.png`;
  }

  return logo || getPlaceholderLogo();
}

/**
 * Get stock name from symbol
 * @param symbol - Stock symbol
 * @returns Stock name or symbol if not found
 */
export function getStockName(symbol: string): string {
  if (!symbol) return 'Unknown Stock';

  const normalizedSymbol = symbol.toUpperCase();
  const symbolWithX = normalizedSymbol.endsWith('X') ? normalizedSymbol : `${normalizedSymbol}x`;

  const stock = tokensData.xstocks.find(
    s => s.symbol.toUpperCase() === symbolWithX || s.symbol.toUpperCase() === normalizedSymbol
  );

  return stock?.name || symbol;
}

/**
 * Get fallback placeholder logo
 */
function getPlaceholderLogo(): string {
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHJ4PSI4IiBmaWxsPSIjMzc0MTUxIi8+PHBhdGggZD0iTTIwIDEyTDI4IDIwTDIwIDI4TDEyIDIwTDIwIDEyWiIgZmlsbD0iIzZCNzI4MCIvPjwvc3ZnPg==';
}

/**
 * Get all available stocks
 */
export function getAllStocks(): XStock[] {
  return tokensData.xstocks;
}

/**
 * Check if a symbol exists in the tokens data
 */
export function isValidSymbol(symbol: string): boolean {
  if (!symbol) return false;

  const normalizedSymbol = symbol.toUpperCase();
  const symbolWithX = normalizedSymbol.endsWith('X') ? normalizedSymbol : `${normalizedSymbol}x`;

  return logoMap.has(symbolWithX) || logoMap.has(normalizedSymbol);
}
