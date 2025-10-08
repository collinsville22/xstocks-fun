import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const tokensPath = join(__dirname, '..', 'tokens.json');
const tokens = JSON.parse(readFileSync(tokensPath, 'utf8'));

export class TokenService {
  constructor() {
    this.xstocks = tokens.xstocks;
    this.baseTokens = tokens.baseTokens;
  }

  getAllTokens() {
    return [...this.baseTokens, ...this.xstocks];
  }

  getXStocks() {
    return this.xstocks;
  }

  getBaseTokens() {
    return this.baseTokens;
  }

  getTokenByMint(mint) {
    return this.getAllTokens().find(token => token.mint === mint);
  }

  getTokenBySymbol(symbol) {
    return this.getAllTokens().find(token => token.symbol === symbol);
  }

  searchTokens(query) {
    const lowerQuery = query.toLowerCase();
    return this.getAllTokens().filter(token =>
      token.symbol.toLowerCase().includes(lowerQuery) ||
      token.name.toLowerCase().includes(lowerQuery)
    );
  }

  getTradingPairs() {
    const pairs = [];

    // Base tokens to xStocks
    this.baseTokens.forEach(baseToken => {
      this.xstocks.forEach(xstock => {
        pairs.push({ from: baseToken, to: xstock });
      });
    });

    // xStocks to base tokens
    this.xstocks.forEach(xstock => {
      this.baseTokens.forEach(baseToken => {
        pairs.push({ from: xstock, to: baseToken });
      });
    });

    return pairs;
  }

  formatAmount(amount, decimals) {
    return (amount / Math.pow(10, decimals)).toFixed(decimals);
  }

  parseAmount(amount, decimals) {
    return Math.floor(parseFloat(amount) * Math.pow(10, decimals));
  }

  isValidToken(mint) {
    return this.getAllTokens().some(token => token.mint === mint);
  }
}