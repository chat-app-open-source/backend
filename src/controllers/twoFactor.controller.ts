import type { NextFunction, Request, Response } from 'express';
import logger from '../config/logger';
import { AdvancedRateLimitService, TwoFactorService } from '../services';
import { errorResponse, successResponse } from '../utils';

export const enable2FA = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    if (!req.user || typeof req.user.id !== 'string') {
      return errorResponse({
        res,
        message: 'User not authenticated',
        statusCode: 401,
      });
    }

    const userId = req.user.id;

    // Check rate limit
    const rateLimit = await AdvancedRateLimitService.checkRateLimit(userId, '2fa');
    if (!rateLimit.allowed) {
      return errorResponse({
        res,
        message: `Too many 2FA setup attempts. Please try again in ${rateLimit.retryAfter} seconds.`,
        statusCode: 429,
        details: {
          retryAfter: rateLimit.retryAfter,
          resetTime: rateLimit.resetTime,
        },
      });
    }

    const twoFactorSetup = await TwoFactorService.enable2FA(userId);

    return successResponse({
      res,
      message: '2FA setup initiated successfully. Scan the QR code with your authenticator app.',
      data: twoFactorSetup,
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('2FA enable error', { error: err.message });
    return errorResponse({ res, message: err.message, statusCode: 400 });
  }
};

export const verify2FA = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    if (!req.user || typeof req.user.id !== 'string') {
      return errorResponse({
        res,
        message: 'User not authenticated',
        statusCode: 401,
      });
    }

    const { token } = req.body;
    const userId = req.user.id;

    if (!token || token.length !== 6) {
      return errorResponse({
        res,
        message: 'Valid 6-digit token is required',
        statusCode: 400,
      });
    }

    // Check rate limit
    const rateLimit = await AdvancedRateLimitService.checkRateLimit(userId, '2fa');
    if (!rateLimit.allowed) {
      return errorResponse({
        res,
        message: `Too many 2FA verification attempts. Please try again in ${rateLimit.retryAfter} seconds.`,
        statusCode: 429,
        details: {
          retryAfter: rateLimit.retryAfter,
          resetTime: rateLimit.resetTime,
        },
      });
    }

    const result = await TwoFactorService.verifyAndEnable2FA(userId, token);

    // Reset rate limit on success
    await AdvancedRateLimitService.resetRateLimit(userId, '2fa');

    return successResponse({
      res,
      message: '2FA enabled successfully. Save your backup codes in a secure location.',
      data: result,
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('2FA verification error', { error: err.message });
    return errorResponse({ res, message: err.message, statusCode: 400 });
  }
};

export const disable2FA = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    if (!req.user || typeof req.user.id !== 'string') {
      return errorResponse({
        res,
        message: 'User not authenticated',
        statusCode: 401,
      });
    }

    const userId = req.user.id;
    await TwoFactorService.disable2FA(userId);

    return successResponse({
      res,
      message: '2FA disabled successfully',
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('2FA disable error', { error: err.message });
    return errorResponse({ res, message: err.message, statusCode: 400 });
  }
};

export const generateBackupCodes = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    if (!req.user || typeof req.user.id !== 'string') {
      return errorResponse({
        res,
        message: 'User not authenticated',
        statusCode: 401,
      });
    }

    const userId = req.user.id;
    const backupCodes = await TwoFactorService.generateNewBackupCodes(userId);

    return successResponse({
      res,
      message: 'New backup codes generated successfully. Save them in a secure location.',
      data: { backupCodes },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Backup codes generation error', { error: err.message });
    return errorResponse({ res, message: err.message, statusCode: 400 });
  }
};

export const get2FAStatus = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    if (!req.user || typeof req.user.id !== 'string') {
      return errorResponse({
        res,
        message: 'User not authenticated',
        statusCode: 401,
      });
    }

    const userId = req.user.id;
    const is2FAEnabled = await TwoFactorService.is2FAEnabled(userId);
    const remainingBackupCodes = await TwoFactorService.getRemainingBackupCodes(userId);

    return successResponse({
      res,
      message: '2FA status retrieved successfully',
      data: {
        is2FAEnabled,
        remainingBackupCodes,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Get 2FA status error', { error: err.message });
    return errorResponse({ res, message: err.message, statusCode: 400 });
  }
};
