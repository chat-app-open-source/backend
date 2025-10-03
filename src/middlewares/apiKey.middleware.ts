import type { NextFunction, Request, Response } from 'express';

import { envConfig, logger } from '../config';
import { checkApiKeyRateLimit, logApiAttempt } from '../services/rateLimit.service';
import { errorResponse } from '../utils';

export const validateAPIKey = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] as string;
    const path = req.path;

    if (!apiKey) {
      await logApiAttempt(ip, 'missing', path, userAgent, false);
      logger.warn('Missing API key attempt', { ip, path });
      errorResponse({ res, message: 'API key is required', statusCode: 401 });
      return;
    }

    // Check rate limit first
    const rateLimitInfo = await checkApiKeyRateLimit(ip, apiKey);

    if (rateLimitInfo.isLocked) {
      await logApiAttempt(ip, apiKey, path, userAgent, false);
      logger.warn('API key attempt blocked - rate limited', {
        ip,
        apiKey: `${apiKey.substring(0, 10)}...`,
        path,
        lockUntil: rateLimitInfo.lockUntil,
        lockCount: rateLimitInfo.lockCount,
      });

      const remainingTime = Math.ceil(
        (rateLimitInfo.lockUntil!.getTime() - Date.now()) / (1000 * 60),
      );

      errorResponse({
        res,
        message: `Too many failed API key attempts. Account locked for ${remainingTime} minutes.`,
        statusCode: 429,
        details: {
          lockUntil: rateLimitInfo.lockUntil?.toISOString(),
          lockCount: rateLimitInfo.lockCount,
          retryAfter: remainingTime * 60,
        },
      });
      return;
    }

    const isValid = apiKey === envConfig.apiKey;

    await logApiAttempt(ip, apiKey, path, userAgent, isValid);

    if (!isValid) {
      const remainingAttempts = rateLimitInfo.remainingAttempts;
      logger.warn('Invalid API key attempt', { ip, path, remainingAttempts });

      if (remainingAttempts > 0) {
        errorResponse({
          res,
          message: `Invalid API key. ${remainingAttempts} attempts remaining.`,
          statusCode: 401,
          details: {
            remainingAttempts,
            resetTime: rateLimitInfo.resetTime,
          },
        });
      } else {
        // Lock the IP
        const lockUntil = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes initial lock
        logger.error('API key rate limit exceeded - IP locked', {
          ip,
          apiKey: `${apiKey.substring(0, 10)}...`,
          path,
          lockUntil,
        });

        errorResponse({
          res,
          message: 'Too many failed API key attempts. Access locked for 5 minutes.',
          statusCode: 429,
          details: {
            lockUntil: lockUntil.toISOString(),
            retryAfter: 300,
          },
        });
      }
      return;
    }

    // API key is valid
    logger.debug('API key validated successfully', { ip, path });
    next();
  } catch (error) {
    logger.error('API key validation error', { error: (error as Error).message });
    errorResponse({ res, message: 'API key validation failed', statusCode: 500 });
  }
};

export const healthCheckBypass = (req: Request, res: Response, next: NextFunction): void => {
  if (req.path === '/api/health') {
    next();
    return;
  }
  validateAPIKey(req, res, next);
};
