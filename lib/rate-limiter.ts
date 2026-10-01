interface RateLimitRecord {
  count: number;
  resetAt: number;
}

interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  name: string;
}

export class SlidingWindowRateLimiter {
  private store: Map<string, RateLimitRecord> = new Map();
  private windowMs: number;
  private maxRequests: number;
  private name: string;

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
    this.name = options.name;

    // Prune expired records every 5 minutes
    if (typeof setInterval !== "undefined") {
      setInterval(() => this.prune(), 5 * 60 * 1000).unref?.();
    }
  }

  public check(key: string): {
    allowed: boolean;
    remaining: number;
    resetInSeconds: number;
    total: number;
  } {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || now >= record.resetAt) {
      // New or expired window
      this.store.set(key, { count: 1, resetAt: now + this.windowMs });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetInSeconds: Math.ceil(this.windowMs / 1000),
        total: this.maxRequests,
      };
    }

    if (record.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetInSeconds: Math.max(1, Math.ceil((record.resetAt - now) / 1000)),
        total: this.maxRequests,
      };
    }

    record.count += 1;
    return {
      allowed: true,
      remaining: this.maxRequests - record.count,
      resetInSeconds: Math.max(1, Math.ceil((record.resetAt - now) / 1000)),
      total: this.maxRequests,
    };
  }

  public reset(key: string): void {
    this.store.delete(key);
  }

  private prune(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now >= record.resetAt) {
        this.store.delete(key);
      }
    }
  }
}

// 1. Login Attempts: 5 failed attempts per 15 minutes per IP
export const loginRateLimiter = new SlidingWindowRateLimiter({
  name: "login",
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
});

// 2. Password Reset: 3 requests per hour
export const passwordResetRateLimiter = new SlidingWindowRateLimiter({
  name: "password_reset",
  windowMs: 60 * 60 * 1000,
  maxRequests: 3,
});

// 3. General API: 100 requests per minute per IP / user
export const apiRateLimiter = new SlidingWindowRateLimiter({
  name: "api",
  windowMs: 60 * 1000,
  maxRequests: 100,
});

// 4. File Uploads: 20 uploads per minute per user / IP
export const uploadRateLimiter = new SlidingWindowRateLimiter({
  name: "file_upload",
  windowMs: 60 * 1000,
  maxRequests: 20,
});

// 5. Order Tracking: 20 lookups per minute per IP to prevent order ID scraping/enumeration
export const orderTrackingRateLimiter = new SlidingWindowRateLimiter({
  name: "order_tracking",
  windowMs: 60 * 1000,
  maxRequests: 20,
});
