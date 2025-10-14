import type { JwtPayload, SignOptions, VerifyOptions } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';

import { envConfig } from '../config/env';
import logger from '../config/logger';
import { RefreshToken } from '../models';
import type { IAuthTokens } from '../types';

const JWT_CONFIG = {
  secret: envConfig.jwtSecret,
  refreshSecret: envConfig.jwtRefreshSecret,
  expire: envConfig.jwtExpire || '15m',
  refreshExpire: envConfig.jwtRefreshExpire || '7d',
  algorithm: 'HS256' as const,
} as const;

// Validate that secrets meet minimum requirements
const validateSecret = (secret: string, type: 'access' | 'refresh'): void => {
  if (!secret || secret.length < 32) {
    throw new Error(
      `${type} secret must be at least 32 characters long. Please update your environment variables.`,
    );
  }

  if (typeof secret !== 'string' || secret.trim().length === 0) {
    throw new Error(
      `${type} secret must be a valid non-empty string. Please provide a valid string secret.`,
    );
  }
};

// Validate secrets on module load
(() => {
  try {
    validateSecret(JWT_CONFIG.secret, 'access');
    validateSecret(JWT_CONFIG.refreshSecret, 'refresh');
    logger.info('JWT configuration validated successfully');
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('JWT configuration validation failed', { error: err.message });
    process.exit(1);
  }
})();

// Sign options for both access and refresh tokens
const getSignOptions = (expiresIn: string): SignOptions => ({
  algorithm: JWT_CONFIG.algorithm,
  expiresIn: `${expiresIn}` as jwt.SignOptions['expiresIn'],
});

export const generateTokens = async (userId: string): Promise<IAuthTokens> => {
  try {
    const payload: JwtPayload = { userId };

    const accessToken = jwt.sign(
      payload,
      JWT_CONFIG.secret as jwt.Secret,
      getSignOptions(JWT_CONFIG.expire),
    );

    const refreshTokenStr = jwt.sign(
      payload,
      JWT_CONFIG.refreshSecret as jwt.Secret,
      getSignOptions(JWT_CONFIG.refreshExpire),
    );

    // Parse refresh token expiration for DB storage
    const decodedRefresh = jwt.decode(refreshTokenStr) as JwtPayload & { exp?: number };
    const expiresAt = decodedRefresh?.exp
      ? new Date(decodedRefresh.exp * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Store refresh token in DB (revoke existing tokens first)
    await RefreshToken.deleteMany({ userId, isRevoked: false });

    const refreshTokenDoc = new RefreshToken({
      token: refreshTokenStr,
      userId,
      expiresAt,
      isRevoked: false,
    });
    await refreshTokenDoc.save();

    logger.debug('Tokens generated successfully', { userId });
    return { accessToken, refreshToken: refreshTokenStr };
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Token generation failed', { error: err.message, userId });
    throw new Error('Failed to generate tokens');
  }
};

export const verifyAccessToken = (token: string): JwtPayload => {
  try {
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid token format');
    }

    const payload = jwt.verify(
      token,
      JWT_CONFIG.secret as jwt.Secret,
      {
        algorithms: [JWT_CONFIG.algorithm],
      } as VerifyOptions,
    ) as JwtPayload;

    if (!payload.userId || typeof payload.userId !== 'string') {
      throw new Error('Invalid token payload');
    }

    return payload;
  } catch (error: unknown) {
    const err = error as Error;
    // Handle specific JWT errors
    let message = 'Invalid or expired access token';

    switch (err.name) {
      case 'TokenExpiredError':
        message = 'Access token has expired';
        break;
      case 'JsonWebTokenError':
        message = 'Invalid access token format';
        break;
      case 'NotBeforeError':
        message = 'Access token not yet valid';
        break;
      default:
        message = err.message || 'Access token verification failed';
    }

    logger.error('Access token verification failed', {
      error: err.name || err.message,
      tokenPrefix: `${token.substring(0, 20)}...`,
    });
    throw new Error(message);
  }
};

export const verifyRefreshToken = async (
  token: string,
): Promise<{ userId: string; newTokens: IAuthTokens }> => {
  try {
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid token format');
    }

    // Verify JWT first
    const payload = jwt.verify(
      token,
      JWT_CONFIG.refreshSecret as jwt.Secret,
      {
        algorithms: [JWT_CONFIG.algorithm],
      } as VerifyOptions,
    ) as JwtPayload;

    if (!payload.userId || typeof payload.userId !== 'string') {
      throw new Error('Invalid token payload');
    }

    // Check database
    const storedToken = await RefreshToken.findOne({
      token,
      userId: payload.userId,
      isRevoked: false,
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      // Revoke the token if expired
      if (storedToken) {
        await RefreshToken.findByIdAndUpdate(storedToken._id, { isRevoked: true });
      }
      throw new Error('Invalid or expired refresh token');
    }

    // Generate new tokens (this will automatically revoke old ones)
    const newTokens = await generateTokens(payload.userId);

    logger.debug('Refresh token verified and new tokens generated', { userId: payload.userId });
    return { userId: payload.userId, newTokens };
  } catch (error: unknown) {
    const err = error as Error;
    // Handle specific JWT errors
    let message = 'Invalid or expired refresh token';

    switch (err.name) {
      case 'TokenExpiredError':
        message = 'Refresh token has expired';
        break;
      case 'JsonWebTokenError':
        message = 'Invalid refresh token format';
        break;
      case 'NotBeforeError':
        message = 'Refresh token not yet valid';
        break;
      default:
        message = err.message || 'Refresh token verification failed';
    }

    logger.error('Refresh token verification failed', {
      error: err.name || err.message,
      tokenPrefix: `${token.substring(0, 20)}...`,
    });
    throw new Error(message);
  }
};

export const invalidateToken = async (token: string): Promise<void> => {
  try {
    const result = await RefreshToken.findOneAndUpdate(
      { token, isRevoked: false },
      { isRevoked: true },
    );

    if (result) {
      logger.warn('Refresh token invalidated', {
        tokenPrefix: `${token.substring(0, 20)}...`,
        userId: result.userId,
      });
    }
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Token invalidation failed', { error: err.message });
    throw err;
  }
};

// Additional utility functions
export const decodeToken = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || typeof decoded !== 'object' || !('userId' in decoded)) {
      return null;
    }
    return decoded as JwtPayload;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Token decoding failed', { error: err.message });
    return null;
  }
};

export const isTokenExpired = (token: string): boolean => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;

  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
};

export const getTokenExpiry = (token: string): Date | null => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return null;

  return new Date(decoded.exp * 1000);
};
