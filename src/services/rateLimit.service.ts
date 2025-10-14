import { envConfig } from '../config/env';
import logger from '../config/logger';
import { ApiAttempt } from '../models';

const MINUTE_MS = 60 * 1000;

export interface ApiLockInfo {
  isLocked: boolean;
  lockUntil?: Date;
  lockCount: number;
  remainingAttempts: number;
  resetTime: number;
}

export const checkApiKeyRateLimit = async (ip: string, apiKey: string): Promise<ApiLockInfo> => {
  try {
    const oneMinuteAgo = new Date(Date.now() - MINUTE_MS);

    // Count all attempts (successful or failed) in the last minute
    const totalAttempts = await ApiAttempt.countDocuments({
      ip,
      apiKey,
      timestamp: { $gt: oneMinuteAgo },
    });

    // Check if IP is currently locked
    const recentLocks = await ApiAttempt.find({
      ip,
      timestamp: { $gt: new Date(Date.now() - 5 * MINUTE_MS) },
    })
      .sort({ timestamp: -1 })
      .limit(1);

    let isLocked = false;
    let lockUntil: Date | undefined;
    let lockCount = 0;
    let remainingAttempts = 0;

    if (recentLocks.length > 0 && totalAttempts >= envConfig.apiKeyRequestLimit) {
      const lastAttemptTime = recentLocks[0].timestamp;
      // Calculate lock duration based on number of attempts
      const baseLockMinutes = 5;
      const additionalMinutesPerLimit = 2;
      const calculatedLockMinutes =
        baseLockMinutes +
        Math.floor(totalAttempts / envConfig.apiKeyRequestLimit) * additionalMinutesPerLimit;

      lockUntil = new Date(lastAttemptTime.getTime() + calculatedLockMinutes * MINUTE_MS);
      isLocked = lockUntil > new Date();
      lockCount = Math.floor(totalAttempts / envConfig.apiKeyRequestLimit);
    }

    if (!isLocked) {
      remainingAttempts = Math.max(0, envConfig.apiKeyRequestLimit - totalAttempts);
    }

    const resetTime = Math.ceil((MINUTE_MS - (Date.now() % MINUTE_MS)) / 1000);

    return {
      isLocked,
      lockUntil,
      lockCount,
      remainingAttempts,
      resetTime,
    };
  } catch (error) {
    logger.error('Failed to check API key rate limit', { error: (error as Error).message });
    // Default to no lock if there's an error
    return {
      isLocked: false,
      lockCount: 0,
      remainingAttempts: envConfig.apiKeyRequestLimit,
      resetTime: 60,
    };
  }
};

export const logApiAttempt = async (
  ip: string,
  apiKey: string,
  path: string,
  userAgent: string | undefined,
  success: boolean,
): Promise<void> => {
  try {
    const attempt = new ApiAttempt({
      ip,
      apiKey,
      path,
      userAgent,
      success,
      timestamp: new Date(),
    });
    await attempt.save();

    if (!success) {
      logger.warn('API key validation failed', {
        ip,
        apiKey: `${apiKey.substring(0, 10)}...`,
        path,
      });
    }
  } catch (error) {
    logger.error('Failed to log API attempt', { error: (error as Error).message });
  }
};

export const getApiLockStatus = async (ip: string): Promise<ApiLockInfo | null> => {
  try {
    const oneMinuteAgo = new Date(Date.now() - MINUTE_MS);
    const totalAttempts = await ApiAttempt.countDocuments({
      ip,
      timestamp: { $gt: oneMinuteAgo },
    });

    if (totalAttempts === 0) return null;

    const recentLocks = await ApiAttempt.find({
      ip,
      timestamp: { $gt: new Date(Date.now() - 5 * MINUTE_MS) },
    })
      .sort({ timestamp: -1 })
      .limit(1);

    if (recentLocks.length === 0) return null;

    const lastAttemptTime = recentLocks[0].timestamp;
    const baseLockMinutes = 5;
    const additionalMinutesPerLimit = 2;
    const calculatedLockMinutes =
      baseLockMinutes +
      Math.floor(totalAttempts / envConfig.apiKeyRequestLimit) * additionalMinutesPerLimit;

    const lockUntil = new Date(lastAttemptTime.getTime() + calculatedLockMinutes * MINUTE_MS);
    const isLocked = lockUntil > new Date();
    const lockCount = Math.floor(totalAttempts / envConfig.apiKeyRequestLimit);

    return {
      isLocked,
      lockUntil,
      lockCount,
      remainingAttempts: isLocked ? 0 : Math.max(0, envConfig.apiKeyRequestLimit - totalAttempts),
      resetTime: Math.ceil((MINUTE_MS - (Date.now() % MINUTE_MS)) / 1000),
    };
  } catch (error) {
    logger.error('Failed to get API lock status', { error: (error as Error).message });
    return null;
  }
};
