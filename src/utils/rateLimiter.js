// src/utils/rateLimiter.js

class RateLimiter {
  constructor(limitMs = 3000) {
    this.requests = new Map();
    this.limitMs = limitMs;
  }

  /**
   * Check if user is rate limited
   * @param {string} userId - User ID to check
   * @returns {boolean} - true if allowed, false if rate limited
   */
  isAllowed(userId) {
    const now = Date.now();
    const lastRequest = this.requests.get(userId);

    if (lastRequest && now - lastRequest < this.limitMs) {
      return false;
    }

    this.requests.set(userId, now);
    return true;
  }

  /**
   * Get remaining cooldown time in seconds
   */
  getRemainingTime(userId) {
    const now = Date.now();
    const lastRequest = this.requests.get(userId);
    
    if (!lastRequest) return 0;
    
    const remaining = this.limitMs - (now - lastRequest);
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  }

  /**
   * Clear rate limit for a user
   */
  clear(userId) {
    this.requests.delete(userId);
  }

  /**
   * Clear all rate limits
   */
  clearAll() {
    this.requests.clear();
  }
}

module.exports = RateLimiter;
