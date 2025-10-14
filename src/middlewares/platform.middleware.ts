import type { NextFunction, Response } from 'express';

import logger from '../config/logger';
import type { PlatformRequest, PlatformType } from '../types/auth.types';

export const detectPlatform = (req: PlatformRequest, _res: Response, next: NextFunction): void => {
  const userAgent = (req.headers['user-agent'] || '').toLowerCase();

  // Mobile detection
  if (
    userAgent.includes('mobile') ||
    userAgent.includes('android') ||
    userAgent.includes('iphone') ||
    userAgent.includes('ipad') ||
    userAgent.includes('ipod')
  ) {
    req.platform = 'mobile';
  }
  // Desktop/Electron detection
  else if (
    userAgent.includes('electron') ||
    userAgent.includes('desktop') ||
    (userAgent.includes('win') && !userAgent.includes('phone')) ||
    userAgent.includes('mac') ||
    userAgent.includes('linux')
  ) {
    req.platform = 'desktop';
  }
  // Default to web
  else {
    req.platform = 'web';
  }

  // Log platform detection
  if (process.env.NODE_ENV === 'dev') {
    logger.info(`🌐 Platform detected: ${req.platform} from ${req.ip}`);
  }

  next();
};

// Platform-aware OAuth state generator
export const generateOAuthState = (req: PlatformRequest): string => {
  const platform = req.platform || 'web';
  const state = {
    platform,
    timestamp: Date.now(),
    returnUrl: req.query.returnUrl as string,
  };

  return Buffer.from(JSON.stringify(state)).toString('base64');
};

// Platform-aware OAuth state validator
export const validateOAuthState = (req: PlatformRequest, state: string): boolean => {
  try {
    const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
    req.oauthState = decodedState;
    req.platform = decodedState.platform as PlatformType;
    return Date.now() - decodedState.timestamp < 5 * 60 * 1000; // 5 minutes validity
  } catch (error) {
    logger.error('Invalid OAuth state', { state, error: (error as Error).message });
    return false;
  }
};
