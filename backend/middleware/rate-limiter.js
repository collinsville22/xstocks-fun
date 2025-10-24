/**
 * Simple Rate Limiting Middleware
 * Prevents abuse by limiting requests per IP
 */

class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000; // 1 minute default
    this.max = options.max || 100; // 100 requests per window
    this.requests = new Map();
  }

  middleware() {
    return (req, res, next) => {
      const ip = req.ip || req.connection.remoteAddress;
      const now = Date.now();

      // Get or create request log for this IP
      if (!this.requests.has(ip)) {
        this.requests.set(ip, []);
      }

      const requestLog = this.requests.get(ip);

      // Remove old requests outside the window
      const validRequests = requestLog.filter(
        timestamp => now - timestamp < this.windowMs
      );

      // Check if limit exceeded
      if (validRequests.length >= this.max) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(this.windowMs / 1000)
        });
      }

      // Add current request
      validRequests.push(now);
      this.requests.set(ip, validRequests);

      // Clean up old IPs periodically
      if (Math.random() < 0.01) { // 1% chance to cleanup
        this.cleanup(now);
      }

      next();
    };
  }

  cleanup(now) {
    for (const [ip, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(
        timestamp => now - timestamp < this.windowMs
      );

      if (validTimestamps.length === 0) {
        this.requests.delete(ip);
      } else {
        this.requests.set(ip, validTimestamps);
      }
    }
  }
}

// Rate limit configurations
export const generalLimiter = new RateLimiter({
  windowMs: 60000, // 1 minute
  max: 100 // 100 requests per minute per IP
});

export const tradingLimiter = new RateLimiter({
  windowMs: 60000, // 1 minute
  max: 30 // 30 trading requests per minute (more restrictive)
});

export const quoteLimiter = new RateLimiter({
  windowMs: 60000, // 1 minute
  max: 60 // 60 quote requests per minute
});
