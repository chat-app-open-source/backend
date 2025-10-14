import { envConfig } from '../config/env';
import logger from '../config/logger';
import { redisClient } from '../config/redis';
import type { RateLimitConfig, RateLimitResult } from '../types/auth.types';

export class AdvancedRateLimitService {
  private static readonly DEFAULT_CONFIG: RateLimitConfig = {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 30 * 60 * 1000, // 30 minutes
  };

  // Check rate limit for various actions
  static async checkRateLimit(
    identifier: string,
    action: 'login' | '2fa' | 'password_reset' | 'api' | 'message' | 'biometric',
    customConfig?: Partial<RateLimitConfig>,
  ): Promise<RateLimitResult> {
    const config = this.getConfigForAction(action, customConfig);
    const key = `rate_limit:${action}:${identifier}`;
    const blockKey = `rate_limit_block:${action}:${identifier}`;

    try {
      // Check if blocked
      const isBlocked = await redisClient.exists(blockKey);
      if (isBlocked) {
        const ttl = await redisClient.get(blockKey);
        const retryAfter = ttl ? parseInt(ttl) : config.blockDurationMs / 1000;

        logger.warn('Rate limit block active', { identifier, action, retryAfter });
        return {
          allowed: false,
          remaining: 0,
          resetTime: Date.now() + retryAfter * 1000,
          retryAfter,
        };
      }

      // Get current attempts
      const currentAttempts = parseInt((await redisClient.get(key)) || '0');
      const remaining = Math.max(0, config.maxAttempts - currentAttempts);

      if (currentAttempts >= config.maxAttempts) {
        // Block the identifier
        await redisClient.set(blockKey, '1', Math.floor(config.blockDurationMs / 1000));
        await redisClient.del(key);

        // Log security event for biometric failures
        if (action === 'biometric') {
          logger.warn('Biometric rate limit exceeded', {
            identifier,
            attempts: currentAttempts,
            blockDuration: config.blockDurationMs,
          });
        }

        logger.warn('Rate limit exceeded, blocking identifier', {
          identifier,
          action,
          config: config.maxAttempts,
        });
        return {
          allowed: false,
          remaining: 0,
          resetTime: Date.now() + config.blockDurationMs,
          retryAfter: config.blockDurationMs / 1000,
        };
      }

      // Increment attempts
      if (currentAttempts === 0) {
        await redisClient.set(key, '1', Math.floor(config.windowMs / 1000));
      } else {
        await redisClient.incr(key);
      }

      return {
        allowed: true,
        remaining,
        resetTime: Date.now() + config.windowMs,
      };
    } catch (error) {
      logger.error('Rate limit check failed', {
        identifier,
        action,
        error: (error as Error).message,
      });
      // Allow on error to not block users, but log it
      return {
        allowed: true,
        remaining: config.maxAttempts,
        resetTime: Date.now() + config.windowMs,
      };
    }
  }

  // Reset rate limit for an identifier
  static async resetRateLimit(identifier: string, action: string): Promise<void> {
    const key = `rate_limit:${action}:${identifier}`;
    const blockKey = `rate_limit_block:${action}:${identifier}`;

    try {
      await redisClient.del(key);
      await redisClient.del(blockKey);
      logger.info('Rate limit reset', { identifier, action });
    } catch (error) {
      logger.error('Rate limit reset failed', {
        identifier,
        action,
        error: (error as Error).message,
      });
    }
  }

  // Get rate limit status
  static async getRateLimitStatus(identifier: string, action: string): Promise<RateLimitResult> {
    const key = `rate_limit:${action}:${identifier}`;
    const blockKey = `rate_limit_block:${action}:${identifier}`;

    try {
      const isBlocked = await redisClient.exists(blockKey);
      if (isBlocked) {
        const ttl = await redisClient.get(blockKey);
        const retryAfter = ttl ? parseInt(ttl) : this.DEFAULT_CONFIG.blockDurationMs / 1000;

        return {
          allowed: false,
          remaining: 0,
          resetTime: Date.now() + retryAfter * 1000,
          retryAfter,
        };
      }

      const currentAttempts = parseInt((await redisClient.get(key)) || '0');
      const remaining = Math.max(0, this.DEFAULT_CONFIG.maxAttempts - currentAttempts);

      return {
        allowed: remaining > 0,
        remaining,
        resetTime: Date.now() + this.DEFAULT_CONFIG.windowMs,
      };
    } catch (error) {
      logger.error('Rate limit status check failed', {
        identifier,
        action,
        error: (error as Error).message,
      });
      return {
        allowed: true,
        remaining: this.DEFAULT_CONFIG.maxAttempts,
        resetTime: Date.now() + this.DEFAULT_CONFIG.windowMs,
      };
    }
  }

  private static getConfigForAction(
    action: string,
    customConfig?: Partial<RateLimitConfig>,
  ): RateLimitConfig {
    const baseConfig = { ...this.DEFAULT_CONFIG };

    switch (action) {
      case 'login':
        return {
          ...baseConfig,
          maxAttempts: envConfig.rateLimitLoginAttempts,
          windowMs: envConfig.rateLimitLoginWindowMs,
          ...customConfig,
        };
      case '2fa':
        return {
          ...baseConfig,
          maxAttempts: envConfig.rateLimit2FAAttempts,
          windowMs: envConfig.rateLimit2FAWindowMs,
          ...customConfig,
        };
      case 'password_reset':
        return {
          ...baseConfig,
          maxAttempts: 3,
          windowMs: 3600000, // 1 hour
          ...customConfig,
        };
      case 'biometric':
        return {
          ...baseConfig,
          maxAttempts: 5,
          windowMs: 900000,
          blockDurationMs: 1800000,
          ...customConfig,
        };
      case 'api':
        return {
          ...baseConfig,
          maxAttempts: envConfig.apiKeyRequestLimit,
          windowMs: 60000, // 1 minute
          ...customConfig,
        };
      case 'message':
        return {
          ...baseConfig,
          maxAttempts: 100,
          windowMs: 60000, // 1 minute
          ...customConfig,
        };
      default:
        return { ...baseConfig, ...customConfig };
    }
  }
}
